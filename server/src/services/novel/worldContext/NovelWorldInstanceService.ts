import type { StoryWorldSlice } from "@ai-novel/shared";
import type { LLMProvider } from "@ai-novel/shared";
import type {
  NovelWorldAssetSummary,
  NovelWorldHandbook,
  NovelWorldSyncRecordSummary,
  NovelWorldSyncDiff,
  NovelWorldSyncInput,
  NovelWorldSyncSection,
} from "@ai-novel/shared";
import { prisma } from "../../../db/prisma";
import { runStructuredPrompt } from "../../../prompting/core/promptRunner";
import { novelThemeWorldGenerationPrompt } from "../../../prompting/prompts/world/world.prompts";
import {
  applyStructuredWorldToLegacyFields,
  buildWorldBindingSupport,
  normalizeWorldStructuredData,
  WORLD_STRUCTURE_SCHEMA_VERSION,
} from "../../world/worldStructure";
import { normalizeLayerStates } from "../../world/worldServiceShared";
import { serializeNovelWorldAssetRows, type WorldAssetRow } from "./novelWorldAssets";
import { buildNovelWorldHandbook, parseCommercialTags } from "./novelWorldProjection";
import { parseSyncPendingChanges } from "./novelWorldSyncPending";
import { listNovelWorldSyncRecords } from "./novelWorldSyncRecords";
import { NovelWorldSyncService } from "./NovelWorldSyncService";

export interface NovelWorldInstanceRow {
  id: string;
  novelId: string;
  sourceWorldId: string | null;
  sourceType: string;
  title: string | null;
  coverSummary: string | null;
  structuredDataJson: string | null;
  bindingContractJson: string | null;
  storySliceJson: string | null;
  storySliceOverridesJson: string | null;
  storySliceSchemaVersion: number;
  storySliceBuiltAt: Date | string | null;
  storySliceDigest: string | null;
  syncEnabled: boolean;
  syncDirection: string;
  syncBaseVersion: number | null;
  lastSyncedAt: Date | string | null;
  syncPendingChangesJson: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

function extractImportedMaterialFromOutline(outline: string | null): string | undefined {
  if (!outline) return undefined;
  const worldMatch = outline.match(/【世界观设定】\s*\n([\s\S]*?)(?=\n【|$)/);
  const charactersMatch = outline.match(/【角色阵容】\s*\n([\s\S]*?)(?=\n【|$)/);
  const outlineStoryMatch = outline.match(/【故事大纲】\s*\n([\s\S]*?)(?=\n【|$)/);

  const parts: string[] = [];
  if (worldMatch?.[1]?.trim()) parts.push(`世界观设定：\n${worldMatch[1].trim()}`);
  if (charactersMatch?.[1]?.trim()) parts.push(`角色阵容：\n${charactersMatch[1].trim()}`);
  if (outlineStoryMatch?.[1]?.trim()) parts.push(`故事大纲：\n${outlineStoryMatch[1].trim()}`);

  return parts.length > 0 ? parts.join("\n\n") : undefined;
}

export interface NovelWorldGenerationValidationResult {
  overallScore: number;
  matches: Array<{
    aspect: string;
    score: number;
    detail: string;
  }>;
  deviations: Array<{
    aspect: string;
    sourceMaterial: string;
    generatedContent: string;
    severity: "minor" | "moderate" | "major";
    suggestion: string;
  }>;
  summary: string;
}

export interface NovelWorldInstanceView {
  hasNovelWorld: boolean;
  novelWorld: {
    id: string;
    novelId: string;
    sourceWorldId: string | null;
    sourceType: string;
    title: string | null;
    coverSummary: string | null;
    syncEnabled: boolean;
    syncDirection: string;
    syncBaseVersion: number | null;
    lastSyncedAt: string | null;
    syncPendingChangeCount: number;
    syncPendingSections: NovelWorldSyncSection[];
    syncPendingSummary: string | null;
    hasStructuredData: boolean;
    hasStorySlice: boolean;
    storySliceBuiltAt: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  handbook?: NovelWorldHandbook | null;
  assets: NovelWorldAssetSummary[];
  syncHistory: NovelWorldSyncRecordSummary[];
  generationValidation?: NovelWorldGenerationValidationResult | null;
}

interface LegacyNovelWorldSourceRow {
  novelId: string;
  worldId: string | null;
  novelCreatedAt: Date | string;
  novelUpdatedAt: Date | string;
  worldName: string | null;
  worldSummary: string | null;
  structureJson: string | null;
  bindingSupportJson: string | null;
  worldVersion: number | null;
}

export class NovelWorldInstanceService {
  private readonly syncService = new NovelWorldSyncService((novelId) => this.ensureFromLegacyNovel(novelId));

