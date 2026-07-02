import type { ReviewIssue } from "@ai-novel/shared/types/novel";
import { prisma } from "../../db/prisma";
import { novelEventBus } from "../../events";
import { ChapterPlanJITService } from "./planning/ChapterPlanJITService";
import { NovelVolumeService } from "./volume/NovelVolumeService";
import { runWithLlmUsageTracking } from "../../llm/usageTracking";
import { ChapterRuntimeCoordinator } from "./runtime/ChapterRuntimeCoordinator";
import { isChapterEmptyContentError } from "./runtime/chapterEmptyContentError";
import {
  logPipelineError,
  logPipelineInfo,
  logPipelineWarn,
  normalizeScore,
  type PipelinePayload,
  type PipelineRunOptions,
} from "./novelCoreShared";
import { createQualityReport } from "./novelCoreReviewService";
import { chapterQualityLoopService } from "./quality/ChapterQualityLoopService";
import { buildPipelineCurrentItemLabel, buildPipelineStageProgress, parsePipelinePayload as parsePipelineJobPayload, stringifyPipelinePayload as stringifyPipelineJobPayload, type PipelineActiveStage } from "./pipelineJobState";
import {
  PIPELINE_HEARTBEAT_INTERVAL_MS,
  buildEmptyChapterDetail,
  buildSkipCompletedChapterWhere,
  clampPipelineMaxRetries,
} from "./novelCorePipelineHelpers";

export interface PipelineExecutorDeps {
  updateJobSafe(jobId: string, data: {
    status?: "queued" | "running" | "succeeded" | "failed" | "cancelled";
    progress?: number;
    completedCount?: number;
    retryCount?: number;
    pendingManualRecovery?: boolean;
    heartbeatAt?: Date | null;
    currentStage?: string | null;
    currentItemKey?: string | null;
    currentItemLabel?: string | null;
    cancelRequestedAt?: Date | null;
    error?: string | null;
    startedAt?: Date | null;
    finishedAt?: Date | null;
    payload?: string | null;
  }): Promise<void>;
  ensurePipelineNotCancelled(jobId: string): Promise<void>;
  chapterRuntimeCoordinator: ChapterRuntimeCoordinator;
}

