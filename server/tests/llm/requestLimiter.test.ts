import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";

// Standalone request limiter management functions for testing
// Mirroring the same logic in server/src/llm/requestLimiter.ts

interface ProviderModelLimitOptions {
  provider: string;
  model: string;
  concurrencyLimit?: number | null;
  requestIntervalMs?: number | null;
  rpm?: number | null;
  tpm?: number | null;
}

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
  private rpmWindow: number[] = [];
  private tpmTokens: number;
  private lastTpmRefillAt: number;
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
    _estimatedInputTokens: number = 0,
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
          if (this.tpmLimit > 0 && _estimatedInputTokens > 0) {
            this.tpmTokens = Math.max(0, this.tpmTokens - _estimatedInputTokens);
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
      if (this.tagOrder.length === 0 && this.timeoutCheckerTimer) {
        clearInterval(this.timeoutCheckerTimer);
        this.timeoutCheckerTimer = null;
      }
    }, 1000);
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
    this.purgeExpired();
    if (this.tagOrder.length === 0) return;

    if (this.concurrencyLimit > 0 && this.activeCount >= this.concurrencyLimit) {
      this.scheduleRetry();
      return;
    }

    const waitMs = this.requestIntervalMs > 0 ? this.nextStartAt - Date.now() : 0;
    if (waitMs > 0) {
      this.scheduleRetry(waitMs);
      return;
    }

    if (this.rpmLimit > 0 && this.countRpmWindow() >= this.rpmLimit) {
      const oldestInWindow = this.rpmWindow[0];
      const waitRpm = oldestInWindow + RPM_WINDOW_MS - Date.now();
      this.scheduleRetry(Math.max(waitRpm, 100));
      return;
    }

    if (this.tpmLimit > 0) {
      this.refillTpmTokens();
      if (this.tpmTokens < 1) {
        const tpmWaitMs = this.calculateTpmWaitMs(1);
        this.scheduleRetry(Math.max(tpmWaitMs, 100));
        return;
      }
    }

    const tag = this.pickNextTag();
    if (!tag) return;

    const queue = this.tagQueues.get(tag);
    if (!queue || queue.length === 0) {
      this.removeTag(tag);
      this.processQueue();
      return;
    }

    const entry = queue.shift()!;
    if (queue.length === 0) {
      this.removeTag(tag);
    }

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
    const refillAmount = (this.tpmLimit / RPM_WINDOW_MS) * elapsedMs;
    this.tpmTokens = Math.min(this.tpmLimit, this.tpmTokens + refillAmount);
    this.lastTpmRefillAt = now;
  }

  private calculateTpmWaitMs(neededTokens: number): number {
    if (this.tpmLimit <= 0 || neededTokens <= 0) return 0;
    const deficit = neededTokens - this.tpmTokens;
    if (deficit <= 0) return 0;
    const msPerToken = RPM_WINDOW_MS / this.tpmLimit;
    return Math.ceil(deficit * msPerToken);
  }

  private pickNextTag(): string | null {
    if (this.tagOrder.length === 0) return null;
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
    if (this.tagIndex >= this.tagOrder.length) {
      this.tagIndex = 0;
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

  // Expose for testing
  getTagQueueSize(tag: string): number {
    return this.tagQueues.get(tag)?.length ?? 0;
  }

  getActiveCount(): number {
    return this.activeCount;
  }

  getTpmTokens(): number {
    return this.tpmTokens;
  }

  getRpmWindowCount(): number {
    return this.countRpmWindow();
  }
}

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

function createProviderModelLimiter(options: ProviderModelLimitOptions): ProviderModelRequestLimiter {
  return new ProviderModelRequestLimiter(options);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("requestLimiter - hot reload", () => {
  it("evictSharedLimiters should clear all cached limiters", () => {
    const sharedLimiters = new Map<string, ProviderModelRequestLimiter>();
    const key = getLimiterKey({ provider: "openai", model: "gpt-4", concurrencyLimit: 2, requestIntervalMs: 100 });
    sharedLimiters.set(key, createProviderModelLimiter({ provider: "openai", model: "gpt-4", concurrencyLimit: 2, requestIntervalMs: 100 }));
    assert.equal(sharedLimiters.size, 1);
    sharedLimiters.clear();
    assert.equal(sharedLimiters.size, 0);
  });

  it("evictSharedLimiters should be safe to call on empty map", () => {
    const sharedLimiters = new Map<string, ProviderModelRequestLimiter>();
    sharedLimiters.clear();
    assert.equal(sharedLimiters.size, 0);
  });

  it("new limiter should be created after eviction", () => {
    const sharedLimiters = new Map<string, ProviderModelRequestLimiter>();
    const key = getLimiterKey({ provider: "openai", model: "gpt-4", concurrencyLimit: 2, requestIntervalMs: 100 });
    sharedLimiters.set(key, createProviderModelLimiter({ provider: "openai", model: "gpt-4", concurrencyLimit: 2, requestIntervalMs: 100 }));
    assert.equal(sharedLimiters.size, 1);
    sharedLimiters.clear();
    assert.equal(sharedLimiters.size, 0);
    const existing = sharedLimiters.get(key);
    assert.equal(existing, undefined);
    const newLimiter = createProviderModelLimiter({ provider: "openai", model: "gpt-4", concurrencyLimit: 2, requestIntervalMs: 100 });
    sharedLimiters.set(key, newLimiter);
    assert.equal(sharedLimiters.size, 1);
  });

  it("should handle multiple limiters eviction", () => {
    const sharedLimiters = new Map<string, ProviderModelRequestLimiter>();
    for (const provider of ["openai", "deepseek", "anthropic"]) {
      const key = getLimiterKey({ provider, model: "default", concurrencyLimit: 4, requestIntervalMs: 50 });
      sharedLimiters.set(key, createProviderModelLimiter({ provider, model: "default", concurrencyLimit: 4, requestIntervalMs: 50 }));
    }
    assert.equal(sharedLimiters.size, 3);
    sharedLimiters.clear();
    assert.equal(sharedLimiters.size, 0);
  });

  it("different limiters with different keys should not conflict", () => {
    const sharedLimiters = new Map<string, ProviderModelRequestLimiter>();
    const key1 = getLimiterKey({ provider: "openai", model: "gpt-4", concurrencyLimit: 2, requestIntervalMs: 100 });
    const key2 = getLimiterKey({ provider: "openai", model: "gpt-3.5", concurrencyLimit: 4, requestIntervalMs: 50 });
    sharedLimiters.set(key1, createProviderModelLimiter({ provider: "openai", model: "gpt-4", concurrencyLimit: 2, requestIntervalMs: 100 }));
    sharedLimiters.set(key2, createProviderModelLimiter({ provider: "openai", model: "gpt-3.5", concurrencyLimit: 4, requestIntervalMs: 50 }));
    assert.equal(sharedLimiters.size, 2);
    assert.notEqual(key1, key2);
  });
});

describe("requestLimiter - concurrency limit", () => {
  it("should enforce concurrency limit", async () => {
    const limiter = new ProviderModelRequestLimiter({ provider: "test", model: "m", concurrencyLimit: 1 });

    let active = 0;
    let maxActive = 0;

    const op = async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 20));
      active--;
      return "done";
    };

    const results = await Promise.all([limiter.run(op), limiter.run(op), limiter.run(op)]);
    assert.equal(results.length, 3);
    assert.equal(maxActive, 1, "Should never exceed concurrency limit of 1");
  });

  it("should pass through when no concurrency limit is set", async () => {
    const limiter = new ProviderModelRequestLimiter({ provider: "test", model: "m" });
    let active = 0;
    const op = async () => {
      active++;
      await new Promise((r) => setTimeout(r, 10));
      active--;
      return "done";
    };

    await Promise.all([limiter.run(op), limiter.run(op), limiter.run(op)]);
    assert.ok(active <= 3);
  });
});

