import type { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared";
import { z } from "zod";
import { validate } from "../../../../middleware/validate";
import type { VolumePlanDocument } from "@ai-novel/shared";

interface RegisterNovelVolumeRoutesInput {
  router: Router;
  novelService: Record<string, any>;
  idParamsSchema: z.ZodType<{ id: string }>;
  volumeVersionParamsSchema: z.ZodType<{ id: string; versionId: string }>;
  volumeDiffQuerySchema: z.ZodTypeAny;
  volumeDocumentSchema: z.ZodTypeAny;
  volumeDraftSchema: z.ZodTypeAny;
  volumeImpactSchema: z.ZodTypeAny;
  volumeGenerateSchema: z.ZodTypeAny;
  volumeSyncSchema: z.ZodTypeAny;
}

function isHighMemoryVolumeScope(scope: unknown): boolean {
  return scope === "beat_sheet"
    || scope === "chapter_list"
    || scope === "chapter_detail"
    || scope === "rebalance"
    || scope === "volume";
}

function buildSlimVolumeGenerationResponse(
  document: VolumePlanDocument,
): {
  novelId: string;
  workspaceVersion: "v2";
  volumes: VolumePlanDocument["volumes"];
  strategyPlan: VolumePlanDocument["strategyPlan"];
  critiqueReport: null;
  beatSheets: VolumePlanDocument["beatSheets"];
  rebalanceDecisions: VolumePlanDocument["rebalanceDecisions"];
  readiness: VolumePlanDocument["readiness"];
  derivedOutline: "";
  derivedStructuredOutline: "";
  source: VolumePlanDocument["source"];
  activeVersionId: VolumePlanDocument["activeVersionId"];
  slimmed: true;
} {
  return {
    novelId: document.novelId,
    workspaceVersion: document.workspaceVersion,
    volumes: [],
    strategyPlan: null,
    critiqueReport: null,
    beatSheets: [],
    rebalanceDecisions: [],
    readiness: document.readiness,
    derivedOutline: "",
    derivedStructuredOutline: "",
    source: document.source,
    activeVersionId: document.activeVersionId,
    slimmed: true,
  };
}

function shouldUseSlimVolumeGenerationResponse(body: unknown): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return false;
  }
  const input = body as { scope?: unknown; slimResponse?: unknown };
  return input.slimResponse === true && isHighMemoryVolumeScope(input.scope);
}

function shouldPersistBeforeSlimVolumeResponse(body: unknown): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return false;
  }
  const scope = (body as { scope?: unknown }).scope;
  return scope === "beat_sheet" || scope === "rebalance" || scope === "chapter_detail";
}

function shouldSyncSlimVolumeResponseToChapterExecution(body: unknown): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return false;
  }
  const scope = (body as { scope?: unknown }).scope;
  return scope === "chapter_detail";
}

function buildSlimVolumeGetResponse(
  document: VolumePlanDocument,
): VolumePlanDocument {
  return {
    ...document,
    volumes: document.volumes.map((volume) => ({
      ...volume,
      chapters: volume.chapters.map((chapter) => ({
        id: chapter.id,
        volumeId: chapter.volumeId,
        chapterId: chapter.chapterId,
        chapterOrder: chapter.chapterOrder,
        beatKey: chapter.beatKey,
        title: chapter.title,
        summary: chapter.summary,
        purpose: chapter.purpose,
        exclusiveEvent: chapter.exclusiveEvent,
        endingState: chapter.endingState,
        nextChapterEntryState: chapter.nextChapterEntryState,
        conflictLevel: chapter.conflictLevel,
        revealLevel: chapter.revealLevel,
        targetWordCount: chapter.targetWordCount,
        mustAvoid: chapter.mustAvoid,
        taskSheet: chapter.taskSheet,
        sceneCards: chapter.sceneCards,
        styleContract: chapter.styleContract,
        payoffRefs: chapter.payoffRefs,
        createdAt: chapter.createdAt,
        updatedAt: chapter.updatedAt,
      })),
    })),
    derivedOutline: "",
    derivedStructuredOutline: "",
    critiqueReport: null,
  };
}

// Sub-function: Register volume CRUD routes
function registerVolumeCrudRoutes(params: { router: any; novelService: any; idParamsSchema: any; volumeDocumentSchema: any; volumeGenerateSchema: any }) {
  const { router, novelService, idParamsSchema, volumeDocumentSchema, volumeGenerateSchema } = params;

  router.get("/:id/volumes", validate({ params: idParamsSchema }), async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params;
      const data = await novelService.getVolumes(id);
      res.status(200).json({ success: true, data: buildSlimVolumeGetResponse(data), message: "Volume workspace loaded." });
    } catch (error) { next(error); }
  });

  router.put("/:id/volumes", validate({ params: idParamsSchema, body: volumeDocumentSchema }), async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params;
      const data = await novelService.updateVolumes(id, req.body);
      res.status(200).json({ success: true, data, message: "Volume workspace updated." });
    } catch (error) { next(error); }
  });

  router.post("/:id/volumes/generate", validate({ params: idParamsSchema, body: volumeGenerateSchema }), async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params;
      const data = await novelService.generateVolumes(id, req.body);
      if (shouldUseSlimVolumeGenerationResponse(req.body)) {
        const persistedData = shouldPersistBeforeSlimVolumeResponse(req.body)
          ? await novelService.updateVolumes(id, { ...data, syncToChapterExecution: shouldSyncSlimVolumeResponseToChapterExecution(req.body) })
          : data;
        res.status(200).json({ success: true, data: buildSlimVolumeGenerationResponse(persistedData), message: "Volume workspace generated." });
        return;
      }
      res.status(200).json({ success: true, data, message: "Volume workspace generated." });
    } catch (error) { next(error); }
  });
}

