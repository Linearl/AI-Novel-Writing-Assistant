import { Router } from "express";
import type { ApiResponse, LLMProvider, StyleDetectionReport } from "@ai-novel/shared";
import { z } from "zod";
import { llmProviderSchema } from "../../../llm/providerSchema";
import { validate } from "../../../middleware/validate";
import { StyleDetectionService } from "../../../services/styleEngine/StyleDetectionService";
import { StyleRewriteService } from "../../../services/styleEngine/StyleRewriteService";
import { chapterService } from "../../../services/novel/ChapterService";
import { logger } from "../../../services/logging/LoggerService";

const router = Router();
const styleDetectionService = new StyleDetectionService();
const styleRewriteService = new StyleRewriteService();

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const novelIdParamsSchema = z.object({ id: z.string().trim().min(1) });

const batchDetectSchema = z.object({
  chapterIds: z.array(z.string().trim().min(1)).optional(),
  styleProfileId: z.string().trim().optional(),
  taskStyleProfileId: z.string().trim().optional(),
  previewAntiAiRuleIds: z.array(z.string().trim().min(1)).optional(),
  provider: llmProviderSchema.optional(),
  model: z.string().trim().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

const batchPolishSchema = z.object({
  chapterIds: z.array(z.string().trim().min(1)).optional(),
  styleProfileId: z.string().trim().optional(),
  taskStyleProfileId: z.string().trim().optional(),
  previewAntiAiRuleIds: z.array(z.string().trim().min(1)).optional(),
  riskThreshold: z.number().min(0).max(100).default(35),
  autoApply: z.boolean().default(true),
  provider: llmProviderSchema.optional(),
  model: z.string().trim().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

const jobParamsSchema = z.object({
  id: z.string().trim().min(1),
  jobId: z.string().trim().min(1),
});

// ---------------------------------------------------------------------------
// Background job store
// ---------------------------------------------------------------------------

interface ChapterJobResult {
  chapterId: string;
  chapterTitle: string;
  chapterOrder: number;
  status: "pending" | "detecting" | "polishing" | "done" | "error" | "skipped" | "cancelled";
  detection?: StyleDetectionReport;
  rewriteContent?: string;
  originalRiskScore?: number;
  newRiskScore?: number;
  issuesFixed?: number;
  error?: string;
  skippedReason?: string;
}

interface BatchPolishJob {
  id: string;
  novelId: string;
  chapterIds?: string[];
  riskThreshold: number;
  autoApply: boolean;
  status: "running" | "done" | "cancelled" | "error";
  totalChapters: number;
  completedChapters: number;
  rewrittenChapters: number;
  skippedChapters: number;
  failedChapters: number;
  results: ChapterJobResult[];
  abortController: AbortController;
  startedAt: string;
  finishedAt?: string;
  config: Record<string, unknown>;
}

const batchJobs = new Map<string, BatchPolishJob>();

function generateJobId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `bsp-${timestamp}-${random}`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resolveChapterIds(
  novelId: string,
  chapterIds?: string[],
): Promise<Array<{ id: string; title: string; content: string; order: number }>> {
  const chapters = await chapterService.listChapters(novelId);
  if (chapters.length === 0) {
    throw new Error("当前小说还没有章节。");
  }

  if (chapterIds && chapterIds.length > 0) {
    const idSet = new Set(chapterIds);
    const matched = chapters.filter((ch) => idSet.has(ch.id));
    if (matched.length === 0) {
      throw new Error("指定的章节不存在。");
    }
    return matched.map((ch) => ({
      id: ch.id,
      title: ch.title,
      content: ch.content ?? "",
      order: ch.order,
    }));
  }

  return chapters
    .filter((ch) => (ch.content ?? "").trim().length > 0)
    .map((ch) => ({
      id: ch.id,
      title: ch.title,
      content: ch.content ?? "",
      order: ch.order,
    }));
}

// ---------------------------------------------------------------------------
// T1.1: Batch Detection
// ---------------------------------------------------------------------------

router.post(
  "/:id/batch-style-detect",
  validate({ params: novelIdParamsSchema, body: batchDetectSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as z.infer<typeof novelIdParamsSchema>;
      const body = req.body as z.infer<typeof batchDetectSchema>;

      const chapters = await resolveChapterIds(id, body.chapterIds);

      const results: Array<{
        chapterId: string;
        chapterTitle: string;
        detection: StyleDetectionReport;
      }> = [];

      for (const chapter of chapters) {
        const detection = await styleDetectionService.check({
          content: chapter.content,
          novelId: id,
          chapterId: chapter.id,
          styleProfileId: body.styleProfileId,
          taskStyleProfileId: body.taskStyleProfileId,
          previewAntiAiRuleIds: body.previewAntiAiRuleIds,
          provider: body.provider as LLMProvider | undefined,
          model: body.model,
          temperature: body.temperature,
        });
        results.push({
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          detection,
        });
      }

      const totalViolations = results.reduce(
        (sum, r) => sum + r.detection.violations.length,
        0,
      );
      const avgRiskScore =
        results.length > 0
          ? Math.round(
              results.reduce((sum, r) => sum + r.detection.riskScore, 0) / results.length,
            )
          : 0;

      const data = {
        novelId: id,
        chapterCount: results.length,
        totalViolations,
        avgRiskScore,
        results,
      };

      res.status(200).json({
        success: true,
        data,
        message: `批量检测完成，共检测 ${results.length} 章，发现 ${totalViolations} 处问题。`,
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// T1.2: Batch Polish (background job)
// ---------------------------------------------------------------------------

async function runBatchPolishJob(job: BatchPolishJob): Promise<void> {
  // 使用 job 中存储的 chapterIds（透传请求参数）
  const chapters = await resolveChapterIds(job.novelId, job.chapterIds);

  // 先对所有章节做一次检测，获取风险分
  const detectResults: Array<{
    chapter: { id: string; title: string; content: string; order: number };
    detection: StyleDetectionReport;
  }> = [];

  for (const chapter of chapters) {
    if (job.abortController.signal.aborted) {
      job.status = "cancelled";
      job.finishedAt = new Date().toISOString();
      return;
    }
    try {
      const detection = await styleDetectionService.check({
        content: chapter.content,
        novelId: job.novelId,
        chapterId: chapter.id,
        ...(pickOptional(job) as object),
      } as Parameters<typeof styleDetectionService.check>[0]);
      detectResults.push({ chapter, detection });
    } catch {
      // 检测失败的章节跳过
    }
  }

  // 按风险分降序排序：高风险优先处理
  detectResults.sort((a, b) => b.detection.riskScore - a.detection.riskScore);

  job.totalChapters = detectResults.length;
  job.results = detectResults.map(({ chapter, detection }) => ({
    chapterId: chapter.id,
    chapterTitle: chapter.title,
    chapterOrder: chapter.order,
    status: "pending" as const,
    detection,
    originalRiskScore: detection.riskScore,
  }));

  for (let i = 0; i < detectResults.length; i++) {
    if (job.abortController.signal.aborted) {
      for (let j = i; j < detectResults.length; j++) {
        job.results[j].status = "cancelled";
      }
      job.status = "cancelled";
      job.finishedAt = new Date().toISOString();
      return;
    }

    const { chapter, detection } = detectResults[i];
    const resultIndex = job.results.findIndex((r) => r.chapterId === chapter.id);

    try {
      // 风险分低于阈值 → 跳过润色
      if (detection.riskScore < job.riskThreshold) {
        job.results[resultIndex].status = "skipped";
        job.results[resultIndex].skippedReason = `风险分 ${detection.riskScore} < 阈值 ${job.riskThreshold}`;
        job.completedChapters++;
        job.skippedChapters++;
        continue;
      }

      // 无可自动修复的问题 → 跳过
      const autoRewriteIssues = detection.violations
        .filter((v) => v.canAutoRewrite)
        .map((v) => ({
          ruleName: v.ruleName,
          excerpt: v.excerpt,
          suggestion: v.suggestion,
        }));

      if (autoRewriteIssues.length === 0) {
        job.results[resultIndex].status = "skipped";
        job.results[resultIndex].skippedReason = "无可自动修复的风格问题";
        job.completedChapters++;
        job.skippedChapters++;
        continue;
      }

      job.results[resultIndex].status = "polishing";
      const rewriteResult = await styleRewriteService.rewrite({
        content: chapter.content,
        novelId: job.novelId,
        chapterId: chapter.id,
        ...(pickOptional(job) as object),
        issues: autoRewriteIssues,
      } as Parameters<typeof styleRewriteService.rewrite>[0]);

      job.results[resultIndex].rewriteContent = rewriteResult.content;
      job.results[resultIndex].issuesFixed = autoRewriteIssues.length;

      // 持久化：autoApply=true 时直接写回数据库
      if (job.autoApply && rewriteResult.content !== chapter.content) {
        await chapterService.updateChapter(job.novelId, chapter.id, {
          content: rewriteResult.content,
        });

        // 重新检测新内容，获取 newRiskScore
        try {
          const postDetection = await styleDetectionService.check({
            content: rewriteResult.content,
            novelId: job.novelId,
            chapterId: chapter.id,
            ...(pickOptional(job) as object),
          } as Parameters<typeof styleDetectionService.check>[0]);
          job.results[resultIndex].newRiskScore = postDetection.riskScore;
          job.results[resultIndex].detection = postDetection;
        } catch {
          // post-detect 失败不影响主流程
        }

        job.rewrittenChapters++;
      }

      job.results[resultIndex].status = "done";
      job.completedChapters++;
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      logger.error(`[batch-polish] chapter ${chapter.id} failed`, error);
      job.results[resultIndex].status = "error";
      job.results[resultIndex].error = message;
      job.completedChapters++;
      job.failedChapters++;
    }
  }

  job.status = "done";
  job.finishedAt = new Date().toISOString();
}

function pickOptional(job: BatchPolishJob): Record<string, unknown> {
  return job.config ?? {};
}

router.post(
  "/:id/batch-style-polish",
  validate({ params: novelIdParamsSchema, body: batchPolishSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as z.infer<typeof novelIdParamsSchema>;
      const body = req.body as z.infer<typeof batchPolishSchema>;

      const jobId = generateJobId();
      const abortController = new AbortController();

      const job: BatchPolishJob = {
        id: jobId,
        novelId: id,
        chapterIds: body.chapterIds,
        riskThreshold: body.riskThreshold ?? 35,
        autoApply: body.autoApply ?? true,
        status: "running",
        totalChapters: 0,
        completedChapters: 0,
        rewrittenChapters: 0,
        skippedChapters: 0,
        failedChapters: 0,
        results: [],
        abortController,
        startedAt: new Date().toISOString(),
        config: {
          styleProfileId: body.styleProfileId,
          taskStyleProfileId: body.taskStyleProfileId,
          previewAntiAiRuleIds: body.previewAntiAiRuleIds,
          provider: body.provider,
          model: body.model,
          temperature: body.temperature,
        },
      };

      batchJobs.set(jobId, job);

      // Run in background — do not await
      void runBatchPolishJob(job).catch((error) => {
        logger.error(`[batch-polish] job ${jobId} failed unexpectedly`, error);
        job.status = "error";
        job.finishedAt = new Date().toISOString();
      });

      const data = { jobId };
      res.status(202).json({
        success: true,
        data,
        message: "批量润色任务已启动。",
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// T1.3: Progress Query
// ---------------------------------------------------------------------------

router.get(
  "/:id/batch-style-polish/:jobId/progress",
  validate({ params: jobParamsSchema }),
  async (req, res, next) => {
    try {
      const { id, jobId } = req.params as z.infer<typeof jobParamsSchema>;
      const job = batchJobs.get(jobId);

      if (!job || job.novelId !== id) {
        res.status(404).json({
          success: false,
          error: "任务不存在。",
        } satisfies ApiResponse<null>);
        return;
      }

      const data = {
        jobId: job.id,
        status: job.status,
        totalChapters: job.totalChapters,
        completedChapters: job.completedChapters,
        rewrittenChapters: job.rewrittenChapters,
        skippedChapters: job.skippedChapters,
        failedChapters: job.failedChapters,
        riskThreshold: job.riskThreshold,
        autoApply: job.autoApply,
        percent:
          job.totalChapters > 0
            ? Math.round((job.completedChapters / job.totalChapters) * 100)
            : 0,
        results: job.results.map((r) => ({
          chapterId: r.chapterId,
          chapterTitle: r.chapterTitle,
          chapterOrder: r.chapterOrder,
          status: r.status,
          violationCount: r.detection?.violations.length ?? 0,
          riskScore: r.detection?.riskScore ?? r.originalRiskScore ?? null,
          originalRiskScore: r.originalRiskScore ?? null,
          newRiskScore: r.newRiskScore ?? null,
          issuesFixed: r.issuesFixed ?? 0,
          skippedReason: r.skippedReason,
          error: r.error,
        })),
        startedAt: job.startedAt,
        finishedAt: job.finishedAt,
      };

      res.status(200).json({
        success: true,
        data,
        message: "任务进度查询成功。",
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// T1.4: Cancel
// ---------------------------------------------------------------------------

router.post(
  "/:id/batch-style-polish/:jobId/cancel",
  validate({ params: jobParamsSchema }),
  async (req, res, next) => {
    try {
      const { id, jobId } = req.params as z.infer<typeof jobParamsSchema>;
      const job = batchJobs.get(jobId);

      if (!job || job.novelId !== id) {
        res.status(404).json({
          success: false,
          error: "任务不存在。",
        } satisfies ApiResponse<null>);
        return;
      }

      if (job.status !== "running") {
        res.status(400).json({
          success: false,
          error: "任务已完成或已取消，无法再次取消。",
        } satisfies ApiResponse<null>);
        return;
      }

      job.abortController.abort();

      res.status(200).json({
        success: true,
        data: null,
        message: "任务取消请求已发送，正在优雅停止。",
      } satisfies ApiResponse<null>);
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// Cleanup old jobs (keep last 50)
// ---------------------------------------------------------------------------

function cleanupOldJobs(): void {
  const jobs = Array.from(batchJobs.values());
  if (jobs.length <= 50) return;
  const sorted = jobs
    .filter((j) => j.status !== "running")
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
  for (const job of sorted.slice(50)) {
    batchJobs.delete(job.id);
  }
}

setInterval(cleanupOldJobs, 10 * 60 * 1000).unref();

export default router;
