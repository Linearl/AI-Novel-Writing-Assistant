---
description: "REQ-2042 自适应字数控制与水文检测 方案设计"
update_time: 2026-07-03
---

# REQ-2042 方案设计

## 1. 方案概述

采用"类型增强 + 角色标注 + prompt 注入 + 后检测修复 + LLM 水文检测"的五层实现方案。核心思路是：**生成前设定 soft target，生成后检测并修复，而非在生成过程中做硬约束**。水文检测独立于字数检测，基于 LLM 语义理解判断段落有效性。

### 1.1 设计目标

1. 字数控制是 soft target 而非 hard constraint — 不阻断生成，事后修复
2. 章节角色由 AI 自动标注，减少用户手动配置负担
3. 水文检测基于语义理解，不依赖简单字数规则
4. compress/expand 操作有循环保护，不会无限执行

### 1.2 关键决策

1. **soft target + 事后修复**：不在生成过程中强制字数限制，生成后检测并自动 compress/expand
2. **水文检测用 LLM**：需要理解剧情语义才能判断段落是否有效，规则方法无法胜任
3. **基准字数可配置**：默认 3000~4000，用户可通过 settings 调整

### 1.3 不在范围

- 用户手动调整字数系数
- 水文检测结果的自动修复（仅标记，compress/expand 由字数检测触发）
- 实时字数统计

## 2. 实现细节

### 2.1 数据模型变更

#### 2.1.1 章节角色枚举

在 `shared/types/` 中新增章节角色枚举：

```typescript
export const chapterRoleSchema = z.enum([
  "normal",         // 普通章
  "transition",     // 过渡章
  "climax",         // 高潮章
  "turning_point"   // 转折章
])

export type ChapterRole = z.infer<typeof chapterRoleSchema>
```

#### 2.1.2 wordCountTarget 字段

在 Chapter schema 中增加 `wordCountTarget` 字段：

```typescript
wordCountTarget: z.object({
  min: z.number(),           // 目标最小字数
  max: z.number(),           // 目标最大字数
  role: chapterRoleSchema    // 章节角色
}).nullable().optional()
```

- `nullable()`：旧章节无此字段时为 null
- `optional()`：兼容旧数据

#### 2.1.3 水文检测结果字段

在 Chapter schema 中增加水文检测结果：

```typescript
waterContentAnalysis: z.object({
  score: z.number().min(0).max(100),  // 无效描写密度百分比
  flagged: z.boolean(),                // 是否超标（> 30%）
  analyzedAt: z.string().optional()    // 检测时间 ISO 8601
}).nullable().optional()
```

#### 2.1.4 基准字数范围配置

在小说 settings 中增加配置项：

```typescript
baseWordCountMin: z.number().default(3000)  // 基准最小字数
baseWordCountMax: z.number().default(4000)  // 基准最大字数
waterContentThreshold: z.number().default(30)  // 水文超标阈值（百分比）
```

### 2.2 系数计算

#### 2.2.1 角色系数表

```typescript
const ROLE_COEFFICIENTS: Record<ChapterRole, { min: number; max: number }> = {
  normal:        { min: 1.0, max: 1.25 },
  transition:    { min: 1.0, max: 1.25 },
  climax:        { min: 1.0, max: 2.5  },
  turning_point: { min: 1.0, max: 2.5  }
}
```

#### 2.2.2 计算函数

```typescript
function calculateWordCountTarget(
  baseMin: number,
  baseMax: number,
  role: ChapterRole
): { min: number; max: number; role: ChapterRole } {
  const coeff = ROLE_COEFFICIENTS[role]
  return {
    min: Math.round(baseMin * coeff.min),
    max: Math.round(baseMax * coeff.max),
    role
  }
}
```

**示例计算**（基准 3000~4000）：

| 角色 | min | max | 说明 |
| ---- | ---: | ---: | ---- |
| normal | 3000 | 5000 | 3000×1.0 ~ 4000×1.25 |
| transition | 3000 | 5000 | 同上 |
| climax | 3000 | 10000 | 3000×1.0 ~ 4000×2.5 |
| turning_point | 3000 | 10000 | 同上 |

### 2.3 后端

#### 2.3.1 auto-director 章节角色标注

**触发时机**：volume planning / beat sheet 生成阶段

**实现方式**：
1. 在 beat sheet prompt 中增加章节角色分类要求
2. AI 分析章节在卷中的位置、剧情摘要、冲突类型，标注角色
3. 标注结果写入 Chapter 的 `wordCountTarget.role`
4. 基于角色 + 基准字数范围计算 min/max

**Prompt 片段**（注入 beat sheet prompt）：

```
在规划每章时，请同时判断章节的叙事角色：
- normal（普通章）：推进日常剧情，无重大冲突或转折
- transition（过渡章）：场景/时间/视角切换，承上启下
- climax（高潮章）：卷内冲突爆发点，需要大量篇幅展开
- turning_point（转折章）：重大事件触发/反转，改变故事走向

根据角色，系统会自动分配不同的目标字数范围。
```

#### 2.3.2 generation prompt 注入

**注入位置**：章节生成 prompt 的上下文区域

**注入内容**：

```
[字数指引]
本章类型：{role_name}
目标字数范围：{min} ~ {max} 字
请确保内容充实度匹配该字数范围。{role_specific_hint}
```

**角色专属指引**：

| 角色 | 指引 |
| ---- | ---- |
| normal | 保持节奏稳定，适当展开细节。 |
| transition | 简洁高效，快速过渡到下一场景。 |
| climax | 充分展开冲突、情感和戏剧张力，不要吝啬笔墨。 |
| turning_point | 关键时刻需要详细刻画，确保转折力度充分。 |

#### 2.3.3 生成后检测流水线

