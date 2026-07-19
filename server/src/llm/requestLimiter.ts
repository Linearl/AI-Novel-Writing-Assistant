import type { ChatOpenAI } from "@langchain/openai";
import type { LLMProvider } from "@ai-novel/shared";
import { extractLlmTokenUsage } from "./usageTracking";

const LLM_REQUEST_LIMITER_PATCHED = Symbol("LLM_REQUEST_LIMITER_PATCHED");

export interface ProviderModelLimitOptions {
  provider: LLMProvider;
  model: string;
  concurrencyLimit?: number | null;
  requestIntervalMs?: number | null;
  rpm?: number | null;
  tpm?: number | null;
}

type PatchableChatOpenAI = ChatOpenAI & {
  [LLM_REQUEST_LIMITER_PATCHED]?: boolean;
};

function normalizeNonNegativeInteger(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.floor(value);
}

const QUEUE_TIMEOUT_MS = 60_000;
const RPM_WINDOW_MS = 60_000;

interface QueuedEntry {
  resolve: () => void;
  reject: (err: Error) => void;
  enqueuedAt: number;
}

class ProviderModelRequestLimiter {
  private readonly concurrencyLimit: number;
  private readonly requestIntervalMs: number;
  private readonly rpmLimit: number;
  private readonly tpmLimit: number;

  private activeCount = 0;
  private nextStartAt = 0;
  private timer: NodeJS.Timeout | null = null;

  // RPM sliding window: timestamps of completed starts
  private rpmWindow: number[] = [];

  // TPM continuous token bucket
  private tpmTokens: number;
  private lastTpmRefillAt: number;
  private tpmRefillTimer: NodeJS.Timeout | null = null;

  // Per-tag FIFO queues for fair scheduling
  private tagQueues = new Map<string, QueuedEntry[]>();
  private tagOrder: string[] = [];
  private tagIndex = 0;
  private processing = false;

  constructor(options: ProviderModelLimitOptions) {
    this.concurrencyLimit = normalizeNonNegativeInteger(options.concurrencyLimit);
    this.requestIntervalMs = normalizeNonNegativeInteger(options.requestIntervalMs);
    this.rpmLimit = normalizeNonNegativeInteger(options.rpm);
    this.tpmLimit = normalizeNonNegativeInteger(options.tpm);
    this.tpmTokens = this.tpmLimit > 0 ? this.tpmLimit : 0;
    this.lastTpmRefillAt = Date.now();
  }

  run<T>(
    operation: () => Promise<T>,
    estimatedInputTokens: number = 0,
    callerTag: string = "default",
  ): Promise<T> {
    if (!this.hasAnyLimit()) {
      return operation();
    }

    return new Promise<T>((resolve, reject) => {
      const entry: QueuedEntry = {
        resolve: () => {
          this.activeCount += 1;
          if (this.requestIntervalMs > 0) {
            this.nextStartAt = Date.now() + this.requestIntervalMs;
          }
          // Deduct estimated tokens from TPM bucket before executing
          if (this.tpmLimit > 0 && estimatedInputTokens > 0) {
            this.tpmTokens = Math.max(0, this.tpmTokens - estimatedInputTokens);
          }
          operation()
            .then(resolve, reject)
            .finally(() => {
              this.activeCount = Math.max(0, this.activeCount - 1);
              this.scheduleProcessQueue();
            });
        },
        reject,
        enqueuedAt: Date.now(),
      };

      this.enqueueEntry(callerTag, entry);
      this.startTimeoutChecker();
      this.scheduleProcessQueue();
    });
  }

