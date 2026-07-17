/**
 * REQ-7083: Character Mapper — unified serialization/DTO layer.
 *
 * Provides a single place for character data format transformations
 * (Prisma model -> DTO, API response -> internal model, etc.).
 *
 * TODO: Consolidate the scattered serialization implementations
 * across 11 character service files into this mapper.
 */

/**
 * Raw Prisma Character row (as returned by prisma.character.findUnique).
 * Subset of fields commonly needed for DTO conversion.
 */
export interface PrismaCharacterRow {
  id: string;
  novelId: string;
  name: string;
  gender: string | null;
  role: string | null;
  personality: string | null;
  background: string | null;
  storyFunction: string | null;
  currentGoal: string | null;
  relationToProtagonist: string | null;
  appearance: string | null;
  voiceStyle: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Character DTO for API responses and service return values. */
export interface CharacterDTO {
  id: string;
  novelId: string;
  name: string;
  gender: string | null;
  role: string | null;
  personality: string | null;
  background: string | null;
  storyFunction: string | null;
  currentGoal: string | null;
  relationToProtagonist: string | null;
  appearance: string | null;
  voiceStyle: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Convert a Prisma Character row to a CharacterDTO.
 * Handles null fields and date serialization.
 */
export function toCharacterDTO(row: PrismaCharacterRow): CharacterDTO {
  return {
    id: row.id,
    novelId: row.novelId,
    name: row.name,
    gender: row.gender,
    role: row.role,
    personality: row.personality,
    background: row.background,
    storyFunction: row.storyFunction,
    currentGoal: row.currentGoal,
    relationToProtagonist: row.relationToProtagonist,
    appearance: row.appearance,
    voiceStyle: row.voiceStyle,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