export async function executePipeline(
  deps: PipelineExecutorDeps,
  jobId: string,
  novelId: string,
  options: PipelineRunOptions,
): Promise<void> {
  const maxRetries = clampPipelineMaxRetries(options.maxRetries);
  const qualityThreshold = options.qualityThreshold ?? 75;
  const existingJob = await prisma.generationJob.findUnique({
    where: { id: jobId },
    select: {
      startedAt: true,
      completedCount: true,
      totalCount: true,
      retryCount: true,
      payload: true,
    },
  });
  const persistedPayload = parsePipelineJobPayload(existingJob?.payload);
  const runtimePayload: PipelinePayload = {
    provider: persistedPayload.provider ?? options.provider ?? "deepseek",
    model: persistedPayload.model ?? options.model ?? "",
    temperature: persistedPayload.temperature ?? options.temperature ?? 0.8,
    controlPolicy: persistedPayload.controlPolicy ?? options.controlPolicy,
    workflowTaskId: persistedPayload.workflowTaskId ?? options.workflowTaskId,
    taskStyleProfileId: persistedPayload.taskStyleProfileId ?? options.taskStyleProfileId,
    maxRetries: clampPipelineMaxRetries(persistedPayload.maxRetries ?? options.maxRetries),
    runMode: persistedPayload.runMode ?? options.runMode ?? "fast",
    autoReview: persistedPayload.autoReview ?? options.autoReview ?? true,
    autoRepair: persistedPayload.autoRepair ?? options.autoRepair ?? true,
    skipCompleted: persistedPayload.skipCompleted ?? options.skipCompleted ?? true,
    qualityThreshold: persistedPayload.qualityThreshold ?? options.qualityThreshold,
    repairMode: persistedPayload.repairMode ?? options.repairMode ?? "light_repair",
    artifactSyncMode: persistedPayload.artifactSyncMode ?? options.artifactSyncMode ?? "adaptive",
  };
  const directorTelemetryTask = runtimePayload.workflowTaskId
    ? await prisma.novelWorkflowTask.findUnique({
      where: { id: runtimePayload.workflowTaskId },
      select: {
        lane: true,
        directorRun: {
          select: { id: true },
        },
      },
    }).catch(() => null)
    : null;
  const shouldRecordDirectorTelemetry = directorTelemetryTask?.lane === "auto_director";
  let totalRetryCount = Math.max(existingJob?.retryCount ?? 0, 0);
  const qualityAlertDetails = [...(persistedPayload.qualityAlertDetails ?? [])];
  const replanAlertDetails = [...(persistedPayload.replanAlertDetails ?? [])];
  const recoverableRepairDetails = [...(persistedPayload.recoverableRepairDetails ?? [])];

  try {
    await runWithLlmUsageTracking({
      generationJobId: jobId,
      workflowTaskId: runtimePayload.workflowTaskId,
      directorTelemetry: shouldRecordDirectorTelemetry,
      novelId: shouldRecordDirectorTelemetry ? novelId : null,
      directorRunId: shouldRecordDirectorTelemetry
        ? directorTelemetryTask?.directorRun?.id ?? runtimePayload.workflowTaskId ?? null
        : null,
    }, async () => {
      await deps.updateJobSafe(jobId, {
        status: "running",
        pendingManualRecovery: false,
        startedAt: existingJob?.startedAt ?? new Date(),
        heartbeatAt: new Date(),
        currentStage: "generating_chapters",
      });
      logPipelineInfo("任务开始执行", {
        jobId,
        novelId,
        range: `${options.startOrder}-${options.endOrder}`,
        maxRetries,
      });

      const novel = await prisma.novel.findUnique({ where: { id: novelId } });
      let chapters = await prisma.chapter.findMany({
          where: {
            novelId,
            order: { gte: options.startOrder, lte: options.endOrder },
            ...(options.skipCompleted
              ? buildSkipCompletedChapterWhere()
              : {}),
          },
          orderBy: { order: "asc" },
        });
      if (!novel) {
        throw new Error("任务执行失败：小说不存在");
      }
      if (chapters.length === 0 && runtimePayload.skipCompleted) {
        // skipCompleted 误过滤了无内容但未完成的章节（unplanned），
        // 回退到不过滤模式重新查询
        chapters = await prisma.chapter.findMany({
          where: {
            novelId,
            order: { gte: options.startOrder, lte: options.endOrder },
          },
          orderBy: { order: "asc" },
        });
        if (chapters.length > 0) {
          logPipelineInfo("skipCompleted 回退：包含未生成章节", {
            jobId,
            novelId,
            chapterCount: chapters.length,
          });
        }
      }
      if (chapters.length === 0) {
        throw new Error("任务执行失败：指定区间内没有可处理的章节");
      }

      logPipelineInfo("任务加载完成", {
        jobId,
        novelId,
        title: novel.title,
        chapterCount: chapters.length,
      });

      const totalCount = Math.max(existingJob?.totalCount ?? 0, chapters.length, 1);
      const storedCompleted = Math.min(Math.max(existingJob?.completedCount ?? 0, 0), totalCount);
      const filteredCompletedCount = runtimePayload.skipCompleted
        ? Math.max(0, totalCount - chapters.length)
        : 0;
      const remainingStartIndex = Math.min(
        Math.max(0, storedCompleted - filteredCompletedCount),
        chapters.length,
      );
      let completed = storedCompleted;
      const chaptersToProcess = chapters.slice(remainingStartIndex);

      // Phase 3：JIT 预取服务（N+1 章执行预取）
      const prefetchVolumeService = new NovelVolumeService();
      const prefetchJITService = new ChapterPlanJITService({
        ensureChapterExecutionContract: (nId, cId, opts) =>
          prefetchVolumeService.ensureChapterExecutionContract(nId, cId, opts),
      });
      const isAutopilotMode = runtimePayload.controlPolicy?.advanceMode === "full_book_autopilot";
      const isPipelineMode = runtimePayload.pipelineMode === "pipeline";

      // pipeline 模式下的交错执行状态
      let activePrefetchPromise: Promise<unknown> | null = null;
      let pipelineRefinementTotal = 0;
      let pipelineRefinementCompleted = 0;

      for (let chapterIndex = 0; chapterIndex < chaptersToProcess.length; chapterIndex++) {
        const chapter = chaptersToProcess[chapterIndex];
        await deps.ensurePipelineNotCancelled(jobId);

        let final = { score: normalizeScore({}), issues: [] as ReviewIssue[] };
        let shouldStopAfterCurrentChapter = false;
        const currentItemLabel = buildPipelineCurrentItemLabel({
          completedCount: completed,
          totalCount,
          chapterOrder: chapter.order,
          title: chapter.title,
        });
        let activeStage: PipelineActiveStage = "generating_chapters";
        const applyChapterStage = async (stage: PipelineActiveStage) => {
          activeStage = stage;
          await deps.updateJobSafe(jobId, {
            heartbeatAt: new Date(),
            currentStage: stage,
            currentItemKey: chapter.id,
            currentItemLabel,
            progress: buildPipelineStageProgress({
              completedCount: completed,
              totalCount,
              stage,
            }),
          });
        };

        await applyChapterStage("generating_chapters");
        logPipelineInfo("开始处理章节", {
          jobId,
          chapterId: chapter.id,
          order: chapter.order,
          hasDraft: Boolean((chapter.content ?? "").trim()),
        });

        const heartbeatTimer = setInterval(() => {
          void deps.updateJobSafe(jobId, {
            heartbeatAt: new Date(),
            currentStage: activeStage,
            currentItemKey: chapter.id,
            currentItemLabel,
            progress: buildPipelineStageProgress({
              completedCount: completed,
              totalCount,
              stage: activeStage,
            }),
          }).catch((error) => {
            logPipelineWarn("heartbeat_write_failed", {
              jobId,
              chapterId: chapter.id,
              error: error instanceof Error ? error.message : String(error),
            });
          });
        }, PIPELINE_HEARTBEAT_INTERVAL_MS);
        heartbeatTimer.unref?.();

        const chapterResult = await deps.chapterRuntimeCoordinator.runPipelineChapter(
          novelId,
          chapter.id,
          {
            provider: runtimePayload.provider,
            model: runtimePayload.model,
            temperature: runtimePayload.temperature,
            taskStyleProfileId: runtimePayload.taskStyleProfileId,
            controlPolicy: runtimePayload.controlPolicy,
            maxRetries,
            autoReview: runtimePayload.autoReview,
            autoRepair: runtimePayload.autoRepair,
            qualityThreshold,
            repairMode: runtimePayload.repairMode,
            artifactSyncMode: runtimePayload.artifactSyncMode,
          },
          {
            onCheckCancelled: () => deps.ensurePipelineNotCancelled(jobId),
            onStageChange: async (stage) => {
              await applyChapterStage(stage);
            },
            onEmptyContent: async (event) => {
              const detail = buildEmptyChapterDetail(chapter);
              const meta = {
                jobId,
                workflowTaskId: runtimePayload.workflowTaskId,
                novelId,
                chapterId: chapter.id,
                chapterOrder: chapter.order,
                provider: runtimePayload.provider,
                model: runtimePayload.model,
                runMode: runtimePayload.runMode,
                emptyAttempt: event.attempt,
                willRetry: event.willRetry,
                contentLength: event.contentLength,
                rawContentLength: event.rawContentLength,
                source: event.error.details.source,
              };
              if (event.willRetry) {
                logPipelineWarn("章节生成未返回正文，正在重试当前章", meta);
                return;
              }
              if (!qualityAlertDetails.includes(detail)) {
                qualityAlertDetails.push(detail);
              }
              logPipelineError("章节生成连续未返回正文，已暂停流水线", meta);
            },
          },
        ).finally(() => {
          clearInterval(heartbeatTimer);
        });

        totalRetryCount += chapterResult.retryCountUsed;
        final = { score: chapterResult.score, issues: chapterResult.issues };
        if (chapterResult.recoverableRepairFailure) {
          recoverableRepairDetails.push(
            `第${chapter.order}章需要后续修复：${chapterResult.recoverableRepairFailure.message}`,
          );
          logPipelineWarn("章节局部修复未安全应用，已记录并继续后续章节", {
            jobId,
            order: chapter.order,
            reason: chapterResult.recoverableRepairFailure.message,
            failureTypes: chapterResult.recoverableRepairFailure.failureTypes,
          });
        }
        if (chapterResult.reviewExecuted) {
          await createQualityReport(novelId, chapter.id, final.score, final.issues);
          await chapterQualityLoopService.recordAssessment({
            novelId,
            chapterId: chapter.id,
            chapterOrder: chapter.order,
            score: final.score,
            issues: final.issues,
            runtimePackage: chapterResult.runtimePackage,
            source: chapterResult.retryCountUsed > 0 ? "repair_recheck" : "pipeline_review",
            terminalAction: chapterResult.pass ? null : "defer_and_continue",
            taskId: runtimePayload.workflowTaskId,
            qualityDebtAttribution: chapterResult.qualityDebtAttribution ?? null,
          }).catch((error) => {
            logPipelineError("记录章节质量闭环状态失败", {
              jobId,
              novelId,
              chapterId: chapter.id,
              error: error instanceof Error ? error.message : String(error),
            });
          });
        }

        if (chapterResult.reviewExecuted && !chapterResult.pass) {
          qualityAlertDetails.push(
            `第${chapter.order}章（coherence=${final.score.coherence}, repetition=${final.score.repetition}, engagement=${final.score.engagement}）`,
          );
          logPipelineWarn("章节最终未达标", {
            jobId,
            order: chapter.order,
            score: final.score,
          });
        }

        const replanRecommendation = chapterResult.runtimePackage?.replanRecommendation;
        if (replanRecommendation?.recommended) {
          const impactedOrders = replanRecommendation.affectedChapterOrders?.length
            ? `影响章节=${replanRecommendation.affectedChapterOrders.join(",")}`
            : `锚点章节=${replanRecommendation.anchorChapterOrder ?? chapter.order}`;
          const detail = `第${chapter.order}章${replanRecommendation.action === "stop_for_replan" ? "需要重规划" : "建议局部处理"}（${impactedOrders}；原因=${replanRecommendation.triggerReason ?? replanRecommendation.reason}）`;
          if (replanRecommendation.action === "stop_for_replan") {
            replanAlertDetails.push(detail);
            shouldStopAfterCurrentChapter = true;
          } else if (!qualityAlertDetails.includes(detail)) {
            qualityAlertDetails.push(detail);
          }
        }

        // Phase 3：N+1 章 JIT 预取
        // 当前章 finalize 完成后（factLedger 已写入），后台触发下一章的 task sheet 生成。
        // fire-and-forget：预取失败不影响当前流水线，下一章正式组装时会重试。
        const nextChapter = chaptersToProcess[chapterIndex + 1];

        if (isPipelineMode && nextChapter) {
          // pipeline 模式：预取 N+1 章的 chapter detail bundle，同时跟踪进度
          pipelineRefinementTotal += 1;
          const prefetchPromise = prefetchJITService.ensureExecutionReady(novelId, nextChapter.id)
            .then(() => {
              pipelineRefinementCompleted += 1;
              logPipelineInfo("pipeline 模式：N+1 章细化完成", {
                jobId,
                nextChapterId: nextChapter.id,
                nextChapterOrder: nextChapter.order,
              });
            })
            .catch((error) => {
              logPipelineInfo("pipeline 模式：N+1 章细化失败（非阻断，下一章将在组装时重试）", {
                jobId,
                nextChapterId: nextChapter.id,
                nextChapterOrder: nextChapter.order,
                error: error instanceof Error ? error.message : String(error),
              });
              pipelineRefinementCompleted += 1;
            });
          activePrefetchPromise = prefetchPromise;
          // 更新 pipelineState 供前端心跳展示
          await deps.updateJobSafe(jobId, {
            heartbeatAt: new Date(),
            payload: stringifyPipelineJobPayload({
              ...runtimePayload,
              qualityAlertDetails,
              replanAlertDetails,
              recoverableRepairDetails,
              pipelineState: {
                refinementProgress: {
                  total: pipelineRefinementTotal,
                  completed: pipelineRefinementCompleted,
                  currentChapterId: nextChapter.id,
                },
                writingProgress: {
                  total: totalCount,
                  completed: completed + 1,
                  currentChapterId: nextChapter.id,
                },
              },
            }),
          });
        } else if (nextChapter && (isAutopilotMode || isPipelineMode)) {
          void prefetchJITService.ensureExecutionReady(novelId, nextChapter.id).catch((error) => {
            logPipelineInfo("N+1 JIT 预取失败（非阻断，下一章将在组装时重试）", {
              jobId,
              nextChapterId: nextChapter.id,
              nextChapterOrder: nextChapter.order,
              error: error instanceof Error ? error.message : String(error),
            });
          });
        }

        // pipeline 模式：在处理下一章前，等待当前章的预取完成以实现交错
        if (isPipelineMode && activePrefetchPromise) {
          await activePrefetchPromise.catch(() => {});
          activePrefetchPromise = null;
        }

        completed += 1;
        await deps.updateJobSafe(jobId, {
          completedCount: completed,
          progress: Number((completed / totalCount).toFixed(4)),
          retryCount: totalRetryCount,
          heartbeatAt: new Date(),
          payload: stringifyPipelineJobPayload({
            ...runtimePayload,
            qualityAlertDetails,
            replanAlertDetails,
            recoverableRepairDetails,
          }),
        });
        logPipelineInfo("任务进度更新", {
          jobId,
          completed,
          total: totalCount,
          progress: Number((completed / totalCount).toFixed(4)),
          retryCount: totalRetryCount,
        });
        if (shouldStopAfterCurrentChapter) {
          logPipelineWarn("章节触发重规划，已停止后续章节流水线", {
            jobId,
            order: chapter.order,
            remaining: Math.max(0, totalCount - completed),
          });
          break;
        }
      }

      const finalStatus: "succeeded" = "succeeded";
      await deps.updateJobSafe(jobId, {
        heartbeatAt: new Date(),
        currentStage: "finalizing",
        currentItemKey: null,
        currentItemLabel: "正在收尾章节流水线任务",
        progress: buildPipelineStageProgress({
          completedCount: completed,
          totalCount,
          stage: "finalizing",
        }),
      });
      await deps.updateJobSafe(jobId, {
        status: finalStatus,
        error: null,
        heartbeatAt: null,
        currentStage: null,
        currentItemKey: null,
        currentItemLabel: null,
        cancelRequestedAt: null,
        finishedAt: new Date(),
        payload: stringifyPipelineJobPayload({
          ...runtimePayload,
          qualityAlertDetails,
          replanAlertDetails,
          recoverableRepairDetails,
        }),
      });
      logPipelineInfo("任务执行结束", {
        jobId,
        status: finalStatus,
        qualityAlertCount: qualityAlertDetails.length,
      });
      void novelEventBus.emit({
        type: "pipeline:completed",
        payload: { novelId, jobId, status: finalStatus },
      }).catch(() => {});
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PIPELINE_CANCELLED") {
      await deps.updateJobSafe(jobId, {
        status: "cancelled",
        heartbeatAt: null,
        currentStage: null,
        currentItemKey: null,
        currentItemLabel: null,
        cancelRequestedAt: null,
        finishedAt: new Date(),
        payload: stringifyPipelineJobPayload({
          ...runtimePayload,
          qualityAlertDetails,
          replanAlertDetails,
          recoverableRepairDetails,
        }),
      });
      void novelEventBus.emit({
        type: "pipeline:completed",
        payload: { novelId, jobId, status: "cancelled" },
      }).catch(() => {});
      return;
    }

    const message = error instanceof Error ? error.message : "流水线执行失败";
    if (isChapterEmptyContentError(error)) {
      logPipelineError("任务因章节空正文失败", {
        jobId,
        novelId,
        provider: runtimePayload.provider,
        model: runtimePayload.model,
        runMode: runtimePayload.runMode,
        workflowTaskId: runtimePayload.workflowTaskId,
        source: error.details.source,
        contentLength: error.details.trimmedLength,
        rawContentLength: error.details.rawLength,
      });
    }
    await deps.updateJobSafe(jobId, {
      status: "failed",
      error: message,
      finishedAt: new Date(),
      payload: stringifyPipelineJobPayload({
        ...runtimePayload,
        qualityAlertDetails,
        replanAlertDetails,
        recoverableRepairDetails,
      }),
    });
    logPipelineError("任务执行异常", {
      jobId,
      novelId,
      message,
    });
    void novelEventBus.emit({
      type: "pipeline:completed",
      payload: { novelId, jobId, status: "failed" },
    }).catch(() => {});
  }
}
