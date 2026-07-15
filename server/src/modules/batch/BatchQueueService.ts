import type { BatchQueue, Batch, QueueStatus, BatchStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { logger } from "../../services/logging/LoggerService";

// ---- Types ----

export interface QueueConfig {
  batchSize: number;
  maxRetries: number;
}

export interface CreateQueueParams {
  novelId: string;
  chapters: number[];
  config?: Partial<QueueConfig>;
}

export interface BatchQueueStatus {
  queueId: string;
  status: QueueStatus;
  totalChapters: number;
  completedChapters: number;
  progressPercent: number;
  totalBatches: number;
  completedBatches: number;
  currentBatchIndex: number | null;
  estimatedRemainingMinutes: number;
  failedTasks: FailedTaskInfo[];
}

export interface FailedTaskInfo {
  batchId: string;
  batchIndex: number;
  chapters: number[];
  error: string | null;
  retryCount: number;
}

const DEFAULT_CONFIG: QueueConfig = {
  batchSize: 10,
  maxRetries: 3,
};

// ---- Helpers ----

export function decomposeIntoBatches(chapters: number[], batchSize: number): number[][] {
  const batches: number[][] = [];
  for (let i = 0; i < chapters.length; i += batchSize) {
    batches.push(chapters.slice(i, i + batchSize));
  }
  return batches;
}

function resolveConfig(partial?: Partial<QueueConfig>): QueueConfig {
  return {
    batchSize: Math.max(1, Math.min(50, partial?.batchSize ?? DEFAULT_CONFIG.batchSize)),
    maxRetries: Math.max(0, Math.min(10, partial?.maxRetries ?? DEFAULT_CONFIG.maxRetries)),
  };
}

// ---- Service ----

export class BatchQueueService {
  /**
   * Create a new batch queue and decompose chapters into batches.
   */
  async createQueue(params: CreateQueueParams): Promise<BatchQueue> {
    const config = resolveConfig(params.config);
    const chapterBatches = decomposeIntoBatches(params.chapters, config.batchSize);

    const queue = await prisma.batchQueue.create({
      data: {
        novelId: params.novelId,
        status: "PENDING",
        config: config as unknown as Record<string, unknown>,
        totalChapters: params.chapters.length,
        completedChapters: 0,
        batches: {
          create: chapterBatches.map((chapters, index) => ({
            batchIndex: index,
            chapters: chapters as unknown as number[],
            status: "PENDING",
            retryCount: 0,
          })),
        },
      },
      include: {
        batches: {
          orderBy: { batchIndex: "asc" },
        },
      },
    });

    logger.info(`[BatchQueue] Created queue ${queue.id} with ${chapterBatches.length} batches (${params.chapters.length} chapters)`);
    return queue;
  }

  /**
   * Get queue with all batches.
   */
  async getQueue(queueId: string): Promise<BatchQueue | null> {
    return prisma.batchQueue.findUnique({
      where: { id: queueId },
      include: {
        batches: {
          orderBy: { batchIndex: "asc" },
        },
      },
    });
  }

  /**
   * Get queue status summary.
   */
  async getQueueStatus(queueId: string): Promise<BatchQueueStatus | null> {
    const queue = await prisma.batchQueue.findUnique({
      where: { id: queueId },
      include: {
        batches: {
          orderBy: { batchIndex: "asc" },
        },
      },
    });

    if (!queue) return null;

    const totalBatches = queue.batches.length;
    const completedBatches = queue.batches.filter((b) => b.status === "COMPLETED").length;
    const failedBatches = queue.batches.filter((b) => b.status === "FAILED");
    const currentBatch = queue.batches.find((b) => b.status === "RUNNING");

    const progressPercent = queue.totalChapters > 0
      ? Math.round((queue.completedChapters / queue.totalChapters) * 100)
      : 0;

    const estimatedRemainingMinutes = totalBatches > 0 && completedBatches > 0
      ? Math.round(((totalBatches - completedBatches) / completedBatches) * 5)
      : totalBatches * 5;

    const failedTasks: FailedTaskInfo[] = failedBatches.map((b) => ({
      batchId: b.id,
      batchIndex: b.batchIndex,
      chapters: b.chapters as unknown as number[],
      error: b.error,
      retryCount: b.retryCount,
    }));

    return {
      queueId: queue.id,
      status: queue.status as QueueStatus,
      totalChapters: queue.totalChapters,
      completedChapters: queue.completedChapters,
      progressPercent,
      totalBatches,
      completedBatches,
      currentBatchIndex: currentBatch?.batchIndex ?? null,
      estimatedRemainingMinutes,
      failedTasks,
    };
  }

  /**
   * List all queues for a novel.
   */
  async listQueues(novelId: string): Promise<BatchQueue[]> {
    return prisma.batchQueue.findMany({
      where: { novelId },
      include: {
        batches: {
          orderBy: { batchIndex: "asc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Pause a running queue.
   */
  async pauseQueue(queueId: string): Promise<BatchQueue | null> {
    const queue = await prisma.batchQueue.findUnique({ where: { id: queueId } });
    if (!queue) return null;
    if (queue.status !== "RUNNING") {
      return queue;
    }

    const updated = await prisma.batchQueue.update({
      where: { id: queueId },
      data: { status: "PAUSED" },
    });

    logger.info(`[BatchQueue] Paused queue ${queueId}`);
    return updated;
  }

  /**
   * Resume a paused queue.
   */
  async resumeQueue(queueId: string): Promise<BatchQueue | null> {
    const queue = await prisma.batchQueue.findUnique({ where: { id: queueId } });
    if (!queue) return null;
    if (queue.status !== "PAUSED") {
      return queue;
    }

    const updated = await prisma.batchQueue.update({
      where: { id: queueId },
      data: { status: "RUNNING" },
    });

    logger.info(`[BatchQueue] Resumed queue ${queueId}`);
    return updated;
  }

  /**
   * Clear (delete) a queue. Only PENDING or PAUSED queues can be cleared.
   */
  async clearQueue(queueId: string): Promise<{ deleted: boolean; reason?: string }> {
    const queue = await prisma.batchQueue.findUnique({ where: { id: queueId } });
    if (!queue) return { deleted: false, reason: "Queue not found" };

    if (queue.status === "RUNNING") {
      return { deleted: false, reason: "Cannot clear a running queue. Pause it first." };
    }

    await prisma.batchQueue.delete({ where: { id: queueId } });
    logger.info(`[BatchQueue] Cleared queue ${queueId}`);
    return { deleted: true };
  }

  /**
   * Delete a queue by ID.
   */
  async deleteQueue(queueId: string): Promise<{ deleted: boolean; reason?: string }> {
    return this.clearQueue(queueId);
  }

  /**
   * Get the next pending batch for execution.
   */
  async getNextPendingBatch(queueId: string): Promise<Batch | null> {
    return prisma.batch.findFirst({
      where: {
        queueId,
        status: "PENDING",
      },
      orderBy: { batchIndex: "asc" },
    });
  }

  /**
   * Mark a batch as running.
   */
  async markBatchRunning(batchId: string): Promise<Batch> {
    return prisma.batch.update({
      where: { id: batchId },
      data: {
        status: "RUNNING",
        startedAt: new Date(),
      },
    });
  }

  /**
   * Mark a batch as completed.
   */
  async markBatchCompleted(batchId: string): Promise<Batch> {
    const batch = await prisma.batch.update({
      where: { id: batchId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    // Update queue completed chapters count
    const chapters = batch.chapters as unknown as number[];
    await prisma.batchQueue.update({
      where: { id: batch.queueId },
      data: {
        completedChapters: { increment: chapters.length },
      },
    });

    return batch;
  }

  /**
   * Mark a batch as failed with error.
   */
  async markBatchFailed(batchId: string, error: string): Promise<Batch> {
    return prisma.batch.update({
      where: { id: batchId },
      data: {
        status: "FAILED",
        error,
      },
    });
  }

  /**
   * Increment retry count and reset to PENDING for retry.
   */
  async resetBatchForRetry(batchId: string): Promise<Batch> {
    return prisma.batch.update({
      where: { id: batchId },
      data: {
        status: "PENDING",
        retryCount: { increment: 1 },
        error: null,
      },
    });
  }

  /**
   * Update queue status.
   */
  async updateQueueStatus(queueId: string, status: QueueStatus): Promise<BatchQueue> {
    return prisma.batchQueue.update({
      where: { id: queueId },
      data: { status },
    });
  }
}

// Singleton export
export const batchQueueService = new BatchQueueService();