  private serializeView(
    row: NovelWorldInstanceRow | null,
    assets: NovelWorldAssetSummary[] = serializeNovelWorldAssetRows([]),
    syncHistory: NovelWorldSyncRecordSummary[] = [],
    generationValidation?: NovelWorldGenerationValidationResult | null
  ): NovelWorldInstanceView {
    if (!row) {
      return {
        hasNovelWorld: false,
        novelWorld: null,
        handbook: null,
        assets: [],
        syncHistory: [],
        generationValidation: generationValidation ?? null,
      };
    }
    const syncPending = parseSyncPendingChanges(row.syncPendingChangesJson);
    return {
      hasNovelWorld: true,
      novelWorld: {
        id: row.id,
        novelId: row.novelId,
        sourceWorldId: row.sourceWorldId,
        sourceType: row.sourceType,
        title: row.title,
        coverSummary: row.coverSummary,
        syncEnabled: row.syncEnabled,
        syncDirection: row.syncDirection,
        syncBaseVersion: row.syncBaseVersion,
        lastSyncedAt: row.lastSyncedAt ? new Date(row.lastSyncedAt).toISOString() : null,
        syncPendingChangeCount: syncPending.differenceCount,
        syncPendingSections: syncPending.sections,
        syncPendingSummary: syncPending.summary,
        hasStructuredData: Boolean(row.structuredDataJson?.trim()),
        hasStorySlice: Boolean(row.storySliceJson?.trim()),
        storySliceBuiltAt: row.storySliceBuiltAt ? new Date(row.storySliceBuiltAt).toISOString() : null,
        createdAt: new Date(row.createdAt).toISOString(),
        updatedAt: new Date(row.updatedAt).toISOString(),
      },
      handbook: buildNovelWorldHandbook(row),
      assets,
      syncHistory,
      generationValidation: generationValidation ?? null,
    };
  }

  private async getAssetSummaries(row: NovelWorldInstanceRow | null): Promise<NovelWorldAssetSummary[]> {
    if (!row) {
      return [];
    }
    try {
      const rows = await prisma.$queryRaw<WorldAssetRow[]>`
        SELECT
          "id",
          "assetType",
          "title",
          "description",
          "status",
          "thumbnailUrl",
          "version",
          "renderDataJson",
          "updatedAt"
        FROM "WorldAsset"
        WHERE "novelWorldId" = ${row.id}
           OR (${row.sourceWorldId} IS NOT NULL AND "worldId" = ${row.sourceWorldId})
        ORDER BY "updatedAt" DESC
      `;
      return serializeNovelWorldAssetRows(rows);
    } catch {
      return serializeNovelWorldAssetRows([]);
    }
  }

  async getByNovelId(novelId: string): Promise<NovelWorldInstanceRow | null> {
    const rows = await prisma.$queryRaw<NovelWorldInstanceRow[]>`
      SELECT
        "id",
        "novelId",
        "sourceWorldId",
        "sourceType",
        "title",
        "coverSummary",
        "structuredDataJson",
        "bindingContractJson",
        "storySliceJson",
        "storySliceOverridesJson",
        "storySliceSchemaVersion",
        "storySliceBuiltAt",
        "storySliceDigest",
        "syncEnabled",
        "syncDirection",
        "syncBaseVersion",
        "lastSyncedAt",
        "syncPendingChangesJson",
        "createdAt",
        "updatedAt"
      FROM "NovelWorld"
      WHERE "novelId" = ${novelId}
      LIMIT 1
    `;
    return rows[0] ?? null;
  }