```
章节内容生成完成
    ↓
[Step 1] 字数检测
  actual = countWords(chapter.content)
  target = chapter.wordCountTarget
  result = checkWordCount(actual, target)
    ↓
  ┌─ over  → [Step 2a] compress
  ├─ under → [Step 2b] expand
  └─ ok    → [Step 3]
    ↓
[Step 2] compress/expand 后重新检测（最多 2 轮）
  仍不达标 → 标记 warning，继续
    ↓
[Step 3] 水文检测（仅当字数达标时执行）
  score = waterContentDetection(chapter.content)
  flagged = score > threshold
    ↓
[Step 4] 写入检测结果
  chapter.waterContentAnalysis = { score, flagged, analyzedAt }
```

#### 2.3.4 compress 实现

**触发条件**：实际字数 > max

**策略**：
1. 识别冗余段落（重复描写、过度环境铺陈、无关对话）
2. 保留核心情节推进段落和角色关键对话
3. 精简目标：降至 max 的 90%~100%（留余量防止刚好卡在边界）

**compress prompt 要点**：
- 输入：章节全文 + 目标字数上限 + 上下文摘要
- 输出：精简后的章节全文
- 约束：保留所有推动情节的段落，保持叙事连贯

#### 2.3.5 expand 实现

**触发条件**：实际字数 < min

**策略**：
1. 分析当前内容的薄弱环节（对话过少、描写不足、情感单薄）
2. 补充角色内心活动、对话细节、环境描写
3. 扩展目标：达到 min 的 100%~110%

**expand prompt 要点**：
- 输入：章节全文 + 目标字数下限 + 上下文摘要
- 输出：扩展后的章节全文
- 约束：不引入新剧情线，仅丰富现有内容

#### 2.3.6 水文检测

**检测 prompt 设计**：

```
你是一位资深小说编辑。请分析以下章节，判断每个段落是否对以下维度有贡献：
1. 推进剧情（事件发展、冲突升级/解决）
2. 塑造角色（性格展现、关系发展、情感变化）
3. 建立世界观（设定补充、规则说明、氛围营造）

对每个段落标注：
- "effective"：对上述至少一个维度有实质贡献
- "water"：与上述三个维度无关的冗余内容

输出 JSON 格式：
{
  "paragraphs": [
    { "index": 0, "verdict": "effective", "reason": "推进了主角的内心冲突" },
    { "index": 1, "verdict": "water", "reason": "重复描写了已知的环境细节" }
  ],
  "waterDensityPercent": 25,
  "summary": "主要水文集中在第 3-5 段的环境重复描写"
}
```

**检测服务流程**：
1. 将章节按段落分割
2. 调用 LLM（水文检测 prompt）分析
3. 解析返回的 waterDensityPercent
4. 超过阈值（默认 30%）时标记 flagged
5. 写入 Chapter.waterContentAnalysis

### 2.4 前端

#### 2.4.1 章节列表字数展示

**位置**：现有章节列表中，每章标题下方增加字数信息行

**展示内容**：

```
第 15 章 暗夜突围
高潮章 | 目标 3000~10000 | 实际 7523 字 ✓
```

或字数不足时：

```
第 12 章 短暂的平静
过渡章 | 目标 3000~5000 | 实际 1892 字 ✗
```

水文超标时：

```
第 8 章 深夜长谈
普通章 | 目标 3000~5000 | 实际 4201 字 ⚠ 水文 35%
```

#### 2.4.2 API 调用

使用现有 TanStack Query hooks，章节列表数据中包含 wordCountTarget 和 waterContentAnalysis 字段。

### 2.5 接口变更

#### 2.5.1 章节 API 响应新增字段

```json
{
  "id": "chapter_xxx",
  "title": "暗夜突围",
  "content": "...",
  "wordCount": 7523,
  "wordCountTarget": {
    "min": 3000,
    "max": 10000,
    "role": "climax"
  },
  "waterContentAnalysis": {
    "score": 12,
    "flagged": false,
    "analyzedAt": "2026-07-03T10:00:00Z"
  }
}
```

## 3. 数据模型

### 3.1 新增字段汇总

| 表/类型 | 字段 | 类型 | 默认值 | 说明 |
| ---- | ---- | ---- | ---- | ---- |
| Chapter | wordCountTarget | Object? | null | 字数目标（min/max/role） |
| Chapter | waterContentAnalysis | Object? | null | 水文检测结果（score/flagged/analyzedAt） |
| NovelSettings | baseWordCountMin | Int | 3000 | 基准最小字数 |
| NovelSettings | baseWordCountMax | Int | 4000 | 基准最大字数 |
| NovelSettings | waterContentThreshold | Int | 30 | 水文超标阈值（%） |

### 3.2 迁移影响

- Chapter 表新增字段均为 nullable 或有默认值，不影响现有数据
- NovelSettings 表新增字段有默认值
- 旧章节无 wordCountTarget 时，前端不显示字数目标信息

## 4. 异常处理

| 错误码 | 场景 | 处理方式 |
| ---- | ---- | -------- |
| 500 | compress/expand LLM 调用失败 | 跳过本轮修复，保留原始内容，记录日志 |
| 500 | 水文检测 LLM 调用失败 | 跳过水文检测，不标记，记录日志 |
| 422 | compress/expand 循环超过 2 轮 | 标记 warning，停止循环，继续流程 |
| 400 | 基准字数范围配置无效（min > max） | 使用默认值，返回配置错误提示 |

## 5. 验证策略

1. 单元测试：系数计算函数、字数检测逻辑、循环保护逻辑
2. 集成测试：auto-director 角色标注、generation pipeline 字数注入、compress/expand 触发
3. E2E 测试：章节列表字数展示、水文标记展示
4. 手动验证：生成不同角色章节，验证字数范围和水文检测结果
