import type {
  CharacterConsistencyContradiction,
  ContradictionReport,
  ConsistencyScoreBreakdown,
} from "./types";

export function generateContradictionReport(
  novelId: string,
  chapterNumber: number,
  contradictions: CharacterConsistencyContradiction[],
  score: ConsistencyScoreBreakdown | null,
): ContradictionReport {
  const hardCount = contradictions.filter((c) => c.severity === "hard").length;
  const softCount = contradictions.filter((c) => c.severity === "soft").length;
  const unresolvedCount = contradictions.filter((c) => !c.resolved).length;

  const byType: Record<string, number> = {};
  for (const c of contradictions) {
    byType[c.type] = (byType[c.type] ?? 0) + 1;
  }

  const typeSummary = Object.entries(byType)
    .map(([type, count]) => `${type}: ${count}个`)
    .join("，");

  const summaryParts: string[] = [];
  if (contradictions.length === 0) {
    summaryParts.push("未发现角色一致性问题");
  } else {
    summaryParts.push(`共发现${contradictions.length}个矛盾`);
    if (hardCount > 0) summaryParts.push(`${hardCount}个硬矛盾`);
    if (softCount > 0) summaryParts.push(`${softCount}个软矛盾`);
    if (unresolvedCount > 0) summaryParts.push(`${unresolvedCount}个未解决`);
    summaryParts.push(`(${typeSummary})`);
  }

  if (score) {
    summaryParts.push(`综合评分: ${score.overall}/100`);
  }

  return {
    novelId,
    chapterNumber,
    contradictions,
    score,
    generatedAt: new Date().toISOString(),
    summary: summaryParts.join("，"),
  };
}

export function generateNovelSummaryReport(
  novelId: string,
  allContradictions: CharacterConsistencyContradiction[],
  scores: Array<{ chapterNumber: number; overall: number }>,
): {
  novelId: string;
  totalContradictions: number;
  unresolvedCount: number;
  hardCount: number;
  softCount: number;
  averageScore: number | null;
  byType: Record<string, number>;
  scoreTrend: Array<{ chapterNumber: number; overall: number }>;
  worstChapters: Array<{ chapterNumber: number; count: number }>;
} {
  const hardCount = allContradictions.filter((c) => c.severity === "hard").length;
  const softCount = allContradictions.filter((c) => c.severity === "soft").length;
  const unresolvedCount = allContradictions.filter((c) => !c.resolved).length;

  const byType: Record<string, number> = {};
  for (const c of allContradictions) {
    byType[c.type] = (byType[c.type] ?? 0) + 1;
  }

  const averageScore = scores.length > 0
    ? Math.round(scores.reduce((sum, s) => sum + s.overall, 0) / scores.length)
    : null;

  // Find worst chapters by contradiction count
  const byChapter: Record<number, number> = {};
  for (const c of allContradictions) {
    byChapter[c.chapterNumber] = (byChapter[c.chapterNumber] ?? 0) + 1;
  }
  const worstChapters = Object.entries(byChapter)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cn, count]) => ({ chapterNumber: Number(cn), count }));

  return {
    novelId,
    totalContradictions: allContradictions.length,
    unresolvedCount,
    hardCount,
    softCount,
    averageScore,
    byType,
    scoreTrend: scores.sort((a, b) => a.chapterNumber - b.chapterNumber),
    worstChapters,
  };
}
