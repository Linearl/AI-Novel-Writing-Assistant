---
description: "REQ-2042 任务拆解"
update_time: 2026-07-03
---

# REQ-2042 任务拆解

> 状态：📋 待开发（完成后改为 ✅ 全部完成）

## 任务概述

### 1. 来源

竞品分析讨论 + 用户反馈 — 章节字数膨胀（水文）与核心章节字数不足的双重问题。

### 2. 问题

当前章节生成使用统一字数限制，无法区分普通章和高潮章的不同需求。水文检测仅依赖字数阈值，无法语义判断段落有效性。

### 3. 需求

- shared：Chapter 类型增加 wordCountTarget 字段（min/max/role）
- server：auto-director 标注章节角色 + generation pipeline 字数约束 + 生成后检测 compress/expand + 水文检测
- client：章节列表字数目标 vs 实际对比

### 4. 验收标准

> 见 [REQ-2042-adaptive-word-count-control.md](./REQ-2042-adaptive-word-count-control.md) 第 4 节。

## 任务清单

### 阶段一：shared 层 — 类型增强

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | shared/types：Chapter 类型增加 wordCountTarget 字段（min/max/role） | P0 | 1h | ✅ 完成 |
| T2 | shared/types：章节角色枚举类型定义（normal/transition/climax/turning_point） | P0 | 0.5h | ✅ 完成 |
| T3 | shared：构建验证（`pnpm --filter @ai-novel/shared build`） | P0 | 0.5h | ✅ 完成 |

### 阶段二：server 层 — auto-director 章节角色标注

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T4 | auto-director volume planning / beat sheet：标注章节角色（normal/transition/climax/turning_point） | P0 | 2h | ✅ 完成 |
| T5 | 系数计算逻辑：根据章节角色 + 基准字数范围计算 min/max | P0 | 1h | ✅ 完成 |
| T6 | 基准字数范围配置：settings 中可配置（默认 3000~4000） | P1 | 1h | ✅ 完成 |

### 阶段三：server 层 — generation pipeline 字数约束

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T7 | generation prompt 注入：将字数范围（min/max/role）作为 soft target 注入生成 prompt | P0 | 2h | ✅ 完成 |
| T8 | compress 能力实现/增强：超限时 AI 精简冗余描写 | P0 | 2h | ✅ 完成 |
| T9 | expand 能力实现/增强：不足时 AI 补充缺失内容 | P1 | 2h | ✅ 完成 |

### 阶段四：server 层 — 生成后字数检测

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T10 | 字数检测逻辑：实际字数 vs 目标范围比较 + 超限/不足判断 | P0 | 1.5h | ✅ 完成 |
| T11 | 自动 compress/expand 触发：检测结果驱动 compress 或 expand 执行 | P0 | 2h | ✅ 完成 |
| T12 | 检测循环保护：compress/expand 后重新检测，防止无限循环（最多 2 轮） | P1 | 1h | ✅ 完成 |

### 阶段五：server 层 — 水文检测

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T13 | 水文检测 prompt 设计与注册（PromptAsset） | P0 | 2h | ✅ 完成 |
| T14 | 水文检测服务：调用 LLM 分析无效描写密度 | P0 | 2h | ✅ 完成 |
| T15 | 水文超标处理：密度 > 30% 时标记 + 建议精简 | P1 | 1.5h | ✅ 完成 |

### 阶段六：client 层 — 字数目标展示

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T16 | 章节列表：显示字数目标范围（min~max） | P0 | 1.5h | ⬜ 待开始 |
| T17 | 章节列表：实际字数 vs 目标范围可视化对比（进度条或颜色标识） | P1 | 1.5h | ⬜ 待开始 |
| T18 | 水文标记：水文超标章节在列表中标红或警告 | P1 | 1h | ⬜ 待开始 |

---

## 逐项展开

### T1: shared/types — Chapter wordCountTarget 字段

