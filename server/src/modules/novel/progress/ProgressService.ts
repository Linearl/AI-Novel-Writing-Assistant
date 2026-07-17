import { prisma } from "@/db/prisma";
import {
  ChapterExecutionProgressInspector,
  type ChapterExecutionProgressSummary,
} from "@/services/novel/director/runtime/utils/ChapterExecutionProgressInspector";

// ──────────────────── 进度类型定义 ────────────────────

export type ProgressTargetType = "novel" | "job" | "workflow";

export interface ProgressCurrentChapter {
  index: number;
  title: string | null;
  status: "pending" | "running" | "completed" | "failed" | "needs_repair";
}

export interface ProgressBatchInfo {
  batchSize: number;
  currentBatch: number;
  totalBatches: number;
}

export interface ProgressInfo {
  targetId: string;
  targetType: ProgressTargetType;
  totalChapters: number;
  completedChapters: number;
  progressPercent: number;
  currentChapter: ProgressCurrentChapter;
  estimatedRemainingMinutes: number;
  elapsedMinutes: number;
  failedCount: number;
  draftedCount: number;
  needsRepairCount: number;
  activeChapterOrder: number | null;
  batchInfo: ProgressBatchInfo | null;
  phase: string | null;
}

export interface ProgressConfig {
  defaultMinutesPerChapter: number;
  recentSampleCount: number;
}

const DEFAULT_CONFIG: ProgressConfig = {
  defaultMinutesPerChapter: 2,
  recentSampleCount: 10,
};

/**
 * 进度聚合服务 —— 聚合多种来源的进度数据，
 * 计算百分比、剩余时间估算，输出统一 ProgressInfo。
 */
export class ProgressService {
  private readonly config: ProgressConfig;
  private readonly chapterInspector: ChapterExecutionProgressInspector;

  constructor(config: Partial<ProgressConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.chapterInspector = new ChapterExecutionProgressInspector();
  }

  // ─── 核心入口 ───

