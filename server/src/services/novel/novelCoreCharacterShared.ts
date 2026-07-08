import { z } from "zod";

export const zodCharacterImportResult = z.object({
  name: z.string().trim().min(1),
  role: z.string().trim().min(1),
  gender: z.enum(["male", "female", "other", "unknown"]).optional(),
  personality: z.string().trim().optional(),
  background: z.string().trim().optional(),
  relationToProtagonist: z.string().trim().optional(),
  storyFunction: z.string().trim().optional(),
});

export const zodCharacterImportRelation = z.object({
  sourceName: z.string().trim().min(1),
  targetName: z.string().trim().min(1),
  surfaceRelation: z.string().trim().min(1),
  hiddenTension: z.string().trim().optional(),
  conflictSource: z.string().trim().optional(),
});

export const zodImportCharactersWithRelationsSchema = z.object({
  characters: z.array(zodCharacterImportResult),
  relations: z.array(zodCharacterImportRelation).optional(),
});