**目标**: 在 Chapter 类型中增加 wordCountTarget 字段，存储字数目标信息。

**改动点**:
- `shared/types/` 中 Chapter 相关 schema — 增加 `wordCountTarget` 字段：
  ```typescript
  wordCountTarget: z.object({
    min: z.number(),      // 最小字数
    max: z.number(),      // 最大字数
    role: chapterRoleEnum // 章节角色
  }).optional()
  ```

**DoD**:
- [ ] 类型定义包含 wordCountTarget 字段
- [ ] 字段为 optional（不影响未标注的旧章节）
- [ ] 构建 shared 通过

---

### T2: shared/types — 章节角色枚举

**目标**: 定义章节角色枚举类型。

**改动点**:
- `shared/types/` — 新增 chapterRole 枚举：
  ```typescript
  chapterRoleEnum = z.enum(["normal", "transition", "climax", "turning_point"])
  ```

**DoD**:
- [ ] 枚举包含 4 种角色
- [ ] 与 wordCountTarget.role 字段关联

---

### T3: shared 构建验证

**目标**: 验证 shared 包构建通过，类型兼容。

**DoD**:
- [ ] `pnpm --filter @ai-novel/shared build` 通过

---

### T4: auto-director 章节角色标注

**目标**: auto-director 在 volume planning / beat sheet 阶段自动标注每章的叙事角色。

**改动点**:
- `server/src/services/novel/director/` — beat sheet 生成逻辑中增加章节角色标注
- `server/src/prompting/` — beat sheet prompt 中增加角色分类要求

**标注逻辑**:
- AI 根据章节在卷中的位置、剧情摘要、冲突类型等信息判断角色
- 高潮卷的高峰章 → climax
- 卷与卷之间的衔接章 → transition
- 重大事件触发/反转章 → turning_point
- 其余 → normal

**DoD**:
- [ ] beat sheet 生成后每章包含 role 字段
- [ ] role 标注写入 Chapter 的 wordCountTarget.role
- [ ] prompt 在 registry 中注册

---

### T5: 系数计算逻辑

**目标**: 根据章节角色和基准字数范围计算目标 min/max。

**改动点**:
- `server/src/services/novel/director/` — 新增 word count target 计算函数

**计算逻辑**:
```typescript
function calculateWordCountTarget(
  baseMin: number,   // 基准最小字数，默认 3000
  baseMax: number,   // 基准最大字数，默认 4000
  role: ChapterRole  // 章节角色
): { min: number; max: number } {
  const coeffMin = ROLE_COEFFICIENTS[role].min  // 如 normal: 1.0
  const coeffMax = ROLE_COEFFICIENTS[role].max  // 如 normal: 1.25
  return {
    min: Math.round(baseMin * coeffMin),
    max: Math.round(baseMax * coeffMax)
  }
}
```

**系数表**:
| 角色 | coeffMin | coeffMax |
| ---- | ---- | ---- |
| normal | 1.0 | 1.25 |
| transition | 1.0 | 1.25 |
| climax | 1.0 | 2.5 |
| turning_point | 1.0 | 2.5 |

**DoD**:
- [ ] 计算函数正确实现系数表
- [ ] 单元测试覆盖 4 种角色

---

### T6: 基准字数范围配置

**目标**: 小说 settings 中可配置基准字数范围。

**改动点**:
- `shared/types/novelSettings.ts`（或对应配置类型）— 增加 `baseWordCountMin` / `baseWordCountMax` 字段
- `server/src/modules/novel/` — 设置读写 API 支持该字段

**DoD**:
- [ ] 默认值 3000 / 4000
- [ ] 用户可通过 settings 修改
- [ ] 修改后即时生效

---

### T7: generation prompt 注入

**目标**: 将字数范围信息注入生成 prompt，作为 soft target 引导 AI 生成。

**改动点**:
- `server/src/prompting/` — 章节生成 prompt 增加字数指引片段
- `server/src/services/novel/director/` — 生成上下文组装时读取 wordCountTarget

