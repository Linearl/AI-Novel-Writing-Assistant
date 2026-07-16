/**
 * AI味趋势追踪服务
 *
 * REQ-7057: 提供趋势数据聚合、异常点检测和范围对比能力。
 *
 * 职责：
 * - 从 AiSmellScore 表聚合章节评分趋势数据
 * - 检测异常点（连续下降、单章突变）
 * - 支持两个章节范围的对比分析
 */

import type { PrismaClient } from "@prisma/client";

// ─── 类型定义 ────────────────────────────────────────────────────────────

export interface TrendDimension {
  formulaic: number[];
  mechanical: number[];
  emotional: number[];
  original: number[];
}

export interface AnomalyPoint {
  chapterNumber: number;
  type: "sharp_drop" | "sharp_rise" | "continuous_decline";
  score: number;
  expectedRange: [number, number];
  suggestion?: string;
}

export interface TrendData {
  chapters: number[];
  overall: number[];
  dimensions: TrendDimension;
  anomalies: AnomalyPoint[];
}

export interface RangeStats {
  startChapter: number;
  endChapter: number;
  avgOverallScore: number;
  minScore: number;
  maxScore: number;
  scoreRange: number;
  dimensionAverages: {
    formulaic: number;
    mechanical: number;
    emotional: number;
    original: number;
  };
  chapterCount: number;
}

export interface ComparisonResult {
  range1: RangeStats;
  range2: RangeStats;
  diff: {
    overallChange: number;
    formulaicChange: number;
    mechanicalChange: number;
    emotionalChange: number;
    originalChange: number;
    interpretation: string;
  };
}

interface AiSmellScoreRecord {
  chapterId: string;
  chapterOrder: number;
  overallScore: number;
  formulaicScore: number | null;
  mechanicalScore: number | null;
  emotionalScore: number | null;
  originalScore: number | null;
}

// ─── 服务类 ──────────────────────────────────────────────────────────────

export class AiSmellTrendService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 获取小说的 AI 味趋势数据。
   *
   * @param novelId     - 小说 ID
   * @param startChapter - 起始章节号（可选）
   * @param endChapter   - 结束章节号（可选）
   * @returns 包含章节号、评分、各维度、异常点的趋势数据
   */
  async getTrendData(
    novelId: string,
    startChapter?: number,
    endChapter?: number,
  ): Promise<TrendData> {
    const scores = await this.queryScores(novelId, startChapter, endChapter);

    if (scores.length === 0) {
      return {
        chapters: [],
        overall: [],
        dimensions: {
          formulaic: [],
          mechanical: [],
          emotional: [],
          original: [],
        },
        anomalies: [],
      };
    }

    return {
      chapters: scores.map((s) => s.chapterOrder),
      overall: scores.map((s) => s.overallScore),
      dimensions: {
        formulaic: scores.map((s) => s.formulaicScore ?? 0),
        mechanical: scores.map((s) => s.mechanicalScore ?? 0),
        emotional: scores.map((s) => s.emotionalScore ?? 0),
        original: scores.map((s) => s.originalScore ?? 0),
      },
      anomalies: detectAnomalies(scores),
    };
  }

  /**
   * 仅查询异常点。
   */
  async getAnomalies(
    novelId: string,
    startChapter?: number,
    endChapter?: number,
  ): Promise<AnomalyPoint[]> {
    const scores = await this.queryScores(novelId, startChapter, endChapter);
    return detectAnomalies(scores);
  }

  /**
   * 对比两个章节区间的 AI 味评分。
   *
   * @param novelId - 小说 ID
   * @param range1   - 第一个范围 [startChapter, endChapter]
   * @param range2   - 第二个范围 [startChapter, endChapter]
   */
  async compareRanges(
    novelId: string,
    range1: [number, number],
    range2: [number, number],
  ): Promise<ComparisonResult> {
    const [scores1, scores2] = await Promise.all([
      this.queryScores(novelId, range1[0], range1[1]),
      this.queryScores(novelId, range2[0], range2[1]),
    ]);

    const stats1 = computeRangeStats(scores1, range1[0], range1[1]);
    const stats2 = computeRangeStats(scores2, range2[0], range2[1]);

    const diff = computeDiff(stats1, stats2);

    return { range1: stats1, range2: stats2, diff };
  }

  // ─── Private ──────────────────────────────────────────────────────────

  private async queryScores(
    novelId: string,
    startChapter?: number,
    endChapter?: number,
  ): Promise<AiSmellScoreRecord[]> {
    const records = await this.prisma.aiSmellScore.findMany({
      where: {
        novelId,
        ...(startChapter !== undefined && { chapterOrder: { gte: startChapter } }),
        ...(endChapter !== undefined && { chapterOrder: { lte: endChapter } }),
      },
      orderBy: { chapterOrder: "asc" },
      select: {
        chapterId: true,
        chapterOrder: true,
        overallScore: true,
        formulaicScore: true,
        mechanicalScore: true,
        emotionalScore: true,
        originalScore: true,
      },
    });

    return records;
  }
}

// ─── 异常点检测算法 ────────────────────────────────────────────────────

/**
 * 检测 AI 味评分中的异常点。
 *
 * 检测规则：
 * 1. 连续下降：连续 3 章评分下降 → "continuous_decline"
 * 2. 单章突变：相邻两章评分变化 > 20 分 → "sharp_drop" 或 "sharp_rise"
 */
