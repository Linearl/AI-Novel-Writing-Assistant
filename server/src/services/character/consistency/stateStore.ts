import { prisma } from "../../../db/prisma";
import type {
  CharacterConsistencyStateRecord,
  AppearanceState,
  PersonalityState,
  AbilityState,
  RelationshipState,
} from "./types";

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value || !value.trim()) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapState(row: {
  id: string;
  novelId: string;
  characterId: string;
  chapterNumber: number;
  appearance: string;
  personality: string;
  abilities: string;
  relationships: string;
  currentStatus: string | null;
  location: string | null;
  sourceChapter: number;
  createdAt: Date;
}): CharacterConsistencyStateRecord {
  return {
    id: row.id,
    novelId: row.novelId,
    characterId: row.characterId,
    chapterNumber: row.chapterNumber,
    appearance: parseJson<AppearanceState>(row.appearance, { rawDescription: "" }),
    personality: parseJson<PersonalityState>(row.personality, { traits: [], motivations: [], fears: [], rawDescription: "" }),
    abilities: parseJson<AbilityState[]>(row.abilities, []),
    relationships: parseJson<RelationshipState[]>(row.relationships, []),
    currentStatus: row.currentStatus,
    location: row.location,
    sourceChapter: row.sourceChapter,
    createdAt: row.createdAt,
  };
}

export async function saveCharacterState(
  state: Omit<CharacterConsistencyStateRecord, "id" | "createdAt">,
): Promise<CharacterConsistencyStateRecord> {
  const row = await prisma.characterConsistencyState.create({
    data: {
      novelId: state.novelId,
      characterId: state.characterId,
      chapterNumber: state.chapterNumber,
      appearance: JSON.stringify(state.appearance),
      personality: JSON.stringify(state.personality),
      abilities: JSON.stringify(state.abilities),
      relationships: JSON.stringify(state.relationships),
      currentStatus: state.currentStatus,
      location: state.location,
      sourceChapter: state.sourceChapter,
    },
  });
  return mapState(row);
}

export async function getLatestState(
  novelId: string,
  characterId: string,
): Promise<CharacterConsistencyStateRecord | null> {
  const row = await prisma.characterConsistencyState.findFirst({
    where: { novelId, characterId },
    orderBy: { chapterNumber: "desc" },
  });
  return row ? mapState(row) : null;
}

export async function getStateByChapter(
  novelId: string,
  characterId: string,
  chapterNumber: number,
): Promise<CharacterConsistencyStateRecord | null> {
  const row = await prisma.characterConsistencyState.findFirst({
    where: { novelId, characterId, chapterNumber },
  });
  return row ? mapState(row) : null;
}

export async function getStateHistory(
  novelId: string,
  characterId: string,
): Promise<CharacterConsistencyStateRecord[]> {
  const rows = await prisma.characterConsistencyState.findMany({
    where: { novelId, characterId },
    orderBy: { chapterNumber: "asc" },
  });
  return rows.map(mapState);
}

export async function getHistoricalStates(
  novelId: string,
  characterId: string,
  beforeChapter: number,
): Promise<CharacterConsistencyStateRecord[]> {
  const rows = await prisma.characterConsistencyState.findMany({
    where: {
      novelId,
      characterId,
      chapterNumber: { lt: beforeChapter },
    },
    orderBy: { chapterNumber: "asc" },
  });
  return rows.map(mapState);
}

export async function deleteStatesForChapter(
  novelId: string,
  chapterNumber: number,
): Promise<number> {
  const result = await prisma.characterConsistencyState.deleteMany({
    where: { novelId, chapterNumber },
  });
  return result.count;
}
