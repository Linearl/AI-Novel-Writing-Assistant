---
description: "REQ-7002 任务拆解"
---

# REQ-7002 任务拆解

> 状态：⏳ 进行中

## 任务概述

### 1. 来源

2026-06-28 健康检查报告 — 架构健康度评估

### 2. 问题

`NovelEdit.tsx` 2731 行，严重超出项目约束（>700 必须重构），影响开发效率和代码审查。

### 3. 需求

- 拆分为 5-8 个职责单一的子组件/模块
- 每个文件 ≤ 600 行
- 纯重构，功能不变

### 4. 验收标准

> 见 [REQ-7002.md](./REQ-7002.md) 第 4 节。

## 任务清单

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | 分析 NovelEdit.tsx 功能区块与依赖图 | P0 | 1h | ⬜ 待开始 |
| T2 | 制定拆分方案并输出 design.md | P0 | 1h | ⬜ 待开始 |
| T3 | 提取自定义 hooks（useNovelEditState 等） | P1 | 2h | ⬜ 待开始 |
| T4 | 提取子组件（Header、TabContent 等） | P1 | 2h | ⬜ 待开始 |
| T5 | 清理主文件，确认行数达标 | P0 | 1h | ⬜ 待开始 |
| T6 | typecheck + build + 功能验证 | P0 | 30min | ⬜ 待开始 |

---

## 逐项展开

### T1: 分析 NovelEdit.tsx 功能区块与依赖图

**目标**: 识别文件中的逻辑区块（state、effects、handlers、render），绘制依赖关系。

**改动点**: 纯分析，无代码改动。

### T2: 制定拆分方案并输出 design.md

**目标**: 明确拆分为哪些文件、每个文件的职责边界、状态提升/下沉策略。

**改动点**: `design.md` 新增。

### T3: 提取自定义 hooks

**目标**: 将页面级状态管理和副作用逻辑提取到 custom hooks。

**改动点**:
- 新建 `client/src/pages/novels/components/novelEdit/useNovelEditState.ts`
- 新建 `client/src/pages/novels/components/novelEdit/useNovelEditActions.ts`

### T4: 提取子组件

**目标**: 将渲染逻辑按功能区块提取为独立组件。

**改动点**:
- 新建 `client/src/pages/novels/components/novelEdit/NovelEditHeader.tsx`
- 新建 `client/src/pages/novels/components/novelEdit/NovelEditTabContent.tsx`
- 可能更多，以 design.md 为准

### T5: 清理主文件，确认行数达标

**目标**: NovelEdit.tsx 仅保留页面编排逻辑，≤ 400 行。

**改动点**:
- `client/src/pages/novels/NovelEdit.tsx` — 大幅瘦身

### T6: typecheck + build + 功能验证

**目标**: 确认无类型错误、构建成功、页面功能正常。

**改动点**: 无代码改动，纯验证。

---

## DoD（Definition of Done）

- NovelEdit.tsx ≤ 400 行
- 所有新建文件 ≤ 600 行
- `pnpm typecheck` + `pnpm build` 通过
- 页面功能无回归

---

## 验证步骤

1. `pnpm typecheck` — 0 错误
2. `pnpm build` — 成功
3. `wc -l client/src/pages/novels/NovelEdit.tsx` — ≤ 400
4. 手动验证小说编辑页面各标签页功能正常