// Sub-function: Register volume version routes
function registerVolumeVersionRoutes(params: { router: any; novelService: any; idParamsSchema: any; volumeVersionParamsSchema: any; volumeDiffQuerySchema: any; volumeDraftSchema: any }) {
  const { router, novelService, idParamsSchema, volumeVersionParamsSchema, volumeDiffQuerySchema, volumeDraftSchema } = params;

  router.post("/:id/volumes/versions/draft", validate({ params: idParamsSchema, body: volumeDraftSchema }), async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params;
      const data = await novelService.createVolumeDraft(id, req.body);
      res.status(201).json({ success: true, data, message: "Volume draft version created." });
    } catch (error) { next(error); }
  });

  router.post("/:id/volumes/versions/:versionId/activate", validate({ params: volumeVersionParamsSchema }), async (req: any, res: any, next: any) => {
    try {
      const { id, versionId } = req.params;
      const data = await novelService.activateVolumeVersion(id, versionId);
      res.status(200).json({ success: true, data, message: "Volume version activated." });
    } catch (error) { next(error); }
  });

  router.post("/:id/volumes/versions/:versionId/freeze", validate({ params: volumeVersionParamsSchema }), async (req: any, res: any, next: any) => {
    try {
      const { id, versionId } = req.params;
      const data = await novelService.freezeVolumeVersion(id, versionId);
      res.status(200).json({ success: true, data, message: "Volume version frozen." });
    } catch (error) { next(error); }
  });

  router.get("/:id/volumes/versions", validate({ params: idParamsSchema }), async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params;
      const data = await novelService.listVolumeVersions(id);
      res.status(200).json({ success: true, data, message: "Volume versions loaded." });
    } catch (error) { next(error); }
  });

  router.get("/:id/volumes/versions/:versionId", validate({ params: volumeVersionParamsSchema }), async (req: any, res: any, next: any) => {
    try {
      const { id, versionId } = req.params;
      const data = await novelService.getVolumeVersion(id, versionId);
      res.status(200).json({ success: true, data, message: "Volume version loaded." });
    } catch (error) { next(error); }
  });

  router.get("/:id/volumes/versions/:versionId/diff", validate({ params: volumeVersionParamsSchema, query: volumeDiffQuerySchema }), async (req: any, res: any, next: any) => {
    try {
      const { id, versionId } = req.params;
      const query = volumeDiffQuerySchema.parse(req.query) as { compareVersion?: number };
      const data = await novelService.getVolumeDiff(id, versionId, query.compareVersion);
      res.status(200).json({ success: true, data, message: "Volume diff loaded." });
    } catch (error) { next(error); }
  });
}

// Sub-function: Register volume utility routes
function registerVolumeUtilityRoutes(params: { router: any; novelService: any; idParamsSchema: any; volumeImpactSchema: any; volumeSyncSchema: any }) {
  const { router, novelService, idParamsSchema, volumeImpactSchema, volumeSyncSchema } = params;

  router.post("/:id/volumes/impact-analysis", validate({ params: idParamsSchema, body: volumeImpactSchema }), async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params;
      const data = await novelService.analyzeVolumeImpact(id, req.body);
      res.status(200).json({ success: true, data, message: "Volume impact analysis completed." });
    } catch (error) { next(error); }
  });

  router.post("/:id/volumes/sync-chapters", validate({ params: idParamsSchema, body: volumeSyncSchema }), async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params;
      const data = await novelService.syncVolumeChapters(id, req.body);
      res.status(200).json({ success: true, data, message: "Volume chapters synchronized." });
    } catch (error) { next(error); }
  });

  router.post("/:id/volumes/migrate-legacy", validate({ params: idParamsSchema }), async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params;
      const data = await novelService.migrateLegacyVolumes(id);
      res.status(200).json({ success: true, data, message: "Legacy outline migrated to volume workspace." });
    } catch (error) { next(error); }
  });
}

export function registerNovelVolumeRoutes(input: RegisterNovelVolumeRoutesInput): void {
  const {
    router,
    novelService,
    idParamsSchema,
    volumeVersionParamsSchema,
    volumeDiffQuerySchema,
    volumeDocumentSchema,
    volumeDraftSchema,
    volumeImpactSchema,
    volumeGenerateSchema,
    volumeSyncSchema,
  } = input;

  registerVolumeCrudRoutes({ router, novelService, idParamsSchema, volumeDocumentSchema, volumeGenerateSchema });
  registerVolumeVersionRoutes({ router, novelService, idParamsSchema, volumeVersionParamsSchema, volumeDiffQuerySchema, volumeDraftSchema });
  registerVolumeUtilityRoutes({ router, novelService, idParamsSchema, volumeImpactSchema, volumeSyncSchema });
}
