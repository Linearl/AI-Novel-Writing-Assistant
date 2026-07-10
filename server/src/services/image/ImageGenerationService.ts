import {
  DEFAULT_NOVEL_COVER_NEGATIVE_PROMPT,
  DEFAULT_NOVEL_COVER_STYLE_PRESET,
} from "@ai-novel/shared/imagePrompt";
import {
  DEFAULT_NOVEL_COVER_IMAGE_COUNT,
  DEFAULT_NOVEL_COVER_IMAGE_SIZE,
  type ImageAsset,
  type ImageGenerationTask,
} from "@ai-novel/shared";
import type { LLMProvider } from "@ai-novel/shared";
import { prisma } from "../../db/prisma";
import { AppError } from "../../middleware/errorHandler";
import {
  buildNovelCoverTaskPrompt,
  loadNovelCoverNovel,
} from "./novelCover/novelCoverPromptSupport";
import { isImageProviderSupported, resolveImageModel } from "./provider";
import {
  removeStoredImageAssetFile,
  resolveImageAssetFile,
} from "./imageAssetStorage";
import {
  buildCharacterPrompt,
  toImageAsset,
  toImageTask,
} from "./imageGenerationMappers";
import { logger } from "../logging/LoggerService";
import { ImageTaskExecutionEngine, markPendingTasksForManualRecovery } from "./ImageTaskExecutionEngine";
import type {
  CharacterImageGenerationRequest,
  NovelCoverImageGenerationRequest,
} from "./types";

function mergeNovelCoverNegativePrompt(input: string | null | undefined): string {
  const normalized = input?.trim();
  if (!normalized) {
    return DEFAULT_NOVEL_COVER_NEGATIVE_PROMPT;
  }
  return normalized.includes(DEFAULT_NOVEL_COVER_NEGATIVE_PROMPT)
    ? normalized
    : `${normalized}，${DEFAULT_NOVEL_COVER_NEGATIVE_PROMPT}`;
}

export class ImageGenerationService {
  private readonly engine: ImageTaskExecutionEngine;

  constructor() {
    this.engine = new ImageTaskExecutionEngine((taskId) => this.engine.enqueueTask(taskId));
  }

  async createCharacterTask(input: CharacterImageGenerationRequest): Promise<ImageGenerationTask> {
    const provider: LLMProvider = input.provider ?? "openai";
    if (!isImageProviderSupported(provider)) {
      throw new AppError(`Provider ${provider} is not supported for image generation yet.`, 400);
    }

    const character = await prisma.baseCharacter.findUnique({
      where: { id: input.baseCharacterId },
    });
    if (!character) {
      throw new AppError("Base character not found.", 404);
    }

    const model = await resolveImageModel(provider, input.model);
    const prompt = input.promptMode === "direct"
      ? input.prompt.trim()
      : buildCharacterPrompt(input.prompt, input.stylePreset, character);
    const task = await prisma.imageGenerationTask.create({
      data: {
        sceneType: "character",
        baseCharacterId: character.id,
        novelId: null,
        provider,
        model,
        prompt,
        negativePrompt: input.negativePrompt?.trim() || null,
        stylePreset: input.stylePreset?.trim() || null,
        size: input.size ?? "1024x1024",
        imageCount: input.count ?? 1,
        seed: input.seed,
        status: "queued",
        maxRetries: input.maxRetries ?? 2,
        heartbeatAt: null,
        currentStage: "queued",
        currentItemKey: character.id,
        currentItemLabel: character.name,
      },
    });
    this.engine.enqueueTask(task.id);
    return toImageTask(task);
  }