  /**
   * Run an operation after the limiter gate, then backfill TPM with actual usage.
   */
  runWithBackfill<T>(
    operation: () => Promise<T>,
    estimatedInputTokens: number = 0,
    callerTag: string = "default",
  ): Promise<T> {
    if (!this.hasAnyLimit()) {
      return operation();
    }

    return new Promise<T>((resolve, reject) => {
      const entry: QueuedEntry = {
        resolve: () => {
          this.activeCount += 1;
          if (this.requestIntervalMs > 0) {
            this.nextStartAt = Date.now() + this.requestIntervalMs;
          }
          if (this.tpmLimit > 0 && estimatedInputTokens > 0) {
            this.tpmTokens = Math.max(0, this.tpmTokens - estimatedInputTokens);
          }
          operation()
            .then((result) => {
              // Backfill TPM with actual usage
              const usage = extractLlmTokenUsage(result);
              if (this.tpmLimit > 0 && usage && usage.totalTokens > 0) {
                // Refund the over-estimated portion, or charge the difference
                const actualDeducted = estimatedInputTokens > 0
                  ? estimatedInputTokens
                  : 0;
                const correction = usage.totalTokens - actualDeducted;
                // If actual > estimated, we need to deduct more; if less, refund
                this.tpmTokens = Math.max(
                  0,
                  this.tpmTokens - Math.max(0, correction),
                );
                // If actual < estimated, refund the difference
                if (correction < 0) {
                  this.tpmTokens = Math.min(
                    this.tpmLimit,
                    this.tpmTokens - correction, // correction is negative, so this adds
                  );
                }
              }
              resolve(result);
            }, reject)
            .finally(() => {
              this.activeCount = Math.max(0, this.activeCount - 1);
              this.scheduleProcessQueue();
            });
        },
        reject,
        enqueuedAt: Date.now(),
      };

      this.enqueueEntry(callerTag, entry);
      this.startTimeoutChecker();
      this.scheduleProcessQueue();
    });
  }

  private hasAnyLimit(): boolean {
    return this.concurrencyLimit > 0
      || this.requestIntervalMs > 0
      || this.rpmLimit > 0
      || this.tpmLimit > 0;
  }

  private enqueueEntry(tag: string, entry: QueuedEntry): void {
    let queue = this.tagQueues.get(tag);
    if (!queue) {
      queue = [];
      this.tagQueues.set(tag, queue);
      this.tagOrder.push(tag);
    }
    queue.push(entry);
  }

  private timeoutCheckerTimer: NodeJS.Timeout | null = null;

  private startTimeoutChecker(): void {
    if (this.timeoutCheckerTimer) return;
    this.timeoutCheckerTimer = setInterval(() => {
      this.purgeExpired();
      this.scheduleProcessQueue();
      // Stop checker when all queues are empty
      if (this.tagOrder.length === 0 && this.timeoutCheckerTimer) {
        clearInterval(this.timeoutCheckerTimer);
        this.timeoutCheckerTimer = null;
      }
    }, 1000);
    // Allow the timer to be unref'd so it doesn't keep the process alive
    if (typeof this.timeoutCheckerTimer === "object" && "unref" in this.timeoutCheckerTimer) {
      this.timeoutCheckerTimer.unref();
    }
  }

  private scheduleProcessQueue(): void {
    if (this.processing) return;
    this.processing = true;
    queueMicrotask(() => {
      this.processing = false;
      this.processQueue();
    });
  }

  private processQueue(): void {
    // Clean up expired entries
    this.purgeExpired();

    if (this.tagOrder.length === 0) {
      return;
    }

    // Check global constraints
    if (this.concurrencyLimit > 0 && this.activeCount >= this.concurrencyLimit) {
      this.scheduleRetry();
      return;
    }

    const waitMs = this.requestIntervalMs > 0 ? this.nextStartAt - Date.now() : 0;
    if (waitMs > 0) {
      this.scheduleRetry(waitMs);
      return;
    }

    // Check RPM
    if (this.rpmLimit > 0 && this.countRpmWindow() >= this.rpmLimit) {
      const oldestInWindow = this.rpmWindow[0];
      const waitRpm = oldestInWindow + RPM_WINDOW_MS - Date.now();
      this.scheduleRetry(Math.max(waitRpm, 100));
      return;
    }

    // Check TPM
    if (this.tpmLimit > 0) {
      this.refillTpmTokens();
      const frontTag = this.peekFrontTag();
      if (frontTag) {
        const frontQueue = this.tagQueues.get(frontTag);
        const frontEntry = frontQueue?.[0];
        if (frontEntry) {
          const estimated = this.estimateFromQueueEntry(frontEntry);
          if (this.tpmTokens < estimated) {
            // Not enough tokens for this request - schedule retry
            const tpmWaitMs = this.calculateTpmWaitMs(estimated);
            this.scheduleRetry(Math.max(tpmWaitMs, 100));
            return;
          }
        }
      }
    }

    // Round-robin across tags
    const tag = this.pickNextTag();
    if (!tag) return;

    const queue = this.tagQueues.get(tag);
    if (!queue || queue.length === 0) {
      // Remove empty tag from rotation
      this.removeTag(tag);
      this.processQueue();
      return;
    }

    const entry = queue.shift()!;
    if (queue.length === 0) {
      this.removeTag(tag);
    }

    // Record RPM timestamp
    if (this.rpmLimit > 0) {
      this.rpmWindow.push(Date.now());
    }

    entry.resolve();
    this.processQueue();
  }

