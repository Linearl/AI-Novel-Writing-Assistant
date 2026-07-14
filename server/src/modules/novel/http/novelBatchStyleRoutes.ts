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
  status: "pending" | "detecting" | "polishing" | "done" | "error" | "skipped" | "cancelled";
  detection?: StyleDetectionReport;
  rewriteContent?: string;
  error?: string;
}

interface BatchPolishJob {
  id: string;
  novelId: string;
  status: "running" | "done" | "cancelled" | "error";
  totalChapters: number;
  completedChapters: number;
  results: ChapterJobResult[];
  abortController: AbortController;
  startedAt: string;
  finishedAt?: string;
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
): Promise<Array<{ id: string; title: string; content: string }>> {
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
    }));
  }

  return chapters
    .filter((ch) => (ch.content ?? "").trim().length > 0)
    .map((ch) => ({
      id: ch.id,
      title: ch.title,
      content: ch.content ?? "",
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
  const chapters = await resolveChapterIds(job.novelId);

  // Filter to only chapters with content and that aren't cancelled
  const targetChapters = chapters.filter((ch) => ch.content.trim().length > 0);
  job.totalChapters = targetChapters.length;
  job.results = targetChapters.map((ch) => ({
    chapterId: ch.id,
    chapterTitle: ch.title,
    status: "pending" as const,
  }));

  for (let i = 0; i < targetChapters.length; i++) {
    if (job.abortController.signal.aborted) {
      // Mark remaining as cancelled
      for (let j = i; j < targetChapters.length; j++) {
        job.results[j].status = "cancelled";
      }
      job.status = "cancelled";
      job.finishedAt = new Date().toISOString();
      return;
    }

    const chapter = targetChapters[i];
    const resultIndex = job.results.findIndex((r) => r.chapterId === chapter.id);

    try {
      // Step 1: Detect
      job.results[resultIndex].status = "detecting";
      const detection = await styleDetectionService.check({
        content: chapter.content,
        novelId: job.novelId,
        chapterId: chapter.id,
        ...pickOptional(job),
      });

      if (job.abortController.signal.aborted) {
        job.results[resultIndex].status = "cancelled";
        continue;
      }

      job.results[resultIndex].detection = detection;

      // Step 2: Rewrite if there are violations
      if (detection.violations.length === 0) {
        job.results[resultIndex].status = "done";
        job.results[resultIndex].rewriteContent = chapter.content;
        job.completedChapters++;
        continue;
      }

      const autoRewriteIssues = detection.violations
        .filter((v) => v.canAutoRewrite)
        .map((v) => ({
          ruleName: v.ruleName,
          excerpt: v.excerpt,
          suggestion: v.suggestion,
        }));

      if (autoRewriteIssues.length === 0) {
        job.results[resultIndex].status = "done";
        job.results[resultIndex].rewriteContent = chapter.content;
        job.completedChapters++;
        continue;
      }

      job.results[resultIndex].status = "polishing";
      const rewriteResult = await styleRewriteService.rewrite({
        content: chapter.content,
        novelId: job.novelId,
        chapterId: chapter.id,
        ...pickOptional(job),
        issues: autoRewriteIssues,
      });

      job.results[resultIndex].rewriteContent = rewriteResult.content;
      job.results[resultIndex].status = "done";
      job.completedChapters++;
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      logger.error(`[batch-polish] chapter ${chapter.id} failed`, error);
      job.results[resultIndex].status = "error";
      job.results[resultIndex].error = message;
      job.completedChapters++;
    }
  }

  job.status = "done";
  job.finishedAt = new Date().toISOString();
}

function pickOptional(job: BatchPolishJob): {
  styleProfileId?: string;
  taskStyleProfileId?: string;
  previewAntiAiRuleIds?: string[];
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
} {
  // We store config in the job itself; use the first result's config
  // Actually we need to pass config through. Let's store it on the job.
  return (job as BatchPolishJob & { config?: Record<string, unknown> }).config ?? {};
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

      const job: BatchPolishJob & { config?: Record<string, unknown> } = {
        id: jobId,
        novelId: id,
        status: "running",
        totalChapters: 0,
        completedChapters: 0,
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

      batchJobs.set(jobId, job as BatchPolishJob);

      // Run in background — do not await
      void runBatchPolishJob(job as BatchPolishJob).catch((error) => {
        logger.error(`[batch-polish] job ${jobId} failed unexpectedly`, error);
        (job as BatchPolishJob).status = "error";
        (job as BatchPolishJob).finishedAt = new Date().toISOString();
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
        percent:
          job.totalChapters > 0
            ? Math.round((job.completedChapters / job.totalChapters) * 100)
            : 0,
        results: job.results.map((r) => ({
          chapterId: r.chapterId,
          chapterTitle: r.chapterTitle,
          status: r.status,
          violationCount: r.detection?.violations.length ?? 0,
          riskScore: r.detection?.riskScore ?? null,
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
