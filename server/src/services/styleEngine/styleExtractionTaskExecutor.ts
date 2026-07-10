import type { LLMProvider } from "@ai-novel/shared";
import { prisma } from "../../db/prisma";
import { runWithLlmUsageTracking } from "../../llm/usageTracking";
import { AppError } from "../../middleware/errorHandler";
import { getStyleEngineRuntimeSettings } from "../settings/StyleEngineRuntimeSettingsService";
import {
  resolveStyleExtractionInputText,
  resolveTaskProfileSource,
} from "./StyleExtractionSourceInput";
import type { StyleProfileService } from "./StyleProfileService";
import {
  buildExtractionDecisions,
  isAbortError,
  isTimeoutError,
  normalizeTaskError,
  writeTaskLog,
} from "./styleExtractionTaskUtils";

type PresetKey = "imitate" | "balanced" | "transfer";

type LogFn = (event: string, payload: Record<string, unknown>, level?: "info" | "warn") => void;

interface ExecuteStyleExtractionTaskDeps {
  ensureNotCancelled: (taskId: string) => Promise<void>;
  startTaskHeartbeat: (taskId: string) => () => void;
  markSucceeded: (taskId: string, profileId: string, profileName: string, summary?: string | null) => Promise<void>;
  markCancelled: (taskId: string, progress: number) => Promise<void>;
  resolveTaskProgress: (taskId: string, fallback: number) => Promise<number>;
  isCancellationRequested: (taskId: string) => Promise<boolean>;
  enqueueTask: (taskId: string) => void;
  activeControllers: Map<string, AbortController>;
  styleProfileService: StyleProfileService;
  logTaskEvent: LogFn;
}

