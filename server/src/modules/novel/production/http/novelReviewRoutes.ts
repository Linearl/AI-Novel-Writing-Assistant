import type { Router } from "express";
import type { ApiResponse, LLMProvider } from "@ai-novel/shared";
import { z } from "zod";
import { streamToSSE } from "../../../../llm/streaming";
import { validate } from "../../../../middleware/validate";
import type { NovelApplicationServices } from "../../../../services/novel/application/NovelApplicationContracts";
import type { ChapterRuntimeCoordinator } from "../../../../services/novel/runtime/ChapterRuntimeCoordinator";
import { stepModuleRunner } from "../../../../services/novel/director/workflowStepRuntime/StepModuleRunner";
import { DIRECTOR_EXECUTION_STEP_IDS } from "../../../../services/novel/director/workflowStepRuntime/directorWorkflowStepIds";
import { chapterService } from "../../../../services/novel/ChapterService";
import { globalReviewService } from "../../../../services/audit/GlobalReviewService";

type RepairStreamResult = Awaited<ReturnType<ChapterRuntimeCoordinator["createRepairStream"]>>;

interface RegisterNovelReviewRoutesInput {
  router: Router;
  novelService: Pick<NovelApplicationServices,
    | "reviewChapter"
    | "auditChapter"
    | "listChapterAuditReports"
    | "resolveAuditIssues"
    | "getQualityReport"
  >;
  idParamsSchema: z.ZodType<{ id: string }>;
  chapterParamsSchema: z.ZodType<{ id: string; chapterId: string }>;
  auditIssueParamsSchema: z.ZodType<{ id: string; issueId: string }>;
  reviewSchema: z.ZodTypeAny;
  repairSchema: z.ZodTypeAny;
}