  async getNovelWorldView(
    novelId: string,
    generationValidation?: NovelWorldGenerationValidationResult | null
  ): Promise<NovelWorldInstanceView> {
    const row = await this.ensureFromLegacyNovel(novelId);
    return this.serializeView(row, await this.getAssetSummaries(row), await listNovelWorldSyncRecords(row?.id), generationValidation);
  }

  async deleteNovelWorld(novelId: string): Promise<void> {
    // 1. 删除 NovelWorld 记录（级联删除关联的 sync records 等）
    await prisma.novelWorld.deleteMany({ where: { novelId } });
    // 2. 清除 Novel 上的世界关联
    await prisma.novel.update({
      where: { id: novelId },
      data: { worldId: null },
    });
  }

  async ensureFromLegacyNovel(novelId: string): Promise<NovelWorldInstanceRow | null> {
    const existing = await this.getByNovelId(novelId);
    if (existing) {
      return existing;
    }

    const rows = await prisma.$queryRaw<LegacyNovelWorldSourceRow[]>`
      SELECT
        n."id" AS "novelId",
        n."worldId" AS "worldId",
        n."createdAt" AS "novelCreatedAt",
        n."updatedAt" AS "novelUpdatedAt",
        w."name" AS "worldName",
        COALESCE(w."overviewSummary", w."description") AS "worldSummary",
        w."structureJson" AS "structureJson",
        w."bindingSupportJson" AS "bindingSupportJson",
        w."version" AS "worldVersion"
      FROM "Novel" n
      LEFT JOIN "World" w ON w."id" = n."worldId"
      WHERE n."id" = ${novelId}
      LIMIT 1
    `;
    const source = rows[0];
    if (!source) {
      throw new Error("小说不存在。");
    }
    if (!source.worldId) {
      return null;
    }

    const novelWorldId = `novel_world_${source.novelId}`;
    await prisma.$executeRaw`
      INSERT INTO "NovelWorld" (
        "id",
        "novelId",
        "sourceWorldId",
        "sourceType",
        "title",
        "coverSummary",
        "structuredDataJson",
        "bindingContractJson",
        "storySliceJson",
        "storySliceOverridesJson",
        "storySliceSchemaVersion",
        "storySliceBuiltAt",
        "storySliceDigest",
        "syncEnabled",
        "syncDirection",
        "syncBaseVersion",
        "createdAt",
        "updatedAt"
      ) VALUES (
        ${novelWorldId},
        ${source.novelId},
        ${source.worldId},
        ${"imported"},
        ${source.worldName},
        ${source.worldSummary},
        ${source.structureJson},
        ${source.bindingSupportJson},
        ${null},
        ${null},
        ${1},
        ${null},
        ${null},
        ${false},
        ${"none"},
        ${source.worldVersion},
        ${source.novelCreatedAt},
        ${source.novelUpdatedAt}
      )
      ON CONFLICT ("novelId") DO NOTHING
    `;
    return this.getByNovelId(novelId);
  }

  async persistStorySlice(novelId: string, slice: StoryWorldSlice | null, overridesJson?: string | null): Promise<void> {
    const novelWorld = await this.ensureFromLegacyNovel(novelId);
    if (!novelWorld) {
      return;
    }
    const sliceJson = slice ? JSON.stringify(slice) : null;
    const builtAt = slice?.metadata.builtAt ?? null;
    const digest = slice?.metadata.storyInputDigest ?? null;
    await prisma.$executeRaw`
      UPDATE "NovelWorld"
      SET
        "storySliceJson" = ${sliceJson},
        "storySliceOverridesJson" = COALESCE(${overridesJson ?? null}, "storySliceOverridesJson"),
        "storySliceSchemaVersion" = ${slice?.metadata.schemaVersion ?? novelWorld.storySliceSchemaVersion},
        "storySliceBuiltAt" = ${builtAt},
        "storySliceDigest" = ${digest}
      WHERE "novelId" = ${novelId}
    `;
  }

