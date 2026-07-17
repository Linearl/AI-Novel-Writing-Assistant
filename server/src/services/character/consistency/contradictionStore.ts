import { prisma } from "../../../db/prisma";
import type { CharacterConsistencyContradiction, ContradictionFilter } from "./types";

function mapContradiction(row: {
  id: string;
  novelId: string;
  chapterNumber: number;
  characterId: string;
  characterName: string;
  type: string;
  severity: string;
  description: string;
  existingState: string | null;
  newState: string | null;
  suggestion: string | null;
  confidence: number;
  resolved: boolean;
  resolvedNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}): CharacterConsistencyContradiction {
  return {
    id: row.id,
    novelId: row.novelId,
    chapterNumber: row.chapterNumber,
    characterId: row.characterId,
    characterName: row.characterName,
    type: row.type as CharacterConsistencyContradiction["type"],
    severity: row.severity as CharacterConsistencyContradiction["severity"],
    description: row.description,
    existingState: row.existingState,
    newState: row.newState,
    suggestion: row.suggestion,
    confidence: row.confidence,
    resolved: row.resolved,
    resolvedNote: row.resolvedNote,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function saveContradictions(
  contradictions: Omit<CharacterConsistencyContradiction, "id">[],
): Promise<CharacterConsistencyContradiction[]> {
  const results: CharacterConsistencyContradiction[] = [];

  for (const c of contradictions) {
    const row = await prisma.characterConsistencyContradiction.create({
      data: {
        novelId: c.novelId,
        chapterNumber: c.chapterNumber,
        characterId: c.characterId,
        characterName: c.characterName,
        type: c.type,
        severity: c.severity,
        description: c.description,
        existingState: c.existingState,
        newState: c.newState,
        suggestion: c.suggestion,
        confidence: c.confidence,
        resolved: false,
      },
    });
    results.push(mapContradiction(row));
  }

  return results;
}

export async function getChapterContradictions(
  novelId: string,
  chapterNumber: number,
): Promise<CharacterConsistencyContradiction[]> {
  const rows = await prisma.characterConsistencyContradiction.findMany({
    where: { novelId, chapterNumber },
    orderBy: { severity: "desc" },
  });
  return rows.map(mapContradiction);
}

export async function getNovelContradictions(
  novelId: string,
  filter?: ContradictionFilter,
): Promise<CharacterConsistencyContradiction[]> {
  const where: Record<string, unknown> = { novelId };

  if (filter?.characterId) where.characterId = filter.characterId;
  if (filter?.type) where.type = filter.type;
  if (filter?.severity) where.severity = filter.severity;
  if (filter?.resolved !== undefined) where.resolved = filter.resolved;

  const rows = await prisma.characterConsistencyContradiction.findMany({
    where,
    orderBy: [{ severity: "desc" }, { chapterNumber: "asc" }],
  });
  return rows.map(mapContradiction);
}

export async function getContradictionById(id: string): Promise<CharacterConsistencyContradiction | null> {
  const row = await prisma.characterConsistencyContradiction.findUnique({ where: { id } });
  return row ? mapContradiction(row) : null;
}

export async function resolveContradiction(
  id: string,
  note?: string,
): Promise<CharacterConsistencyContradiction | null> {
  const row = await prisma.characterConsistencyContradiction.update({
    where: { id },
    data: {
      resolved: true,
      resolvedNote: note ?? null,
    },
  });
  return mapContradiction(row);
}

export async function deleteContradictionsForChapter(
  novelId: string,
  chapterNumber: number,
): Promise<number> {
  const result = await prisma.characterConsistencyContradiction.deleteMany({
    where: { novelId, chapterNumber },
  });
  return result.count;
}

export async function getContradictionStats(novelId: string): Promise<{
  total: number;
  unresolved: number;
  hard: number;
  soft: number;
  byType: Record<string, number>;
}> {
  const all = await prisma.characterConsistencyContradiction.findMany({
    where: { novelId },
    select: { type: true, severity: true, resolved: true },
  });

  const byType: Record<string, number> = {};
  let hard = 0;
  let soft = 0;
  let unresolved = 0;

  for (const c of all) {
    byType[c.type] = (byType[c.type] ?? 0) + 1;
    if (c.severity === "hard") hard++;
    else soft++;
    if (!c.resolved) unresolved++;
  }

  return {
    total: all.length,
    unresolved,
    hard,
    soft,
    byType,
  };
}
