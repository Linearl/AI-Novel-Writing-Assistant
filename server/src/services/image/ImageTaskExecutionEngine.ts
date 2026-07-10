import type { LLMProvider } from "@ai-novel/shared";
import { prisma } from "../../db/prisma";
import { AppError } from "../../middleware/errorHandler";
import { generateImagesByProvider } from "./provider";
import { persistGeneratedImageAsset } from "./imageAssetStorage";
import { normalizeImageGenerationError, isMissingTableError } from "./imageGenerationMappers";
import { logger } from "../logging/LoggerService";
import type { ImageSize } from "./types";

type SupportedImageSceneType = "character" | "novel_cover";

function resolveSceneType(sceneType: string): SupportedImageSceneType {
  if (sceneType === "character" || sceneType === "novel_cover") {
    return sceneType;
  }
  throw new AppError(`Scene type ${sceneType} is not supported for image generation yet.`, 400);
}

function resolveTaskOwnerKey(task: {
  sceneType: string;
  baseCharacterId: string | null;
  novelId: string | null;
}): string | null {
  if (task.sceneType === "novel_cover") {
    return task.novelId;
  }
  if (task.sceneType === "character") {
    return task.baseCharacterId;
  }
  return null;
}

function buildAssetOwnerWhere(input: {
  sceneType: SupportedImageSceneType;
  baseCharacterId: string | null;
  novelId: string | null;
}): Record<string, unknown> {
  if (input.sceneType === "novel_cover") {
    if (!input.novelId) {
      throw new AppError("Novel cover asset is missing novelId.", 400);
    }
    return {
      sceneType: "novel_cover",
      novelId: input.novelId,
    };
  }

  if (!input.baseCharacterId) {
    throw new AppError("Character image asset is missing baseCharacterId.", 400);
  }
  return {
    sceneType: "character",
    baseCharacterId: input.baseCharacterId,
  };
}

function buildMissingOwnerError(sceneType: SupportedImageSceneType): string {
  return sceneType === "novel_cover"
    ? "Novel was not found."
    : "Base character was not found.";
}

function resolveCurrentItemLabel(task: {
  sceneType: string;
  baseCharacter?: { name: string } | null;
  novel?: { title: string } | null;
} | null): string | null {
  if (!task) {
    return null;
  }
  if (task.sceneType === "novel_cover") {
    return task.novel?.title ?? null;
  }
  return task.baseCharacter?.name ?? null;
}

export class ImageTaskExecutionEngine {
  private readonly queue: string[] = [];
  private readonly queueSet = new Set<string>();
  private processing = false;

  constructor(private readonly onRetry: (taskId: string) => void) {}

