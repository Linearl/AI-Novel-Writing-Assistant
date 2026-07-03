---
description: "REQ-2033 任务拆解"
---

# REQ-2033 任务拆解

> 状态：⏳ 进行中（完成后改为 ✅ 全部完成）
> 模板类型：**简单版** — 纯后端工具

## 任务概述

### 1. 来源

REQ-2029 后续迭代。主题数据散布无聚合工具。

### 2. 问题

伏笔失控无汇总，卷主题无覆盖检查，主题层级不可见。

### 3. 需求

3 个纯数据 inspect tool：payoff 健康度、卷主题覆盖率、主题层级。

### 4. 验收标准

> 见 [REQ-2033.md](./REQ-2033.md) 第 4 节。

---

## 任务清单

| # | 任务 | 优先级 | 预估 | 依赖 | 产物 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | audit_payoff_health — 伏笔健康度 | P0 | 25min | — | 工具定义 | ⬜ 待开始 |
| T2 | audit_volume_theme_coverage — 卷主题覆盖率 | P0 | 25min | — | 工具定义 | ⬜ 待开始 |
| T3 | get_theme_hierarchy — 主题层级聚合 | P1 | 20min | — | 工具定义 | ⬜ 待开始 |
| T4 | 工具注册 + 权限 + 验证 | P1 | 20min | T1-T3 | toolRegistry + approvalPolicy | ⬜ 待开始 |

---

## 逐项展开

### T1: audit_payoff_health

**目标**: 扫描 PayoffLedgerItem，统计各状态数量，标记 overdue/failed 为高风险。

**改动点**:
- `server/src/agents/tools/novelReadTools.ts`（或新建 `themeConsistencyTools.ts`）
- 查询 `PayoffLedgerItem.findMany({ where: { novelId } })`
- 按 `currentStatus` 分组统计，计算风险等级

### T2: audit_volume_theme_coverage

**目标**: 检查每卷 mainPromise 是否有章节 purpose 覆盖。

**改动点**:
- 查询 `VolumePlan` + `VolumeChapterPlan`
- 计算每卷 `chaptersWithPurpose / chapterCount`

### T3: get_theme_hierarchy

**目标**: 聚合书→卷→章三层主题结构。

**改动点**:
- 查询 `NovelBible` + `BookContract` + `VolumePlan` + `VolumeChapterPlan`
- 组装三层嵌套 JSON

### T4: 注册 + 验证

**改动点**:
- `toolRegistry.ts` + `approvalPolicy.ts`
- `pnpm typecheck` + `pnpm test`

---

## DoD

3 个工具可获取、category 正确、类型检查+测试通过。

---

## 执行记录

| 日期 | 任务 | 状态 |
| ---- | ---- | ---- |

---

## 当前门禁

- [x] 待激活
