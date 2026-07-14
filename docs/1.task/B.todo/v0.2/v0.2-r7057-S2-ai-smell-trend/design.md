---
description: "REQ-7057: AI味趋势追踪 — 技术设计"
update_time: "2026-07-11"
status: todo
---

# REQ-7057: AI味趋势追踪 — 技术设计

## 1. 架构设计

### 1.1 实现位置

后端扩展REQ-7050的AI味检测模块，增加趋势数据聚合API。前端新增趋势可视化页面。

```
调用链路：
章节AI味评分存储 → 趋势数据聚合API → 前端图表组件
                                          ↓
                                   异常点检测 → 异常提示
```

### 1.2 核心组件

```typescript
// 后端：扩展REQ-7050的评分存储
interface AiSmellScoreRecord {
  id: string;
  chapterId: string;
  chapterNumber: number;
  novelId: string;
  overallScore: number;       // 0-100
  dimensions: {
    formulaic: number;        // 套路化程度
    mechanical: number;       // 机械化程度
    emotional: number;        // 情感度
    original: number;         // 原创性
  };
  detectedAt: Date;
}

// 前端：趋势数据类型
interface TrendData {
  chapters: number[];
  overall: number[];
  dimensions: {
    formulaic: number[];
    mechanical: number[];
    emotional: number[];
    original: number[];
  };
  anomalies: AnomalyPoint[];
}

interface AnomalyPoint {
  chapterNumber: number;
  type: 'sharp_drop' | 'sharp_rise' | 'continuous_decline';
  score: number;
  expectedRange: [number, number];
  suggestion?: string;
}
```

## 2. 详细设计

### 2.1 趋势数据聚合API

```typescript
// 后端API
async function getTrendData(
  novelId: string,
  startChapter?: number,
  endChapter?: number
): Promise<TrendData> {
  // 查询章节评分记录
  const scores = await prisma.aiSmellScore.findMany({
    where: {
      novelId,
      ...(startChapter && { chapterNumber: { gte: startChapter } }),
      ...(endChapter && { chapterNumber: { lte: endChapter } }),
    },
    orderBy: { chapterNumber: 'asc' },
  });

  // 聚合为趋势数据
  return {
    chapters: scores.map(s => s.chapterNumber),
    overall: scores.map(s => s.overallScore),
    dimensions: {
      formulaic: scores.map(s => s.formulaic),
      mechanical: scores.map(s => s.mechanical),
      emotional: scores.map(s => s.emotional),
      original: scores.map(s => s.original),
    },
    anomalies: detectAnomalies(scores),
  };
}
```

### 2.2 异常点检测

```typescript
function detectAnomalies(scores: AiSmellScoreRecord[]): AnomalyPoint[] {
  const anomalies: AnomalyPoint[] = [];

  // 检测连续下降（连续3章评分下降）
  for (let i = 2; i < scores.length; i++) {
    if (scores[i].overallScore < scores[i-1].overallScore &&
        scores[i-1].overallScore < scores[i-2].overallScore) {
      anomalies.push({
        chapterNumber: scores[i].chapterNumber,
        type: 'continuous_decline',
        score: scores[i].overallScore,
        expectedRange: [scores[i-2].overallScore, scores[i].overallScore],
        suggestion: '连续3章AI味上升，建议检查提示词或调整模型参数',
      });
    }
  }

  // 检测单章突变（变化>20分）
  for (let i = 1; i < scores.length; i++) {
    const diff = Math.abs(scores[i].overallScore - scores[i-1].overallScore);
    if (diff > 20) {
      const type = scores[i].overallScore > scores[i-1].overallScore ? 'sharp_rise' : 'sharp_drop';
      anomalies.push({
        chapterNumber: scores[i].chapterNumber,
        type,
        score: scores[i].overallScore,
        expectedRange: [scores[i-1].overallScore - 10, scores[i-1].overallScore + 10],
      });
    }
  }

  return anomalies;
}
```

### 2.3 前端可视化

```tsx
// 新增文件：client/src/components/charts/AiSmellTrendChart.tsx

// 使用Recharts绘制折线图
// - 总体评分趋势线
// - 各维度叠加（可选）
// - 异常点标注
// - 章节范围选择器
```

## 3. 数据模型

### 3.1 数据库表（扩展）

```sql
-- AI味评分表（REQ-7050已有，确认字段）
CREATE TABLE ai_smell_scores (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL REFERENCES chapters(id),
  chapter_number INTEGER NOT NULL,
  novel_id TEXT NOT NULL REFERENCES novels(id),
  overall_score INTEGER NOT NULL,
  formulaic_score INTEGER,
  mechanical_score INTEGER,
  emotional_score INTEGER,
  original_score INTEGER,
  detected_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 4. 接口设计

### 4.1 REST API

```
GET /api/novels/:novelId/ai-smell/trend              - 查询趋势数据
GET /api/novels/:novelId/ai-smell/anomalies           - 查询异常点
GET /api/novels/:novelId/ai-smell/compare             - 对比两个范围
```

### 4.2 前端接口

```typescript
// client/src/api/aiSmell.ts

export const aiSmellApi = {
  getTrend: (novelId: string, params?: { start?: number; end?: number }) =>
    api.get(`/novels/${novelId}/ai-smell/trend`, { params }),
  getAnomalies: (novelId: string) =>
    api.get(`/novels/${novelId}/ai-smell/anomalies`),
  compare: (novelId: string, range1: [number, number], range2: [number, number]) =>
    api.get(`/novels/${novelId}/ai-smell/compare`, { params: { range1, range2 } }),
};
```

## 5. 实现步骤

### Phase 1: 后端趋势API（0.15天）

1. 实现趋势数据聚合API
2. 实现异常点检测
3. 实现对比API

### Phase 2: 前端可视化（0.1天）

1. 安装Recharts
2. 实现趋势折线图组件
3. 实现异常点标注

### Phase 3: 测试（0.05天）

1. 单元测试：异常检测算法
2. 集成测试：API
3. 可视化验证

## 6. 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 图表性能 | 大量数据加载慢 | 低 | 分页+虚拟滚动 |
| 异常误报 | 用户困惑 | 中 | 合理阈值+可配置 |

## 7. 交付物

- [ ] 后端趋势API端点
- [ ] 前端趋势图组件
- [ ] 异常点检测逻辑
- [ ] 单元测试
