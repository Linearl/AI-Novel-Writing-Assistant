import type { AiSmellDimensionScore, AiSmellIssue } from './types';

export interface VocabularyDetectorConfig {
  threshold: number;
  customWords?: string[];
}

// 预定义AI高频词汇库
const DEFAULT_AI_WORDS = [
  '值得一提的是', '在这个充满', '不禁', '缓缓',
  '一抹', '一丝', '一缕', '淡淡的', '深深的',
  '目光中', '嘴角微扬', '轻声说道', '淡淡地说',
  '不禁想到', '心中暗想', '恍然大悟', '若有所思',
  '总而言之', '综上所述', '不得不说', '毫无疑问',
  '众所周知', '不言而喻', '显而易见', '毋庸置疑',
  '与此同时', '然而', '因此', '于是',
  '仿佛', '恍若', '宛如', '似是',
  '无与伦比', '前所未有', '令人惊叹', '令人感慨',
  '在这座城市里', '在那个年代', '从某种意义上说',
  '可以说', '不约而同', '出人意料', '意料之中',
  '心底泛起', '眼眶微红', '嘴角勾起', '眉头微皱',
  '微微一笑', '缓缓开口', '轻叹一声', '摇了摇头',
  '默默地看着', '静静地站着', '久久地注视',
];

export class VocabularyDetector {
  private readonly words: string[];
  private readonly config: VocabularyDetectorConfig;

  constructor(config: Partial<VocabularyDetectorConfig> = {}) {
    this.config = { threshold: 0.05, ...config };
    this.words = [...DEFAULT_AI_WORDS, ...(config.customWords ?? [])];
  }

  detect(content: string): AiSmellDimensionScore {
    const issues: AiSmellIssue[] = [];
    const wordHits: Record<string, number> = {};
    let aiWordCount = 0;

    for (const word of this.words) {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'g');
      const matches = content.match(regex);
      if (matches && matches.length > 0) {
        aiWordCount += matches.length;
        wordHits[word] = matches.length;
      }
    }

    // 估算总词数（中文字符数 + 英文单词数）
    const chineseChars = (content.match(/[一-鿿]/g) || []).length;
    const englishWords = content.match(/[a-zA-Z]+/g)?.length ?? 0;
    const totalWords = Math.max(chineseChars + englishWords, 1);

    const ratio = aiWordCount / totalWords;
    // 将比例映射到0-100分
    const score = Math.min(100, Math.round(ratio * 2000));

    // 生成具体问题
    for (const [word, count] of Object.entries(wordHits)) {
      const severity = count >= 5 ? 'error' as const : count >= 2 ? 'warning' as const : 'info' as const;
      if (count >= 1) {
        issues.push({
          type: 'repeated_ai_word',
          message: `AI高频词汇"${word}"出现 ${count} 次`,
          severity,
          suggestion: `考虑替换"${word}"为更自然的表达方式`,
        });
      }
    }

    // 排序：按命中次数降序
    issues.sort((a, b) => {
      const aCount = wordHits[this.extractWord(a.message)] ?? 0;
      const bCount = wordHits[this.extractWord(b.message)] ?? 0;
      return bCount - aCount;
    });

    return {
      name: 'vocabulary',
      score,
      weight: 0.3,
      issues,
    };
  }

  private extractWord(message: string): string {
    const match = message.match(/AI高频词汇"(.+?)"出现/);
    return match ? match[1] : '';
  }

  getWordCount(): number {
    return this.words.length;
  }

  getWords(): string[] {
    return [...this.words];
  }
}
