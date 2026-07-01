import { z } from "zod";
import {
  toolCountSchema,
  toolListLimitSchema,
  toolNullableTextSchema,
  toolOptionalTextSchema,
  toolRequiredIdSchema,
  toolSummarySchema,
  toolTimestampSchema,
} from "./toolSchemaPrimitives";

export const listBaseCharactersInputSchema = z.object({
  category: toolOptionalTextSchema,
  search: toolOptionalTextSchema,
  limit: toolListLimitSchema,
});

export const baseCharacterSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  category: z.string(),
  tags: z.string(),
  updatedAt: toolTimestampSchema,
});

export const listBaseCharactersOutputSchema = z.object({
  items: z.array(baseCharacterSummarySchema),
  summary: toolSummarySchema,
});

export const baseCharacterIdInputSchema = z.object({
  characterId: toolRequiredIdSchema,
});

export const getBaseCharacterDetailOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  category: z.string(),
  personality: z.string(),
  background: z.string(),
  development: z.string(),
  appearance: toolNullableTextSchema,
  weaknesses: toolNullableTextSchema,
  interests: toolNullableTextSchema,
  keyEvents: toolNullableTextSchema,
  tags: z.string(),
  updatedAt: toolTimestampSchema,
  summary: toolSummarySchema,
});

// --- REQ-2031: Character Arc Query Tools ---

export const getCharacterArcInputSchema = z.object({
  novelId: toolRequiredIdSchema,
  characterId: toolRequiredIdSchema,
});

export const characterArcSchema = z.object({
  arcStart: toolNullableTextSchema,
  arcMidpoint: toolNullableTextSchema,
  arcClimax: toolNullableTextSchema,
  arcEnd: toolNullableTextSchema,
});

export const characterTimelineEventSchema = z.object({
  chapterOrder: z.number().int().nullable(),
  title: z.string(),
  event: z.string(),
});

export const getCharacterArcOutputSchema = z.object({
  characterId: z.string(),
  name: z.string(),
  role: z.string(),
  arc: characterArcSchema,
  currentState: toolNullableTextSchema,
  currentGoal: toolNullableTextSchema,
  timeline: z.array(characterTimelineEventSchema),
  summary: toolSummarySchema,
});

export const getCharacterDynamicsOverviewInputSchema = z.object({
  novelId: toolRequiredIdSchema,
  chapterOrder: z.number().int().min(1).optional(),
});

export const getCharacterDynamicsOverviewOutputSchema = z.object({
  novelId: z.string(),
  summary: toolSummarySchema,
  currentVolume: z
    .object({
      id: z.string(),
      title: z.string(),
      startChapterOrder: z.number().int().nullable(),
      endChapterOrder: z.number().int().nullable(),
      currentChapterOrder: z.number().int().nullable(),
    })
    .nullable(),
  characterCount: toolCountSchema,
  coreCharacterCount: toolCountSchema,
  pendingCandidateCount: toolCountSchema,
  relationStageCount: toolCountSchema,
  characters: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      role: z.string(),
      isCoreInVolume: z.boolean(),
      absenceRisk: z.string(),
      absenceSpan: z.number().int(),
      currentGoal: toolNullableTextSchema,
      currentState: toolNullableTextSchema,
      factionLabel: toolNullableTextSchema,
      stanceLabel: toolNullableTextSchema,
    }),
  ),
  relations: z.array(
    z.object({
      sourceCharacterName: z.string(),
      targetCharacterName: z.string(),
      stageLabel: z.string(),
      stageSummary: z.string(),
      nextTurnPoint: toolNullableTextSchema,
    }),
  ),
});

export const getCharacterRelationEvolutionInputSchema = z.object({
  novelId: toolRequiredIdSchema,
  characterIdA: toolRequiredIdSchema,
  characterIdB: toolRequiredIdSchema,
});

export const relationStageEntrySchema = z.object({
  stageLabel: z.string(),
  stageSummary: z.string(),
  chapterOrder: z.number().int().nullable(),
  trustScore: z.number().int().nullable(),
  conflictScore: z.number().int().nullable(),
  intimacyScore: z.number().int().nullable(),
  dependencyScore: z.number().int().nullable(),
  sourceType: z.string(),
  isCurrent: z.boolean(),
  nextTurnPoint: toolNullableTextSchema,
});

export const getCharacterRelationEvolutionOutputSchema = z.object({
  characterA: z.string(),
  characterB: z.string(),
  stageCount: toolCountSchema,
  stages: z.array(relationStageEntrySchema),
  summary: toolSummarySchema,
});

export const getCharacterStatesByChapterInputSchema = z.object({
  novelId: toolRequiredIdSchema,
  characterId: toolRequiredIdSchema,
});

export const characterStateByChapterSchema = z.object({
  chapterOrder: z.number().int().nullable(),
  chapterTitle: toolNullableTextSchema,
  emotion: toolNullableTextSchema,
  stressLevel: z.number().int().nullable(),
  currentGoal: toolNullableTextSchema,
  summary: toolNullableTextSchema,
});

export const getCharacterStatesByChapterOutputSchema = z.object({
  characterId: z.string(),
  name: z.string(),
  stateCount: toolCountSchema,
  states: z.array(characterStateByChapterSchema),
  summary: toolSummarySchema,
});