export function detectAnomalies(scores: AiSmellScoreRecord[]): AnomalyPoint[] {
  const anomalies: AnomalyPoint[] = [];

  if (scores.length < 2) return anomalies;

  // 检测连续下降（连续3章评分下降）
  for (let i = 2; i < scores.length; i++) {
    if (
      scores[i].overallScore < scores[i - 1].overallScore &&
      scores[i - 1].overallScore < scores[i - 2].overallScore
    ) {
      anomalies.push({
        chapterNumber: scores[i].chapterOrder,
        type: "continuous_decline",
        score: scores[i].overallScore,
        expectedRange: [
          Math.max(0, scores[i - 2].overallScore - 5),
          scores[i - 2].overallScore + 5,
        ],
        suggestion: "连续3章AI味评分下降，建议检查提示词或调整模型参数",
      });
    }
  }

  // 检测单章突变（变化>20分）
  for (let i = 1; i < scores.length; i++) {
    const diff = Math.abs(scores[i].overallScore - scores[i - 1].overallScore);
    if (diff > 20) {
      const type =
        scores[i].overallScore > scores[i - 1].overallScore
          ? "sharp_rise"
          : "sharp_drop";
      const suggestion =
        type === "sharp_drop"
          ? "评分突然大幅下降，可能引入明显AI写作模式，建议回顾该章节内容"
          : "评分突然大幅上升，检测到AI写作模式显著变化";
      anomalies.push({
        chapterNumber: scores[i].chapterOrder,
        type,
        score: scores[i].overallScore,
        expectedRange: [
          Math.max(0, scores[i - 1].overallScore - 10),
          Math.min(100, scores[i - 1].overallScore + 10),
        ],
        suggestion,
      });
    }
  }

  return anomalies;
}

// ─── 范围统计 ────────────────────────────────────────────────────────────

function computeRangeStats(
  scores: AiSmellScoreRecord[],
  startChapter: number,
  endChapter: number,
): RangeStats {
  if (scores.length === 0) {
    return {
      startChapter,
      endChapter,
      avgOverallScore: 0,
      minScore: 0,
      maxScore: 0,
      scoreRange: 0,
      dimensionAverages: { formulaic: 0, mechanical: 0, emotional: 0, original: 0 },
      chapterCount: 0,
    };
  }

  const overallScores = scores.map((s) => s.overallScore);
  const avgOverall = average(overallScores);

  const formulaicValues = scores
    .map((s) => s.formulaicScore)
    .filter((v): v is number => v !== null);
  const mechanicalValues = scores
    .map((s) => s.mechanicalScore)
    .filter((v): v is number => v !== null);
  const emotionalValues = scores
    .map((s) => s.emotionalScore)
    .filter((v): v is number => v !== null);
  const originalValues = scores
    .map((s) => s.originalScore)
    .filter((v): v is number => v !== null);

  return {
    startChapter,
    endChapter,
    avgOverallScore: round(avgOverall),
    minScore: Math.min(...overallScores),
    maxScore: Math.max(...overallScores),
    scoreRange: Math.max(...overallScores) - Math.min(...overallScores),
    dimensionAverages: {
      formulaic: round(formulaicValues.length > 0 ? average(formulaicValues) : 0),
      mechanical: round(mechanicalValues.length > 0 ? average(mechanicalValues) : 0),
      emotional: round(emotionalValues.length > 0 ? average(emotionalValues) : 0),
      original: round(originalValues.length > 0 ? average(originalValues) : 0),
    },
    chapterCount: scores.length,
  };
}

// ─── 对比差异计算 ────────────────────────────────────────────────────────

function computeDiff(stats1: RangeStats, stats2: RangeStats): ComparisonResult["diff"] {
  const overallChange = stats2.avgOverallScore - stats1.avgOverallScore;
  const formulaicChange =
    stats2.dimensionAverages.formulaic - stats1.dimensionAverages.formulaic;
  const mechanicalChange =
    stats2.dimensionAverages.mechanical - stats1.dimensionAverages.mechanical;
  const emotionalChange =
    stats2.dimensionAverages.emotional - stats1.dimensionAverages.emotional;
  const originalChange =
    stats2.dimensionAverages.original - stats1.dimensionAverages.original;

  const interpretation = buildInterpretation(
    overallChange,
    formulaicChange,
    mechanicalChange,
    emotionalChange,
    originalChange,
  );

  return {
    overallChange: round(overallChange),
    formulaicChange: round(formulaicChange),
    mechanicalChange: round(mechanicalChange),
    emotionalChange: round(emotionalChange),
    originalChange: round(originalChange),
    interpretation,
  };
}

function buildInterpretation(
  overall: number,
  formulaic: number,
  mechanical: number,
  emotional: number,
  original: number,
): string {
  if (overall > 5) {
    return "AI味评分整体上升，写作质量有所提升，AI写作模式减少";
  }
  if (overall < -5) {
    return "AI味评分整体下降，AI写作模式增加，建议检查提示词或调整生成策略";
  }
  if (formulaic < -5) {
    return "套路化程度增加，内容趋于模板化，建议增加原创性指导";
  }
  if (mechanical < -5) {
    return "机械化程度增加，句式结构趋同，建议调整句式多样性参数";
  }
  if (emotional < -5) {
    return "情感表达减弱，建议在提示词中加强情感描写指导";
  }
  if (original > 5) {
    return "原创性提升，写作风格更加多样化";
  }
  return "两个范围AI味评分整体稳定，无明显变化趋势";
}

// ─── 工具函数 ────────────────────────────────────────────────────────────

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
