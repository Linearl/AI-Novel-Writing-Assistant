import type { AiSmellDimensionScore, AiSmellIssue } from './types';

export interface EmotionDetectorConfig {
  patternThreshold: number;
  customEmotionWords?: string[];
}

// 基础情感词库
const DEFAULT_EMOTION_WORDS = [
  '感动', '激动', '兴奋', '开心', '高兴',
  '悲伤', '难过', '伤心', '痛苦', '绝望',
  '愤怒', '生气', '恼火', '气愤', '怒火',
  '温暖', '幸福', '甜蜜', '温馨', '舒适',
  '惊讶', '震惊', '震撼', '恐惧', '害怕',
  '紧张', '不安', '焦虑', '担忧', '困惑',
  '失落', '孤独', '寂寞', '无助', '无奈',
  '欣慰', '满足', '自豪', '骄傲', '感激',
];

// 内心独白模式词
const INNER_THOUGHT_WORDS = [
  '心中', '心里', '内心', '暗想', '想到', '心想',
  '心中暗想', '心中暗道', '心中想到', '心底',
];

// 过度概括/总结词
const SUMMARY_WORDS = [
  '总之', '总而言之', '综上所述', '归根结底',
  '从某种程度上说', '可以说', '不得不承认',
];

export class EmotionDetector {
  private readonly emotionWords: string[];
  private readonly config: EmotionDetectorConfig;

  constructor(config: Partial<EmotionDetectorConfig> = {}) {
    this.config = { patternThreshold: 0.3, ...config };
    this.emotionWords = [...DEFAULT_EMOTION_WORDS, ...(config.customEmotionWords ?? [])];
  }

  detect(content: string): AiSmellDimensionScore {
    const issues: AiSmellIssue[] = [];
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0);

    // 1. 情感词分布集中度
    const emotionCounts = this.emotionWords.map(word => {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'g');
      const matches = content.match(regex);
      return { word, count: matches?.length ?? 0 };
    });

    const totalEmotions = emotionCounts.reduce((sum, e) => sum + e.count, 0);
    const distributionScore = this.calculateConcentrationScore(emotionCounts.map(e => e.count));

    // 2. 内心独白密度
    let innerThoughtCount = 0;
    for (const word of INNER_THOUGHT_WORDS) {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'g');
      const matches = content.match(regex);
      if (matches) {
        innerThoughtCount += matches.length;
      }
    }
    const innerThoughtDensity = innerThoughtCount / Math.max(paragraphs.length, 1);

    // 3. 过度概括密度
    let summaryCount = 0;
    for (const word of SUMMARY_WORDS) {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'g');
      const matches = content.match(regex);
      if (matches) {
        summaryCount += matches.length;
      }
    }
    const contentLength = Math.max(content.length, 1);
    const summaryDensity = summaryCount / (contentLength / 100); // 每百字

    // 评分计算
    // 情感词分布集中度 → 越高越像AI（重复使用同类情感词）
    const distScore = distributionScore > 0.5 ? 70 : distributionScore > 0.35 ? 40 : 15;
    // 内心独白密度
    const innerScore = innerThoughtDensity > 2.5 ? 70 : innerThoughtDensity > 1.5 ? 40 : innerThoughtDensity > 0.8 ? 20 : 5;
    // 概括密度
    const summaryScore = summaryDensity > 0.8 ? 75 : summaryDensity > 0.4 ? 40 : 10;

    const score = Math.round(distScore * 0.4 + innerScore * 0.35 + summaryScore * 0.25);

    // 生成具体问题
    if (distributionScore > 0.35) {
      const top = emotionCounts
        .filter(e => e.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map(e => `"${e.word}"(${e.count}次)`).join('、');
      issues.push({
        type: 'concentrated_emotion_words',
        message: `情感词使用过于集中（${top}），分布集中度 ${distributionScore.toFixed(2)}`,
        severity: distributionScore > 0.5 ? 'error' : 'warning',
        suggestion: '丰富情感表达方式，避免重复使用同类型情感词',
      });
    }

    if (innerThoughtDensity > 1.5) {
      issues.push({
        type: 'excessive_inner_thoughts',
        message: `内心独白密度过高（${innerThoughtCount}处/${paragraphs.length}段），过于依赖直接心理描写`,
        severity: innerThoughtDensity > 2.5 ? 'error' : 'warning',
        suggestion: '减少"心中暗想"类直接心理表述，通过人物行为和对话间接展现心理活动',
      });
    }

    if (summaryDensity > 0.5) {
      issues.push({
        type: 'excessive_summaries',
        message: `过度使用概括性总结词（${summaryCount}处），过于说教或总结`,
        severity: summaryDensity > 0.8 ? 'error' : 'warning',
        suggestion: '减少"总之""综上所述"等总结词，让读者自行体会而非直接灌输结论',
      });
    }

    return {
      name: 'emotion',
      score,
      weight: 0.2,
      issues,
    };
  }

  /**
   * 计算情感词分布集中度（基尼系数近似）
   * 返回0-1之间的值，越高说明越集中
   */
  private calculateConcentrationScore(counts: number[]): number {
    const total = counts.reduce((a, b) => a + b, 0);
    if (total === 0) return 0;

    const positive = counts.filter(c => c > 0);
    if (positive.length <= 1) return 0;

    // 用最大占比作为集中度指标
    const proportions = positive.map(c => c / total);
    const maxProportion = Math.max(...proportions);

    // 如果有使用过的词 >5，但其中某一个占了 >40%，则分数加重
    if (positive.length > 5 && maxProportion > 0.4) {
      return maxProportion + 0.1;
    }

    return maxProportion;
  }

  getEmotionWordCount(): number {
    return this.emotionWords.length;
  }
}