  private purgeExpired(): void {
    const now = Date.now();
    for (const tag of [...this.tagOrder]) {
      const queue = this.tagQueues.get(tag);
      if (!queue) continue;
      while (queue.length > 0 && now - queue[0].enqueuedAt > QUEUE_TIMEOUT_MS) {
        const expired = queue.shift()!;
        expired.reject(new Error(`Request timed out in limiter queue after ${QUEUE_TIMEOUT_MS}ms`));
      }
      if (queue.length === 0) {
        this.removeTag(tag);
      }
    }
    // Purge expired RPM entries
    if (this.rpmLimit > 0) {
      const cutoff = now - RPM_WINDOW_MS;
      while (this.rpmWindow.length > 0 && this.rpmWindow[0] <= cutoff) {
        this.rpmWindow.shift();
      }
    }
  }

  private countRpmWindow(): number {
    const now = Date.now();
    const cutoff = now - RPM_WINDOW_MS;
    // Remove expired timestamps
    while (this.rpmWindow.length > 0 && this.rpmWindow[0] <= cutoff) {
      this.rpmWindow.shift();
    }
    return this.rpmWindow.length;
  }

  private refillTpmTokens(): void {
    if (this.tpmLimit <= 0) return;
    const now = Date.now();
    const elapsedMs = now - this.lastTpmRefillAt;
    if (elapsedMs <= 0) return;
    // Continuous refill: tokens per ms
    const refillAmount = (this.tpmLimit / RPM_WINDOW_MS) * elapsedMs;
    this.tpmTokens = Math.min(this.tpmLimit, this.tpmTokens + refillAmount);
    this.lastTpmRefillAt = now;
  }

  private estimateFromQueueEntry(_entry: QueuedEntry): number {
    // When checking TPM availability before dequeuing, use the full tpmLimit as the
    // worst-case estimate if we don't know the actual size. This is conservative;
    // the actual deduction happens in runWithBackfill with the real estimate.
    // For simple run() calls without backfill, we use a minimal estimate.
    return 1;
  }

  private calculateTpmWaitMs(neededTokens: number): number {
    if (this.tpmLimit <= 0 || neededTokens <= 0) return 0;
    const deficit = neededTokens - this.tpmTokens;
    if (deficit <= 0) return 0;
    const msPerToken = RPM_WINDOW_MS / this.tpmLimit;
    return Math.ceil(deficit * msPerToken);
  }

  private peekFrontTag(): string | null {
    if (this.tagOrder.length === 0) return null;
    // Find the first tag with entries, starting from the current round-robin position
    for (let i = 0; i < this.tagOrder.length; i++) {
      const idx = (this.tagIndex + i) % this.tagOrder.length;
      const tag = this.tagOrder[idx];
      const queue = this.tagQueues.get(tag);
      if (queue && queue.length > 0) return tag;
    }
    return null;
  }

  private pickNextTag(): string | null {
    if (this.tagOrder.length === 0) return null;
    // Find next tag with entries using round-robin
    for (let i = 0; i < this.tagOrder.length; i++) {
      const idx = (this.tagIndex + i) % this.tagOrder.length;
      const tag = this.tagOrder[idx];
      const queue = this.tagQueues.get(tag);
      if (queue && queue.length > 0) {
        this.tagIndex = (idx + 1) % this.tagOrder.length;
        return tag;
      }
    }
    return null;
  }

  private removeTag(tag: string): void {
    const idx = this.tagOrder.indexOf(tag);
    if (idx === -1) return;
    this.tagOrder.splice(idx, 1);
    this.tagQueues.delete(tag);
    // Adjust tagIndex after removal
    if (this.tagIndex >= this.tagOrder.length) {
      this.tagIndex = this.tagOrder.length > 0 ? 0 : 0;
    }
  }

