/**
 * Drama routes — image generation and file-serving sub-routes.
 * Extracted from dramaRoutes.ts for modularity.
 */

import fs from "fs";
import { Router } from "express";
import { z } from "zod";
import { validate } from "../../../middleware/validate";
import { dramaCharacterImageService } from "../../../services/drama/DramaCharacterImageService";
import { dramaShotKeyframeService } from "../../../services/drama/visual/DramaShotKeyframeService";
import {
  characterParamsSchema,
  imageProviderBodySchema,
  shotImageParamsSchema,
  shotImageVersionParamsSchema,
  charImageParamsSchema,
  charImageVersionParamsSchema,
  threeViewParamsSchema,
} from "./dramaRouteSchemas";

const imageRouter = Router();

/* ------------------------------------------------------------------ */
/*  Character image generation                                         */
/* ------------------------------------------------------------------ */

/** GET /api/drama/projects/:id/characters/:characterId/image-status */
imageRouter.get(
  "/projects/:id/characters/:characterId/image-status",
  validate({ params: characterParamsSchema }),
  async (req, res, next) => {
    try {
      const { characterId } = req.params as z.infer<typeof characterParamsSchema>;
      const data = await dramaCharacterImageService.getImageStatus(characterId);
      res.status(200).json({ success: true, data, message: "Character image status loaded." });
    } catch (error) {
      next(error);
    }
  },
);

/** POST /api/drama/projects/:id/characters/:characterId/generate-character-sheet */
imageRouter.post(
  "/projects/:id/characters/:characterId/generate-character-sheet",
  validate({ params: characterParamsSchema, body: imageProviderBodySchema }),
  async (req, res, next) => {
    try {
      const { characterId } = req.params as z.infer<typeof characterParamsSchema>;
      const provider = (req.body as { provider?: string } | undefined)?.provider;
      const data = await dramaCharacterImageService.generateCharacterSheet(
        characterId,
        provider as Parameters<typeof dramaCharacterImageService.generateCharacterSheet>[1],
      );
      res.status(200).json({ success: true, data, message: "Character sheet generation completed." });
    } catch (error) {
      next(error);
    }
  },
);

/** POST /api/drama/projects/:id/characters/:characterId/generate-portrait (backward compat) */
imageRouter.post(
  "/projects/:id/characters/:characterId/generate-portrait",
  validate({ params: characterParamsSchema, body: imageProviderBodySchema }),
  async (req, res, next) => {
    try {
      const { characterId } = req.params as z.infer<typeof characterParamsSchema>;
      const provider = (req.body as { provider?: string } | undefined)?.provider;
      const data = await dramaCharacterImageService.generateCharacterSheet(
        characterId,
        provider as Parameters<typeof dramaCharacterImageService.generateCharacterSheet>[1],
      );
      res.status(200).json({ success: true, data, message: "Portrait generation completed." });
    } catch (error) {
      next(error);
    }
  },
);

/** POST /api/drama/projects/:id/characters/:characterId/generate-three-view (backward compat) */
imageRouter.post(
  "/projects/:id/characters/:characterId/generate-three-view",
  validate({ params: characterParamsSchema, body: imageProviderBodySchema }),
  async (req, res, next) => {
    try {
      const { characterId } = req.params as z.infer<typeof characterParamsSchema>;
      const provider = (req.body as { provider?: string } | undefined)?.provider;
      const data = await dramaCharacterImageService.generateThreeView(
        characterId,
        provider as Parameters<typeof dramaCharacterImageService.generateThreeView>[1],
      );
      res.status(200).json({ success: true, data, message: "Three-view generation completed." });
    } catch (error) {
      next(error);
    }
  },
);

/* ------------------------------------------------------------------ */
/*  Shot / character image file serving                                */
/* ------------------------------------------------------------------ */