  async importFromWorldLibrary(input: {
    novelId: string;
    worldId: string;
    syncEnabled?: boolean;
    syncDirection?: "push" | "pull" | "bidirectional" | "none";
  }): Promise<NovelWorldInstanceView> {
    const world = await prisma.world.findUnique({
      where: { id: input.worldId },
      select: {
        id: true,
        name: true,
        description: true,
        overviewSummary: true,
        structureJson: true,
        bindingSupportJson: true,
        version: true,
      },
    });
    if (!world) {
      throw new Error("世界不存在。");
    }
    const novel = await prisma.novel.findUnique({
      where: { id: input.novelId },
      select: { id: true },
    });
    if (!novel) {
      throw new Error("小说不存在。");
    }

    const novelWorldId = `novel_world_${input.novelId}`;
    const syncEnabled = input.syncEnabled ?? false;
    const syncDirection = input.syncDirection ?? "none";

    await prisma.$transaction(async (tx) => {
      await tx.novel.update({
        where: { id: input.novelId },
        data: { worldId: world.id },
      });
      await tx.$executeRaw`
        INSERT INTO "NovelWorld" (
          "id",
          "novelId",
          "sourceWorldId",
          "sourceType",
          "title",
          "coverSummary",
          "structuredDataJson",
          "bindingContractJson",
          "storySliceJson",
          "storySliceOverridesJson",
          "storySliceSchemaVersion",
          "storySliceBuiltAt",
          "storySliceDigest",
          "syncEnabled",
          "syncDirection",
          "syncBaseVersion",
          "createdAt",
          "updatedAt"
        ) VALUES (
          ${novelWorldId},
          ${input.novelId},
          ${world.id},
          ${"imported"},
          ${world.name},
          ${world.overviewSummary ?? world.description},
          ${world.structureJson},
          ${world.bindingSupportJson},
          ${null},
          ${null},
          ${1},
          ${null},
          ${null},
          ${syncEnabled},
          ${syncDirection},
          ${world.version},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT ("novelId") DO UPDATE SET
          "sourceWorldId" = EXCLUDED."sourceWorldId",
          "sourceType" = EXCLUDED."sourceType",
          "title" = EXCLUDED."title",
          "coverSummary" = EXCLUDED."coverSummary",
          "structuredDataJson" = EXCLUDED."structuredDataJson",
          "bindingContractJson" = EXCLUDED."bindingContractJson",
          "storySliceJson" = NULL,
          "storySliceOverridesJson" = NULL,
          "storySliceBuiltAt" = NULL,
          "storySliceDigest" = NULL,
          "syncEnabled" = EXCLUDED."syncEnabled",
          "syncDirection" = EXCLUDED."syncDirection",
          "syncBaseVersion" = EXCLUDED."syncBaseVersion",
          "updatedAt" = CURRENT_TIMESTAMP
      `;
    });

    return this.getNovelWorldView(input.novelId);
  }

