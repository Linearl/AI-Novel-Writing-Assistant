---
description: "REQ-7050: AI味自动检测 — 技术设计"
update_time: "2026-07-11"
status: todo
---

# REQ-7050: AI味自动检测 — 技术设计

## 1. 架构设计

### 1.1 实现位置

在 `server/src/services/novel/quality/` 下新增AI味检测模块，作为质量检查器的一个维度插件。

```
检测流程：
文本输入
  ↓
┌─────────────────────────────────────┐
│  VocabularyDetector   → 词汇检测    │
│  SentenceDetector     → 句式检测    │
│  EmotionDetector      → 情感检测    │
│  LogicDetector        → 逻辑检测    │
│  DiversityDetector    → 多样性检测  │
└─────────────────────────────────────┘
  ↓
AiSmellScorer（评分聚合）
  ↓
AiSmellReport（JSON）→ 存储 + 触发调整
```

### 1.2 核心组件

```typescript
// 新增文件：server/src/services/novel/quality/smell/AiSmellDetector.ts

interface AiSmellConfig {
  vocabularyThreshold: number;    // 词汇维度阈值，默认0.05
  sentenceVarianceMin: number;   // 最小句长方差，默认20
  emotionPatternThreshold: number; // 情感模式化阈值，默认0.3
  overallThreshold: number;       // 综合阈值，默认60
  adjustmentStrategy: {
    mild: { temperatureIncrease: number };     // 61-80分：+0.1
    severe: { triggerRegeneration: boolean };  // 81-100分：重新生成
  };
}

interface AiSmellDimensionScore {
  name: string;
  score: number;        // 0-100
  weight: number;       // 权重
  issues: AiSmellIssue[];
}

interface AiSmellIssue {
  type: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  location?: { paragraph: number; sentence: number; offset: number };
  suggestion?: string;
}

interface AiSmellReport {
  overallScore: number;
  level: 'natural' | 'mild' | 'noticeable' | 'heavy';
  dimensions: AiSmellDimensionScore[];
  issues: AiSmellIssue[];
  adjustmentAction?: 'none' | 'adjust_temperature' | 'regenerate';
}
```

## 2. 详细设计

### 2.1 词汇检测器

```typescript
// server/src/services/novel/quality/smell/VocabularyDetector.ts

class VocabularyDetector {
  // 预定义AI高频词汇库
  private readonly AI_WORDS = [
    '值得一提的是', '在这个充满', '不禁', '缓缓',
    '一抹', '一丝', '一缕', '淡淡的', '深深的',
    '目光中', '嘴角微扬', '轻声说道', '淡淡地说',
    '不禁想到', '心中暗想', '恍然大悟', '若有所思',
    '总而言之', '综上所述', '不得不说', '毫无疑问',
    '众所周知', '不言而喻', '显而易见', '毋庸置疑',
  ];

  detect(content: string): AiSmellDimensionScore {
    const issues: AiSmellIssue[] = [];
    const words = this.segmentWords(content);
    const totalWords = words.length;

    let aiWordCount = 0;
    const aiWordHits: Record<string, number> = {};

    for (const word of this.AI_WORDS) {
      const regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const matches = content.match(regex);
      if (matches) {
        aiWordCount += matches.length;
        aiWordHits[word] = matches.length;
      }
    }

    const ratio = totalWords > 0 ? aiWordCount / totalWords : 0;
    const score = Math.min(100, ratio * 1000); // 放大比例

    // 生成具体问题
    for (const [word, count] of Object.entries(aiWordHits)) {
      if (count >= 2) {
        issues.push({
          type: 'repeated_ai_word',
          message: `"${word}" 出现 ${count} 次`,
          severity: count >= 5 ? 'error' : 'warning',
          suggestion: `考虑替换 "${word}" 为更自然的表达`,
        });
      }
    }

    return {
      name: 'vocabulary',
      score,
      weight: 0.3,
      issues,
    };
  }
}
```

### 2.2 句式检测器