/** GET /api/drama/shot-images/:shotId/keyframe */
imageRouter.get("/shot-images/:shotId/keyframe", validate({ params: shotImageParamsSchema }), async (req, res, next) => {
  try {
    const { shotId } = req.params as z.infer<typeof shotImageParamsSchema>;
    const resolved = await dramaShotKeyframeService.resolveExistingKeyframePath(shotId);
    if (!resolved) {
      res.status(404).json({ success: false, message: "镜头首帧图尚未生成。" });
      return;
    }
    res.setHeader("Content-Type", resolved.mimeType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    fs.createReadStream(resolved.filePath).pipe(res);
  } catch (error) {
    next(error);
  }
});

/** GET /api/drama/shot-images/:shotId/keyframe/v1 */
imageRouter.get("/shot-images/:shotId/keyframe/:version", validate({ params: shotImageVersionParamsSchema }), async (req, res, next) => {
  try {
    const { shotId, version } = req.params as z.infer<typeof shotImageVersionParamsSchema>;
    const numericVersion = Number(version.replace(/^v/i, ""));
    const resolved = await dramaShotKeyframeService.resolveArchivedKeyframePath(shotId, numericVersion);
    if (!resolved) {
      res.status(404).json({ success: false, message: "镜头首帧历史版本尚未生成。" });
      return;
    }
    res.setHeader("Content-Type", resolved.mimeType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    fs.createReadStream(resolved.filePath).pipe(res);
  } catch (error) {
    next(error);
  }
});

/** GET /api/drama/character-images/:characterId/character-sheet */
imageRouter.get("/character-images/:characterId/character-sheet", async (req, res, next) => {
  try {
    const { characterId } = req.params as z.infer<typeof charImageParamsSchema>;
    const resolved = await dramaCharacterImageService.resolveExistingImagePath(
      characterId,
      "character-sheet",
    );
    if (!resolved) {
      res.status(404).json({ success: false, message: "角色设计稿尚未生成。" });
      return;
    }
    res.setHeader("Content-Type", resolved.mimeType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    fs.createReadStream(resolved.filePath).pipe(res);
  } catch (error) {
    next(error);
  }
});

/** GET /api/drama/character-images/:characterId/character-sheet/v1 */
imageRouter.get("/character-images/:characterId/character-sheet/:version", validate({ params: charImageVersionParamsSchema }), async (req, res, next) => {
  try {
    const { characterId, version } = req.params as z.infer<typeof charImageVersionParamsSchema>;
    const numericVersion = Number(version.replace(/^v/i, ""));
    const resolved = await dramaCharacterImageService.resolveArchivedImagePath(
      characterId,
      "character-sheet",
      numericVersion,
    );
    if (!resolved) {
      res.status(404).json({ success: false, message: "角色设计稿历史版本尚未生成。" });
      return;
    }
    res.setHeader("Content-Type", resolved.mimeType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    fs.createReadStream(resolved.filePath).pipe(res);
  } catch (error) {
    next(error);
  }
});

/** GET /api/drama/character-images/:characterId/portrait (backward compat, points to same file) */
imageRouter.get("/character-images/:characterId/portrait", async (req, res, next) => {
  try {
    const { characterId } = req.params as z.infer<typeof charImageParamsSchema>;
    const resolved = await dramaCharacterImageService.resolveExistingImagePath(
      characterId,
      "portrait",
    );
    if (!resolved) {
      res.status(404).json({ success: false, message: "角色设计稿尚未生成。" });
      return;
    }
    res.setHeader("Content-Type", resolved.mimeType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    fs.createReadStream(resolved.filePath).pipe(res);
  } catch (error) {
    next(error);
  }
});

/** GET /api/drama/character-images/:characterId/three-view/:view */
imageRouter.get(
  "/character-images/:characterId/three-view/:view",
  validate({ params: threeViewParamsSchema }),
  async (req, res, next) => {
    try {
      const { characterId, view } = req.params as z.infer<typeof threeViewParamsSchema>;
      const resolved = await dramaCharacterImageService.resolveExistingImagePath(
        characterId,
        `three-view-${view}`,
      );
      if (!resolved) {
        res.status(404).json({ success: false, message: `${view} 三视图尚未生成。` });
        return;
      }
      res.setHeader("Content-Type", resolved.mimeType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      fs.createReadStream(resolved.filePath).pipe(res);
    } catch (error) {
      next(error);
    }
  },
);

export default imageRouter;
