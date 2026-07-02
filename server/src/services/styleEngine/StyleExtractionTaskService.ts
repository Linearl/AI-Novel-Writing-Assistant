import { Prisma } from "@prisma/client";
import type {
  StyleExtractionSourceProcessingMode,
} from "@ai-novel/shared/types/styleEngine";
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import { prisma } from "../../db/prisma";
import { AppError } from "../../middleware/errorHandler";
import { getStyleEngineRuntimeSettings } from "../settings/StyleEngineRuntimeSettingsService";
import {
  buildStyleExtractionSourceInput,
  resolveTaskProfileSource,
  type StyleExtractionTaskSourceType,
} from "./StyleExtractionSourceInput";
import { StyleProfileService } from "./StyleProfileService";
import { executeStyleExtractionTask } from "./styleExtractionTaskExecutor";
import {
  isMissingStyleExtractionTaskTableError,
  parseTimeoutMs,
  writeTaskLog,
} from "./styleExtractionTaskUtils";

type PresetKey = "imitate" | "balanced" | "transfer";

interface CreateStyleExtractionTaskInput {
  name: string;
  sourceText: string;
  sourceType?: StyleExtractionTaskSourceType;
  sourceRefId?: string;
  sourceProcessingMode?: StyleExtractionSourceProcessingMode;
  category?: string;
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
  presetKey?: PresetKey;
  maxRetries?: number;
}

const STYLE_EXTRACTION_HEARTBEAT_INTERVAL_MS = parseTimeoutMs(
  process.env.STYLE_EXTRACTION_TASK_HEARTBEAT_INTERVAL_MS,
  10_000,
  5_000,
  60_000,
);

export class StyleExtractionTaskService {
  private readonly queue: string[] = [];

  private readonly queueSet = new Set<string>();

  private readonly activeControllers = new Map<string, AbortController>();

  private processing = false;

  private readonly styleProfileService = new StyleProfileService();

  private logTaskEvent(
    event: string,
    payload: Record<string, unknown>,
    level: "info" | "warn" = "info",
  ): void {
    writeTaskLog(level, event, payload);
  }

  private startTaskHeartbeat(taskId: string): () => void {
    const timer = setInterval(() => {
      void prisma.styleExtractionTask.updateMany({
        where: {
          id: taskId,
          status: "running",
        },
        data: {
          heartbeatAt: new Date(),
        },
      }).catch((error) => {
        this.logTaskEvent("heartbeat_update_failed", {
          taskId,
          message: error instanceof Error ? error.message : String(error),
        }, "warn");
      });
    }, STYLE_EXTRACTION_HEARTBEAT_INTERVAL_MS);

    return () => {
      clearInterval(timer);
    };
  }

  async createTask(input: CreateStyleExtractionTaskInput) {
    const sourceType = input.sourceType ?? "from_text";
    const sourceRefId = input.sourceRefId?.trim() || null;
    const sourceInput = buildStyleExtractionSourceInput({
      sourceText: input.sourceText,
      sourceType,
      sourceProcessingMode: input.sourceProcessingMode,
    });
    const createdTask = await prisma.styleExtractionTask.create({
      data: {
        name: input.name.trim(),
        category: input.category?.trim() || null,
        sourceText: input.sourceText,
        sourceType,
        sourceRefId,
        sourceProcessingMode: sourceInput.sourceProcessingMode,
        sourceInputText: sourceInput.sourceInputText,
        sourceInputCharLimit: sourceInput.sourceInputCharLimit,
        sourceInputCharCount: sourceInput.sourceInputCharCount,
        provider: input.provider ?? "deepseek",
        model: input.model?.trim() || null,
        temperature: input.temperature ?? 0.5,
        presetKey: input.presetKey ?? "balanced",
        status: "queued",
        maxRetries: input.maxRetries ?? 1,
        currentStage: "queued",
        currentItemLabel: input.name.trim(),
      },
    });
    const task = sourceRefId
      ? createdTask
      : await prisma.styleExtractionTask.update({
          where: { id: createdTask.id },
          data: { sourceRefId: createdTask.id },
        });
    const runtimeSettings = await getStyleEngineRuntimeSettings();
    this.logTaskEvent("task_created", {
      taskId: task.id,
      sourceType: task.sourceType,
      sourceRefId: task.sourceRefId,
      sourceProcessingMode: task.sourceProcessingMode,
      provider: task.provider,
      model: task.model,
      temperature: task.temperature,
      sourceTextChars: task.sourceText.length,
      sourceInputChars: task.sourceInputCharCount,
      presetKey: task.presetKey,
      timeoutMs: runtimeSettings.styleExtractionTimeoutMs,
    });
    this.enqueueTask(task.id);
    return task;
  }