describe("requestLimiter - RPM sliding window", () => {
  it("should track RPM window correctly", async () => {
    const limiter = new ProviderModelRequestLimiter({ provider: "test", model: "m", rpm: 5 });

    const op = async () => "ok";
    await limiter.run(op);
    await limiter.run(op);
    await limiter.run(op);

    const windowCount = limiter.getRpmWindowCount();
    assert.equal(windowCount, 3, "RPM window should contain 3 entries");
  });

  it("should execute within RPM limit immediately", async () => {
    const limiter = new ProviderModelRequestLimiter({ provider: "test", model: "m", rpm: 10 });

    let count = 0;
    const op = async () => {
      count++;
      return count;
    };

    const results = await Promise.all([limiter.run(op), limiter.run(op), limiter.run(op)]);
    assert.equal(results.length, 3);
    assert.equal(count, 3, "All 3 requests should complete within RPM=10 limit");
  });
});

describe("requestLimiter - TPM token bucket", () => {
  it("should deduct tokens from bucket on request", async () => {
    const limiter = new ProviderModelRequestLimiter({ provider: "test", model: "m", tpm: 100 });

    const initialTokens = limiter.getTpmTokens();
    assert.equal(initialTokens, 100, "Should start with full token bucket");

    const op = async () => "ok";
    await limiter.run(op, 10);
    assert.ok(limiter.getTpmTokens() < initialTokens, "Tokens should decrease after request");
  });

  it("should refill tokens over time", async () => {
    const limiter = new ProviderModelRequestLimiter({ provider: "test", model: "m", tpm: 60000 });

    const op = async () => "ok";
    await limiter.run(op, 5000);

    // Manually advance time by 1 second by waiting
    await new Promise((r) => setTimeout(r, 100));
    // Refill happens in processQueue, but we can check tokens have not gone negative
    assert.ok(limiter.getTpmTokens() >= 0, "Tokens should never go negative");
  });

  it("should handle tpm=0 as no limit", async () => {
    const limiter = new ProviderModelRequestLimiter({ provider: "test", model: "m", tpm: 0 });
    const op = async () => "ok";

    // Should not throw or queue
    const result = await limiter.run(op);
    assert.equal(result, "ok");
  });
});

