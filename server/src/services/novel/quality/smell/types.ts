// AI味检测核心类型定义

export interface AiSmellIssue {
  type: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  location?: {
    paragraph: number;
    sentence: number;
    offset: number;
  };
  suggestion?: string;
}

export interface AiSmellDimensionScore {
  name: string;
  score: number;        // 0-100，越高越像AI生成
  weight: number;
  issues: AiSmellIssue[];
}

export type AiSmellLevel = 'natural' | 'mild' | 'noticeable' | 'heavy';

export type AiSmellAdjustmentAction = 'none' | 'adjust_temperature' | 'regenerate';

export interface AiSmellReport {
  overallScore: number;          // 0-100
  level: AiSmellLevel;
  dimensions: AiSmellDimensionScore[];
  issues: AiSmellIssue[];
  adjustmentAction: AiSmellAdjustmentAction;
  summary: string;
}

export interface AiSmellScoringConfig {
  dimensions: {
    vocabulary: { weight: number; threshold: number };
    sentence: { weight: number; threshold: number };
    emotion: { weight: number; threshold: number };
  };
  levelThresholds: {
    natural: number;     // 0-30
    mild: number;        // 31-60
    noticeable: number;  // 61-80
    // >80 → heavy
  };
}

export interface AiSmellConfig {
  vocabularyThreshold: number;
  sentenceVarianceMin: number;
  emotionPatternThreshold: number;
  overallThreshold: number;
  adjustmentStrategy: {
    mild: { temperatureIncrease: number };
    severe: { triggerRegeneration: boolean };
  };
  scoring: AiSmellScoringConfig;
}

export type AiSmellDictionaryCategory = 'vocabulary' | 'emotion' | 'inner_thought';

export interface AiSmellDictionaryWord {
  id: string;
  category: AiSmellDictionaryCategory;
  word: string;
  severity: number;  // 1=warning, 2=error
}

export const DEFAULT_AI_SMELL_CONFIG: AiSmellConfig = {
  vocabularyThreshold: 0.05,
  sentenceVarianceMin: 20,
  emotionPatternThreshold: 0.3,
  overallThreshold: 60,
  adjustmentStrategy: {
    mild: { temperatureIncrease: 0.1 },
    severe: { triggerRegeneration: true },
  },
  scoring: {
    dimensions: {
      vocabulary: { weight: 0.3, threshold: 0.05 },
      sentence: { weight: 0.25, threshold: 20 },
      emotion: { weight: 0.2, threshold: 0.3 },
    },
    levelThresholds: {
      natural: 30,
      mild: 60,
      noticeable: 80,
    },
  },
};
