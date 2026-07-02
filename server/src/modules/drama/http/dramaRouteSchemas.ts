/**
 * Drama routes — shared Zod validation schemas.
 * Extracted from dramaRoutes.ts for modularity.
 */

import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  Shared LLM / provider schemas                                     */
/* ------------------------------------------------------------------ */

export const llmOptionsSchema = z
  .object({
    provider: z.string().optional(),
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
  })
  .optional();

export const imageProviderBodySchema = z
  .object({
    provider: z.string().trim().optional(),
    useCharacterRefImages: z.boolean().optional(),
  })
  .optional();

export const batchJobBodySchema = z.object({
  type: z.enum(["keyframes", "videos", "tts"]),
  provider: z.string().trim().optional(),
  failedShotIds: z.array(z.string().trim().min(1)).optional(),
  useCharacterRefImages: z.boolean().optional(),
});

export const outlineRequestSchema = z
  .object({
    startOrder: z.number().int().min(1).optional(),
    count: z.number().int().min(1).max(40).optional(),
    provider: z.string().optional(),
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
  })
  .optional();

export const providerTaskSchema = z
  .object({
    provider: z.string().trim().min(1).optional(),
  })
  .optional();

/* ------------------------------------------------------------------ */
/*  Parameter schemas                                                 */
/* ------------------------------------------------------------------ */

export const idParamsSchema = z.object({ id: z.string().trim().min(1) });

export const episodeParamsSchema = z.object({
  id: z.string().trim().min(1),
  order: z.coerce.number().int().min(1),
});

export const characterParamsSchema = z.object({
  id: z.string().trim().min(1),
  characterId: z.string().trim().min(1),
});

export const storyboardParamsSchema = z.object({ storyboardId: z.string().trim().min(1) });

export const shotParamsSchema = z.object({
  id: z.string().trim().min(1),
  shotId: z.string().trim().min(1),
});

export const videoPromptParamsSchema = z.object({ videoPromptId: z.string().trim().min(1) });

export const shotImageParamsSchema = z.object({ shotId: z.string().trim().min(1) });

export const shotImageVersionParamsSchema = z.object({
  shotId: z.string().trim().min(1),
  version: z.string().trim().regex(/^v?\d+$/),
});

export const charImageParamsSchema = z.object({
  characterId: z.string().trim().min(1),
});

export const charImageVersionParamsSchema = z.object({
  characterId: z.string().trim().min(1),
  version: z.string().trim().regex(/^v?\d+$/),
});

export const threeViewParamsSchema = z.object({
  characterId: z.string().trim().min(1),
  view: z.enum(["front", "side", "back"]),
});

/* ------------------------------------------------------------------ */
/*  Body schemas                                                      */
/* ------------------------------------------------------------------ */

export const createProjectSchema = z.object({
  title: z.string().trim().min(1).max(120),
  source: z.enum(["novel_import", "original", "text_import"]),
  sourceRef: z.string().trim().min(1).optional(),
  track: z.string().trim().max(40).optional(),
  theme: z.string().trim().max(120).optional(),
  targetEpisodes: z.number().int().min(1).max(500).optional(),
  inspiration: z.string().trim().max(4000).optional(),
  rawText: z.string().trim().max(200000).optional(),
});

export const repairRequestSchema = z
  .object({
    instruction: z.string().trim().max(4000).optional(),
    provider: z.string().optional(),
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
  })
  .optional();

export const episodeUpdateSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  content: z.string().max(200000).optional(),
  hookOpening: z.string().trim().max(1000).nullable().optional(),
  cliffhanger: z.string().trim().max(1000).nullable().optional(),
  durationSec: z.number().int().min(1).max(600).nullable().optional(),
});

export const characterUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  archetype: z.string().trim().max(80).optional(),
  persona: z.string().trim().max(1000).optional(),
  speechStyle: z.string().trim().max(1000).optional(),
  visualAnchor: z.unknown().optional(),
  voiceProfile: z.unknown().optional(),
  relations: z.unknown().optional(),
});

export const saveCharacterSchema = z
  .object({
    tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  })
  .optional();

export const importCharacterSchema = z.object({
  libraryId: z.string().trim().min(1),
});

export const trackRecommendationSchema = z.object({
  title: z.string().trim().min(1).max(120),
  sourceType: z.enum(["novel_import", "original", "text_import"]),
  sourceDigest: z.string().trim().max(20000).optional(),
  theme: z.string().trim().max(120).optional(),
  targetEpisodes: z.number().int().min(1).max(500).optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export const sourceSupplementSchema = z
  .object({
    userSupplement: z.string().trim().max(8000).optional(),
    provider: z.string().optional(),
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
  })
  .optional();
