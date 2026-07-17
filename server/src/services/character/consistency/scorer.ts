import type { CharacterConsistencyContradiction, ConsistencyScoreBreakdown } from "./types";

const HARD_PENALTY = 20;
const SOFT_PENALTY = 10;

export interface ScoreCalculationInput {
  chapterNumber: number;
  contradictions: CharacterConsistencyContradiction[];
}

export function calculateConsistencyScore(input: ScoreCalculationInput): ConsistencyScoreBreakdown {
  const { chapterNumber, contradictions } = input;

  const scores = {
    appearance: 100,
    personality: 100,
    ability: 100,
    relationship: 100,
  } as Record<string, number>;

  for (const c of contradictions) {
    const penalty = c.severity === "hard" ? HARD_PENALTY : SOFT_PENALTY;
    // Apply confidence adjustment — lower confidence = lower penalty
    const adjustedPenalty = Math.round(penalty * c.confidence);
    scores[c.type] = Math.max(0, scores[c.type] - adjustedPenalty);
  }

  const overall = Math.round(
    (scores.appearance + scores.personality + scores.ability + scores.relationship) / 4,
  );

  return {
    chapterNumber,
    overall,
    dimensions: {
      appearance: scores["appearance"] ?? 100,
      personality: scores["personality"] ?? 100,
      ability: scores["ability"] ?? 100,
      relationship: scores["relationship"] ?? 100,
    },
    contradictions,
  };
}

export function getScoreThresholdWarning(score: ConsistencyScoreBreakdown): string | null {
  if (score.overall < 40) {
    return `严重风险：第${score.chapterNumber}章人物一致性评分仅为${score.overall}，存在严重矛盾，建议立即审核修复`;
  }
  if (score.overall < 60) {
    return `警告：第${score.chapterNumber}章人物一致性评分仅为${score.overall}，低于合格线，建议审核`;
  }
  if (score.overall < 75) {
    return `注意：第${score.chapterNumber}章人物一致性评分为${score.overall}，存在一些不一致`;
  }
  return null;
}
