import { serializeCommercialTagsJson } from "@ai-novel/shared";
import { prisma } from "../../db/prisma";
import { AppError } from "../../middleware/errorHandler";
import { NovelContinuationService } from "./NovelContinuationService";
import { listNovelTokenUsageByNovelIds } from "./novelTokenUsageSummary";
import { listLatestVisibleAutoDirectorTasksByNovelIds } from "./novelCoreAutoDirectorTasks";
import { NovelWorkflowService } from "./workflow/NovelWorkflowService";
import {
  CreateNovelInput,
  normalizeNovelOutput,
  normalizeOptionalTextForCreate,
  normalizeOptionalTextForUpdate,
  PaginationInput,
  parseContinuationBookAnalysisSections,
  serializeBookFramingJson,
  serializeContinuationBookAnalysisSections,
  serializeContinuationSetupJson,
  serializeSetupProgressJson,
  UpdateNovelInput,
} from "./novelCoreShared";
import { queueRagDelete, queueRagUpsert } from "./novelCoreSupport";

export class NovelCoreCrudService {
  private readonly novelContinuationService = new NovelContinuationService();

  private validateStoryModeSelection(primaryStoryModeId?: string | null, secondaryStoryModeId?: string | null): void {
    if (primaryStoryModeId && secondaryStoryModeId && primaryStoryModeId === secondaryStoryModeId) {
      throw new AppError("主流派模式和副流派模式不能选择同一项。", 400);
    }
  }