**注入内容示例**:
```
本章目标字数：{min}~{max} 字（{role_name}）
请确保内容充实度匹配该字数范围，重点展开核心冲突和角色情感。
```

**DoD**:
- [ ] prompt 中包含字数范围信息
- [ ] 不同角色有不同的生成指引语
- [ ] prompt 在 registry 中注册

---

### T8: compress 能力

**目标**: 超出目标字数上限时，AI 精简冗余描写。

**改动点**:
- `server/src/services/novel/` — 新增或增强 compress 逻辑
- `server/src/prompting/` — 新增 compress prompt（PromptAsset）

**compress 策略**:
- 保留核心情节推进段落
- 精简重复描写、过度环境铺陈、无关对话
- 保持叙事连贯性和角色声音一致性

**DoD**:
- [ ] compress 后字数降至 max 以下
- [ ] 内容连贯性不被破坏
- [ ] prompt 在 registry 中注册

---

### T9: expand 能力

**目标**: 低于目标字数下限时，AI 补充缺失内容。

**改动点**:
- `server/src/services/novel/` — 新增或增强 expand 逻辑
- `server/src/prompting/` — 新增 expand prompt（PromptAsset）

**expand 策略**:
- 补充角色内心活动、对话细节、环境描写
- 不引入新剧情线，仅丰富现有内容
- 与上下文保持一致

**DoD**:
- [ ] expand 后字数达到 min 以上
- [ ] 内容风格与原文一致
- [ ] prompt 在 registry 中注册

---

### T10: 字数检测逻辑

**目标**: 生成后检测实际字数与目标范围的偏差。

**改动点**:
- `server/src/services/novel/` — 新增 word count check 逻辑

**检测逻辑**:
```typescript
function checkWordCount(actual: number, target: { min: number; max: number }): 
  "over" | "under" | "ok" {
  if (actual > target.max) return "over"
  if (actual < target.min) return "under"
  return "ok"
}
```

**DoD**:
- [ ] 检测逻辑正确
- [ ] 返回值清晰区分超限/不足/达标

---

### T11: 自动 compress/expand 触发

**目标**: 字数检测结果驱动 compress 或 expand 自动执行。

**改动点**:
- `server/src/services/novel/director/` — 章节生成后流水线增加字数检测步骤

**触发逻辑**:
- over → 调用 compress → 重新检测
- under → 调用 expand → 重新检测
- ok → 跳过，进入水文检测

**DoD**:
- [ ] 超限自动触发 compress
- [ ] 不足自动触发 expand
- [ ] compress/expand 后重新检测字数

---

### T12: 检测循环保护

**目标**: 防止 compress/expand 无限循环。

**改动点**:
- `server/src/services/novel/` — 字数检测增加循环计数器

**逻辑**:
- 最多执行 2 轮 compress/expand
- 超过 2 轮仍不达标，标记为 warning 但不阻断流程
- 记录日志供排查

**DoD**:
- [ ] 最多 2 轮循环
- [ ] 超过轮次上限不阻断流程
- [ ] 日志记录完整

---

### T13: 水文检测 prompt 设计

**目标**: 设计水文检测 prompt 并注册为 PromptAsset。

**改动点**:
- `server/src/prompting/` — 新增 `waterContentDetectionPrompt`（PromptAsset）

**prompt 设计要点**:
- 输入：章节全文
- 分析维度：段落级，判断每个段落是否推进剧情/塑造角色/建立世界观
- 输出：JSON 格式，包含无效段落列表和密度百分比

**DoD**:
- [ ] prompt 注册于 prompting registry
- [ ] 输出结构化 JSON
- [ ] 覆盖主要水文类型（重复描写、无关对话、过度铺陈）

---

### T14: 水文检测服务

**目标**: 调用 LLM 执行水文检测，返回无效描写密度。

