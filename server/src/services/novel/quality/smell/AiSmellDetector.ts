import type { AiSmellConfig, AiSmellReport } from './types';
import { DEFAULT_AI_SMELL_CONFIG } from './types';
import { VocabularyDetector } from './VocabularyDetector';
import { SentenceDetector } from './SentenceDetector';
import { EmotionDetector } from './EmotionDetector';
import { AiSmellScorer } from './AiSmellScorer';
import { aiSmellDictionaryService } from './AiSmellDictionaryService';

export interface DetectOptions {
  config?: Partial<AiSmellConfig>;
  /** 自定义词汇（追加到默认词汇库） */
  customVocabularyWords?: string[];
  /** 自定义情感词 */
  customEmotionWords?: string[];
  /** 只检测指定维度 */
  dimensions?: Array<'vocabulary' | 'sentence' | 'emotion'>;
  /** 禁用某个维度 */
  disabledDimensions?: Array<'vocabulary' | 'sentence' | 'emotion'>;
}

export class AiSmellDetector {
  private readonly config: AiSmellConfig;

  constructor(config: Partial<AiSmellConfig> = {}) {
    this.config = { ...DEFAULT_AI_SMELL_CONFIG, ...config };
  }

  /**
   * 检测文本的AI味
   */
  async detect(content: string, options: DetectOptions = {}): Promise<AiSmellReport> {
    if (!content || content.trim().length === 0) {
      return {
        overallScore: 0,
        level: 'natural',
        dimensions: [],
        issues: [],
        adjustmentAction: 'none',
        summary: '文本为空',
      };
    }

    const mergedConfig = { ...this.config, ...(options.config ?? {}) };
    const scorer = new AiSmellScorer(mergedConfig);

    // 解析维度范围
    const activeDimensions = this.resolveActiveDimensions(options);

    // 获取词典中的自定义词汇
    const [vocabWords, emotionWords] = await Promise.all([
      aiSmellDictionaryService.getVocabularyWords(),
      aiSmellDictionaryService.getEmotionWords(),
    ]);

    const dimensions: Array<{ pending: boolean; result: AiSmellReport['dimensions'][number] | null }> = [];

    // 词汇检测
    if (activeDimensions.includes('vocabulary')) {
      try {
        const vocabDetector = new VocabularyDetector({
          threshold: mergedConfig.vocabularyThreshold,
          customWords: [...vocabWords, ...(options.customVocabularyWords ?? [])],
        });
        dimensions.push({ pending: false, result: vocabDetector.detect(content) });
      } catch {
        dimensions.push({ pending: false, result: null });
      }
    }

    // 句式检测
    if (activeDimensions.includes('sentence')) {
      try {
        const sentenceDetector = new SentenceDetector({
          varianceMin: mergedConfig.sentenceVarianceMin,
        });
        dimensions.push({ pending: false, result: sentenceDetector.detect(content) });
      } catch {
        dimensions.push({ pending: false, result: null });
      }
    }

    // 情感检测
    if (activeDimensions.includes('emotion')) {
      try {
        const emotionDetector = new EmotionDetector({
          patternThreshold: mergedConfig.emotionPatternThreshold,
          customEmotionWords: [...emotionWords, ...(options.customEmotionWords ?? [])],
        });
        dimensions.push({ pending: false, result: emotionDetector.detect(content) });
      } catch {
        dimensions.push({ pending: false, result: null });
      }
    }

    const validDimensions = dimensions
      .map(d => d.result)
      .filter((d): d is NonNullable<typeof d> => d !== null);

    return scorer.aggregate(validDimensions);
  }

  /**
   * 仅对单个维度进行检测
   */
  async detectSingleDimension(
    content: string,
    dimension: 'vocabulary' | 'sentence' | 'emotion',
    options: Omit<DetectOptions, 'dimensions' | 'disabledDimensions'> = {},
  ): Promise<AiSmellReport> {
    return this.detect(content, { ...options, dimensions: [dimension] });
  }

  private resolveActiveDimensions(options: DetectOptions): Array<'vocabulary' | 'sentence' | 'emotion'> {
    const allDimensions: Array<'vocabulary' | 'sentence' | 'emotion'> = ['vocabulary', 'sentence', 'emotion'];

    // options.dimensions 显式指定了要检测的维度
    if (options.dimensions && options.dimensions.length > 0) {
      return options.dimensions;
    }

    // options.disabledDimensions 指定了要禁用的维度
    if (options.disabledDimensions && options.disabledDimensions.length > 0) {
      return allDimensions.filter(d => !options.disabledDimensions!.includes(d));
    }

    return allDimensions;
  }
}

export const aiSmellDetector = new AiSmellDetector();
