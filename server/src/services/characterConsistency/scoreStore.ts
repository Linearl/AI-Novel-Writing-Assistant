import { prisma } from "../../db/prisma";
import type { ConsistencyScoreRecord, ConsistencyScoreBreakdown } from "./types";

function mapScore(row: {
  id: string;
  novelId: string;
  chapterNumber: number;
  overallScore: number;
  appearanceScore: number | null;
  personalityScore: number | null;
  abilityScore: number | null;
  relationshipScore: number | null;
  contradictionCount: number;
  hardCount: number;
  softCount: number;
  createdAt: Date;
}): ConsistencyScoreRecord {
  return {
    id: row.id,
    novelId: row.novelId,
    chapterNumber: row.chapterNumber,
    overallScore: row.overallScore,
    appearanceScore: row.appearanceScore,
    personalityScore: row.personalityScore,
    abilityScore: row.abilityScore,
    relationshipScore: row.relationshipScore,
    contradictionCount: row.contradictionCount,
    hardCount: row.hardCount,
    softCount: row.softCount,
    createdAt: row.createdAt,
  };
}

export async function saveConsistencyScore(
  novelId: string,
  score: ConsistencyScoreBreakdown,
): Promise<ConsistencyScoreRecord> {
  const hardCount = score.contradictions.filter((c) => c.severity === "hard").length;
  const softCount = score.contradictions.filter((c) => c.severity === "soft").length;

  // Upsert: replace score for this chapter
  await prisma.characterConsistencyScore.deleteMany({
    where: { novelId, chapterNumber: score.chapterNumber },
  });

  const row = await prisma.characterConsistencyScore.create({
    data: {
      novelId,
      chapterNumber: score.chapterNumber,
      overallScore: score.overall,
      appearanceScore: score.dimensions.appearance,
      personalityScore: score.dimensions.personality,
      abilityScore: score.dimensions.ability,
      relationshipScore: score.dimensions.relationship,
      contradictionCount: score.contradictions.length,
      hardCount,
      softCount,
    },
  });

  return mapScore(row);
}

export async function getChapterScore(
  novelId: string,
  chapterNumber: number,
): Promise<ConsistencyScoreRecord | null> {
  const row = await prisma.characterConsistencyScore.findFirst({
    where: { novelId, chapterNumber },
    orderBy: { createdAt: "desc" },
  });
  return row ? mapScore(row) : null;
}

export async function getNovelScores(
  novelId: string,
): Promise<ConsistencyScoreRecord[]> {
  const rows = await prisma.characterConsistencyScore.findMany({
    where: { novelId },
    orderBy: { chapterNumber: "asc" },
  });
  return rows.map(mapScore);
}

export async function getNovelAverageScore(novelId: string): Promise<number | null> {
  const result = await prisma.characterConsistencyScore.aggregate({
    where: { novelId },
    _avg: { overallScore: true },
  });
  return result._avg.overallScore ?? null;
}