  async createNovelCoverTask(input: NovelCoverImageGenerationRequest): Promise<ImageGenerationTask> {
    const provider: LLMProvider = input.provider ?? "openai";
    if (!isImageProviderSupported(provider)) {
      throw new AppError(`Provider ${provider} is not supported for image generation yet.`, 400);
    }

    const novel = await loadNovelCoverNovel(input.novelId);
    const model = await resolveImageModel(provider, input.model);
    const prompt = input.promptMode === "direct"
      ? input.prompt.trim()
      : await buildNovelCoverTaskPrompt({
        novelId: novel.id,
        sourcePrompt: input.prompt,
        stylePreset: input.stylePreset?.trim() || DEFAULT_NOVEL_COVER_STYLE_PRESET,
      });
    const task = await prisma.imageGenerationTask.create({
      data: {
        sceneType: "novel_cover",
        baseCharacterId: null,
        novelId: novel.id,
        provider,
        model,
        prompt,
        negativePrompt: mergeNovelCoverNegativePrompt(input.negativePrompt),
        stylePreset: input.stylePreset?.trim() || DEFAULT_NOVEL_COVER_STYLE_PRESET,
        size: input.size ?? DEFAULT_NOVEL_COVER_IMAGE_SIZE,
        imageCount: input.count ?? DEFAULT_NOVEL_COVER_IMAGE_COUNT,
        seed: input.seed,
        status: "queued",
        maxRetries: input.maxRetries ?? 2,
        heartbeatAt: null,
        currentStage: "queued",
        currentItemKey: novel.id,
        currentItemLabel: novel.title,
      },
    });
    this.engine.enqueueTask(task.id);
    return toImageTask(task);
  }

  async getTask(taskId: string): Promise<ImageGenerationTask> {
    const task = await prisma.imageGenerationTask.findUnique({
      where: { id: taskId },
    });
    return toImageTask(task);
  }

