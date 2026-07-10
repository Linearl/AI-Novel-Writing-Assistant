/**
 * Character arc visualization types (REQ-2032).
 * Shared between server HTTP responses and client components.
 */
import { z } from "zod";

export interface CharacterArcTimelineEvent {
  chapterOrder: number | null;
  title: string;
  event: string;
}

export const characterArcTimelineEventSchema = z.object({
  chapterOrder: z.number().int().nullable(),
  title: z.string(),
  event: z.string(),
});

export interface CharacterArcData {
  characterId: string;
  name: string;
  role: string;
  arc: {
    arcStart: string | null;
    arcMidpoint: string | null;
    arcClimax: string | null;
    arcEnd: string | null;
  };
  currentState: string | null;
  currentGoal: string | null;
  timeline: CharacterArcTimelineEvent[];
}

export const characterArcSubSchema = z.object({
  arcStart: z.string().nullable(),
  arcMidpoint: z.string().nullable(),
  arcClimax: z.string().nullable(),
  arcEnd: z.string().nullable(),
});

export const characterArcDataSchema = z.object({
  characterId: z.string(),
  name: z.string(),
  role: z.string(),
  arc: characterArcSubSchema,
  currentState: z.string().nullable(),
  currentGoal: z.string().nullable(),
  timeline: z.array(characterArcTimelineEventSchema),
});

export interface CharacterRelationStageEntry {
  stageLabel: string;
  stageSummary: string;
  chapterOrder: number | null;
  trustScore: number | null;
  conflictScore: number | null;
  intimacyScore: number | null;
  dependencyScore: number | null;
  sourceType: string;
  isCurrent: boolean;
  nextTurnPoint: string | null;
}

export const characterRelationStageEntrySchema = z.object({
  stageLabel: z.string(),
  stageSummary: z.string(),
  chapterOrder: z.number().int().nullable(),
  trustScore: z.number().nullable(),
  conflictScore: z.number().nullable(),
  intimacyScore: z.number().nullable(),
  dependencyScore: z.number().nullable(),
  sourceType: z.string(),
  isCurrent: z.boolean(),
  nextTurnPoint: z.string().nullable(),
});

export interface CharacterRelationEvolutionData {
  characterA: string;
  characterB: string;
  stageCount: number;
  stages: CharacterRelationStageEntry[];
}

export const characterRelationEvolutionDataSchema = z.object({
  characterA: z.string(),
  characterB: z.string(),
  stageCount: z.number().int(),
  stages: z.array(characterRelationStageEntrySchema),
});

export interface CharacterStatesByChapterEntry {
  chapterOrder: number | null;
  chapterTitle: string | null;
  emotion: string | null;
  stressLevel: number | null;
  currentGoal: string | null;
  summary: string | null;
}

export const characterStatesByChapterEntrySchema = z.object({
  chapterOrder: z.number().int().nullable(),
  chapterTitle: z.string().nullable(),
  emotion: z.string().nullable(),
  stressLevel: z.number().nullable(),
  currentGoal: z.string().nullable(),
  summary: z.string().nullable(),
});

export interface CharacterStatesByChapterData {
  characterId: string;
  name: string;
  stateCount: number;
  states: CharacterStatesByChapterEntry[];
}

export const characterStatesByChapterDataSchema = z.object({
  characterId: z.string(),
  name: z.string(),
  stateCount: z.number().int(),
  states: z.array(characterStatesByChapterEntrySchema),
});
