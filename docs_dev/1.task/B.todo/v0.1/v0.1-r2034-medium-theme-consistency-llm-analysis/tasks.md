---
description: "REQ-2034 任务拆解"
---

# REQ-2034 任务拆解

> 状态：⏳ 进行中（完成后改为 ✅ 全部完成）
> 模板类型：**简单版** — 后端工具 + prompt

## 任务概述

### 1. 来源

REQ-2029 后续迭代。REQ-2033 纯数据工具之上，需要 LLM 辅助做语义级主题分析。

### 2. 问题

主题偏移、母题断裂无法用规则检测，需要 LLM 理解文本后判断。

### 3. 需求

2 个 inspect tool + 1 个 PromptAsset。

### 4. 验收标准

> 见 [REQ-2034.md](./REQ-2034.md) 第 4 节。

---

## 任务清单

| # | 任务 | 优先级 | 预估 | 依赖 | 产物 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | analyze_theme_consistency — 主题偏移检测 | P0 | 35min | REQ-2033 | 工具定义 | ⬜ 待开始 |
| T2 | analyze_motif_tracking — 母题持续性 | P0 | 30min | REQ-2033 | 工具定义 | ⬜ 待开始 |
| T3 | PromptAsset — 主题分析 prompt | P1 | 20min | — | themeAnalysisPrompt.ts | ⬜ 待开始 |
| T4 | 工具注册 + 权限 + 验证 | P1 | 20min | T1-T3 | toolRegistry + approvalPolicy | ⬜ 待开始 |

---

## 逐项展开

### T1: analyze_theme_consistency

**目标**: LLM 辅助检测各卷主题是否与声明的主题承诺一致。

**改动点**:
- 新建工具定义（可放在 `themeConsistencyTools.ts` 或 `novelReadTools.ts`）
- 内部调用 `runStructuredPrompt(themeAnalysisPrompt, { themeHierarchy, chapterSummaries })`
- 返回结构化分析结果

### T2: analyze_motif_tracking

**目标**: 检查 WritingFormula.motifs 是否在章节中持续出现。

**改动点**:
- 查询 `WritingFormula` 获取 motifs
- 查询章节内容/摘要，检测 motifs 出现频率
- 计算间隔和 verdict

### T3: PromptAsset

**目标**: 创建主题分析 prompt。

**改动点**:
- 新建 `server/src/prompting/prompts/narrative/themeAnalysisPrompt.ts`
- 在 `registry.ts` 注册

### T4: 注册 + 验证

**改动点**:
- `toolRegistry.ts` + `approvalPolicy.ts`（riskLevel: medium）
- `pnpm typecheck` + `pnpm test`

---

## DoD

2 个工具可获取，PromptAsset 注册，类型检查+测试通过。

---

## 执行记录

| 日期 | 任务 | 状态 |
| ---- | ---- | ---- |

---

## 当前门禁

- [ ] 待激活