```typescript
// server/src/services/novel/quality/smell/SentenceDetector.ts

class SentenceDetector {
  detect(content: string): AiSmellDimensionScore {
    const issues: AiSmellIssue[] = [];
    const sentences = this.splitSentences(content);

    // 句子长度方差
    const lengths = sentences.map(s => s.length);
    const variance = this.calculateVariance(lengths);

    // 句式开头重复率
    const starters = sentences.map(s => s.slice(0, 2));
    const starterCounts = this.countFrequency(starters);
    const maxStarterRatio = Math.max(...Object.values(starterCounts)) / sentences.length;

    // 感叹号密度
    const exclamationCount = (content.match(/！|!/g) || []).length;
    const exclamationDensity = exclamationCount / sentences.length;

    // 评分
    const varianceScore = variance < 20 ? 70 : variance < 40 ? 30 : 10;
    const starterScore = maxStarterRatio > 0.3 ? 80 : maxStarterRatio > 0.2 ? 50 : 20;
    const exclamationScore = exclamationDensity > 0.2 ? 80 : exclamationDensity > 0.1 ? 50 : 20;

    const score = (varianceScore * 0.4 + starterScore * 0.35 + exclamationScore * 0.25);

    if (maxStarterRatio > 0.2) {
      issues.push({
        type: 'repetitive_starters',
        message: `句式开头重复率 ${(maxStarterRatio * 100).toFixed(1)}%`,
        severity: maxStarterRatio > 0.3 ? 'error' : 'warning',
        suggestion: '尝试变换句子开头，增加句式多样性',
      });
    }

    if (variance < 20) {
      issues.push({
        type: 'uniform_sentence_length',
        message: '句子长度过于均匀，缺乏节奏变化',
        severity: 'warning',
        suggestion: '交替使用长短句，增加阅读节奏感',
      });
    }

    return {
      name: 'sentence',
      score,
      weight: 0.25,
      issues,
    };
  }

  private calculateVariance(arr: number[]): number {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
  }
}
```

### 2.3 情感检测器

```typescript
// server/src/services/novel/quality/smell/EmotionDetector.ts

class EmotionDetector {
  private readonly EMOTION_WORDS = [
    '感动', '激动', '兴奋', '开心', '高兴',
    '悲伤', '难过', '伤心', '痛苦', '绝望',
    '愤怒', '生气', '恼火', '气愤', '怒火',
    '温暖', '幸福', '甜蜜', '温馨', '舒适',
  ];

  detect(content: string): AiSmellDimensionScore {
    const issues: AiSmellIssue[] = [];

    // 情感词分布
    const emotionCounts = this.EMOTION_WORDS.map(word => {
      const regex = new RegExp(word, 'g');
      const matches = content.match(regex);
      return { word, count: matches?.length || 0 };
    });

    const totalEmotions = emotionCounts.reduce((sum, e) => sum + e.count, 0);
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim());

    // 情感词分布集中度
    const emotionDistribution = this.calculateDistribution(
      emotionCounts.map(e => e.count)
    );

    // "心中"类内心独白密度
    const innerThoughtPattern = /心中|心里|内心|暗想|想到|心想/g;
    const innerThoughts = content.match(innerThoughtPattern) || [];
    const innerThoughtDensity = innerThoughts.length / Math.max(paragraphs.length, 1);

    // 评分
    const distributionScore = emotionDistribution > 0.7 ? 70 : emotionDistribution > 0.5 ? 40 : 15;
    const densityScore = innerThoughtDensity > 2 ? 70 : innerThoughtDensity > 1 ? 40 : 15;

    const score = (distributionScore * 0.6 + densityScore * 0.4);

    if (innerThoughtDensity > 1.5) {
      issues.push({
        type: 'excessive_inner_thoughts',
        message: `内心独白密度过高（${innerThoughts.length}处/${paragraphs.length}段）`,
        severity: innerThoughtDensity > 2 ? 'error' : 'warning',
        suggestion: '减少"心中暗想"类表达，通过行为和对话展现人物心理',
      });
    }

    return {
      name: 'emotion',
      score,
      weight: 0.2,
      issues,
    };
  }

  private calculateDistribution(counts: number[]): number {
    const total = counts.reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    const proportions = counts.map(c => c / total);
    return Math.max(...proportions); // 越集中分数越高
  }
}
```

### 2.4 综合评分聚合

```typescript
// server/src/services/novel/quality/smell/AiSmellScorer.ts

class AiSmellScorer {
  private readonly LEVELS = {
    natural: { max: 30, label: '自然度高' },
    mild: { max: 60, label: '轻微AI味' },
    noticeable: { max: 80, label: '明显AI味' },
    heavy: { max: 100, label: '重度AI味' },
  };

  aggregate(dimensions: AiSmellDimensionScore[]): AiSmellReport {
    // 加权平均
    const totalWeight = dimensions.reduce((sum, d) => sum + d.weight, 0);
    const overallScore = dimensions.reduce(
      (sum, d) => sum + d.score * d.weight, 0
    ) / totalWeight;

    const level = this.getLevel(overallScore);
    const allIssues = dimensions.flatMap(d => d.issues);

    // 判断调整动作
    let adjustmentAction: AiSmellReport['adjustmentAction'] = 'none';
    if (overallScore > 80) {
      adjustmentAction = 'regenerate';
    } else if (overallScore > 60) {
      adjustmentAction = 'adjust_temperature';
    }

    return {
      overallScore: Math.round(overallScore),
      level,
      dimensions,
      issues: allIssues,
      adjustmentAction,
    };
  }

  private getLevel(score: number): AiSmellReport['level'] {
    if (score <= 30) return 'natural';
    if (score <= 60) return 'mild';
    if (score <= 80) return 'noticeable';
    return 'heavy';
  }
}
```

