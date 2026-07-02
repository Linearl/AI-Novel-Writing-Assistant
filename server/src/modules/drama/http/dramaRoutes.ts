import { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import { z } from "zod";
import { validate } from "../../../middleware/validate";
import { dramaCharacterService } from "../../../services/drama/DramaCharacterService";
import { dramaComplianceService } from "../../../services/drama/DramaComplianceService";
import { dramaEpisodeService } from "../../../services/drama/DramaEpisodeService";
import { dramaEpisodeOutlineService } from "../../../services/drama/DramaEpisodeOutlineService";
import { dramaExportService } from "../../../services/drama/DramaExportService";
import { dramaGuidanceService } from "../../../services/drama/guidance/DramaGuidanceService";
import { dramaProjectService } from "../../../services/drama/DramaProjectService";
import { dramaQualityGate } from "../../../services/drama/DramaQualityGate";
import { dramaRepairService } from "../../../services/drama/DramaRepairService";
import { dramaScriptService } from "../../../services/drama/DramaScriptService";
import { dramaStoryboardService } from "../../../services/drama/DramaStoryboardService";
import { dramaStrategyService } from "../../../services/drama/DramaStrategyService";
import { dramaVideoPromptService } from "../../../services/drama/DramaVideoPromptService";
import { dramaShotKeyframeService } from "../../../services/drama/visual/DramaShotKeyframeService";
import { ttsProviderRegistry } from "../../../services/drama/audio/TTSProviderPort";
import { rhythmEngine } from "../../../services/drama/engine/rhythmEngine";
import { dramaBatchOrchestrator } from "../../../services/drama/production/DramaBatchOrchestrator";
import { videoProviderRegistry } from "../../../services/drama/video/VideoProviderPort";

import {
  llmOptionsSchema,
  idParamsSchema,
  episodeParamsSchema,
  characterParamsSchema,
  storyboardParamsSchema,
  shotParamsSchema,
  videoPromptParamsSchema,
  batchJobBodySchema,
  outlineRequestSchema,
  createProjectSchema,
  repairRequestSchema,
  episodeUpdateSchema,
  characterUpdateSchema,
  saveCharacterSchema,
  importCharacterSchema,
  trackRecommendationSchema,
  sourceSupplementSchema,
  providerTaskSchema,
  imageProviderBodySchema,
} from "./dramaRouteSchemas";

import imageRouter from "./dramaImageRoutes";

const router = Router();

/* ── Mount image sub-routes ──────────────────────────────────────── */

router.use(imageRouter);

/* ── Project routes ──────────────────────────────────────────────── */

router.get("/projects", async (_req, res, next) => {
  try {
    const data = await dramaProjectService.listProjects();
    res.status(200).json({ success: true, data, message: "Drama projects loaded." } satisfies ApiResponse<typeof data>);
  } catch (error) {
    next(error);
  }
});

router.post("/projects", validate({ body: createProjectSchema }), async (req, res, next) => {
  try {
    const data = await dramaProjectService.createProject(req.body as z.infer<typeof createProjectSchema>);
    res.status(201).json({ success: true, data, message: "Drama project created." } satisfies ApiResponse<typeof data>);
  } catch (error) {
    next(error);
  }
});

router.get("/projects/:id", validate({ params: idParamsSchema }), async (req, res, next) => {
  try {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    const data = await dramaProjectService.getProject(id);
    if (!data) {
      res.status(404).json({ success: false, error: "Drama project not found." } satisfies ApiResponse<null>);
      return;
    }
    res.status(200).json({ success: true, data, message: "Drama project loaded." } satisfies ApiResponse<typeof data>);
  } catch (error) {
    next(error);
  }
});

router.post("/projects/:id/source-bundle", validate({ params: idParamsSchema }), async (req, res, next) => {
  try {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    const data = await dramaProjectService.assembleSourceBundle(id);
    res.status(200).json({ success: true, data, message: "Drama source bundle assembled." } satisfies ApiResponse<typeof data>);
  } catch (error) {
    next(error);
  }
});

router.post(
  "/projects/:id/source-supplement",
  validate({ params: idParamsSchema, body: sourceSupplementSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as z.infer<typeof idParamsSchema>;
      const data = await dramaGuidanceService.analyzeSourceSupplement(id, (req.body ?? {}) as never);
      res.status(200).json({ success: true, data, message: "Drama source supplement guidance generated." });
    } catch (error) {
      next(error);
    }
  },
);

/* ── Track / provider info routes ────────────────────────────────── */

router.get("/tracks", (_req, res) => {
  res.status(200).json({ success: true, data: rhythmEngine.listTracks(), message: "Drama tracks loaded." });
});

router.get("/hooks", (_req, res) => {
  res.status(200).json({ success: true, data: rhythmEngine.listHooks(), message: "Drama hooks loaded." });
});

router.get("/video-providers", (_req, res) => {
  const data = videoProviderRegistry.listProviders();
  res.status(200).json({ success: true, data, message: "Drama video providers loaded." });
});

router.get("/tts-providers", (_req, res) => {
  const data = ttsProviderRegistry.listProviders();
  res.status(200).json({ success: true, data, message: "Drama TTS providers loaded." });
});

router.post("/track-recommendation", validate({ body: trackRecommendationSchema }), async (req, res, next) => {
  try {
    const data = await dramaGuidanceService.recommendTrack(req.body as z.infer<typeof trackRecommendationSchema>);
    res.status(200).json({ success: true, data, message: "Drama track recommendation generated." });
  } catch (error) {
    next(error);
  }
});

/* ── Character routes ────────────────────────────────────────────── */

router.get("/character-library", async (req, res, next) => {
  try {
    const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
    const data = await dramaCharacterService.listLibrary(projectId);
    res.status(200).json({ success: true, data, message: "Drama character library loaded." });
  } catch (error) {
    next(error);
  }
});

router.get("/projects/:id/characters", validate({ params: idParamsSchema }), async (req, res, next) => {
  try {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    const data = await dramaCharacterService.listProjectCharacters(id);
    res.status(200).json({ success: true, data, message: "Drama characters loaded." });
  } catch (error) {
    next(error);
  }
});

router.patch(
  "/projects/:id/characters/:characterId",
  validate({ params: characterParamsSchema, body: characterUpdateSchema }),
  async (req, res, next) => {
    try {
      const { characterId } = req.params as z.infer<typeof characterParamsSchema>;
      const data = await dramaCharacterService.updateProjectCharacter(characterId, req.body);
      res.status(200).json({ success: true, data, message: "Drama character updated." });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/projects/:id/characters/:characterId/save-to-library",
  validate({ params: characterParamsSchema, body: saveCharacterSchema }),
  async (req, res, next) => {
    try {
      const { characterId } = req.params as z.infer<typeof characterParamsSchema>;
      const data = await dramaCharacterService.saveCharacterToLibrary(characterId, req.body?.tags);
      res.status(201).json({ success: true, data, message: "Drama character saved to library." });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/projects/:id/character-library/import",
  validate({ params: idParamsSchema, body: importCharacterSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as z.infer<typeof idParamsSchema>;
      const body = req.body as z.infer<typeof importCharacterSchema>;
      const data = await dramaCharacterService.importLibraryCharacter(id, body.libraryId);
      res.status(201).json({ success: true, data, message: "Drama character imported." });
    } catch (error) {
      next(error);
    }
  },
);

/* ── Strategy / outline / script / review / compliance / repair ─── */

router.post("/projects/:id/strategy", validate({ params: idParamsSchema, body: llmOptionsSchema }), async (req, res, next) => {
  try {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    const data = await dramaStrategyService.generateStrategy(id, (req.body ?? {}) as never);
    res.status(200).json({ success: true, data, message: "Drama strategy generated." } satisfies ApiResponse<typeof data>);
  } catch (error) {
    next(error);
  }
});

router.post("/projects/:id/outline", validate({ params: idParamsSchema, body: outlineRequestSchema }), async (req, res, next) => {
  try {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    const body = (req.body ?? {}) as { startOrder?: number; count?: number };
    const data = await dramaEpisodeOutlineService.generateOutline(
      id,
      { startOrder: body.startOrder, count: body.count },
      (req.body ?? {}) as never,
    );
    res.status(200).json({ success: true, data, message: "Drama episode outline generated." } satisfies ApiResponse<typeof data>);
  } catch (error) {
    next(error);
  }
});

router.post("/projects/:id/episodes/:order/script", validate({ params: episodeParamsSchema, body: llmOptionsSchema }), async (req, res, next) => {
  try {
    const { id, order } = req.params as unknown as z.infer<typeof episodeParamsSchema>;
    const data = await dramaScriptService.generateEpisodeScript(id, order, (req.body ?? {}) as never);
    res.status(200).json({ success: true, data, message: "Drama episode script generated." });
  } catch (error) {
    next(error);
  }
});

router.patch("/projects/:id/episodes/:order", validate({ params: episodeParamsSchema, body: episodeUpdateSchema }), async (req, res, next) => {
  try {
    const { id, order } = req.params as unknown as z.infer<typeof episodeParamsSchema>;
    const data = await dramaEpisodeService.updateEpisode(id, order, req.body as z.infer<typeof episodeUpdateSchema>);
    res.status(200).json({ success: true, data, message: "Drama episode updated." });
  } catch (error) {
    next(error);
  }
});

router.post("/projects/:id/episodes/:order/review", validate({ params: episodeParamsSchema, body: llmOptionsSchema }), async (req, res, next) => {
  try {
    const { id, order } = req.params as unknown as z.infer<typeof episodeParamsSchema>;
    const data = await dramaQualityGate.reviewEpisode(id, order, (req.body ?? {}) as never);
    res.status(200).json({ success: true, data, message: "Drama episode reviewed." });
  } catch (error) {
    next(error);
  }
});

router.post("/projects/:id/compliance", validate({ params: idParamsSchema, body: llmOptionsSchema }), async (req, res, next) => {
  try {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    const data = await dramaComplianceService.checkProject(id, (req.body ?? {}) as never);
    res.status(200).json({ success: true, data, message: "Drama project compliance checked." });
  } catch (error) {
    next(error);
  }
});

router.post("/projects/:id/episodes/:order/compliance", validate({ params: episodeParamsSchema, body: llmOptionsSchema }), async (req, res, next) => {
  try {
    const { id, order } = req.params as unknown as z.infer<typeof episodeParamsSchema>;
    const data = await dramaComplianceService.checkEpisode(id, order, (req.body ?? {}) as never);
    res.status(200).json({ success: true, data, message: "Drama episode compliance checked." });
  } catch (error) {
    next(error);
  }
});

router.post("/projects/:id/episodes/:order/repair", validate({ params: episodeParamsSchema, body: repairRequestSchema }), async (req, res, next) => {
  try {
    const { id, order } = req.params as unknown as z.infer<typeof episodeParamsSchema>;
    const body = (req.body ?? {}) as { instruction?: string };
    const data = await dramaRepairService.repairEpisode(id, order, body.instruction, (req.body ?? {}) as never);
    res.status(200).json({ success: true, data, message: "Drama episode repaired." });
  } catch (error) {
    next(error);
  }
});

/* ── Export routes ───────────────────────────────────────────────── */

router.get("/projects/:id/export", validate({ params: idParamsSchema }), async (req, res, next) => {
  try {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    const format = req.query.format === "json" ? "json" : "markdown";
    const data = await dramaExportService.exportProject(id, format);
    res.setHeader("Content-Type", data.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(data.filename)}"`);
    res.status(200).send(data.body);
  } catch (error) {
    next(error);
  }
});

router.get("/projects/:id/episodes/:order/export", validate({ params: episodeParamsSchema }), async (req, res, next) => {
  try {
    const { id, order } = req.params as unknown as z.infer<typeof episodeParamsSchema>;
    const format = req.query.format === "timeline-json" ? "timeline-json" : "srt";
    const data = await dramaExportService.exportEpisode(id, order, format);
    res.setHeader("Content-Type", data.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(data.filename)}"`);
    res.status(200).send(data.body);
  } catch (error) {
    next(error);
  }
});

/* ── Batch jobs ─────────────────────────────────────────────────── */

router.post("/projects/:id/episodes/:order/batch-jobs", validate({ params: episodeParamsSchema, body: batchJobBodySchema }), async (req, res, next) => {
  try {
    const { id, order } = req.params as unknown as z.infer<typeof episodeParamsSchema>;
    const body = req.body as z.infer<typeof batchJobBodySchema>;
    const data = await dramaBatchOrchestrator.createEpisodeBatchJob(id, order, body);
    res.status(201).json({ success: true, data, message: "Drama batch job created." });
  } catch (error) {
    next(error);
  }
});

router.post("/projects/:id/episodes/:order/batch-jobs/estimate", validate({ params: episodeParamsSchema, body: batchJobBodySchema }), async (req, res, next) => {
  try {
    const { id, order } = req.params as unknown as z.infer<typeof episodeParamsSchema>;
    const body = req.body as z.infer<typeof batchJobBodySchema>;
    const data = await dramaBatchOrchestrator.estimateEpisodeBatchJob(id, order, body);
    res.status(200).json({ success: true, data, message: "Drama batch job cost estimate loaded." });
  } catch (error) {
    next(error);
  }
});

/* ── Storyboard / video-prompt / keyframe routes ─────────────────── */

router.post("/projects/:id/episodes/:order/storyboard", validate({ params: episodeParamsSchema, body: llmOptionsSchema }), async (req, res, next) => {
  try {
    const { id, order } = req.params as unknown as z.infer<typeof episodeParamsSchema>;
    const data = await dramaStoryboardService.generateStoryboard(id, order, (req.body ?? {}) as never);
    res.status(200).json({ success: true, data, message: "Drama storyboard generated." });
  } catch (error) {
    next(error);
  }
});

router.get("/storyboards/:storyboardId", validate({ params: storyboardParamsSchema }), async (req, res, next) => {
  try {
    const { storyboardId } = req.params as z.infer<typeof storyboardParamsSchema>;
    const data = await dramaStoryboardService.getStoryboard(storyboardId);
    res.status(200).json({ success: true, data, message: "Drama storyboard loaded." });
  } catch (error) {
    next(error);
  }
});

router.post("/projects/:id/shots/:shotId/video-prompt", validate({ params: shotParamsSchema, body: llmOptionsSchema }), async (req, res, next) => {
  try {
    const { id, shotId } = req.params as z.infer<typeof shotParamsSchema>;
    const data = await dramaVideoPromptService.generateVideoPromptForShot(id, shotId, (req.body ?? {}) as never);
    res.status(200).json({ success: true, data, message: "Drama video prompt generated." });
  } catch (error) {
    next(error);
  }
});

router.post("/projects/:id/shots/:shotId/keyframe", validate({ params: shotParamsSchema, body: imageProviderBodySchema }), async (req, res, next) => {
  try {
    const { shotId } = req.params as z.infer<typeof shotParamsSchema>;
    const body = req.body as { provider?: string; useCharacterRefImages?: boolean } | undefined;
    const data = await dramaShotKeyframeService.generateKeyframe(
      shotId,
      body?.provider as Parameters<typeof dramaShotKeyframeService.generateKeyframe>[1],
      body?.useCharacterRefImages ?? false,
    );
    res.status(200).json({ success: true, data, message: "Drama shot keyframe generated." });
  } catch (error) {
    next(error);
  }
});

router.post("/video-prompts/:videoPromptId/provider-task", validate({ params: videoPromptParamsSchema, body: providerTaskSchema }), async (req, res, next) => {
  try {
    const { videoPromptId } = req.params as z.infer<typeof videoPromptParamsSchema>;
    const body = (req.body ?? {}) as { provider?: string };
    const data = await dramaVideoPromptService.createProviderTask(videoPromptId, body.provider ?? "mock");
    res.status(200).json({ success: true, data, message: "Drama video task created." });
  } catch (error) {
    next(error);
  }
});

router.post("/video-prompts/:videoPromptId/provider-task/refresh", validate({ params: videoPromptParamsSchema }), async (req, res, next) => {
  try {
    const { videoPromptId } = req.params as z.infer<typeof videoPromptParamsSchema>;
    const data = await dramaVideoPromptService.refreshProviderTask(videoPromptId);
    res.status(200).json({ success: true, data, message: "Drama video task refreshed." });
  } catch (error) {
    next(error);
  }
});

export default router;