  async retryTask(taskId: string) {
    const task = await prisma.styleExtractionTask.findUnique({
      where: { id: taskId },
    });
    if (!task) {
      throw new AppError("Style extraction task not found.", 404);
    }
    if (task.status !== "failed" && task.status !== "cancelled") {
      throw new AppError("Only failed or cancelled style extraction tasks can be retried.", 400);
    }

    await prisma.styleExtractionTask.update({
      where: { id: taskId },
      data: {
        status: "queued",
        progress: 0,
        retryCount: 0,
        pendingManualRecovery: false,
        heartbeatAt: null,
        currentStage: "queued",
        currentItemKey: null,
        currentItemLabel: task.name,
        cancelRequestedAt: null,
        error: null,
        startedAt: null,
        finishedAt: null,
        summary: null,
        createdStyleProfileId: null,
        createdStyleProfileName: null,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        llmCallCount: 0,
        lastTokenRecordedAt: null,
      },
    });
    this.logTaskEvent("task_retry_requested", {
      taskId,
      provider: task.provider,
      model: task.model,
    });
    this.enqueueTask(taskId);
    return prisma.styleExtractionTask.findUniqueOrThrow({ where: { id: taskId } });
  }

  async cancelTask(taskId: string) {
    const task = await prisma.styleExtractionTask.findUnique({
      where: { id: taskId },
    });
    if (!task) {
      throw new AppError("Style extraction task not found.", 404);
    }
    if (task.status === "succeeded" || task.status === "failed" || task.status === "cancelled") {
      throw new AppError("Only queued or running style extraction tasks can be cancelled.", 400);
    }

    if (task.status === "queued") {
      await this.markCancelled(task.id, task.progress);
    } else {
      await prisma.styleExtractionTask.update({
        where: { id: taskId },
        data: {
          cancelRequestedAt: new Date(),
          heartbeatAt: new Date(),
        },
      });
      this.activeControllers.get(taskId)?.abort();
    }
    this.logTaskEvent("task_cancel_requested", {
      taskId,
      status: task.status,
    });
    return prisma.styleExtractionTask.findUniqueOrThrow({ where: { id: taskId } });
  }

  async markPendingTasksForManualRecovery(): Promise<void> {
    try {
      const rows = await prisma.styleExtractionTask.findMany({
        where: {
          status: { in: ["queued", "running"] },
          pendingManualRecovery: false,
        },
        select: { id: true, status: true },
        orderBy: { createdAt: "asc" },
      });
      if (rows.length === 0) {
        return;
      }

      const runningIds = rows.filter((item) => item.status === "running").map((item) => item.id);
      if (runningIds.length > 0) {
        await prisma.styleExtractionTask.updateMany({
          where: { id: { in: runningIds } },
          data: {
            status: "queued",
            pendingManualRecovery: true,
            error: "服务重启后，写法提取任务已暂停，等待手动恢复。",
            heartbeatAt: null,
            currentStage: "queued",
            currentItemKey: null,
            cancelRequestedAt: null,
          },
        });
      }

      const queuedIds = rows.filter((item) => item.status === "queued").map((item) => item.id);
      if (queuedIds.length > 0) {
        await prisma.styleExtractionTask.updateMany({
          where: { id: { in: queuedIds } },
          data: {
            pendingManualRecovery: true,
            error: "服务重启后，写法提取任务已暂停，等待手动恢复。",
            heartbeatAt: null,
            cancelRequestedAt: null,
          },
        });
      }
    } catch (error) {
      if (isMissingStyleExtractionTaskTableError(error)) {
        return;
      }
      throw error;
    }
  }

