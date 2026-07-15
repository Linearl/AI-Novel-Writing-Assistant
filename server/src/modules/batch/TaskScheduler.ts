import type { Batch, BatchQueue } from "@prisma/client";
import { batchQueueService, type BatchQueueFull, type QueueConfig } from "./BatchQueueService";
import { logger } from "../../services/logging/LoggerService";

export interface TaskSchedulerOptions {
  /** Polling interval in ms */
  pollIntervalMs?: number;
  /** Callback for executing a single chapter */
  onExecuteChapter?: (novelId: string, chapterIndex: number) => Promise<void>;
}

interface RunningQueueEntry {
  queueId: string;
  novelId: string;
  config: QueueConfig;
  abortController: AbortController;
}

export class TaskScheduler {
  private runningQueues = new Map<string, RunningQueueEntry>();
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private readonly pollIntervalMs: number;
  private _onExecuteChapter?: (novelId: string, chapterIndex: number) => Promise<void>;

  constructor(options: TaskSchedulerOptions = {}) {
    this.pollIntervalMs = options.pollIntervalMs ?? 1000;
    this._onExecuteChapter = options.onExecuteChapter;
  }

  /**
   * Start executing a queue. Only PENDING queues can be started.
   */
  async startQueue(queueId: string): Promise<void> {
    const queue = await batchQueueService.getQueue(queueId);
    if (!queue) {
      throw new Error(`Queue ${queueId} not found`);
    }
    if (queue.status !== "PENDING") {
      throw new Error(`Cannot start queue in status: ${queue.status}`);
    }

    await batchQueueService.updateQueueStatus(queueId, "RUNNING");

    const config = typeof queue.config === "string"
      ? (JSON.parse(queue.config) as QueueConfig)
      : (queue.config as unknown as QueueConfig);

    const abortController = new AbortController();

    this.runningQueues.set(queueId, {
      queueId,
      novelId: queue.novelId,
      config,
      abortController,
    });

    logger.info(`[TaskScheduler] Started queue ${queueId}`);

    // Kick off processing immediately
    void this.processQueue(queueId).catch((error: unknown) => {
      logger.error(`[TaskScheduler] Queue ${queueId} processing error`, error);
    });

    // Ensure the poll loop is running
    this.ensurePollLoop();
  }

  /**
   * Ensure the polling loop is active.
   */
  private ensurePollLoop(): void {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(() => {
      void this.pollAllQueues().catch((error: unknown) => {
        logger.error("[TaskScheduler] Poll error", error);
      });
    }, this.pollIntervalMs);
  }

  /**
   * Poll all running queues for pending batches.
   */
  private async pollAllQueues(): Promise<void> {
    const entries = [...this.runningQueues.values()];
    for (const entry of entries) {
      if (entry.abortController.signal.aborted) {
        this.runningQueues.delete(entry.queueId);
        continue;
      }
      await this.processQueue(entry.queueId);
    }

    if (this.runningQueues.size === 0) {
      this.stopPollLoop();
    }
  }

  /**
   * Process the next pending batch in a queue.
   */
  private async processQueue(queueId: string): Promise<void> {
    const entry = this.runningQueues.get(queueId);
    if (!entry || entry.abortController.signal.aborted) {
      return;
    }

    // Re-read queue status from DB
    const queue = await batchQueueService.getQueue(queueId);
    if (!queue || queue.status !== "RUNNING") {
      this.runningQueues.delete(queueId);
      return;
    }

    // Get next pending batch
    const nextBatch = await batchQueueService.getNextPendingBatch(queueId);
    if (!nextBatch) {
      // No more pending batches — check completion
      const freshQueue = await batchQueueService.getQueue(queueId);
      if (!freshQueue) {
        this.runningQueues.delete(queueId);
        return;
      }

      const hasFailedBatches = freshQueue.batches.some((b: Batch) => b.status === "FAILED");
      const hasPendingOrRunning = freshQueue.batches.some(
        (b: Batch) => b.status === "PENDING" || b.status === "RUNNING"
      );

      if (!hasPendingOrRunning) {
        const newStatus = hasFailedBatches ? "FAILED" : "COMPLETED";
        await batchQueueService.updateQueueStatus(queueId, newStatus);
        this.runningQueues.delete(queueId);
        logger.info(`[TaskScheduler] Queue ${queueId} finished with status: ${newStatus}`);
      }
      return;
    }

    // Execute the batch
    await this.executeBatch(nextBatch, queue, entry.config);
  }

  /**
   * Execute a single batch.
   */
  private async executeBatch(
    batch: Batch,
    queue: BatchQueueFull,
    config: QueueConfig,
  ): Promise<void> {
    await batchQueueService.markBatchRunning(batch.id);

    try {
      const chaptersStr = batch.chapters as unknown as string;
      const chapters: number[] = JSON.parse(chaptersStr) as number[];
      for (const chapterIndex of chapters) {
        if (this._onExecuteChapter) {
          await this._onExecuteChapter(queue.novelId, chapterIndex);
        }
      }

      await batchQueueService.markBatchCompleted(batch.id);
      logger.info(`[TaskScheduler] Batch ${batch.id} (index ${batch.batchIndex}) completed`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await batchQueueService.markBatchFailed(batch.id, errorMessage);
      logger.warn(
        `[TaskScheduler] Batch ${batch.id} (index ${batch.batchIndex}) failed: ${errorMessage}`,
      );

      const currentRetryCount = batch.retryCount + 1;
      if (currentRetryCount < config.maxRetries) {
        await batchQueueService.resetBatchForRetry(batch.id);
        logger.info(
          `[TaskScheduler] Batch ${batch.id} will be retried (attempt ${currentRetryCount + 1}/${config.maxRetries})`,
        );
      } else {
        logger.warn(
          `[TaskScheduler] Batch ${batch.id} permanently failed after ${currentRetryCount} retries`,
        );
      }
    }
  }

  /**
   * Pause a running queue by aborting its execution.
   */
  async pauseQueue(queueId: string): Promise<void> {
    const entry = this.runningQueues.get(queueId);
    if (entry) {
      entry.abortController.abort();
      this.runningQueues.delete(queueId);
    }

    await batchQueueService.pauseQueue(queueId);
  }

  /**
   * Stop a specific queue and remove it from scheduling.
   */
  async stopQueue(queueId: string): Promise<void> {
    const entry = this.runningQueues.get(queueId);
    if (entry) {
      entry.abortController.abort();
      this.runningQueues.delete(queueId);
    }
  }

  /**
   * Stop all queues and clean up.
   */
  async shutdown(): Promise<void> {
    this.stopPollLoop();
    for (const [, entry] of this.runningQueues) {
      entry.abortController.abort();
    }
    this.runningQueues.clear();
    logger.info("[TaskScheduler] Shutdown complete");
  }

  /**
   * Get the number of actively running queues.
   */
  get activeQueueCount(): number {
    return this.runningQueues.size;
  }

  private stopPollLoop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