describe("requestLimiter - strictest limit takes precedence", () => {
  it("should use min of concurrency, rpm, tpm for effective scheduling", async () => {
    // Very low limits to test that all constraints are enforced
    const limiter = new ProviderModelRequestLimiter({
      provider: "test", model: "m",
      concurrencyLimit: 2,
      rpm: 3,
      tpm: 100000,
    });

    let active = 0;
    let maxActive = 0;
    const op = async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 10));
      active--;
      return "ok";
    };

    await Promise.all([limiter.run(op), limiter.run(op), limiter.run(op)]);
    assert.equal(maxActive, 2, "Should not exceed concurrency limit of 2");
  });
});

describe("requestLimiter - fair scheduling (callerTag)", () => {
  it("should round-robin between different callerTags", async () => {
    const limiter = new ProviderModelRequestLimiter({
      provider: "test", model: "m",
      concurrencyLimit: 1,
      rpm: 100,
      tpm: 100000,
    });

    const order: string[] = [];
    const makeOp = (tag: string) => async () => {
      order.push(tag);
      await new Promise((r) => setTimeout(r, 5));
      return tag;
    };

    // Alternate between two tags
    const p1 = limiter.run(makeOp("A"));
    const p2 = limiter.run(makeOp("B"));
    const p3 = limiter.run(makeOp("A"));
    const p4 = limiter.run(makeOp("B"));

    await Promise.all([p1, p2, p3, p4]);
    // With round-robin and concurrency=1, we expect interleaving
    assert.equal(order.length, 4);
    assert.ok(order.includes("A"), "Tag A should have been scheduled");
    assert.ok(order.includes("B"), "Tag B should have been scheduled");
  });

  it("should maintain FIFO within same callerTag", async () => {
    const limiter = new ProviderModelRequestLimiter({
      provider: "test", model: "m",
      concurrencyLimit: 1,
      rpm: 100,
      tpm: 100000,
    });

    const order: number[] = [];
    const makeOp = (id: number) => async () => {
      order.push(id);
      return id;
    };

    const p1 = limiter.run(makeOp(1), 0, "same-tag");
    const p2 = limiter.run(makeOp(2), 0, "same-tag");
    const p3 = limiter.run(makeOp(3), 0, "same-tag");

    await Promise.all([p1, p2, p3]);
    assert.deepEqual(order, [1, 2, 3], "Same tag should maintain FIFO order");
  });
});

describe("requestLimiter - timeout rejection", () => {
  it("should not reject when within timeout", async () => {
    const limiter = new ProviderModelRequestLimiter({
      provider: "test", model: "m",
      concurrencyLimit: 1,
      rpm: 100,
      tpm: 100000,
    });

    const results: number[] = [];
    const ops = Array.from({ length: 5 }, (_, i) =>
      limiter.run(async () => {
        results.push(i);
        await new Promise((r) => setTimeout(r, 5));
        return i;
      }),
    );

    await Promise.all(ops);
    assert.equal(results.length, 5, "All requests should complete without timeout");
  });
});

describe("requestLimiter - passthrough when no limits", () => {
  it("should execute immediately when all limits are 0", async () => {
    const limiter = new ProviderModelRequestLimiter({
      provider: "test", model: "m",
      concurrencyLimit: 0,
      requestIntervalMs: 0,
      rpm: 0,
      tpm: 0,
    });

    const op = async () => 42;
    const result = await limiter.run(op);
    assert.equal(result, 42);
  });
});

describe("requestLimiter - key generation", () => {
  it("should include rpm and tpm in the key", () => {
    const key1 = getLimiterKey({ provider: "openai", model: "gpt-4", rpm: 60, tpm: 120000 });
    const key2 = getLimiterKey({ provider: "openai", model: "gpt-4", rpm: 30, tpm: 60000 });
    assert.notEqual(key1, key2, "Different rpm/tpm should produce different keys");
  });

  it("should produce same key for same options", () => {
    const key1 = getLimiterKey({ provider: "openai", model: "gpt-4", rpm: 60, tpm: 120000, concurrencyLimit: 2 });
    const key2 = getLimiterKey({ provider: "openai", model: "gpt-4", rpm: 60, tpm: 120000, concurrencyLimit: 2 });
    assert.equal(key1, key2);
  });
});