  async resumeTask(taskId: string) {
    const task = await prisma.styleExtractionTask.findUnique({
      where: { id: taskId },
      select: { status: true },
    });
    if (!task) {
      throw new AppError("Style extraction task not found.", 404);
    }
    if (task.status !== "queued" && task.status !== "running") {
      throw new AppError("Only queued or running style extraction tasks can be resumed.", 400);
    }

    await prisma.styleExtractionTask.update({
      where: { id: taskId },
      data: {
        status: "queued",
        pendingManualRecovery: false,
        heartbeatAt: null,
        cancelRequestedAt: null,
      },
    });
    this.logTaskEvent("task_resume_requested", { taskId });
    this.enqueueTask(taskId);
    return prisma.styleExtractionTask.findUniqueOrThrow({ where: { id: taskId } });
  }

  private enqueueTask(taskId: string): void {
    if (this.queueSet.has(taskId)) {
      return;
    }
    this.queue.push(taskId);
    this.queueSet.add(taskId);
    void this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.processing) {
      return;
    }
    this.processing = true;
    try {
      while (this.queue.length > 0) {
        const taskId = this.queue.shift();
        if (!taskId) {
          continue;
        }
        this.queueSet.delete(taskId);
        await this.executeTask(taskId);
      }
    } finally {
      this.processing = false;
    }
  }

  private async executeTask(taskId: string): Promise<void> {
    await executeStyleExtractionTask(taskId, {
      ensureNotCancelled: (id) => this.ensureNotCancelled(id),
      startTaskHeartbeat: (id) => this.startTaskHeartbeat(id),
      markSucceeded: (id, profileId, profileName, summary) => this.markSucceeded(id, profileId, profileName, summary),
      markCancelled: (id, progress) => this.markCancelled(id, progress),
      resolveTaskProgress: (id, fallback) => this.resolveTaskProgress(id, fallback),
      isCancellationRequested: (id) => this.isCancellationRequested(id),
      enqueueTask: (id) => this.enqueueTask(id),
      activeControllers: this.activeControllers,
      styleProfileService: this.styleProfileService,
      logTaskEvent: (event, payload, level) => this.logTaskEvent(event, payload, level),
    });
  }

  private async ensureNotCancelled(taskId: string): Promise<void> {
    const task = await prisma.styleExtractionTask.findUnique({
      where: { id: taskId },
      select: {
        status: true,
        cancelRequestedAt: true,
      },
    });
    if (!task || task.status === "cancelled" || task.cancelRequestedAt) {
      throw new AppError("STYLE_EXTRACTION_TASK_CANCELLED", 400);
    }
  }

  private async markSucceeded(
    taskId: string,
    profileId: string,
    profileName: string,
    summary?: string | null,
  ): Promise<void> {
    await prisma.styleExtractionTask.update({
      where: { id: taskId },
      data: {
        status: "succeeded",
        progress: 1,
        error: null,
        heartbeatAt: null,
        currentStage: null,
        currentItemKey: profileId,
        currentItemLabel: profileName,
        cancelRequestedAt: null,
        createdStyleProfileId: profileId,
        createdStyleProfileName: profileName,
        summary: summary ?? undefined,
        finishedAt: new Date(),
      },
    });
    this.logTaskEvent("task_succeeded", {
      taskId,
      profileId,
      profileName,
    });
  }

  private async markCancelled(taskId: string, progress: number): Promise<void> {
    await prisma.styleExtractionTask.update({
      where: { id: taskId },
      data: {
        status: "cancelled",
        progress,
        error: null,
        heartbeatAt: null,
        currentStage: null,
        currentItemKey: null,
        currentItemLabel: null,
        cancelRequestedAt: null,
        finishedAt: new Date(),
      },
    });
    this.logTaskEvent("task_cancelled", {
      taskId,
      progress,
    }, "warn");
  }

  private async resolveTaskProgress(taskId: string, fallback: number): Promise<number> {
    const task = await prisma.styleExtractionTask.findUnique({
      where: { id: taskId },
      select: { progress: true },
    });
    return task?.progress ?? fallback;
  }

  private async isCancellationRequested(taskId: string): Promise<boolean> {
    const task = await prisma.styleExtractionTask.findUnique({
      where: { id: taskId },
      select: {
        status: true,
        cancelRequestedAt: true,
      },
    });
    return Boolean(task && (task.status === "cancelled" || task.cancelRequestedAt));
  }
}

export const styleExtractionTaskService = new StyleExtractionTaskService();