export async function executeStyleExtractionTask(
  taskId: string,
  deps: ExecuteStyleExtractionTaskDeps,
): Promise<void> {
  const task = await prisma.styleExtractionTask.findUnique({
    where: { id: taskId },
  });
  if (!task) {
    return;
  }
  if ((task.status !== "queued" && task.status !== "running") || task.pendingManualRecovery) {
    deps.logTaskEvent("task_skipped", {
      taskId,
      status: task.status,
      pendingManualRecovery: task.pendingManualRecovery,
    });
    return;
  }
  if (task.cancelRequestedAt) {
    await deps.markCancelled(task.id, task.progress);
    return;
  }

  const taskSource = resolveTaskProfileSource(task);
  if (!taskSource) {
    const errorMessage = "知识库原文写法提取任务缺少来源文档 ID，无法安全生成写法。";
    await prisma.styleExtractionTask.update({
      where: { id: task.id },
      data: {
        status: "failed",
        progress: 1,
        error: errorMessage,
        heartbeatAt: null,
        currentStage: null,
        currentItemKey: null,
        currentItemLabel: task.name,
        cancelRequestedAt: null,
        finishedAt: new Date(),
      },
    });
    deps.logTaskEvent("task_failed_missing_source_ref", {
      taskId: task.id,
      sourceType: task.sourceType,
    }, "warn");
    return;
  }

  const existingProfile = task.createdStyleProfileId
    ? await prisma.styleProfile.findUnique({
        where: { id: task.createdStyleProfileId },
        select: { id: true, name: true },
      })
    : await prisma.styleProfile.findFirst({
        where: {
          sourceType: taskSource.sourceType,
          sourceRefId: taskSource.sourceRefId,
          ...(taskSource.sourceType === "from_knowledge_document"
            ? {
                name: task.name,
                sourceContent: task.sourceText,
              }
            : {}),
        },
        select: { id: true, name: true },
      });
  if (existingProfile) {
    deps.logTaskEvent("task_reused_existing_profile", {
      taskId: task.id,
      profileId: existingProfile.id,
      profileName: existingProfile.name,
    });
    await deps.markSucceeded(task.id, existingProfile.id, existingProfile.name, task.summary);
    return;
  }

  const runtimeSettings = await getStyleEngineRuntimeSettings();
  const styleExtractionTimeoutMs = runtimeSettings.styleExtractionTimeoutMs;
  const extractionInputText = resolveStyleExtractionInputText(task);

  await prisma.styleExtractionTask.update({
    where: { id: task.id },
    data: {
      status: "running",
      pendingManualRecovery: false,
      progress: 0.08,
      error: null,
      startedAt: task.startedAt ?? new Date(),
      heartbeatAt: new Date(),
      currentStage: "extracting_features",
      currentItemKey: task.id,
      currentItemLabel: task.name,
    },
  });

  const controller = new AbortController();
  deps.activeControllers.set(task.id, controller);
  const stopHeartbeat = deps.startTaskHeartbeat(task.id);
  deps.logTaskEvent("task_started", {
    taskId: task.id,
    sourceType: taskSource.sourceType,
    sourceRefId: taskSource.sourceRefId,
    provider: task.provider,
    model: task.model,
    sourceProcessingMode: task.sourceProcessingMode,
    sourceTextChars: task.sourceText.length,
    sourceInputChars: extractionInputText.length,
    timeoutMs: styleExtractionTimeoutMs,
    retryCount: task.retryCount,
    maxRetries: task.maxRetries,
  });

  try {
    await deps.ensureNotCancelled(task.id);
    const extractStartedAt = Date.now();
    const draft = await runWithLlmUsageTracking({
      styleExtractionTaskId: task.id,
    }, () => deps.styleProfileService.extractFromText({
      name: task.name,
      sourceText: extractionInputText,
      category: task.category ?? undefined,
      provider: task.provider as LLMProvider,
      model: task.model ?? undefined,
      temperature: task.temperature ?? undefined,
      timeoutMs: styleExtractionTimeoutMs,
      signal: controller.signal,
    }));
    deps.logTaskEvent("features_extracted", {
      taskId: task.id,
      latencyMs: Date.now() - extractStartedAt,
      featureCount: draft.features.length,
      summary: draft.summary,
    });

    await deps.ensureNotCancelled(task.id);
    await prisma.styleExtractionTask.update({
      where: { id: task.id },
      data: {
        progress: 0.58,
        summary: draft.summary,
        heartbeatAt: new Date(),
        currentStage: "building_profile",
        currentItemKey: task.id,
        currentItemLabel: task.name,
      },
    });

    const presetKey = (task.presetKey as PresetKey) || "balanced";
    const decisions = buildExtractionDecisions(draft, presetKey);

    await deps.ensureNotCancelled(task.id);
    await prisma.styleExtractionTask.update({
      where: { id: task.id },
      data: {
        progress: 0.82,
        heartbeatAt: new Date(),
        currentStage: "saving_profile",
        currentItemKey: task.id,
        currentItemLabel: task.name,
      },
    });

    const saveStartedAt = Date.now();
    const profile = await deps.styleProfileService.createProfileFromExtraction({
      name: task.name,
      sourceText: task.sourceText,
      category: task.category ?? undefined,
      draft,
      presetKey,
      decisions,
      sourceType: taskSource.sourceType,
      sourceRefId: taskSource.sourceRefId,
    });
    deps.logTaskEvent("profile_created", {
      taskId: task.id,
      profileId: profile.id,
      profileName: profile.name,
      latencyMs: Date.now() - saveStartedAt,
    });

    await deps.markSucceeded(task.id, profile.id, profile.name, draft.summary);
  } catch (error) {
    if (error instanceof AppError && error.message === "STYLE_EXTRACTION_TASK_CANCELLED") {
      await deps.markCancelled(task.id, await deps.resolveTaskProgress(task.id, task.progress));
      return;
    }
    if (isAbortError(error) && await deps.isCancellationRequested(task.id)) {
      await deps.markCancelled(task.id, await deps.resolveTaskProgress(task.id, task.progress));
      return;
    }

    const errorMessage = normalizeTaskError(error);
    const shouldRetry = !isTimeoutError(error) && task.retryCount < task.maxRetries;
    if (shouldRetry) {
      deps.logTaskEvent("task_requeued_after_error", {
        taskId: task.id,
        retryCount: task.retryCount + 1,
        maxRetries: task.maxRetries,
        errorMessage,
        rawError: error instanceof Error ? {
          name: error.name,
          message: error.message,
        } : String(error),
      }, "warn");
      await prisma.styleExtractionTask.update({
        where: { id: task.id },
        data: {
          status: "queued",
          pendingManualRecovery: false,
          progress: 0,
          retryCount: { increment: 1 },
          error: errorMessage,
          heartbeatAt: null,
          currentStage: "queued",
          currentItemKey: null,
          currentItemLabel: task.name,
          cancelRequestedAt: null,
        },
      });
      setTimeout(() => deps.enqueueTask(task.id), 1500);
    } else {
      deps.logTaskEvent("task_failed", {
        taskId: task.id,
        retryCount: task.retryCount,
        maxRetries: task.maxRetries,
        errorMessage,
        rawError: error instanceof Error ? {
          name: error.name,
          message: error.message,
        } : String(error),
      }, "warn");
      await prisma.styleExtractionTask.update({
        where: { id: task.id },
        data: {
          status: "failed",
          progress: 1,
          error: errorMessage,
          heartbeatAt: null,
          currentStage: null,
          currentItemKey: null,
          currentItemLabel: task.name,
          cancelRequestedAt: null,
          finishedAt: new Date(),
        },
      });
    }
  } finally {
    stopHeartbeat();
    if (deps.activeControllers.get(task.id) === controller) {
      deps.activeControllers.delete(task.id);
    }
  }
}