  async listNovels({ page, limit }: PaginationInput) {
    const [items, total] = await Promise.all([
      prisma.novel.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          description: true,
          targetAudience: true,
          bookFramingJson: true,
          commercialTagsJson: true,
          status: true,
          writingMode: true,
          projectMode: true,
          narrativePov: true,
          pacePreference: true,
          styleTone: true,
          emotionIntensity: true,
          aiFreedom: true,
          postGenerationStyleReviewEnabled: true,
          defaultChapterLength: true,
          estimatedChapterCount: true,
          setupProgressJson: true,
          sourceNovelId: true,
          continuationSetupJson: true,
          storyWorldSliceCacheJson: true,
          genreId: true,
          primaryStoryModeId: true,
          secondaryStoryModeId: true,
          worldId: true,
          createdAt: true,
          updatedAt: true,
          genre: { select: { id: true, name: true } },
          world: { select: { id: true, name: true, worldType: true } },
          _count: { select: { chapters: true, characters: true, plotBeats: true } },
        },
      }),
      prisma.novel.count(),
    ]);

    const latestAutoDirectorTaskByNovelId = await listLatestVisibleAutoDirectorTasksByNovelIds(
      items.map((item) => item.id),
      new NovelWorkflowService(),
    );
    const tokenUsageByNovelId = await listNovelTokenUsageByNovelIds(items.map((item) => item.id));

    return {
      items: items.map((item) => ({
        ...normalizeNovelOutput(item),
        latestAutoDirectorTask: latestAutoDirectorTaskByNovelId.get(item.id) ?? null,
        tokenUsage: tokenUsageByNovelId.get(item.id) ?? null,
      })),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async createNovel(input: CreateNovelInput) {
    const writingMode = input.writingMode ?? "original";
    const sourceNovelId = input.sourceNovelId ?? null;
    const sourceKnowledgeDocumentId = input.sourceKnowledgeDocumentId ?? null;
    const continuationBookAnalysisId = input.continuationBookAnalysisId ?? null;
    const normalizedContinuationBookAnalysisId =
      writingMode === "continuation" && (sourceNovelId || sourceKnowledgeDocumentId) ? continuationBookAnalysisId : null;
    const continuationBookAnalysisSections = serializeContinuationBookAnalysisSections(
      input.continuationBookAnalysisSections,
    );
    const commercialTagsJson = serializeCommercialTagsJson(input.commercialTags);
    this.validateStoryModeSelection(input.primaryStoryModeId, input.secondaryStoryModeId);

    await this.novelContinuationService.validateWritingModeConfig({
      writingMode,
      sourceNovelId,
      sourceKnowledgeDocumentId,
      continuationBookAnalysisId: normalizedContinuationBookAnalysisId,
    });

    const created = await prisma.novel.create({
      data: {
        title: input.title,
        description: input.description,
        targetAudience: normalizeOptionalTextForCreate(input.targetAudience),
        bookFramingJson: serializeBookFramingJson({
          bookSellingPoint: normalizeOptionalTextForCreate(input.bookSellingPoint),
          competingFeel: normalizeOptionalTextForCreate(input.competingFeel),
          first30ChapterPromise: normalizeOptionalTextForCreate(input.first30ChapterPromise),
        }),
        commercialTagsJson,
        genreId: input.genreId,
        primaryStoryModeId: input.primaryStoryModeId ?? null,
        secondaryStoryModeId: input.secondaryStoryModeId ?? null,
        worldId: input.worldId,
        writingMode,
        projectMode: input.projectMode,
        narrativePov: input.narrativePov,
        pacePreference: input.pacePreference,
        styleTone: input.styleTone,
        emotionIntensity: input.emotionIntensity,
        aiFreedom: input.aiFreedom,
        postGenerationStyleReviewEnabled: input.postGenerationStyleReviewEnabled,
        defaultChapterLength: input.defaultChapterLength,
        estimatedChapterCount: input.estimatedChapterCount,
        setupProgressJson: serializeSetupProgressJson({
          projectStatus: input.projectStatus,
          storylineStatus: input.storylineStatus,
          outlineStatus: input.outlineStatus,
          resourceReadyScore: input.resourceReadyScore,
        }),
        outline: input.outline ?? null,
        sourceNovelId: writingMode === "continuation" ? sourceNovelId : null,
        continuationSetupJson: serializeContinuationSetupJson({
          sourceKnowledgeDocumentId: writingMode === "continuation" ? sourceKnowledgeDocumentId : null,
          continuationBookAnalysisId: normalizedContinuationBookAnalysisId ?? (writingMode === "continuation" ? continuationBookAnalysisId : null),
          continuationBookAnalysisSections:
            writingMode === "continuation"
            && (sourceNovelId || sourceKnowledgeDocumentId)
            && normalizedContinuationBookAnalysisId
              ? input.continuationBookAnalysisSections
              : null,
        }),
      },
    });

    queueRagUpsert("novel", created.id);
    if (created.worldId) {
      queueRagUpsert("world", created.worldId);
    }
    return normalizeNovelOutput(created);
  }

  async getNovelById(id: string) {
    const row = await prisma.novel.findUnique({
      where: { id },
      include: {
        genre: true,
        primaryStoryMode: true,
        secondaryStoryMode: true,
        world: true,
        bible: true,
        bookContract: true,
        chapters: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            content: true,
            order: true,
            generationState: true,
            chapterStatus: true,
            targetWordCount: true,
            conflictLevel: true,
            revealLevel: true,
            mustAvoid: true,
            // taskSheet/sceneCards 仅在章节编辑 tab 需要，通过 chapter detail 端点按需加载
            repairHistory: true,
            qualityScore: true,
            continuityScore: true,
            characterScore: true,
            pacingScore: true,
            riskFlags: true,
            hook: true,
            expectation: true,
            locked: true,
            novelId: true,
            createdAt: true,
            updatedAt: true,
            chapterSummary: {
              select: {
                id: true,
                novelId: true,
                chapterId: true,
                summary: true,
                keyEvents: true,
                characterStates: true,
                hook: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
        characters: { orderBy: { createdAt: "asc" } },
        plotBeats: { orderBy: [{ chapterOrder: "asc" }, { createdAt: "asc" }] },
      },
    });
    if (!row) {
      return null;
    }
    // structuredOutline (58KB) 通过独立端点按需加载，detail 响应中置 null
    const normalized = normalizeNovelOutput(row);
    return { ...normalized, structuredOutline: null };
  }

  async getNovelStructuredOutline(id: string): Promise<string | null> {
    const row = await prisma.novel.findUnique({
      where: { id },
      select: { structuredOutline: true },
    });
    return row?.structuredOutline ?? null;
  }

  async updateNovel(id: string, input: UpdateNovelInput) {
    const existing = await prisma.novel.findUnique({
      where: { id },
      select: {
        id: true,
        worldId: true,
        writingMode: true,
        sourceNovelId: true,
        continuationSetupJson: true,
        primaryStoryModeId: true,
        secondaryStoryModeId: true,
      },
    });
    if (!existing) {
      throw new Error("小说不存在");
    }

    const existingContinuation = (() => {
      try {
        return existing.continuationSetupJson ? JSON.parse(existing.continuationSetupJson) as Record<string, unknown> : {};
      } catch {
        return {};
      }
    })() as { sourceKnowledgeDocumentId?: string | null; continuationBookAnalysisId?: string | null; continuationBookAnalysisSections?: unknown };

    const nextWritingMode = input.writingMode ?? (existing.writingMode === "continuation" ? "continuation" : "original");
    const nextSourceNovelId = input.sourceNovelId !== undefined ? input.sourceNovelId : existing.sourceNovelId;
    const nextSourceKnowledgeDocumentId = input.sourceKnowledgeDocumentId !== undefined
      ? input.sourceKnowledgeDocumentId
      : (existingContinuation.sourceKnowledgeDocumentId ?? null);
    const nextContinuationBookAnalysisId = input.continuationBookAnalysisId !== undefined
      ? input.continuationBookAnalysisId
      : (existingContinuation.continuationBookAnalysisId ?? null);
    const nextContinuationBookAnalysisSections = input.continuationBookAnalysisSections !== undefined
      ? input.continuationBookAnalysisSections
      : parseContinuationBookAnalysisSections(existingContinuation.continuationBookAnalysisSections as string | null | undefined);
    const nextPrimaryStoryModeId = input.primaryStoryModeId !== undefined
      ? input.primaryStoryModeId
      : existing.primaryStoryModeId;
    const nextSecondaryStoryModeId = input.secondaryStoryModeId !== undefined
      ? input.secondaryStoryModeId
      : existing.secondaryStoryModeId;
    const normalizedNextContinuationBookAnalysisId =
      nextWritingMode === "continuation" && (nextSourceNovelId || nextSourceKnowledgeDocumentId)
        ? nextContinuationBookAnalysisId
        : null;
    this.validateStoryModeSelection(nextPrimaryStoryModeId, nextSecondaryStoryModeId);

    await this.novelContinuationService.validateWritingModeConfig({
      novelId: id,
      writingMode: nextWritingMode,
      sourceNovelId: nextSourceNovelId,
      sourceKnowledgeDocumentId: nextSourceKnowledgeDocumentId,
      continuationBookAnalysisId: normalizedNextContinuationBookAnalysisId,
    });

    const {
      continuationBookAnalysisSections: _ignoreSectionPatch,
      targetAudience: _ignoreTargetAudience,
      bookSellingPoint: _ignoreBookSellingPoint,
      competingFeel: _ignoreCompetingFeel,
      first30ChapterPromise: _ignoreFirst30ChapterPromise,
      commercialTags: _ignoreCommercialTags,
      payoffExpiryThreshold: _ignorePayoffExpiryThreshold,
      projectStatus: _ignoreProjectStatus,
      storylineStatus: _ignoreStorylineStatus,
      outlineStatus: _ignoreOutlineStatus,
      resourceReadyScore: _ignoreResourceReadyScore,
      ...restInput
    } = input;

    const commercialTagsJson = input.commercialTags !== undefined
      ? serializeCommercialTagsJson(input.commercialTags)
      : undefined;
    const nextWorldId = input.worldId !== undefined ? input.worldId : existing.worldId;
    const shouldResetWorldSlice = nextWorldId !== existing.worldId;

    const updated = await prisma.novel.update({
      where: { id },
      data: {
        ...restInput,
        payoffExpiryThreshold: input.payoffExpiryThreshold ?? undefined,
        sourceNovelId: nextWritingMode === "continuation" ? nextSourceNovelId : null,
        primaryStoryModeId: nextPrimaryStoryModeId ?? null,
        secondaryStoryModeId: nextSecondaryStoryModeId ?? null,
        targetAudience: normalizeOptionalTextForUpdate(input.targetAudience),
        bookFramingJson: (input.bookSellingPoint !== undefined || input.competingFeel !== undefined || input.first30ChapterPromise !== undefined)
          ? serializeBookFramingJson({
              bookSellingPoint: normalizeOptionalTextForUpdate(input.bookSellingPoint),
              competingFeel: normalizeOptionalTextForUpdate(input.competingFeel),
              first30ChapterPromise: normalizeOptionalTextForUpdate(input.first30ChapterPromise),
            })
          : undefined,
        commercialTagsJson,
        setupProgressJson: (input.projectStatus !== undefined || input.storylineStatus !== undefined || input.outlineStatus !== undefined || input.resourceReadyScore !== undefined)
          ? serializeSetupProgressJson({
              projectStatus: input.projectStatus,
              storylineStatus: input.storylineStatus,
              outlineStatus: input.outlineStatus,
              resourceReadyScore: input.resourceReadyScore,
            })
          : undefined,
        continuationSetupJson: serializeContinuationSetupJson({
          sourceKnowledgeDocumentId: nextWritingMode === "continuation" ? nextSourceKnowledgeDocumentId : null,
          continuationBookAnalysisId: normalizedNextContinuationBookAnalysisId,
          continuationBookAnalysisSections:
            nextWritingMode === "continuation"
            && (nextSourceNovelId || nextSourceKnowledgeDocumentId)
            && normalizedNextContinuationBookAnalysisId
              ? nextContinuationBookAnalysisSections
              : null,
        }),
      },
      include: {
        primaryStoryMode: true,
        secondaryStoryMode: true,
      },
    });

    if (shouldResetWorldSlice) {
      await prisma.novelWorld.deleteMany({ where: { novelId: id } });
    }

    queueRagUpsert("novel", id);
    if (updated.worldId) {
      queueRagUpsert("world", updated.worldId);
    }
    return normalizeNovelOutput(updated);
  }

  async deleteNovel(id: string) {
    queueRagDelete("novel", id);
    queueRagDelete("bible", id);
    await prisma.novel.delete({ where: { id } });
  }
}
