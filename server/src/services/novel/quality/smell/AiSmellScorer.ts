import type { AiSmellConfig } from './types';
import type { AiSmellDimensionScore, AiSmellReport, AiSmellLevel, AiSmellAdjustmentAction } from './types';
import { DEFAULT_AI_SMELL_CONFIG } from './types';

const LEVEL_LABELS: Record<AiSmellLevel, string> = {
  natural: '自然度高',
  mild: '轻微AI味',
  noticeable: '明显AI味',
  heavy: '重度AI味',
};

export class AiSmellScorer {
  private readonly config: AiSmellConfig;

  constructor(config: Partial<AiSmellConfig> = {}) {
    this.config = { ...DEFAULT_AI_SMELL_CONFIG, ...config };
  }

  aggregate(dimensions: AiSmellDimensionScore[]): AiSmellReport {
    if (dimensions.length === 0) {
      return {
        overallScore: 0,
        level: 'natural',
        dimensions: [],
        issues: [],
        adjustmentAction: 'none',
        summary: '未进行检测',
      };
    }

    // 加权平均计算综合评分
    const totalWeight = dimensions.reduce((sum, d) => sum + d.weight, 0);
    const overallScore = totalWeight > 0
      ? Math.round(dimensions.reduce((sum, d) => sum + d.score * d.weight, 0) / totalWeight)
      : 0;

    const level = this.determineLevel(overallScore);
    const adjustmentAction = this.determineAction(overallScore);

    // 收集所有问题
    const allIssues = dimensions.flatMap(d => d.issues);

    // 生成摘要
    const summary = this.generateSummary(overallScore, level, dimensions);

    return {
      overallScore,
      level,
      dimensions,
      issues: allIssues,
      adjustmentAction,
      summary,
    };
  }

  private determineLevel(score: number): AiSmellLevel {
    const t = this.config.scoring.levelThresholds;
    if (score <= t.natural) return 'natural';
    if (score <= t.mild) return 'mild';
    if (score <= t.noticeable) return 'noticeable';
    return 'heavy';
  }

  private determineAction(score: number): AiSmellAdjustmentAction {
    const t = this.config.scoring.levelThresholds;
    if (score > t.noticeable) return 'regenerate';
    if (score > t.mild) return 'adjust_temperature';
    return 'none';
  }

  private generateSummary(
    overallScore: number,
    level: AiSmellLevel,
    dimensions: AiSmellDimensionScore[],
  ): string {
    const levelLabel = LEVEL_LABELS[level];
    const dimSummary = dimensions
      .filter(d => d.score > 20)
      .sort((a, b) => b.score - a.score)
      .map(d => `${d.name}=${d.score}分`)
      .join('、');

    const issueCount = dimensions.reduce((sum, d) => sum + d.issues.length, 0);

    const parts = [
      `综合AI味评分: ${overallScore}/100（${levelLabel}）`,
    ];
    if (dimSummary) {
      parts.push(`维度得分: ${dimSummary}`);
    }
    if (issueCount > 0) {
      const errorCount = dimensions.reduce((sum, d) => sum + d.issues.filter(i => i.severity === 'error').length, 0);
      const warnCount = dimensions.reduce((sum, d) => sum + d.issues.filter(i => i.severity === 'warning').length, 0);
      const infoCount = dimensions.reduce((sum, d) => sum + d.issues.filter(i => i.severity === 'info').length, 0);

      const counts: string[] = [];
      if (errorCount > 0) counts.push(`${errorCount}个严重`);
      if (warnCount > 0) counts.push(`${warnCount}个警告`);
      if (infoCount > 0) counts.push(`${infoCount}个提示`);

      parts.push(`检测到 ${counts.join('、')} 问题`);
    }

    return parts.join('。');
  }
}