**改动点**:
- `server/src/services/novel/` — 新增 water content detection 服务
- 调用 prompting registry 中的水文检测 prompt

**逻辑**:
1. 获取章节全文
2. 调用 LLM 执行段落级分析
3. 计算无效描写密度百分比
4. 返回检测结果

**DoD**:
- [ ] 可调用 LLM 执行水文检测
- [ ] 返回无效描写密度百分比
- [ ] LLM 调用失败时 graceful 降级（跳过检测，记录日志）

---

### T15: 水文超标处理

**目标**: 无效描写密度超 30% 时标记水文超标。

**改动点**:
- `server/src/services/novel/` — 水文检测结果处理逻辑
- `shared/types/` — Chapter 类型增加水文检测结果字段（如 `waterContentScore`）

**处理逻辑**:
- 密度 <= 30%：正常，不标记
- 密度 > 30%：标记水文超标，写入章节元数据
- 可选：自动触发精简（由配置控制）

**DoD**:
- [ ] 超标阈值可配置（默认 30%）
- [ ] 超标结果写入章节元数据
- [ ] 不阻断章节生成流程

---

### T16: 章节列表字数目标展示

**目标**: 章节列表中显示字数目标范围。

**改动点**:
- `client/src/pages/novels/` — 章节列表组件增加字数目标展示

**展示内容**:
- 目标范围：如 "3000~5000 字"
- 章节角色：如 "高潮章"

**DoD**:
- [ ] 字数目标范围正确显示
- [ ] 无 wordCountTarget 的旧章节显示默认或不显示

---

### T17: 字数对比可视化

**目标**: 实际字数与目标范围的可视化对比。

**改动点**:
- `client/src/pages/novels/` — 章节列表增加字数对比视图

**展示形式**:
- 进度条：min~max 区间为绿色，超出/不足为红色/黄色
- 或文字标签：实际字数 / 目标范围 + 颜色标识

**DoD**:
- [ ] 实际字数与目标范围直观对比
- [ ] 超限/不足有醒目颜色标识

---

### T18: 水文标记展示

**目标**: 水文超标章节在列表中标记警告。

**改动点**:
- `client/src/pages/novels/` — 章节列表增加水文警告标记

**展示形式**:
- 水文超标章节显示警告图标（如三角感叹号）
- hover 时显示无效描写密度百分比

**DoD**:
- [ ] 水文超标章节有醒目警告标记
- [ ] hover 显示详细信息

---

## DoD（Definition of Done）

- Chapter 类型包含 wordCountTarget 字段，shared 构建通过
- auto-director 可在 beat sheet 阶段标注章节角色
- generation prompt 注入字数范围信息
- 生成后字数检测正确：超限 compress / 不足 expand
- 水文检测可用，无效描写密度 > 30% 时标记超标
- 章节列表显示字数目标 vs 实际对比
- 所有测试通过

---

## 依赖

- 前置依赖：无
- 关联依赖：无
- 后继依赖：无

---

## 验证步骤

1. 创建小说，走完 volume planning，验证章节角色被自动标注
2. 生成一个普通章，验证字数在 3000~5000 范围内
3. 生成一个高潮章，验证字数上限可达 10000
4. 手动构造一个超长章节，验证自动 compress 触发
5. 手动构造一个过短章节，验证自动 expand 触发
6. 对一个包含大量无用描写的章节执行水文检测，验证密度计算正确
7. 在章节列表中验证字数目标 vs 实际对比展示
8. 修改基准字数范围设置，验证新章节使用新基准

---

## 执行记录

| 日期 | 任务 | 状态 |
| ---- | ---- | ---- |
| 2026-07-03 | req 路由生成任务包 | 完成 |
| 2026-07-04 | Phase 1-5（T1-T15）shared + server 实现 | 完成 |

---

## 完成判定

- T1~T18 全部完成且 DoD 全部满足后，REQ-2042 达到"已完成"状态。
