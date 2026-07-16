import type { AiSmellDictionaryCategory, AiSmellDictionaryWord } from './types';

/**
 * 内存词典存储，后续可通过数据库表 AiSmellDictionary 持久化。
 * 当前版本：默认词库硬编码，预留数据库同步接口。
 */
const BUILTIN_DICTIONARY: Omit<AiSmellDictionaryWord, 'id'>[] = [
  // vocabulary 类
  { category: 'vocabulary', word: '值得一提的是', severity: 2 },
  { category: 'vocabulary', word: '在这个充满', severity: 2 },
  { category: 'vocabulary', word: '不禁', severity: 1 },
  { category: 'vocabulary', word: '缓缓', severity: 1 },
  { category: 'vocabulary', word: '一抹', severity: 1 },
  { category: 'vocabulary', word: '一丝', severity: 1 },
  { category: 'vocabulary', word: '一缕', severity: 1 },
  { category: 'vocabulary', word: '淡淡的', severity: 1 },
  { category: 'vocabulary', word: '深深的', severity: 1 },
  { category: 'vocabulary', word: '目光中', severity: 2 },
  { category: 'vocabulary', word: '嘴角微扬', severity: 2 },
  { category: 'vocabulary', word: '轻声说道', severity: 2 },
  { category: 'vocabulary', word: '淡淡地说', severity: 2 },
  { category: 'vocabulary', word: '不禁想到', severity: 2 },
  { category: 'vocabulary', word: '心中暗想', severity: 2 },
  { category: 'vocabulary', word: '恍然大悟', severity: 1 },
  { category: 'vocabulary', word: '若有所思', severity: 1 },
  { category: 'vocabulary', word: '总而言之', severity: 2 },
  { category: 'vocabulary', word: '综上所述', severity: 2 },
  { category: 'vocabulary', word: '不得不说', severity: 1 },
  { category: 'vocabulary', word: '毫无疑问', severity: 1 },
  { category: 'vocabulary', word: '众所周知', severity: 1 },
  { category: 'vocabulary', word: '不言而喻', severity: 1 },
  { category: 'vocabulary', word: '显而易见', severity: 1 },
  { category: 'vocabulary', word: '毋庸置疑', severity: 1 },
  { category: 'vocabulary', word: '与此同时', severity: 1 },
  { category: 'vocabulary', word: '仿佛', severity: 1 },
  { category: 'vocabulary', word: '恍若', severity: 1 },
  { category: 'vocabulary', word: '宛如', severity: 1 },
  { category: 'vocabulary', word: '无与伦比', severity: 1 },
  { category: 'vocabulary', word: '前所未有', severity: 1 },
  { category: 'vocabulary', word: '令人惊叹', severity: 1 },
  { category: 'vocabulary', word: '心底泛起', severity: 2 },
  { category: 'vocabulary', word: '眼眶微红', severity: 2 },
  { category: 'vocabulary', word: '嘴角勾起', severity: 2 },
  { category: 'vocabulary', word: '眉头微皱', severity: 1 },
  { category: 'vocabulary', word: '微微一笑', severity: 1 },
  { category: 'vocabulary', word: '缓缓开口', severity: 1 },
  { category: 'vocabulary', word: '轻叹一声', severity: 1 },
  { category: 'vocabulary', word: '摇了摇头', severity: 1 },
  { category: 'vocabulary', word: '默默地看着', severity: 1 },
  { category: 'vocabulary', word: '静静地站着', severity: 1 },
  { category: 'vocabulary', word: '久久地注视', severity: 1 },
  // emotion 类
  { category: 'emotion', word: '感动', severity: 1 },
  { category: 'emotion', word: '激动', severity: 1 },
  { category: 'emotion', word: '兴奋', severity: 1 },
  { category: 'emotion', word: '开心', severity: 1 },
  { category: 'emotion', word: '悲伤', severity: 1 },
  { category: 'emotion', word: '难过', severity: 1 },
  { category: 'emotion', word: '痛苦', severity: 1 },
  { category: 'emotion', word: '绝望', severity: 1 },
  { category: 'emotion', word: '愤怒', severity: 1 },
  { category: 'emotion', word: '温暖', severity: 1 },
  { category: 'emotion', word: '幸福', severity: 1 },
  { category: 'emotion', word: '甜蜜', severity: 1 },
  { category: 'emotion', word: '震惊', severity: 1 },
  { category: 'emotion', word: '恐惧', severity: 1 },
  { category: 'emotion', word: '孤独', severity: 1 },
  { category: 'emotion', word: '落寞', severity: 1 },
  { category: 'emotion', word: '无奈', severity: 1 },
  { category: 'emotion', word: '欣慰', severity: 1 },
  // inner_thought 类
  { category: 'inner_thought', word: '心中', severity: 1 },
  { category: 'inner_thought', word: '心里', severity: 1 },
  { category: 'inner_thought', word: '内心', severity: 1 },
  { category: 'inner_thought', word: '暗想', severity: 2 },
  { category: 'inner_thought', word: '想到', severity: 1 },
  { category: 'inner_thought', word: '心想', severity: 2 },
  { category: 'inner_thought', word: '心中暗想', severity: 2 },
  { category: 'inner_thought', word: '心中暗道', severity: 2 },
  { category: 'inner_thought', word: '心底', severity: 1 },
];

let dictionaryCache: AiSmellDictionaryWord[] | null = null;

function buildDictionary(): AiSmellDictionaryWord[] {
  return BUILTIN_DICTIONARY.map((entry, index) => ({
    id: `builtin-${index}`,
    ...entry,
  }));
}

export class AiSmellDictionaryService {
  /**
   * 获取所有词典条目
   */
  async listAll(): Promise<AiSmellDictionaryWord[]> {
    if (!dictionaryCache) {
      dictionaryCache = buildDictionary();
    }
    return dictionaryCache;
  }

  /**
   * 按分类获取词典条目
   */
  async listByCategory(category: AiSmellDictionaryCategory): Promise<AiSmellDictionaryWord[]> {
    const all = await this.listAll();
    return all.filter(item => item.category === category);
  }

  /**
   * 获取指定类别的词列表（纯字符串数组）
   */
  async getWordsByCategory(category: AiSmellDictionaryCategory): Promise<string[]> {
    const items = await this.listByCategory(category);
    return items.map(item => item.word);
  }

  /**
   * 获取所有词汇检测词
   */
  async getVocabularyWords(): Promise<string[]> {
    return this.getWordsByCategory('vocabulary');
  }

  /**
   * 获取情感检测词
   */
  async getEmotionWords(): Promise<string[]> {
    return this.getWordsByCategory('emotion');
  }

  /**
   * 获取内心独白检测词
   */
  async getInnerThoughtWords(): Promise<string[]> {
    return this.getWordsByCategory('inner_thought');
  }

  /**
   * 重置缓存（刷新词典）
   */
  resetCache(): void {
    dictionaryCache = null;
  }
}

export const aiSmellDictionaryService = new AiSmellDictionaryService();