  private scheduleRetry(delayMs: number = 0): void {
    if (this.timer) return;
    const wait = Math.max(delayMs, 10);
    this.timer = setTimeout(() => {
      this.timer = null;
      this.processQueue();
    }, wait);
  }

  /**
   * Estimate input tokens from text length.
   * Uses normalized.length / 4 (ceiling) as a rough heuristic.
   */
  static estimateInputTokens(text: string): number {
    if (!text) return 0;
    const normalized = text.normalize("NFC");
    return Math.ceil(normalized.length / 4);
  }
}

const sharedLimiters = new Map<string, ProviderModelRequestLimiter>();

function getLimiterKey(options: ProviderModelLimitOptions): string {
  return [
    options.provider,
    options.model,
    normalizeNonNegativeInteger(options.concurrencyLimit),
    normalizeNonNegativeInteger(options.requestIntervalMs),
    normalizeNonNegativeInteger(options.rpm),
    normalizeNonNegativeInteger(options.tpm),
  ].join(":");
}

export function createProviderModelLimiter(options: ProviderModelLimitOptions): ProviderModelRequestLimiter {
  return new ProviderModelRequestLimiter(options);
}

function getSharedProviderModelLimiter(options: ProviderModelLimitOptions): ProviderModelRequestLimiter {
  const key = getLimiterKey(options);
  const existing = sharedLimiters.get(key);
  if (existing) {
    return existing;
  }
  const created = createProviderModelLimiter(options);
  sharedLimiters.set(key, created);
  return created;
}

export function attachLLMRequestLimiter(
  llm: ChatOpenAI,
  options: ProviderModelLimitOptions & { callerTag?: string },
): ChatOpenAI {
  const concurrencyLimit = normalizeNonNegativeInteger(options.concurrencyLimit);
  const requestIntervalMs = normalizeNonNegativeInteger(options.requestIntervalMs);
  const rpm = normalizeNonNegativeInteger(options.rpm);
  const tpm = normalizeNonNegativeInteger(options.tpm);

  if (concurrencyLimit === 0 && requestIntervalMs === 0 && rpm === 0 && tpm === 0) {
    return llm;
  }

  const patchable = llm as PatchableChatOpenAI;
  if (patchable[LLM_REQUEST_LIMITER_PATCHED]) {
    return llm;
  }

  const limiter = getSharedProviderModelLimiter({
    ...options,
    concurrencyLimit,
    requestIntervalMs,
    rpm,
    tpm,
  });
  const callerTag = options.callerTag ?? "default";
  const originalInvoke = llm.invoke.bind(llm);
  const originalStream = llm.stream.bind(llm);
  const originalBatch = llm.batch.bind(llm);

  patchable.invoke = (async (...args: Parameters<ChatOpenAI["invoke"]>) =>
    limiter.runWithBackfill(() => originalInvoke(...args), 0, callerTag)) as ChatOpenAI["invoke"];

  patchable.stream = (async (...args: Parameters<ChatOpenAI["stream"]>) =>
    limiter.runWithBackfill(() => originalStream(...args), 0, callerTag)) as ChatOpenAI["stream"];

  patchable.batch = (async (...args: Parameters<ChatOpenAI["batch"]>) =>
    limiter.runWithBackfill(() => originalBatch(...args), 0, callerTag)) as ChatOpenAI["batch"];

  Object.defineProperty(patchable, LLM_REQUEST_LIMITER_PATCHED, {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false,
  });

  return llm;
}

/**
 * 清除所有缓存的共享限制器实例。
 * 下次请求时将根据最新配置重新创建限制器，实现热重载。
 */
export function evictSharedLimiters(): void {
  const count = sharedLimiters.size;
  sharedLimiters.clear();
  if (count > 0) {
    console.log(`[RequestLimiter] 已驱逐 ${count} 个共享限制器，下次请求将根据最新配置重新创建。`);
  }
}

/**
 * 获取当前缓存的限制器数量（用于监控和调试）
 */
export function getSharedLimiterCount(): number {
  return sharedLimiters.size;
}
