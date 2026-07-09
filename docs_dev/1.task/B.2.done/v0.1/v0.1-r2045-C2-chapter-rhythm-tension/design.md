---
description: "章节节奏张力设计方案"
---

# 设计文档

## 数据模型

```prisma
model Chapter {
  // ... existing fields
  tensionLevel String @default("medium") // low | medium | high | climax
}
```

## AI 标记

在 beatSheet 生成 prompt 中新增输出要求：
- 为每个章节推荐 tensionLevel
- 给出推荐理由（基于故事结构和节奏曲线）

## 质量系统联动

```typescript
function getQualityThresholds(tensionLevel: TensionLevel) {
  switch (tensionLevel) {
    case 'climax': return { repetition: 0.9, attractiveness: 0.9, continuity: 0.95 }
    case 'high': return { repetition: 0.8, attractiveness: 0.8, continuity: 0.9 }
    case 'medium': return { repetition: 0.7, attractiveness: 0.7, continuity: 0.85 }
    case 'low': return { repetition: 0.6, attractiveness: 0.6, continuity: 0.8 }
  }
}
```
