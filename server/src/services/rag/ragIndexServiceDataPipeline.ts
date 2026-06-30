/**
 * Data pipeline helpers extracted from RagIndexService.
 *
 * These functions handle document loading, chunking, embedding, and vector-store
 * operations. They accept explicit dependencies (prisma, services, config) instead
 * of reading class members via `this`, so they can live outside the class while
 * remaining pure extractions with no functional changes.
 *
 * Kept under 600 lines — the largest function (loadSourceDocuments) is a switch
 * over owner types and is intentionally left as-is to preserve readability.
 */
import type { PrismaClient } from "@prisma/client";
import { ragConfig } from "../../config/rag";
import { getRagEmbeddingSettings } from "../settings/RagSettingsService";
import { EmbeddingService } from "./EmbeddingService";
import { VectorStoreService } from "./VectorStoreService";
import { resolveEmbeddingChunkTokenBudget } from "./embeddingModelLimits";
import type { RagChunkCandidate, RagOwnerType, RagSourceDocument } from "./types";
import { buildChunkId, computeChunkHash, estimateTokenCount, normalizeRagText, splitRagChunks } from "./utils";
import { buildJoinedText, isCjk, type RagJobProgressSnapshot } from "./ragIndexServiceHelpers";

// ---------------------------------------------------------------------------
// Shared dependency bundle passed from the class to each pipeline function.
// ---------------------------------------------------------------------------