export function registerNovelReviewRoutes(input: RegisterNovelReviewRoutesInput): void {
  const {
    router,
    novelService,
    idParamsSchema,
    chapterParamsSchema,
    auditIssueParamsSchema,
    reviewSchema,
    repairSchema,
  } = input;

  router.post(
    "/:id/chapters/:chapterId/review",
    validate({ params: chapterParamsSchema, body: reviewSchema }),
    async (req, res, next) => {
      try {
        const { id, chapterId } = req.params as z.infer<typeof chapterParamsSchema>;
        const data = await novelService.reviewChapter(id, chapterId, req.body as z.infer<typeof reviewSchema>);
        res.status(200).json({
          success: true,
          data,
          message: "Chapter review completed.",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/chapters/:chapterId/audit/continuity",
    validate({ params: chapterParamsSchema, body: reviewSchema }),
    async (req, res, next) => {
      try {
        const { id, chapterId } = req.params as z.infer<typeof chapterParamsSchema>;
        const data = await novelService.auditChapter(id, chapterId, "continuity", req.body as z.infer<typeof reviewSchema>);
        res.status(200).json({
          success: true,
          data,
          message: "Continuity audit completed.",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/chapters/:chapterId/audit/character",
    validate({ params: chapterParamsSchema, body: reviewSchema }),
    async (req, res, next) => {
      try {
        const { id, chapterId } = req.params as z.infer<typeof chapterParamsSchema>;
        const data = await novelService.auditChapter(id, chapterId, "character", req.body as z.infer<typeof reviewSchema>);
        res.status(200).json({
          success: true,
          data,
          message: "Character audit completed.",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/chapters/:chapterId/audit/plot",
    validate({ params: chapterParamsSchema, body: reviewSchema }),
    async (req, res, next) => {
      try {
        const { id, chapterId } = req.params as z.infer<typeof chapterParamsSchema>;
        const data = await novelService.auditChapter(id, chapterId, "plot", req.body as z.infer<typeof reviewSchema>);
        res.status(200).json({
          success: true,
          data,
          message: "Plot audit completed.",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/chapters/:chapterId/audit/full",
    validate({ params: chapterParamsSchema, body: reviewSchema }),
    async (req, res, next) => {
      try {
        const { id, chapterId } = req.params as z.infer<typeof chapterParamsSchema>;
        const data = await novelService.auditChapter(id, chapterId, "full", req.body as z.infer<typeof reviewSchema>);
        res.status(200).json({
          success: true,
          data,
          message: "Full audit completed.",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/:id/chapters/:chapterId/audit-reports",
    validate({ params: chapterParamsSchema }),
    async (req, res, next) => {
      try {
        const { id, chapterId } = req.params as z.infer<typeof chapterParamsSchema>;
        const data = await novelService.listChapterAuditReports(id, chapterId);
        res.status(200).json({
          success: true,
          data,
          message: "Audit reports loaded.",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/audit-issues/:issueId/resolve",
    validate({ params: auditIssueParamsSchema }),
    async (req, res, next) => {
      try {
        const { id, issueId } = req.params as z.infer<typeof auditIssueParamsSchema>;
        const data = await novelService.resolveAuditIssues(id, [issueId]);
        res.status(200).json({
          success: true,
          data,
          message: "Audit issue resolved.",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/chapters/:chapterId/repair",
    validate({ params: chapterParamsSchema, body: repairSchema }),
    async (req, res, next) => {
      try {
        const { id, chapterId } = req.params as z.infer<typeof chapterParamsSchema>;
        const { stream, onDone } = await stepModuleRunner.runStep<RepairStreamResult>(
          DIRECTOR_EXECUTION_STEP_IDS.chapter_repair,
          {
            novelId: id,
            mode: "manual",
            targetType: "chapter",
            targetChapterId: chapterId,
            stepInput: req.body,
          },
        );
        await streamToSSE(res, stream, onDone);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get("/:id/quality-report", validate({ params: idParamsSchema }), async (req, res, next) => {
    try {
      const { id } = req.params as z.infer<typeof idParamsSchema>;
      const data = await novelService.getQualityReport(id);
      res.status(200).json({
        success: true,
        data,
        message: "Quality report loaded.",
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id/chapters/:chapterId/repair-versions", validate({ params: chapterParamsSchema }), async (req, res, next) => {
    try {
      const { id, chapterId } = req.params as z.infer<typeof chapterParamsSchema>;
      const data = {
        versions: await chapterService.listRepairVersions(id, chapterId),
      };
      res.status(200).json({
        success: true,
        data,
        message: "Repair versions loaded.",
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  });

  // ---------------------------------------------------------------------------
  // REQ-2050: 全局审校（跨章节）
  // ---------------------------------------------------------------------------

  const globalReviewSchema = z.object({
    mode: z.enum(["currentVolume", "range"]).default("currentVolume"),
    startChapterOrder: z.number().int().min(1).optional(),
    endChapterOrder: z.number().int().min(1).optional(),
    provider: z.string().optional(),
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
  });

  const globalReviewIssueParamsSchema = z.object({ id: z.string().min(1), issueId: z.string().min(1) });

  router.post(
    "/:id/global-review",
    validate({ params: idParamsSchema, body: globalReviewSchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const body = req.body as z.infer<typeof globalReviewSchema>;
        const data = await globalReviewService.runGlobalReview(
          id,
          {
            mode: body.mode,
            startChapterOrder: body.startChapterOrder,
            endChapterOrder: body.endChapterOrder,
          },
          {
            provider: body.provider as LLMProvider | undefined,
            model: body.model,
            temperature: body.temperature,
          },
        );
        res.status(200).json({
          success: true,
          data,
          message: "Global review completed.",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/:id/global-review-issues",
    validate({ params: idParamsSchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const status = typeof req.query.status === "string" ? req.query.status : undefined;
        const reviewRunId = typeof req.query.reviewRunId === "string" ? req.query.reviewRunId : undefined;
        const data = await globalReviewService.listGlobalReviewIssues(id, { status, reviewRunId });
        res.status(200).json({
          success: true,
          data,
          message: "Global review issues loaded.",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/global-review-issues/:issueId/status",
    validate({ params: globalReviewIssueParamsSchema }),
    async (req, res, next) => {
      try {
        const { id, issueId } = req.params as z.infer<typeof globalReviewIssueParamsSchema>;
        const { status } = req.body as { status: string };
        await globalReviewService.updateIssueStatus(id, issueId, status);
        res.status(200).json({
          success: true,
          data: null,
          message: "Global review issue status updated.",
        } satisfies ApiResponse<null>);
      } catch (error) {
        next(error);
      }
    },
  );

  // T3.2: 卷完成自动触发全局审校
  const autoTriggerSchema = z.object({
    volumePlanId: z.string().min(1),
    provider: z.string().optional(),
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
  });

  router.post(
    "/:id/global-review/auto-trigger",
    validate({ params: idParamsSchema, body: autoTriggerSchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const body = req.body as z.infer<typeof autoTriggerSchema>;
        const data = await globalReviewService.autoTriggerOnVolumeCompletion(
          id,
          body.volumePlanId,
          {
            provider: body.provider as LLMProvider | undefined,
            model: body.model,
            temperature: body.temperature,
          },
        );
        res.status(200).json({
          success: true,
          data,
          message: data
            ? "Auto-triggered global review completed."
            : "Volume not all chapters reviewed yet, auto-trigger skipped.",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );
}