  async retryTask(taskId: string): Promise<ImageGenerationTask> {
    const task = await prisma.imageGenerationTask.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        status: true,
        sceneType: true,
        baseCharacterId: true,
        novelId: true,
      },
    });
    if (!task) {
      throw new AppError("Image task not found.", 404);
    }
    if (task.status !== "failed" && task.status !== "cancelled") {
      throw new AppError("Only failed or cancelled image tasks can be retried.", 400);
    }
    await prisma.imageGenerationTask.update({
      where: { id: taskId },
      data: {
        status: "queued",
        pendingManualRecovery: false,
        progress: 0,
        retryCount: 0,
        error: null,
        startedAt: null,
        finishedAt: null,
        heartbeatAt: null,
        currentStage: "queued",
        currentItemKey: task.novelId ?? task.baseCharacterId,
        currentItemLabel: null,
        cancelRequestedAt: null,
      },
    });
    this.engine.enqueueTask(taskId);
    return this.getTask(taskId);
  }

  async cancelTask(taskId: string): Promise<ImageGenerationTask> {
    const task = await prisma.imageGenerationTask.findUnique({
      where: { id: taskId },
    });
    if (!task) {
      throw new AppError("Image task not found.", 404);
    }
    if (task.status === "succeeded" || task.status === "failed" || task.status === "cancelled") {
      throw new AppError("Only queued or running image tasks can be cancelled.", 400);
    }
    if (task.status === "queued") {
      await prisma.imageGenerationTask.update({
        where: { id: taskId },
        data: {
          status: "cancelled",
          progress: task.progress,
          error: null,
          heartbeatAt: null,
          currentStage: null,
          currentItemKey: null,
          currentItemLabel: null,
          cancelRequestedAt: null,
          finishedAt: new Date(),
        },
      });
    } else {
      await prisma.imageGenerationTask.update({
        where: { id: taskId },
        data: {
          cancelRequestedAt: new Date(),
          heartbeatAt: new Date(),
        },
      });
    }
    return this.getTask(taskId);
  }

  async listCharacterAssets(baseCharacterId: string): Promise<ImageAsset[]> {
    const assets = await prisma.imageAsset.findMany({
      where: {
        sceneType: "character",
        baseCharacterId,
      },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    });
    return assets.map((item) => toImageAsset(item));
  }

  async listNovelCoverAssets(novelId: string): Promise<ImageAsset[]> {
    const assets = await prisma.imageAsset.findMany({
      where: {
        sceneType: "novel_cover",
        novelId,
      },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    });
    return assets.map((item) => toImageAsset(item));
  }

  async setPrimaryAsset(assetId: string): Promise<ImageAsset> {
    const asset = await prisma.imageAsset.findUnique({
      where: { id: assetId },
    });
    if (!asset) {
      throw new AppError("Image asset not found.", 404);
    }

    const sceneType = asset.sceneType === "character" || asset.sceneType === "novel_cover"
      ? asset.sceneType
      : (() => { throw new AppError(`Scene type ${asset.sceneType} is not supported.`, 400); })();
    const ownerWhere = sceneType === "novel_cover"
      ? { sceneType: "novel_cover" as const, novelId: asset.novelId }
      : { sceneType: "character" as const, baseCharacterId: asset.baseCharacterId };

    await prisma.$transaction(async (tx) => {
      await tx.imageAsset.updateMany({
        where: ownerWhere,
        data: { isPrimary: false },
      });
      await tx.imageAsset.update({
        where: { id: asset.id },
        data: { isPrimary: true },
      });
    });
    const updated = await prisma.imageAsset.findUnique({ where: { id: asset.id } });
    return toImageAsset(updated);
  }

  async deleteAsset(assetId: string): Promise<ImageAsset> {
    const asset = await prisma.imageAsset.findUnique({
      where: { id: assetId },
    });
    if (!asset) {
      throw new AppError("Image asset not found.", 404);
    }

    const sceneType = asset.sceneType === "character" || asset.sceneType === "novel_cover"
      ? asset.sceneType
      : (() => { throw new AppError(`Scene type ${asset.sceneType} is not supported.`, 400); })();
    const ownerWhere = sceneType === "novel_cover"
      ? { sceneType: "novel_cover" as const, novelId: asset.novelId }
      : { sceneType: "character" as const, baseCharacterId: asset.baseCharacterId };

    await prisma.$transaction(async (tx) => {
      await tx.imageAsset.delete({
        where: { id: asset.id },
      });

      if (!asset.isPrimary) {
        return;
      }

      const replacement = await tx.imageAsset.findFirst({
        where: ownerWhere,
        orderBy: [{ createdAt: "desc" }],
      });

      if (!replacement) {
        return;
      }

      await tx.imageAsset.update({
        where: { id: replacement.id },
        data: { isPrimary: true },
      });
    });

    try {
      await removeStoredImageAssetFile({
        assetId: asset.id,
        url: asset.url,
        metadata: asset.metadata,
      });
    } catch (error) {
      logger.warn(`[image] failed to remove stored asset file for ${asset.id}.`, error);
    }

    return toImageAsset(asset);
  }

  async getAssetFile(assetId: string): Promise<{ localPath?: string; stream?: NodeJS.ReadableStream; mimeType: string | null }> {
    const asset = await prisma.imageAsset.findUnique({
      where: { id: assetId },
      select: {
        id: true,
        url: true,
        mimeType: true,
        metadata: true,
      },
    });
    if (!asset) {
      throw new AppError("Image asset not found.", 404);
    }

    const resolved = await resolveImageAssetFile({
      assetId: asset.id,
      url: asset.url,
      mimeType: asset.mimeType ?? null,
      metadata: asset.metadata,
    });

    return {
      localPath: resolved.localPath,
      stream: resolved.stream,
      mimeType: resolved.mimeType ?? asset.mimeType ?? null,
    };
  }

  async markPendingTasksForManualRecovery(): Promise<void> {
    return markPendingTasksForManualRecovery();
  }

  async resumeTask(taskId: string): Promise<ImageGenerationTask> {
    const task = await prisma.imageGenerationTask.findUnique({
      where: { id: taskId },
      select: {
        status: true,
      },
    });
    if (!task) {
      throw new AppError("Image task not found.", 404);
    }
    if (task.status !== "queued" && task.status !== "running") {
      throw new AppError("Only queued or running image tasks can be resumed.", 400);
    }

    await prisma.imageGenerationTask.update({
      where: { id: taskId },
      data: {
        status: "queued",
        pendingManualRecovery: false,
        heartbeatAt: null,
        cancelRequestedAt: null,
      },
    });
    this.engine.enqueueTask(taskId);
    return this.getTask(taskId);
  }
}

export const imageGenerationService = new ImageGenerationService();
