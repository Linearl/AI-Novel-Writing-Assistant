import type { AiSmellDimensionScore, AiSmellIssue } from './types';

export interface SentenceDetectorConfig {
  varianceMin: number;
}

export class SentenceDetector {
  private readonly config: SentenceDetectorConfig;

  constructor(config: Partial<SentenceDetectorConfig> = {}) {
    this.config = { varianceMin: 20, ...config };
  }

  detect(content: string): AiSmellDimensionScore {
    const issues: AiSmellIssue[] = [];
    const sentences = this.splitSentences(content);

    if (sentences.length < 3) {
      return {
        name: 'sentence',
        score: 0,
        weight: 0.25,
        issues: [],
      };
    }

    // 1. 句子长度方差
    const lengths = sentences.map(s => s.length);
    const variance = this.calculateVariance(lengths);
    const lengthStdDev = Math.sqrt(variance);

    // 2. 句式开头重复率
    const starters = sentences.map(s => s.slice(0, Math.min(3, s.length)));
    const starterCounts = this.countFrequency(starters);
    const starterValues = Object.values(starterCounts);
    const maxStarterFreq = starterValues.length > 0 ? Math.max(...starterValues) : 0;
    const maxStarterRatio = maxStarterFreq / Math.max(sentences.length, 1);

    // 3. 句子长度均值
    const avgLength = lengths.reduce((a, b) => a + b, 0) / Math.max(lengths.length, 1);

    // 4. 感叹号密度
    const exclamationCount = (content.match(/！|!/g) || []).length;
    const exclamationDensity = exclamationCount / Math.max(sentences.length, 1);

    // 5. 句号密度（检查是否有过多短句）
    const periodCount = (content.match(/。|\./g) || []).length;
    const periodDensity = periodCount / Math.max(sentences.length, 1);

    // 分项评分
    // 句长方差：方差越小越像AI（句式单一）
    const varianceScore = lengthStdDev < 8 ? 70 : lengthStdDev < 15 ? 40 : lengthStdDev < 22 ? 20 : 10;

    // 开头重复率：越高越像AI
    const starterScore = maxStarterRatio > 0.3 ? 80 : maxStarterRatio > 0.2 ? 50 : maxStarterRatio > 0.12 ? 25 : 10;

    // 感叹号密度：过高像模式化表达
    const exclamationScore = exclamationDensity > 0.25 ? 75 : exclamationDensity > 0.15 ? 45 : exclamationDensity > 0.08 ? 20 : 5;

    // 综合评分
    const score = Math.round(varianceScore * 0.35 + starterScore * 0.35 + exclamationScore * 0.15 + (periodDensity > 1.5 ? 15 : 0));

    // 生成具体问题
    if (maxStarterRatio > 0.15) {
      const topStarters = Object.entries(starterCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([s]) => `"${s}..."`)
        .join('、');
      issues.push({
        type: 'repetitive_starters',
        message: `句式开头重复率 ${(maxStarterRatio * 100).toFixed(1)}%（常见开头: ${topStarters}）`,
        severity: maxStarterRatio > 0.3 ? 'error' : 'warning',
        suggestion: '尝试变换句子开头，增加句式多样性',
      });
    }

    if (lengthStdDev < 12) {
      issues.push({
        type: 'uniform_sentence_length',
        message: `句子长度过于均匀（标准差 ${lengthStdDev.toFixed(1)}），缺乏节奏变化`,
        severity: lengthStdDev < 8 ? 'error' : 'warning',
        suggestion: '交替使用长短句，增加阅读节奏感',
      });
    }

    if (exclamationDensity > 0.2) {
      issues.push({
        type: 'excessive_exclamation',
        message: `感叹号密度过高（${(exclamationDensity * 100).toFixed(1)}%），情感表达过于模式化`,
        severity: exclamationDensity > 0.25 ? 'error' : 'warning',
        suggestion: '减少感叹号使用，通过行文本身传递情感强度',
      });
    }

    return {
      name: 'sentence',
      score,
      weight: 0.25,
      issues,
    };
  }

  private splitSentences(content: string): string[] {
    // 按中英文标点分句
    return content
      .split(/[。！？.!?\n]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    return numbers.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / numbers.length;
  }

  private countFrequency<T extends string>(items: T[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const item of items) {
      counts[item] = (counts[item] ?? 0) + 1;
    }
    return counts;
  }
}