## 3. 数据模型

### 3.1 数据库表

```sql
-- AI味检测词汇库（可动态更新）
CREATE TABLE AiSmellDictionary (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,       -- 'vocabulary' | 'emotion' | 'inner_thought'
  word TEXT NOT NULL,
  severity INTEGER NOT NULL DEFAULT 1,  -- 1=warning, 2=error
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_smell_dict_category ON AiSmellDictionary(category);
```

### 3.2 评分模型

```typescript
interface AiSmellScoringModel {
  dimensions: {
    vocabulary: { weight: number; threshold: number };
    sentence: { weight: number; threshold: number };
    emotion: { weight: number; threshold: number };
    diversity: { weight: number; threshold: number };
  };
  levelThresholds: {
    natural: number;     // 30
    mild: number;        // 60
    noticeable: number;  // 80
  };
}
```

## 4. 接口设计

### 4.1 HTTP API

```typescript
// POST /api/novel/:novelId/chapters/:chapterId/ai-smell
// 检测章节AI味
Response: AiSmellReport

// GET /api/novel/:novelId/ai-smell/stats
// 查询小说整体AI味统计
Response: {
  averageScore: number;
  levelDistribution: Record<string, number>;
  topIssues: AiSmellIssue[];
}

// PUT /api/novel/ai-smell/config
// 更新AI味检测配置
Body: Partial<AiSmellConfig>
Response: AiSmellConfig
```

### 4.2 内部接口

```typescript
// AI味检测入口
export async function detectAiSmell(
  content: string,
  config?: Partial<AiSmellConfig>
): Promise<AiSmellReport>;

// 获取检测配置
export async function getAiSmellConfig(): Promise<AiSmellConfig>;

// 更新词汇库
export async function updateDictionary(
  category: string,
  words: string[]
): Promise<void>;
```

## 5. 实现步骤

### Phase 1: 核心检测逻辑（0.5天）

1. 创建 `server/src/services/novel/quality/smell/` 目录
2. 实现 `VocabularyDetector`
3. 实现 `SentenceDetector`
4. 实现 `EmotionDetector`
5. 实现 `AiSmellScorer` 综合评分

### Phase 2: 集成和API（0.25天）

1. 实现 `AiSmellDetector` 主类（编排各检测器）
2. 集成到质量检查器（REQ-7048）
3. 实现 HTTP API
4. 创建数据库迁移

### Phase 3: 测试（0.25天）

1. 单元测试：各检测器
2. 集成测试：完整AI味检测流程
3. 边界用例测试

## 6. 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 检测不准 | 误报/漏报 | 中 | 持续优化词汇库 + 可配置阈值 |
| 词汇库过时 | 检测效果下降 | 中 | 支持动态更新 + 定期审查 |
| 过度检测 | 合理表达被误判 | 低 | 提供白名单机制 |
| 性能问题 | 检测耗时过长 | 低 | 正则优化 + 缓存常用结果 |

## 7. 测试计划

### 7.1 单元测试

```typescript
describe('VocabularyDetector', () => {
  it('should detect repeated AI words', () => {});
  it('should return low score for natural text', () => {});
  it('should return high score for AI-heavy text', () => {});
});

describe('SentenceDetector', () => {
  it('should detect uniform sentence length', () => {});
  it('should detect repetitive starters', () => {});
});

describe('AiSmellScorer', () => {
  it('should aggregate dimension scores correctly', () => {});
  it('should determine correct level', () => {});
  it('should recommend adjustment action', () => {});
});
```

### 7.2 集成测试

```typescript
describe('AiSmellDetector integration', () => {
  it('should detect AI smell in generated chapter', () => {});
  it('should integrate with quality checker', () => {});
  it('should trigger parameter adjustment on high score', () => {});
});
```

## 8. 交付物

- [ ] `server/src/services/novel/quality/smell/AiSmellDetector.ts`
- [ ] `server/src/services/novel/quality/smell/VocabularyDetector.ts`
- [ ] `server/src/services/novel/quality/smell/SentenceDetector.ts`
- [ ] `server/src/services/novel/quality/smell/EmotionDetector.ts`
- [ ] `server/src/services/novel/quality/smell/AiSmellScorer.ts`
- [ ] `server/src/services/novel/quality/smell/config.ts`
- [ ] `server/prisma/migrations/` - 新增 AiSmellDictionary 迁移
- [ ] `server/tests/novel/quality/smell/` - 测试文件
