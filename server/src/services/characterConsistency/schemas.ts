import { z } from "zod";

export const appearanceStateSchema = z.object({
  height: z.string().optional(),
  build: z.string().optional(),
  hair: z.string().optional(),
  eyes: z.string().optional(),
  skin: z.string().optional(),
  distinguishingFeatures: z.array(z.string()).optional(),
  clothing: z.string().optional(),
  rawDescription: z.string(),
});

export const personalityStateSchema = z.object({
  traits: z.array(z.string()),
  motivations: z.array(z.string()),
  fears: z.array(z.string()),
  speechPattern: z.string().optional(),
  rawDescription: z.string(),
});

export const abilityStateSchema = z.object({
  name: z.string(),
  level: z.string(),
  limitations: z.array(z.string()).optional(),
  sourceChapter: z.number(),
});

export const relationshipStateSchema = z.object({
  targetCharacterId: z.string(),
  targetCharacterName: z.string(),
  type: z.string(),
  trustLevel: z.number().min(0).max(100).optional(),
  rawDescription: z.string(),
});

export const characterStateExtractionOutputSchema = z.object({
  appearance: appearanceStateSchema,
  personality: personalityStateSchema,
  abilities: z.array(abilityStateSchema),
  relationships: z.array(relationshipStateSchema),
  currentStatus: z.string().nullable(),
  location: z.string().nullable(),
});

export type CharacterStateExtractionOutput = z.infer<typeof characterStateExtractionOutputSchema>;

export interface CharacterStateExtractionInput {
  characterName: string;
  characterPersonality: string;
  characterBackground: string;
  characterAppearance: string;
  chapterContent: string;
  previousAppearance: string;
  previousPersonality: string;
}

export const contradictionDetectionOutputSchema = z.object({
  contradictions: z.array(z.object({
    type: z.enum(["appearance", "personality", "ability", "relationship", "location"]),
    severity: z.enum(["hard", "soft"]),
    description: z.string(),
    existingState: z.string(),
    newState: z.string(),
    suggestion: z.string().optional(),
    confidence: z.number().min(0).max(1),
  })),
  summary: z.string(),
});

export type ContradictionDetectionOutput = z.infer<typeof contradictionDetectionOutputSchema>;

export interface ContradictionDetectionInput {
  characterName: string;
  chapterNumber: number;
  newStateDescription: string;
  historicalStatesSummary: string;
}
