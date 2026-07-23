import type { Router } from "express";
import type { ApiResponse, LLMProvider } from "@ai-novel/shared";
import { z } from "zod";
import { streamToSSE } from "../../../../llm/streaming";
import { validate } from "../../../../middleware/validate";
import { prisma } from "../../../../db/prisma";
import type { NovelApplicationServices } from "../../../../services/novel/application/NovelApplicationContracts";
import type { ChapterRuntimeCoordinator } from "../../../../services/novel/runtime/ChapterRuntimeCoordinator";
import { stepModuleRunner } from "../../../../orchestration/pipeline/workflowStepRuntime/StepModuleRunner";
import { DIRECTOR_EXECUTION_STEP_IDS } from "../../../../orchestration/pipeline/workflowStepRuntime/directorWorkflowStepIds";
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
    volumeId: z.string().optional(),
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

        // 在任务中心注册全局审校任务
        const scopeLabel = body.mode === "range"
          ? `第${body.startChapterOrder}-${body.endChapterOrder}章`
          : "当前卷";
        const task = await prisma.novelWorkflowTask.create({
          data: {
            novelId: id,
            lane: "global_review",
            title: `全局审校（${scopeLabel}）`,
            status: "running",
            progress: 0,
            currentStage: "global_review",
          },
        });

        try {
          const data = await globalReviewService.runGlobalReview(
            id,
            {
              mode: body.mode,
              startChapterOrder: body.startChapterOrder,
              endChapterOrder: body.endChapterOrder,
              volumeId: body.volumeId,
            },
            {
              provider: body.provider as LLMProvider | undefined,
              model: body.model,
              temperature: body.temperature,
            },
          );
          await prisma.novelWorkflowTask.update({
            where: { id: task.id },
            data: {
              status: "succeeded",
              progress: 1,
              checkpointSummary: `发现 ${data.issueCount} 个跨章节问题`,
              finishedAt: new Date(),
            },
          });
          res.status(200).json({
            success: true,
            data,
            message: "Global review completed.",
          } satisfies ApiResponse<typeof data>);
        } catch (reviewError) {
          await prisma.novelWorkflowTask.update({
            where: { id: task.id },
            data: {
              status: "failed",
              lastError: reviewError instanceof Error ? reviewError.message : String(reviewError),
              finishedAt: new Date(),
            },
          });
          throw reviewError;
        }
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
        const { status, fixDirection, verificationFeedback } = req.body as {
          status: string;
          fixDirection?: string;
          verificationFeedback?: string;
        };
        await globalReviewService.updateIssueStatus(id, issueId, status, fixDirection, verificationFeedback);
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

  // REQ-2060: 批量修复全局审校问题
  const batchRepairSchema = z.object({
    globalReviewIssueIds: z.array(z.string().trim().min(1)).min(1),
    userInstruction: z.string().trim().max(4000).optional(),
  });

  router.post(
    "/:id/global-review-issues/repair",
    validate({ params: idParamsSchema, body: batchRepairSchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const body = req.body as z.infer<typeof batchRepairSchema>;

        // 获取全局审校问题并按 primaryFixChapter 分组
        const issues = await globalReviewService.listGlobalReviewIssues(id);
        const targetIssues = issues.filter(
          (issue) => body.globalReviewIssueIds.includes(issue.id)
            && (issue.status === "pending" || issue.status === "acknowledged"),
        );

        if (targetIssues.length === 0) {
          res.status(200).json({
            success: true,
            data: { repairedChapterIds: [], repairedIssueIds: [] },
            message: "没有可修复的问题。",
          });
          return;
        }

        // 在任务中心注册批量修复任务
        const issueNumbers = targetIssues
          .filter((i) => i.issueNumber != null)
          .map((i) => `#G${String(i.issueNumber).padStart(3, "0")}`);
        const task = await prisma.novelWorkflowTask.create({
          data: {
            novelId: id,
            lane: "global_review",
            title: `批量修复（${targetIssues.length}个问题${issueNumbers.length > 0 ? `: ${issueNumbers.join(" ")}` : ""}）`,
            status: "running",
            progress: 0,
            currentStage: "global_review_batch_repair",
          },
        });

        // 将章节编号（如 ch_11）转换为实际章节 ID
        const chapterNumberToId = new Map<string, string>();
        const allChapters = await prisma.chapter.findMany({
          where: { novelId: id },
          select: { id: true, order: true },
        });
        for (const ch of allChapters) {
          chapterNumberToId.set(`ch_${ch.order}`, ch.id);
        }

        // 按 primaryFixChapter 分组（转换为实际章节 ID）
        const groups = new Map<string, string[]>();
        for (const issue of targetIssues) {
          const chapterNumber = issue.primaryFixChapter;
          if (!chapterNumber) continue;
          const chapterId = chapterNumberToId.get(chapterNumber) ?? chapterNumber;
          if (!groups.has(chapterId)) {
            groups.set(chapterId, []);
          }
          groups.get(chapterId)!.push(issue.id);
        }

        const repairedChapterIds: string[] = [];
        const repairedIssueIds: string[] = [];
        const totalGroups = groups.size;
        let completedGroups = 0;

        // 逐章节修复，并更新进度
        for (const [chapterId, issueIds] of groups) {
          try {
            // 查找当前章节的 order 用于进度显示
            const chapterInfo = allChapters.find((ch) => ch.id === chapterId);
            const chapterOrder = chapterInfo?.order ?? completedGroups + 1;
            const chapterIssueNums = issueIds
              .map((iid) => targetIssues.find((ti) => ti.id === iid))
              .filter((ti) => ti?.issueNumber != null)
              .map((ti) => `#G${String(ti!.issueNumber).padStart(3, "0")}`);

            await prisma.novelWorkflowTask.update({
              where: { id: task.id },
              data: {
                currentItemLabel: `正在修复第${chapterOrder}章 — 问题 ${chapterIssueNums.join(" ")}`,
                progress: completedGroups / totalGroups,
              },
            });

            const { stream, onDone } = await stepModuleRunner.runStep<{
              stream: AsyncIterable<import("@langchain/core/messages").BaseMessageChunk>;
              onDone: (fullContent: string, helpers: import("../../../../llm/streaming").StreamDoneHelpers) => Promise<void | import("../../../../llm/streaming").StreamDonePayload>;
            }>(
              DIRECTOR_EXECUTION_STEP_IDS.chapter_repair,
              {
                novelId: id,
                mode: "manual",
                targetType: "chapter",
                targetChapterId: chapterId,
                stepInput: {
                  globalReviewIssueIds: issueIds,
                  userInstruction: body.userInstruction,
                },
              },
            );

            // Consume the stream (required to trigger onDone which marks issues as fixed)
            let fullContent = "";
            for await (const chunk of stream) {
              const text = typeof chunk.content === "string" ? chunk.content : "";
              if (text) fullContent += text;
            }
            if (onDone) {
              // Provide a no-op writeFrame since we don't have SSE in batch context
              await onDone(fullContent, { writeFrame: () => {} });
            }

            repairedChapterIds.push(chapterId);
            repairedIssueIds.push(...issueIds);
          } catch (repairError) {
            // 单个章节修复失败不阻断其他章节
            console.error(`[BatchRepair] Chapter ${chapterId} repair failed:`, repairError instanceof Error ? repairError.message : repairError);
          }
          completedGroups++;
        }

        await prisma.novelWorkflowTask.update({
          where: { id: task.id },
          data: {
            status: "succeeded",
            progress: 1,
            checkpointSummary: `已修复 ${repairedChapterIds.length} 个章节，共 ${repairedIssueIds.length} 个问题`,
            finishedAt: new Date(),
          },
        });

        res.status(200).json({
          success: true,
          data: { repairedChapterIds, repairedIssueIds },
          message: `已触发 ${repairedChapterIds.length} 个章节的修复，共 ${repairedIssueIds.length} 个问题。`,
        } satisfies ApiResponse<{ repairedChapterIds: string[]; repairedIssueIds: string[] }>);
      } catch (error) {
        next(error);
      }
    },
  );
}
