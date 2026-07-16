import { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared";
import { z } from "zod";
import { authMiddleware } from "../../../middleware/auth";
import { validate } from "../../../middleware/validate";
import { BookAnalysisCharacterService } from "../../../services/bookAnalysis/bookAnalysisCharacter/BookAnalysisCharacterService";
import { BookAnalysisCharacterAppearanceService } from "../../../services/bookAnalysis/bookAnalysisCharacter/BookAnalysisCharacterAppearanceService";
import { BookAnalysisCharacterAppearanceTermService } from "../../../services/bookAnalysis/bookAnalysisCharacter/BookAnalysisCharacterAppearanceTermService";
import { BookAnalysisCharacterMediaService } from "../../../services/bookAnalysis/bookAnalysisCharacter/BookAnalysisCharacterMediaService";
import type {
  CharacterRow,
  AppearanceRow,
  AppearanceTermRow,
  MediaRow,
} from "../../../services/bookAnalysis/bookAnalysisCharacter/BookAnalysisCharacterSerializers";
import {
  serializeCharacter,
  serializeCharacterDetail,
  serializeAppearance,
  serializeAppearanceTerm,
  serializeMedia,
} from "../../../services/bookAnalysis/bookAnalysisCharacter/BookAnalysisCharacterSerializers";

const router = Router();
const characterService = new BookAnalysisCharacterService();
const appearanceService = new BookAnalysisCharacterAppearanceService();
const termService = new BookAnalysisCharacterAppearanceTermService();
const mediaService = new BookAnalysisCharacterMediaService();

const analysisParamsSchema = z.object({
  id: z.string().trim().min(1),
});

const charParamsSchema = z.object({
  id: z.string().trim().min(1),
  charId: z.string().trim().min(1),
});

const termParamsSchema = z.object({
  id: z.string().trim().min(1),
  charId: z.string().trim().min(1),
  termId: z.string().trim().min(1),
});

const appearanceParamsSchema = z.object({
  id: z.string().trim().min(1),
  charId: z.string().trim().min(1),
  appearanceId: z.string().trim().min(1),
});

const mediaParamsSchema = z.object({
  id: z.string().trim().min(1),
  charId: z.string().trim().min(1),
  mediaId: z.string().trim().min(1),
});

const createCharSchema = z.object({
  name: z.string().trim().min(1),
  aliases: z.array(z.string()).optional(),
  role: z.string().optional(),
  profile: z.any(),
  firstAppearanceLabel: z.string().optional(),
});

const updateCharSchema = z.object({
  name: z.string().trim().min(1).optional(),
  aliases: z.array(z.string()).optional(),
  role: z.string().optional().nullable(),
  profile: z.any().optional(),
  firstAppearanceLabel: z.string().optional().nullable(),
});

const addAppearanceSchema = z.object({
  sectionKey: z.string().optional(),
  excerpt: z.string().trim().min(1),
  orderIndex: z.number().int().min(0),
  parsedTraits: z.any().optional(),
});

const updateAppearanceSchema = z.object({
  excerpt: z.string().trim().min(1).optional(),
  parsedTraits: z.any().optional(),
  orderIndex: z.number().int().min(0).optional(),
});

const addTermSchema = z.object({
  termCategory: z.string().trim().min(1),
  termOriginal: z.string().trim().min(1),
});

const addMediaSchema = z.object({
  mediaType: z.string().default("portrait"),
  url: z.string().trim().min(1),
  prompt: z.string().optional(),
  style: z.string().optional(),
});

router.use(authMiddleware);

// --- Character CRUD ---

router.get(
  "/:id/characters",
  validate({ params: analysisParamsSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as z.infer<typeof analysisParamsSchema>;
      const rows = await characterService.listCharacters(id);
      const data = rows.map((row) => serializeCharacter(row as unknown as CharacterRow));
      res.status(200).json({
        success: true,
        data,
        message: "Characters loaded.",
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/:id/characters/:charId",
  validate({ params: charParamsSchema }),
  async (req, res, next) => {
    try {
      const { charId } = req.params as z.infer<typeof charParamsSchema>;
      const character = await characterService.getCharacter(charId);
      const data = serializeCharacterDetail(
        character as unknown as CharacterRow,
        (character.appearances ?? []) as unknown as AppearanceRow[],
        (character.media ?? []) as unknown as MediaRow[],
      );
      res.status(200).json({
        success: true,
        data,
        message: "Character loaded.",
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/:id/characters",
  validate({ params: analysisParamsSchema, body: createCharSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as z.infer<typeof analysisParamsSchema>;
      const body = req.body as z.infer<typeof createCharSchema>;
      const row = await characterService.createCharacter({
        analysisId: id,
        name: body.name,
        aliases: body.aliases,
        role: body.role,
        profile: body.profile,
        firstAppearanceLabel: body.firstAppearanceLabel,
      });
      const data = serializeCharacter(row as unknown as CharacterRow);
      res.status(201).json({
        success: true,
        data,
        message: "Character created.",
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/:id/characters/:charId",
  validate({ params: charParamsSchema, body: updateCharSchema }),
  async (req, res, next) => {
    try {
      const { charId } = req.params as z.infer<typeof charParamsSchema>;
      const body = req.body;
      const row = await characterService.updateCharacter(charId, body);
      const data = serializeCharacter(row as unknown as CharacterRow);
      res.status(200).json({
        success: true,
        data,
        message: "Character updated.",
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/:id/characters/:charId",
  validate({ params: charParamsSchema }),
  async (req, res, next) => {
    try {
      const { charId } = req.params as z.infer<typeof charParamsSchema>;
      await characterService.deleteCharacter(charId);
      res.status(200).json({
        success: true,
        message: "Character deleted.",
      } satisfies ApiResponse<null>);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/:id/characters/extract",
  validate({ params: analysisParamsSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as z.infer<typeof analysisParamsSchema>;
      const count = await characterService.extractCharactersFromSections(id);
      res.status(200).json({
        success: true,
        data: { count },
        message: `Extracted ${count} characters.`,
      } satisfies ApiResponse<{ count: number }>);
    } catch (error) {
      next(error);
    }
  },
);

// --- Appearances ---

router.get(
  "/:id/characters/:charId/appearances",
  validate({ params: charParamsSchema }),
  async (req, res, next) => {
    try {
      const { charId } = req.params as z.infer<typeof charParamsSchema>;
      const rows = await appearanceService.listAppearances(charId);
      const data = rows.map((row) => serializeAppearance(row as unknown as AppearanceRow));
      res.status(200).json({
        success: true,
        data,
        message: "Appearances loaded.",
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/:id/characters/:charId/appearances",
  validate({ params: charParamsSchema, body: addAppearanceSchema }),
  async (req, res, next) => {
    try {
      const { charId } = req.params as z.infer<typeof charParamsSchema>;
      const body = req.body as z.infer<typeof addAppearanceSchema>;
      const row = await appearanceService.addAppearance({
        characterId: charId,
        sectionKey: body.sectionKey,
        excerpt: body.excerpt,
        orderIndex: body.orderIndex,
        parsedTraits: body.parsedTraits,
      });
      const data = serializeAppearance(row as unknown as AppearanceRow);
      res.status(201).json({
        success: true,
        data,
        message: "Appearance added.",
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/:id/characters/:charId/appearances/:appearanceId",
  validate({ params: appearanceParamsSchema, body: updateAppearanceSchema }),
  async (req, res, next) => {
    try {
      const { appearanceId } = req.params as z.infer<typeof appearanceParamsSchema>;
      const body = req.body;
      const row = await appearanceService.updateAppearance(appearanceId, body);
      const data = serializeAppearance(row as unknown as AppearanceRow);
      res.status(200).json({
        success: true,
        data,
        message: "Appearance updated.",
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/:id/characters/:charId/appearances/:appearanceId",
  validate({ params: appearanceParamsSchema }),
  async (req, res, next) => {
    try {
      const { appearanceId } = req.params as z.infer<typeof appearanceParamsSchema>;
      await appearanceService.deleteAppearance(appearanceId);
      res.status(200).json({
        success: true,
        message: "Appearance deleted.",
      } satisfies ApiResponse<null>);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/:id/characters/:charId/appearances/extract",
  validate({ params: charParamsSchema }),
  async (req, res, next) => {
    try {
      const { charId } = req.params as z.infer<typeof charParamsSchema>;
      const count = await appearanceService.extractAppearancesFromSections(charId);
      res.status(200).json({
        success: true,
        data: { count },
        message: `Extracted ${count} appearances.`,
      } satisfies ApiResponse<{ count: number }>);
    } catch (error) {
      next(error);
    }
  },
);

// --- Appearance Terms ---

router.get(
  "/:id/characters/:charId/terms",
  validate({ params: charParamsSchema }),
  async (req, res, next) => {
    try {
      const { charId } = req.params as z.infer<typeof charParamsSchema>;
      const rows = await termService.listTerms(charId);
      const data = rows.map((row) => serializeAppearanceTerm(row as unknown as AppearanceTermRow));
      res.status(200).json({
        success: true,
        data,
        message: "Appearance terms loaded.",
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/:id/characters/:charId/terms",
  validate({ params: charParamsSchema, body: addTermSchema }),
  async (req, res, next) => {
    try {
      const { charId } = req.params as z.infer<typeof charParamsSchema>;
      const body = req.body as z.infer<typeof addTermSchema>;
      const row = await termService.addTerm(charId, body.termCategory, body.termOriginal);
      const data = serializeAppearanceTerm(row as unknown as AppearanceTermRow);
      res.status(201).json({
        success: true,
        data,
        message: "Appearance term added.",
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/:id/characters/:charId/terms/:termId",
  validate({ params: termParamsSchema }),
  async (req, res, next) => {
    try {
      const { termId } = req.params as z.infer<typeof termParamsSchema>;
      await termService.deleteTerm(termId);
      res.status(200).json({
        success: true,
        message: "Appearance term deleted.",
      } satisfies ApiResponse<null>);
    } catch (error) {
      next(error);
    }
  },
);

// --- Media ---

router.get(
  "/:id/characters/:charId/media",
  validate({ params: charParamsSchema }),
  async (req, res, next) => {
    try {
      const { charId } = req.params as z.infer<typeof charParamsSchema>;
      const rows = await mediaService.listMedia(charId);
      const data = rows.map((row) => serializeMedia(row as unknown as MediaRow));
      res.status(200).json({
        success: true,
        data,
        message: "Media loaded.",
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/:id/characters/:charId/media",
  validate({ params: charParamsSchema, body: addMediaSchema }),
  async (req, res, next) => {
    try {
      const { charId } = req.params as z.infer<typeof charParamsSchema>;
      const body = req.body as z.infer<typeof addMediaSchema>;
      const row = await mediaService.createMedia(charId, body.mediaType, body.url, body.prompt, body.style);
      const data = serializeMedia(row as unknown as MediaRow);
      res.status(201).json({
        success: true,
        data,
        message: "Media added.",
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/:id/characters/:charId/media/:mediaId",
  validate({ params: mediaParamsSchema }),
  async (req, res, next) => {
    try {
      const { mediaId } = req.params as z.infer<typeof mediaParamsSchema>;
      await mediaService.deleteMedia(mediaId);
      res.status(200).json({
        success: true,
        message: "Media deleted.",
      } satisfies ApiResponse<null>);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/:id/characters/:charId/media/generate",
  validate({ params: charParamsSchema }),
  async (req, res, next) => {
    try {
      const { charId } = req.params as z.infer<typeof charParamsSchema>;
      const character = await characterService.getCharacter(charId);
      const prompt = mediaService.buildPortraitPrompt(character);
      const row = await mediaService.createMedia(charId, "portrait", "", prompt, "anime_style");
      const serialized = serializeMedia(row as unknown as MediaRow);
      const data = { ...serialized, generatedPrompt: prompt };
      res.status(201).json({
        success: true,
        data,
        message: "Portrait prompt generated. Assign a URL to complete.",
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