  enqueueTask(taskId: string): void {
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
    const task = await prisma.imageGenerationTask.findUnique({
      where: { id: taskId },
      include: {
        baseCharacter: true,
        novel: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
    if (!task) {
      return;
    }
    if ((task.status !== "queued" && task.status !== "running") || task.pendingManualRecovery) {
      return;
    }

    const sceneType = resolveSceneType(task.sceneType);
    const currentItemKey = resolveTaskOwnerKey(task);
    const currentItemLabel = resolveCurrentItemLabel(task);

    if (task.cancelRequestedAt) {
      await this.markCancelled(task.id, task.progress);
      return;
    }
    if (!currentItemKey || !currentItemLabel) {
      await prisma.imageGenerationTask.update({
        where: { id: task.id },
        data: {
          status: "failed",
          progress: 1,
          error: buildMissingOwnerError(sceneType),
          heartbeatAt: null,
          currentStage: null,
          currentItemKey: null,
          currentItemLabel: null,
          cancelRequestedAt: null,
          finishedAt: new Date(),
        },
      });
      return;
    }

    await prisma.imageGenerationTask.update({
      where: { id: task.id },
      data: {
        status: "running",
        pendingManualRecovery: false,
        progress: 0.1,
        error: null,
        startedAt: task.startedAt ?? new Date(),
        heartbeatAt: new Date(),
        currentStage: "submitting",
        currentItemKey,
        currentItemLabel,
      },
    });

    try {
      await this.ensureNotCancelled(task.id);
      await prisma.imageGenerationTask.update({
        where: { id: task.id },
        data: {
          heartbeatAt: new Date(),
          currentStage: "generating",
          currentItemKey,
          currentItemLabel,
        },
      });

      const result = await generateImagesByProvider({
        sceneType,
        provider: task.provider as LLMProvider,
        model: task.model,
        prompt: task.prompt,
        negativePrompt: task.negativePrompt ?? undefined,
        size: task.size as ImageSize,
        count: task.imageCount,
        seed: task.seed ?? undefined,
      });

      await this.ensureNotCancelled(task.id);
      await prisma.imageGenerationTask.update({
        where: { id: task.id },
        data: {
          progress: 0.8,
          heartbeatAt: new Date(),
          currentStage: "saving_assets",
        },
      });

      const persistedImages: Array<{
        image: (typeof result.images)[number];
        persisted: Awaited<ReturnType<typeof persistGeneratedImageAsset>>;
      }> = [];
      for (let index = 0; index < result.images.length; index += 1) {
        await this.ensureNotCancelled(task.id);
        const image = result.images[index];
        const persisted = await persistGeneratedImageAsset({
          taskId: task.id,
          sceneType,
          baseCharacterId: task.baseCharacterId,
          novelId: task.novelId,
          sortOrder: index,
          url: image.url,
          mimeType: image.mimeType ?? null,
        });
        persistedImages.push({ image, persisted });
      }

      const ownerWhere = buildAssetOwnerWhere({
        sceneType,
        baseCharacterId: task.baseCharacterId,
        novelId: task.novelId,
      });

      await this.ensureNotCancelled(task.id);
      await prisma.$transaction(async (tx) => {
        const hasPrimary = await tx.imageAsset.findFirst({
          where: {
            ...ownerWhere,
            isPrimary: true,
          },
          select: { id: true },
        });
        for (let index = 0; index < persistedImages.length; index += 1) {
          const { image, persisted } = persistedImages[index];
          await tx.imageAsset.create({
            data: {
              taskId: task.id,
              sceneType,
              baseCharacterId: sceneType === "character" ? task.baseCharacterId : null,
              novelId: sceneType === "novel_cover" ? task.novelId : null,
              provider: result.provider,
              model: result.model,
              url: persisted.persistedUrl,
              mimeType: persisted.mimeType,
              width: image.width ?? null,
              height: image.height ?? null,
              seed: image.seed ?? null,
              prompt: task.prompt,
              isPrimary: !hasPrimary && index === 0,
              sortOrder: index,
              metadata: JSON.stringify({
                ...(image.metadata ?? {}),
                localPath: persisted.localPath,
                relativePath: persisted.relativePath,
                sourceUrl: persisted.sourceUrl,
                storageKey: persisted.storageKey,
                storageDriver: persisted.storageDriver,
              }),
            },
          });
        }
        await tx.imageGenerationTask.update({
          where: { id: task.id },
          data: {
            status: "succeeded",
            progress: 1,
            error: null,
            heartbeatAt: null,
            currentStage: null,
            currentItemKey: null,
            currentItemLabel: null,
            cancelRequestedAt: null,
            finishedAt: new Date(),
          },
        });
      });
    } catch (error) {
      if (error instanceof AppError && error.message === "IMAGE_TASK_CANCELLED") {
        await this.markCancelled(task.id, task.progress);
        return;
      }
      const errorMessage = normalizeImageGenerationError(error);
      const shouldRetry = task.retryCount < task.maxRetries;
      if (shouldRetry) {
        await prisma.imageGenerationTask.update({
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
            currentItemLabel: null,
            cancelRequestedAt: null,
          },
        });
        setTimeout(() => this.onRetry(task.id), 1500);
      } else {
        await prisma.imageGenerationTask.update({
          where: { id: task.id },
          data: {
            status: "failed",
            progress: 1,
            error: errorMessage,
            heartbeatAt: null,
            currentStage: null,
            currentItemKey: null,
            currentItemLabel: null,
            cancelRequestedAt: null,
            finishedAt: new Date(),
          },
        });
      }
    }
  }

  private async ensureNotCancelled(taskId: string): Promise<void> {
    const task = await prisma.imageGenerationTask.findUnique({
      where: { id: taskId },
      select: {
        status: true,
        cancelRequestedAt: true,
      },
    });
    if (!task || task.status === "cancelled" || task.cancelRequestedAt) {
      throw new AppError("IMAGE_TASK_CANCELLED", 400);
    }
  }

  private async markCancelled(taskId: string, progress: number): Promise<void> {
    await prisma.imageGenerationTask.update({
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
  }
}

export async function markPendingTasksForManualRecovery(): Promise<void> {
  try {
    const rows = await prisma.imageGenerationTask.findMany({
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
      await prisma.imageGenerationTask.updateMany({
        where: { id: { in: runningIds } },
        data: {
          status: "queued",
          pendingManualRecovery: true,
          error: "服务重启后任务已暂停，等待手动恢复。",
          heartbeatAt: null,
          currentStage: "queued",
          currentItemKey: null,
          currentItemLabel: null,
          cancelRequestedAt: null,
        },
      });
    }
    const queuedIds = rows.filter((item) => item.status === "queued").map((item) => item.id);
    if (queuedIds.length > 0) {
      await prisma.imageGenerationTask.updateMany({
        where: { id: { in: queuedIds } },
        data: {
          pendingManualRecovery: true,
          error: "服务重启后任务已暂停，等待手动恢复。",
          heartbeatAt: null,
          cancelRequestedAt: null,
        },
      });
    }
  } catch (error) {
    if (isMissingTableError(error)) {
      return;
    }
    throw error;
  }
}