export interface RagPipelineDeps {
  prisma: PrismaClient;
  embeddingService: EmbeddingService;
  vectorStoreService: VectorStoreService;
  /** Callback the class provides so pipeline functions can update job progress. */
  updateJobProgress: (jobId: string, progress: Omit<RagJobProgressSnapshot, "updatedAt">) => Promise<void>;
  /** Callback the class provides so pipeline functions can check cancellation. */
  assertJobNotCancelled: (jobId: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// embedTextsInBatches
// ---------------------------------------------------------------------------

export async function embedTextsInBatches(
  deps: RagPipelineDeps,
  texts: string[],
  onBatchComplete?: (payload: {
    processed: number;
    total: number;
    batchIndex: number;
    totalBatches: number;
  }) => Promise<void>,
): Promise<{ vectors: number[][]; provider: string; model: string }> {
  const vectors: number[][] = [];
  let provider = ragConfig.embeddingProvider;
  let model = ragConfig.embeddingModel;
  const totalBatches = Math.max(1, Math.ceil(texts.length / ragConfig.embeddingBatchSize));

  for (
    let cursor = 0, batchIndex = 0;
    cursor < texts.length;
    cursor += ragConfig.embeddingBatchSize, batchIndex += 1
  ) {
    const batch = texts.slice(cursor, cursor + ragConfig.embeddingBatchSize);
    const result = await deps.embeddingService.embedTexts(batch);
    provider = result.provider;
    model = result.model;
    vectors.push(...result.vectors);
    if (onBatchComplete) {
      await onBatchComplete({
        processed: Math.min(cursor + batch.length, texts.length),
        total: texts.length,
        batchIndex: batchIndex + 1,
        totalBatches,
      });
    }
  }
  return { vectors, provider, model };
}

// ---------------------------------------------------------------------------
// loadSourceDocuments
// ---------------------------------------------------------------------------

export async function loadSourceDocuments(
  deps: RagPipelineDeps,
  ownerType: RagOwnerType,
  ownerId: string,
  tenantId: string,
): Promise<RagSourceDocument[]> {
  const { prisma } = deps;

  switch (ownerType) {
    case "novel": {
      const novel = await prisma.novel.findUnique({
        where: { id: ownerId },
        include: { world: true },
      });
      if (!novel) {
        return [];
      }
      const content = buildJoinedText(
        novel.title,
        novel.description ?? undefined,
        novel.outline ?? undefined,
        novel.structuredOutline ?? undefined,
        novel.world?.description ?? undefined,
      );
      return content
        ? [{
          ownerType,
          ownerId,
          tenantId,
          novelId: novel.id,
          worldId: novel.worldId ?? undefined,
          title: novel.title,
          content,
          metadata: {
            status: novel.status,
            updatedAt: novel.updatedAt.toISOString(),
          },
        }]
        : [];
    }
    case "chapter": {
      const chapter = await prisma.chapter.findUnique({ where: { id: ownerId } });
      if (!chapter) {
        return [];
      }
      const content = buildJoinedText(chapter.title, chapter.content ?? undefined);
      return content
        ? [{
          ownerType,
          ownerId,
          tenantId,
          novelId: chapter.novelId,
          title: chapter.title,
          content,
          metadata: {
            order: chapter.order,
            chapterOrder: chapter.order,
            state: chapter.generationState,
            updatedAt: chapter.updatedAt.toISOString(),
          },
        }]
        : [];
    }
    case "world": {
      const world = await prisma.world.findUnique({ where: { id: ownerId } });
      if (!world) {
        return [];
      }
      const content = buildJoinedText(
        world.name,
        world.description ?? undefined,
        world.background ?? undefined,
        world.geography ?? undefined,
        world.magicSystem ?? undefined,
        world.politics ?? undefined,
        world.cultures ?? undefined,
        world.races ?? undefined,
        world.religions ?? undefined,
        world.technology ?? undefined,
        world.history ?? undefined,
        world.economy ?? undefined,
        world.factions ?? undefined,
        world.conflicts ?? undefined,
        world.overviewSummary ?? undefined,
      );
      return content
        ? [{
          ownerType,
          ownerId,
          tenantId,
          worldId: world.id,
          title: world.name,
          content,
          metadata: {
            worldType: world.worldType,
            status: world.status,
            version: world.version,
            updatedAt: world.updatedAt.toISOString(),
          },
        }]
        : [];
    }
    case "character": {
      const character = await prisma.character.findUnique({ where: { id: ownerId } });
      if (!character) {
        return [];
      }
      const content = buildJoinedText(
        character.name,
        character.role,
        character.personality ?? undefined,
        character.background ?? undefined,
        character.development ?? undefined,
        character.currentState ?? undefined,
        character.currentGoal ?? undefined,
      );
      return content
        ? [{
          ownerType,
          ownerId,
          tenantId,
          novelId: character.novelId,
          title: character.name,
          content,
          metadata: {
            role: character.role,
            updatedAt: character.updatedAt.toISOString(),
          },
        }]
        : [];
    }
    case "bible": {
      const bible = await prisma.novelBible.findUnique({ where: { novelId: ownerId } });
      if (!bible) {
        return [];
      }
      const content = buildJoinedText(
        bible.mainPromise ?? undefined,
        bible.coreSetting ?? undefined,
        bible.forbiddenRules ?? undefined,
        bible.characterArcs ?? undefined,
        bible.worldRules ?? undefined,
        bible.rawContent ?? undefined,
      );
      return content
        ? [{
          ownerType,
          ownerId,
          tenantId,
          novelId: bible.novelId,
          title: `bible-${bible.novelId}`,
          content,
          metadata: {
            updatedAt: bible.updatedAt.toISOString(),
          },
        }]
        : [];
    }
    case "chapter_summary": {
      const summary = await prisma.chapterSummary.findUnique({ where: { chapterId: ownerId } });
      if (!summary) {
        return [];
      }
      const content = buildJoinedText(
        summary.summary,
        summary.keyEvents ?? undefined,
        summary.characterStates ?? undefined,
        summary.hook ?? undefined,
      );
      return content
        ? [{
          ownerType,
          ownerId,
          tenantId,
          novelId: summary.novelId,
          title: `chapter-summary-${summary.chapterId}`,
          content,
          metadata: {
            chapterId: summary.chapterId,
            updatedAt: summary.updatedAt.toISOString(),
          },
        }]
        : [];
    }
    case "consistency_fact": {
      const fact = await prisma.consistencyFact.findUnique({ where: { id: ownerId } });
      if (!fact) {
        return [];
      }
      const content = normalizeRagText(fact.content);
      return content
        ? [{
          ownerType,
          ownerId,
          tenantId,
          novelId: fact.novelId,
          title: `fact-${fact.category}`,
          content,
          metadata: {
            category: fact.category,
            source: fact.source,
            chapterId: fact.chapterId,
            updatedAt: fact.updatedAt.toISOString(),
          },
        }]
        : [];
    }
    case "character_timeline": {
      const timeline = await prisma.characterTimeline.findUnique({ where: { id: ownerId } });
      if (!timeline) {
        return [];
      }
      const content = buildJoinedText(timeline.title, timeline.content);
      return content
        ? [{
          ownerType,
          ownerId,
          tenantId,
          novelId: timeline.novelId,
          title: timeline.title,
          content,
          metadata: {
            source: timeline.source,
            characterId: timeline.characterId,
            chapterId: timeline.chapterId,
            chapterOrder: timeline.chapterOrder,
            updatedAt: timeline.updatedAt.toISOString(),
          },
        }]
        : [];
    }
    case "world_library_item": {
      const item = await prisma.worldPropertyLibrary.findUnique({ where: { id: ownerId } });
      if (!item) {
        return [];
      }
      const content = buildJoinedText(item.name, item.description ?? undefined);
      return content
        ? [{
          ownerType,
          ownerId,
          tenantId,
          worldId: item.sourceWorldId ?? undefined,
          title: item.name,
          content,
          metadata: {
            category: item.category,
            worldType: item.worldType,
            usageCount: item.usageCount,
            updatedAt: item.updatedAt.toISOString(),
          },
        }]
        : [];
    }
    case "knowledge_document": {
      const document = await prisma.knowledgeDocument.findUnique({
        where: { id: ownerId },
        include: { activeVersion: true },
      });
      if (!document?.activeVersion || document.status === "archived") {
        return [];
      }
      const content = normalizeRagText(document.activeVersion.content);
      return content
        ? [{
          ownerType,
          ownerId,
          tenantId,
          title: document.title,
          content,
          metadata: {
            fileName: document.fileName,
            status: document.status,
            activeVersionId: document.activeVersionId,
            activeVersionNumber: document.activeVersionNumber,
            updatedAt: document.updatedAt.toISOString(),
          },
        }]
        : [];
    }
    case "chat_message":
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// buildChunkCandidates
// ---------------------------------------------------------------------------

export function buildChunkCandidates(
  documents: RagSourceDocument[],
  embedProvider: string,
  embedModel: string,
  options?: { maxTokens?: number | null },
): RagChunkCandidate[] {
  const candidates: RagChunkCandidate[] = [];
  for (const document of documents) {
    const pieces = splitRagChunks(document.content, ragConfig.chunkSize, ragConfig.chunkOverlap, {
      maxTokens: options?.maxTokens ?? null,
    });
    for (let index = 0; index < pieces.length; index += 1) {
      const chunkText = pieces[index];
      const chunkHash = computeChunkHash(
        `${document.tenantId}|${document.ownerType}|${document.ownerId}|${index}|${chunkText}`,
      );
      candidates.push({
        id: buildChunkId(),
        ownerType: document.ownerType,
        ownerId: document.ownerId,
        tenantId: document.tenantId,
        title: document.title,
        chunkText,
        chunkHash,
        chunkOrder: index,
        tokenEstimate: estimateTokenCount(chunkText),
        language: isCjk(chunkText) ? "zh" : "en",
        metadataJson: document.metadata ? JSON.stringify(document.metadata) : undefined,
        embedProvider,
        embedModel,
        embedVersion: ragConfig.embeddingVersion,
        novelId: document.novelId,
        worldId: document.worldId,
      });
    }
  }
  return candidates;
}

// ---------------------------------------------------------------------------
// deleteOwnerChunks
// ---------------------------------------------------------------------------

export async function deleteOwnerChunks(
  deps: RagPipelineDeps,
  ownerType: RagOwnerType,
  ownerId: string,
  tenantId: string,
  jobId?: string,
): Promise<{ deleted: number }> {
  if (jobId) {
    await deps.assertJobNotCancelled(jobId);
  }
  const existing = await deps.prisma.knowledgeChunk.findMany({
    where: { tenantId, ownerType, ownerId },
    select: { id: true },
  });
  if (existing.length === 0) {
    return { deleted: 0 };
  }
  if (jobId) {
    await deps.updateJobProgress(jobId, {
      stage: "deleting_existing",
      label: "清理旧索引",
      detail: `正在删除 ${existing.length} 条旧分块。`,
      current: existing.length,
      total: existing.length,
      documents: 0,
      chunks: existing.length,
      percent: 0.8,
    });
  }
  const ids = existing.map((item) => item.id);
  await deps.vectorStoreService.deletePoints(ids);
  await deps.prisma.knowledgeChunk.deleteMany({
    where: { tenantId, ownerType, ownerId },
  });
  return { deleted: existing.length };
}

// ---------------------------------------------------------------------------
// upsertOwnerChunks
// ---------------------------------------------------------------------------

export async function upsertOwnerChunks(
  deps: RagPipelineDeps,
  ownerType: RagOwnerType,
  ownerId: string,
  tenantId: string,
  jobId: string,
): Promise<{ chunks: number }> {
  await deps.assertJobNotCancelled(jobId);
  await deps.updateJobProgress(jobId, {
    stage: "loading_source",
    label: "读取文档",
    detail: "正在读取知识库文档内容。",
    documents: 0,
    chunks: 0,
    percent: 0.05,
  });
  const docs = await loadSourceDocuments(deps, ownerType, ownerId, tenantId);
  await deps.assertJobNotCancelled(jobId);
  if (docs.length === 0) {
    await deps.updateJobProgress(jobId, {
      stage: "deleting_existing",
      label: "清理旧索引",
      detail: "当前没有可索引内容，正在清理旧索引。",
      documents: 0,
      chunks: 0,
      percent: 0.3,
    });
    await deleteOwnerChunks(deps, ownerType, ownerId, tenantId, jobId);
    await deps.updateJobProgress(jobId, {
      stage: "completed",
      label: "索引完成",
      detail: "没有可索引内容，旧索引已清理。",
      documents: 0,
      chunks: 0,
      percent: 1,
    });
    return { chunks: 0 };
  }

  const embeddingSettings = await getRagEmbeddingSettings();
  const embeddingTokenBudget = resolveEmbeddingChunkTokenBudget(
    embeddingSettings.embeddingProvider,
    embeddingSettings.embeddingModel,
  );
  const candidates = buildChunkCandidates(docs, embeddingSettings.embeddingProvider, embeddingSettings.embeddingModel, {
    maxTokens: embeddingTokenBudget,
  });
  const splitTexts = candidates.map((item) => item.chunkText);
  await deps.updateJobProgress(jobId, {
    stage: "chunking",
    label: "切分分块",
    detail: `已读取 ${docs.length} 份文档，生成 ${splitTexts.length} 个分块。`,
    current: splitTexts.length,
    total: splitTexts.length,
    documents: docs.length,
    chunks: splitTexts.length,
    percent: 0.15,
  });
  await deps.assertJobNotCancelled(jobId);
  const embedding = await embedTextsInBatches(deps, splitTexts, async ({ processed, total, batchIndex, totalBatches }) => {
    await deps.updateJobProgress(jobId, {
      stage: "embedding",
      label: "生成向量",
      detail: `正在生成向量，第 ${batchIndex}/${totalBatches} 批。`,
      current: processed,
      total,
      documents: docs.length,
      chunks: total,
      percent: 0.15 + (total > 0 ? (processed / total) * 0.5 : 0),
    });
  });
  await deps.assertJobNotCancelled(jobId);
  for (const candidate of candidates) {
    candidate.embedProvider = embedding.provider;
    candidate.embedModel = embedding.model;
  }
  if (candidates.length === 0) {
    await deps.updateJobProgress(jobId, {
      stage: "deleting_existing",
      label: "清理旧索引",
      detail: "切分后没有可写入的分块，正在清理旧索引。",
      documents: docs.length,
      chunks: 0,
      percent: 0.3,
    });
    await deleteOwnerChunks(deps, ownerType, ownerId, tenantId, jobId);
    await deps.updateJobProgress(jobId, {
      stage: "completed",
      label: "索引完成",
      detail: "切分后没有可写入的分块。",
      documents: docs.length,
      chunks: 0,
      percent: 1,
    });
    return { chunks: 0 };
  }
  if (embedding.vectors.length !== candidates.length) {
    throw new Error("RAG embedding 数量与 chunk 数量不一致。");
  }

  const vectorSize = embedding.vectors[0]?.length ?? 0;
  await deps.updateJobProgress(jobId, {
    stage: "ensuring_collection",
    label: "校验集合",
    detail: `正在校验向量集合，目标维度 ${vectorSize}。`,
    current: candidates.length,
    total: candidates.length,
    documents: docs.length,
    chunks: candidates.length,
    percent: 0.7,
  });
  await deps.assertJobNotCancelled(jobId);
  await deps.vectorStoreService.ensureCollection(vectorSize);

  const existing = await deps.prisma.knowledgeChunk.findMany({
    where: { tenantId, ownerType, ownerId },
    select: { id: true },
  });
  await deps.assertJobNotCancelled(jobId);
  if (existing.length > 0) {
    await deps.updateJobProgress(jobId, {
      stage: "deleting_existing",
      label: "清理旧索引",
      detail: `发现 ${existing.length} 条旧分块，正在清理。`,
      current: existing.length,
      total: existing.length,
      documents: docs.length,
      chunks: candidates.length,
      percent: 0.8,
    });
    await deps.assertJobNotCancelled(jobId);
    await deps.vectorStoreService.deletePoints(existing.map((item) => item.id));
  } else {
    await deps.updateJobProgress(jobId, {
      stage: "deleting_existing",
      label: "清理旧索引",
      detail: "未发现旧分块，准备写入新索引。",
      current: 0,
      total: 0,
      documents: docs.length,
      chunks: candidates.length,
      percent: 0.8,
    });
  }

  await deps.updateJobProgress(jobId, {
    stage: "upserting_vectors",
    label: "写入向量库",
    detail: `正在向 Qdrant 写入 ${candidates.length} 个分块。`,
    current: candidates.length,
    total: candidates.length,
    documents: docs.length,
    chunks: candidates.length,
    percent: 0.9,
  });
  await deps.assertJobNotCancelled(jobId);
  await deps.vectorStoreService.upsertPoints(
    candidates.map((item, index) => ({
      id: item.id,
      vector: embedding.vectors[index],
      payload: {
        tenantId: item.tenantId,
        ownerType: item.ownerType,
        ownerId: item.ownerId,
        novelId: item.novelId,
        worldId: item.worldId,
        title: item.title,
        chunkText: item.chunkText,
        chunkHash: item.chunkHash,
        chunkOrder: item.chunkOrder,
        metadataJson: item.metadataJson,
      },
    })),
  );

  try {
    await deps.updateJobProgress(jobId, {
      stage: "writing_metadata",
      label: "写入索引元数据",
      detail: `正在写入 ${candidates.length} 条本地索引记录。`,
      current: candidates.length,
      total: candidates.length,
      documents: docs.length,
      chunks: candidates.length,
      percent: 0.97,
    });
    await deps.prisma.$transaction(async (tx) => {
      await tx.knowledgeChunk.deleteMany({
        where: { tenantId, ownerType, ownerId },
      });
      await tx.knowledgeChunk.createMany({
        data: candidates.map((item) => ({
          id: item.id,
          tenantId: item.tenantId,
          ownerType: item.ownerType,
          ownerId: item.ownerId,
          novelId: item.novelId ?? null,
          worldId: item.worldId ?? null,
          title: item.title ?? null,
          chunkText: item.chunkText,
          chunkHash: item.chunkHash,
          chunkOrder: item.chunkOrder,
          tokenEstimate: item.tokenEstimate,
          language: item.language,
          metadataJson: item.metadataJson ?? null,
          embedProvider: item.embedProvider,
          embedModel: item.embedModel,
          embedVersion: item.embedVersion,
          indexedAt: new Date(),
        })),
      });
    });
  } catch (error) {
    await deps.vectorStoreService.deletePoints(candidates.map((item) => item.id));
    throw error;
  }

  await deps.updateJobProgress(jobId, {
    stage: "completed",
    label: "索引完成",
    detail: `索引已完成，共 ${candidates.length} 个分块。`,
    current: candidates.length,
    total: candidates.length,
    documents: docs.length,
    chunks: candidates.length,
    percent: 1,
  });
  return { chunks: candidates.length };
}