  /**
   * 获取小说级综合进度，聚合章节生成状态与活跃任务。
   */
  async getNovelProgress(novelId: string, options?: {
    targetChapterCount?: number;
  }): Promise<ProgressInfo> {
    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
      select: {
        id: true,
        title: true,
        createdAt: true,
        chapters: { select: { id: true, order: true }, orderBy: { order: "asc" } },
        generationJobs: { orderBy: { createdAt: "desc" }, take: 1 },
        workflowTasks: {
          where: { status: { in: ["queued", "running", "waiting_approval"] } },
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: { id: true, status: true, startedAt: true, progress: true, currentStage: true },
        },
      },
    });

    if (!novel) {
      throw new Error("小说不存在。");
    }

    const chapterProgress = await this.safeInspectNovel(novelId);
    const targetChapterCount = options?.targetChapterCount
      ?? (novel.chapters.length > 0 ? novel.chapters.length : 20);
    const completedChapters = chapterProgress?.completedChapters ?? 0;
    const draftedCount = chapterProgress?.draftedChapterCount ?? 0;
    const needsRepairCount = chapterProgress?.needsRepairChapters ?? 0;
    const progressPercent = this.calcPercent(targetChapterCount > 0 ? completedChapters / targetChapterCount : 0);
    const elapsedMinutes = this.calcElapsedMinutes(novel.createdAt, "novel", novel.workflowTasks[0]?.startedAt);
    const estimatedRemainingMinutes = await this.estimateRemainingTime(novelId, targetChapterCount, completedChapters);

    const activeTask = novel.workflowTasks[0] ?? null;
    const currentChapter = chapterProgress?.currentChapterOrder
      ? {
          index: chapterProgress.currentChapterOrder,
          title: await this.getChapterTitle(novelId, chapterProgress.currentChapterOrder),
          status: chapterProgress.needsRepairChapters > 0
            ? ("needs_repair" as const)
            : ("running" as const),
        }
      : this.buildPendingChapter(novel.chapters.length);

    return {
      targetId: novelId,
      targetType: "novel",
      totalChapters: targetChapterCount,
      completedChapters,
      progressPercent,
      currentChapter,
      estimatedRemainingMinutes,
      elapsedMinutes,
      failedCount: 0,
      draftedCount,
      needsRepairCount,
      activeChapterOrder: chapterProgress?.activeChapterOrder ?? chapterProgress?.currentChapterOrder ?? null,
      batchInfo: this.buildBatchInfoForNovel(novel.chapters.length, targetChapterCount),
      phase: activeTask?.currentStage ?? (completedChapters < targetChapterCount ? "章节生成中" : "完成"),
    };
  }

  /**
   * 获取 GenerationJob 的进度。
   */
  async getJobProgress(jobId: string): Promise<ProgressInfo> {
    const job = await prisma.generationJob.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        novelId: true,
        status: true,
        progress: true,
        completedCount: true,
        totalCount: true,
        currentItemLabel: true,
        currentStage: true,
        startedAt: true,
        createdAt: true,
      },
    });

    if (!job) {
      throw new Error("任务不存在。");
    }

    const chapterProgress = await this.safeInspectNovel(job.novelId);

    const totalChapters = job.totalCount > 0 ? job.totalCount : (chapterProgress?.totalChapters ?? 0);
    const completedChapters = chapterProgress?.completedChapters ?? job.completedCount;
    const draftedCount = chapterProgress?.draftedChapterCount ?? 0;
    const needsRepairCount = chapterProgress?.needsRepairChapters ?? 0;
    const progressPercent = this.calcPercent(totalChapters > 0 ? completedChapters / totalChapters : 0);
    const elapsedMinutes = this.calcElapsedMinutes(job.createdAt, "job", job.startedAt);
    const remainingChapters = totalChapters - completedChapters;
    const estimatedRemainingMinutes = remainingChapters > 0
      ? await this.estimateRemainingTime(job.novelId, totalChapters, completedChapters)
      : 0;

    const currentChapter = chapterProgress?.currentChapterOrder
      ? {
          index: chapterProgress.currentChapterOrder,
          title: await this.getChapterTitle(job.novelId, chapterProgress.currentChapterOrder),
          status: chapterProgress.needsRepairChapters > 0
            ? ("needs_repair" as const)
            : ("running" as const),
        }
      : {
          index: completedChapters + 1,
          title: null,
          status: job.status === "running" ? ("running" as const) : ("pending" as const),
        };

    return {
      targetId: jobId,
      targetType: "job",
      totalChapters,
      completedChapters,
      progressPercent,
      currentChapter,
      estimatedRemainingMinutes,
      elapsedMinutes,
      failedCount: 0,
      draftedCount,
      needsRepairCount,
      activeChapterOrder: chapterProgress?.activeChapterOrder ?? chapterProgress?.currentChapterOrder ?? null,
      batchInfo: totalChapters > 0 ? {
        batchSize: 0,
        currentBatch: Math.min(Math.floor(completedChapters / Math.max(1, totalChapters)) + 1, totalChapters),
        totalBatches: Math.ceil(totalChapters / Math.max(1, totalChapters)),
      } : null,
      phase: job.currentStage ?? (job.status === "succeeded" ? "完成" : "任务执行中"),
    };
  }

  /**
   * 获取 NovelWorkflowTask 的进度。
   */
  async getWorkflowProgress(taskId: string): Promise<ProgressInfo> {
    const task = await prisma.novelWorkflowTask.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        novelId: true,
        status: true,
        progress: true,
        currentStage: true,
        currentItemLabel: true,
        startedAt: true,
        createdAt: true,
      },
    });

    if (!task) {
      throw new Error("工作流任务不存在。");
    }

    const novelId = task.novelId;
    if (!novelId) {
      // 无关联小说时返回基于任务本身的进度
      const progressPercent = Math.round((task.progress ?? 0) * 100);
      return {
        targetId: taskId,
        targetType: "workflow",
        totalChapters: 0,
        completedChapters: 0,
        progressPercent,
        currentChapter: { index: 0, title: null, status: "pending" },
        estimatedRemainingMinutes: 0,
        elapsedMinutes: this.calcElapsedMinutes(task.createdAt, "workflow", task.startedAt),
        failedCount: 0,
        draftedCount: 0,
        needsRepairCount: 0,
        activeChapterOrder: null,
        batchInfo: null,
        phase: task.currentStage ?? task.status,
      };
    }

    const chapterProgress = await this.safeInspectNovel(novelId);
    const totalChapters = chapterProgress?.totalChapters ?? 0;
    const completedChapters = chapterProgress?.completedChapters ?? 0;
    const draftedCount = chapterProgress?.draftedChapterCount ?? 0;
    const needsRepairCount = chapterProgress?.needsRepairChapters ?? 0;
    const progressPercent = this.calcPercent(totalChapters > 0 ? completedChapters / totalChapters : task.progress ?? 0);
    const elapsedMinutes = this.calcElapsedMinutes(task.createdAt, "workflow", task.startedAt);
    const estimatedRemainingMinutes = totalChapters > 0
      ? await this.estimateRemainingTime(novelId, totalChapters, completedChapters)
      : 0;

    const currentChapter = chapterProgress?.currentChapterOrder
      ? {
          index: chapterProgress.currentChapterOrder,
          title: await this.getChapterTitle(novelId, chapterProgress.currentChapterOrder),
          status: chapterProgress.needsRepairChapters > 0
            ? ("needs_repair" as const)
            : ("running" as const),
        }
      : {
          index: completedChapters + 1,
          title: null,
          status: task.status === "running" ? ("running" as const) : ("pending" as const),
        };

    return {
      targetId: taskId,
      targetType: "workflow",
      totalChapters,
      completedChapters,
      progressPercent,
      currentChapter,
      estimatedRemainingMinutes,
      elapsedMinutes,
      failedCount: 0,
      draftedCount,
      needsRepairCount,
      activeChapterOrder: chapterProgress?.activeChapterOrder ?? chapterProgress?.currentChapterOrder ?? null,
      batchInfo: null,
      phase: task.currentStage ?? task.status,
    };
  }

  // ─── 进度计算 ───

  private calcPercent(ratio: number): number {
    if (!Number.isFinite(ratio)) return 0;
    return Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  }

  /**
   * 根据最近完成的章节执行时间估算剩余时间（分钟）。
   */
  async estimateRemainingTime(
    novelId: string,
    totalChapters: number,
    completedChapters: number,
  ): Promise<number> {
    const remaining = totalChapters - completedChapters;
    if (remaining <= 0) return 0;

    const avgMinutes = await this.getAverageChapterTime(novelId);
    return Math.round(remaining * avgMinutes);
  }

  /**
   * 获取最近 N 章的平均执行时间（分钟）。
   */
  private async getAverageChapterTime(novelId: string): Promise<number> {
    // 从已完成的 GenerationJob 中提取执行时间数据
    const completedJobs = await prisma.generationJob.findMany({
      where: {
        novelId,
        status: "succeeded",
        startedAt: { not: null },
        finishedAt: { not: null },
      },
      orderBy: { finishedAt: "desc" },
      take: this.config.recentSampleCount,
      select: {
        startedAt: true,
        finishedAt: true,
        completedCount: true,
      },
    });

    if (completedJobs.length === 0) {
      return this.config.defaultMinutesPerChapter;
    }

    let totalTimeMs = 0;
    let totalChapters = 0;

    for (const job of completedJobs) {
      if (job.startedAt && job.finishedAt && job.completedCount > 0) {
        const jobDurationMs = job.finishedAt.getTime() - job.startedAt.getTime();
        totalTimeMs += jobDurationMs;
        totalChapters += job.completedCount;
      }
    }

    if (totalChapters === 0) {
      return this.config.defaultMinutesPerChapter;
    }

    const avgMinutes = totalTimeMs / totalChapters / 60000;
    // 上下限钳制，避免极端值
    return Math.max(0.5, Math.min(avgMinutes, 30));
  }

  // ─── 辅助方法 ───

  private async safeInspectNovel(novelId: string): Promise<ChapterExecutionProgressSummary | null> {
    try {
      return await this.chapterInspector.inspectNovel(novelId);
    } catch {
      return null;
    }
  }

  private async getChapterTitle(novelId: string, order: number): Promise<string | null> {
    try {
      const chapter = await prisma.chapter.findFirst({
        where: { novelId, order },
        select: { title: true },
      });
      return chapter?.title ?? null;
    } catch {
      return null;
    }
  }

  private calcElapsedMinutes(
    createdAt: Date,
    type: ProgressTargetType,
    startedAt?: Date | string | null,
  ): number {
    const start = (startedAt instanceof Date ? startedAt : startedAt ? new Date(startedAt) : null) ?? createdAt;
    const now = Date.now();
    return Math.max(0, Math.round((now - start.getTime()) / 60000));
  }

  private buildPendingChapter(chapterCount: number): ProgressCurrentChapter {
    return {
      index: chapterCount > 0 ? chapterCount + 1 : 0,
      title: null,
      status: "pending",
    };
  }

  private buildBatchInfoForNovel(
    chapterCount: number,
    targetChapterCount: number,
  ): ProgressBatchInfo | null {
    if (targetChapterCount <= 0) return null;
    const batchSize = Math.max(1, Math.min(chapterCount, targetChapterCount));
    return {
      batchSize,
      currentBatch: chapterCount > 0 ? Math.ceil(chapterCount / Math.max(1, batchSize)) : 0,
      totalBatches: Math.ceil(targetChapterCount / Math.max(1, batchSize)),
    };
  }
}

export const progressService = new ProgressService();