  async generateFromNovelTheme(input: {
    novelId: string;
    saveToLibrary?: boolean;
    provider?: LLMProvider;
    model?: string;
    temperature?: number;
    storyMacroContext?: string;
    bookContractContext?: string;
  }): Promise<NovelWorldInstanceView> {
    const novel = await prisma.novel.findUnique({
      where: { id: input.novelId },
      select: {
        id: true,
        title: true,
        description: true,
        targetAudience: true,
        bookFramingJson: true,
        commercialTagsJson: true,
        outline: true,
        genre: { select: { name: true } },
        primaryStoryMode: { select: { name: true } },
        secondaryStoryMode: { select: { name: true } },
      },
    });
    if (!novel) {
      throw new Error("小说不存在。");
    }

    const bookFraming = ((): { bookSellingPoint?: string | null; first30ChapterPromise?: string | null } => {
      try {
        return novel.bookFramingJson ? JSON.parse(novel.bookFramingJson) as Record<string, unknown> : {};
      } catch {
        return {};
      }
    })();
    const bookSellingPoint = bookFraming.bookSellingPoint ?? "";
    const first30ChapterPromise = bookFraming.first30ChapterPromise ?? "";

    const importedMaterial = extractImportedMaterialFromOutline(novel.outline);

    const result = await runStructuredPrompt({
      asset: novelThemeWorldGenerationPrompt,
      promptInput: {
        novelTitle: novel.title,
        description: novel.description ?? "",
        targetAudience: novel.targetAudience ?? "",
        bookSellingPoint,
        first30ChapterPromise,
        commercialTags: parseCommercialTags(novel.commercialTagsJson),
        genreName: novel.genre?.name ?? "",
        primaryStoryModeName: novel.primaryStoryMode?.name ?? "",
        secondaryStoryModeName: novel.secondaryStoryMode?.name ?? "",
        storyMacroContext: input.storyMacroContext,
        bookContractContext: input.bookContractContext,
        importedMaterial,
      },
      options: {
        novelId: input.novelId,
        provider: input.provider ?? "deepseek",
        model: input.model,
        temperature: input.temperature ?? 0.5,
        entrypoint: "novel-world-generate",
      },
    });

    const structuredData = normalizeWorldStructuredData(result.output.structuredData);
    structuredData.metadata = {
      ...structuredData.metadata,
      schemaVersion: WORLD_STRUCTURE_SCHEMA_VERSION,
      seededFrom: "novel-theme",
      lastGeneratedAt: new Date().toISOString(),
    };
    const bindingSupport = buildWorldBindingSupport(structuredData);
    const title = result.output.title.trim() || `${novel.title}世界`;
    const coverSummary = result.output.coverSummary.trim() || structuredData.profile.summary || null;
    const worldType = result.output.worldType.trim() || structuredData.profile.identity || "custom";
    const structuredFields = applyStructuredWorldToLegacyFields(structuredData, {
      id: "",
      name: title,
      worldType,
      description: coverSummary,
      overviewSummary: coverSummary,
      axioms: null,
      background: null,
      geography: null,
      cultures: null,
      magicSystem: null,
      politics: null,
      races: null,
      religions: null,
      technology: null,
      conflicts: null,
      history: null,
      economy: null,
      factions: null,
      selectedElements: null,
      structureJson: null,
      bindingSupportJson: null,
      structureSchemaVersion: WORLD_STRUCTURE_SCHEMA_VERSION,
    }, bindingSupport);
    const structuredDataJson = structuredFields.structureJson as string;
    const bindingContractJson = structuredFields.bindingSupportJson as string;
    const novelWorldId = `novel_world_${input.novelId}`;
    const generationPolicyJson = JSON.stringify({
      promptId: result.meta.invocation.promptId,
      promptVersion: result.meta.invocation.promptVersion,
      provider: result.meta.provider ?? input.provider ?? "deepseek",
      model: result.meta.model ?? input.model ?? null,
      temperature: input.temperature ?? 0.5,
      saveToLibrary: input.saveToLibrary === true,
    });
    const generatedFromThemeJson = JSON.stringify({
      novelTitle: novel.title,
      description: novel.description ?? null,
      targetAudience: novel.targetAudience ?? null,
      bookSellingPoint: bookSellingPoint || null,
      first30ChapterPromise: first30ChapterPromise || null,
      commercialTags: parseCommercialTags(novel.commercialTagsJson),
      genreName: novel.genre?.name ?? null,
      primaryStoryModeName: novel.primaryStoryMode?.name ?? null,
      secondaryStoryModeName: novel.secondaryStoryMode?.name ?? null,
      storyMacroContext: input.storyMacroContext ?? null,
      bookContractContext: input.bookContractContext ?? null,
    });

    await prisma.$transaction(async (tx) => {
      let sourceWorldId: string | null = null;
      let savedToLibraryAt: Date | null = null;
      if (input.saveToLibrary) {
        const world = await tx.world.create({
          data: {
            name: title,
            description: (structuredFields.description as string | null | undefined) ?? coverSummary,
            worldType,
            templateKey: "custom",
            axioms: structuredFields.axioms as string | null | undefined,
            geography: structuredFields.geography as string | null | undefined,
            politics: structuredFields.politics as string | null | undefined,
            conflicts: structuredFields.conflicts as string | null | undefined,
            factions: structuredFields.factions as string | null | undefined,
            status: "draft",
            layerStates: JSON.stringify(normalizeLayerStates(undefined)),
            overviewSummary: (structuredFields.overviewSummary as string | null | undefined) ?? coverSummary,
            structureJson: structuredDataJson,
            bindingSupportJson: bindingContractJson,
            structureSchemaVersion: WORLD_STRUCTURE_SCHEMA_VERSION,
          },
        });
        sourceWorldId = world.id;
        savedToLibraryAt = new Date();
        await tx.worldSnapshot.create({
          data: {
            worldId: world.id,
            label: "novel-theme-generated",
            data: JSON.stringify(world),
          },
        });
      }

      await tx.novel.update({
        where: { id: input.novelId },
        data: { worldId: sourceWorldId },
      });

      await tx.$executeRaw`
        INSERT INTO "NovelWorld" (
          "id",
          "novelId",
          "sourceWorldId",
          "sourceType",
          "title",
          "coverSummary",
          "structuredDataJson",
          "bindingContractJson",
          "storySliceJson",
          "storySliceOverridesJson",
          "storySliceSchemaVersion",
          "storySliceBuiltAt",
          "storySliceDigest",
          "syncEnabled",
          "syncDirection",
          "syncBaseVersion",
          "generationPolicyJson",
          "generatedFromThemeJson",
          "savedToLibraryAt",
          "createdAt",
          "updatedAt"
        ) VALUES (
          ${novelWorldId},
          ${input.novelId},
          ${sourceWorldId},
          ${"generated"},
          ${title},
          ${coverSummary},
          ${structuredDataJson},
          ${bindingContractJson},
          ${null},
          ${null},
          ${1},
          ${null},
          ${null},
          ${input.saveToLibrary === true},
          ${input.saveToLibrary ? "bidirectional" : "none"},
          ${input.saveToLibrary ? 1 : null},
          ${generationPolicyJson},
          ${generatedFromThemeJson},
          ${savedToLibraryAt},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT ("novelId") DO UPDATE SET
          "sourceWorldId" = EXCLUDED."sourceWorldId",
          "sourceType" = EXCLUDED."sourceType",
          "title" = EXCLUDED."title",
          "coverSummary" = EXCLUDED."coverSummary",
          "structuredDataJson" = EXCLUDED."structuredDataJson",
          "bindingContractJson" = EXCLUDED."bindingContractJson",
          "storySliceJson" = NULL,
          "storySliceOverridesJson" = NULL,
          "storySliceBuiltAt" = NULL,
          "storySliceDigest" = NULL,
          "syncEnabled" = EXCLUDED."syncEnabled",
          "syncDirection" = EXCLUDED."syncDirection",
          "syncBaseVersion" = EXCLUDED."syncBaseVersion",
          "generationPolicyJson" = EXCLUDED."generationPolicyJson",
          "generatedFromThemeJson" = EXCLUDED."generatedFromThemeJson",
          "savedToLibraryAt" = EXCLUDED."savedToLibraryAt",
          "updatedAt" = CURRENT_TIMESTAMP
      `;
    });

    let generationValidation: NovelWorldGenerationValidationResult | null = null;
    if (importedMaterial) {
      try {
        const { novelThemeWorldValidationPrompt } = await import("../../../prompting/prompts/world/world.prompts.generation");
        const validationInput = {
          importedMaterial,
          generatedWorldTitle: title,
          generatedWorldSummary: coverSummary || "",
          generatedWorldRules: JSON.stringify(structuredData.rules ?? {}),
          generatedWorldFactions: JSON.stringify(structuredData.factions ?? []),
          generatedWorldForces: JSON.stringify(structuredData.forces ?? []),
          generatedWorldLocations: JSON.stringify(structuredData.locations ?? []),
        };
        const validationResult = await runStructuredPrompt({
          asset: novelThemeWorldValidationPrompt,
          promptInput: validationInput,
          options: {
            novelId: input.novelId,
            provider: input.provider ?? "deepseek",
            model: input.model,
            temperature: 0.3,
            entrypoint: "novel-world-validate",
          },
        });
        generationValidation = validationResult.output as NovelWorldGenerationValidationResult;
      } catch (error) {
        console.error("World generation validation failed (non-blocking):", error);
      }
    }

    return this.getNovelWorldView(input.novelId, generationValidation);
  }

  async getSyncDiff(novelId: string): Promise<NovelWorldSyncDiff> {
    return this.syncService.getSyncDiff(novelId);
  }

  async getNovelWorldSyncDiff(novelId: string): Promise<NovelWorldSyncDiff> {
    return this.syncService.getSyncDiff(novelId);
  }

  async syncWithLibrary(novelId: string, input: NovelWorldSyncInput): Promise<NovelWorldSyncDiff> {
    return this.syncService.syncWithLibrary(novelId, input);
  }
}
