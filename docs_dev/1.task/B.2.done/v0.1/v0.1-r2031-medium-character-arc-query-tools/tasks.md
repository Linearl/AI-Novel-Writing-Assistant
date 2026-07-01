---
description: "REQ-2031 任务拆解"
---

# REQ-2031 任务拆解

> 状态：⏳ 进行中（完成后改为 ✅ 全部完成）
> 模板类型：**简单版** — 后端工具层，无前端

## 任务概述

### 1. 来源

REQ-2029 后续迭代。agent tool 层缺少 novel 级角色弧光查询工具。

### 2. 问题

`characterTools.ts` 只有 base character library 的 2 个工具，narrative_advisor 和其他 agent 无法查询角色弧光数据。

### 3. 需求

新增 4 个 read-only tool：弧光规划+时间线、全角色动态概览、关系演化、情绪/目标变化。

### 4. 验收标准

> 见 [REQ-2031.md](./REQ-2031.md) 第 4 节。

---

## 任务清单

| # | 任务 | 优先级 | 预估 | 依赖 | 产物 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | get_character_arc — 弧光规划 + 时间线 | P0 | 30min | — | characterTools.ts 新增 | ⬜ 待开始 |
| T2 | get_character_dynamics_overview — 全角色概览 | P0 | 20min | — | characterTools.ts 新增 | ⬜ 待开始 |
| T3 | get_character_relation_evolution — 关系演化 | P1 | 25min | — | characterTools.ts 新增 | ⬜ 待开始 |
| T4 | get_character_states_by_chapter — 情绪变化 | P1 | 20min | — | characterTools.ts 新增 | ⬜ 待开始 |
| T5 | 工具注册 + 权限配置 | P0 | 15min | T1-T4 | toolRegistry.ts + approvalPolicy.ts | ⬜ 待开始 |
| T6 | 类型检查 + 测试 | P1 | 15min | T5 | 测试通过报告 | ⬜ 待开始 |

---

## 逐项展开

### T1: get_character_arc

**目标**: 查询某角色的弧光规划（arcStart/Midpoint/Climax/End）+ 按章节有序的事件时间线。

**改动点**:
- `server/src/agents/tools/characterTools.ts`：新增工具定义
- 复用 `prisma.character.findUnique()` + `prisma.characterTimeline.findMany()`

### T2: get_character_dynamics_overview

**目标**: 全角色动态概览，复用 `CharacterDynamicsService.getOverview()`。

**改动点**:
- `server/src/agents/tools/characterTools.ts`：新增工具定义
- 直接调用 `CharacterDynamicsService.getOverview(novelId, chapterOrder?)`

### T3: get_character_relation_evolution

**目标**: 查询某对角色的 `CharacterRelationStage` 时间线。

**改动点**:
- `server/src/agents/tools/characterTools.ts`：新增工具定义
- 查询 `CharacterRelationStage` where `characterIdA` and `characterIdB`

### T4: get_character_states_by_chapter

**目标**: 查询某角色按章节的情绪/目标变化（从 `CharacterTimeline` 提取）。

**改动点**:
- `server/src/agents/tools/characterTools.ts`：新增工具定义
- 查询 `CharacterTimeline` + 关联的 chapter info

### T5: 工具注册 + 权限

**目标**: 将 4 个新工具注册到 toolRegistry，配置 Planner/Reviewer 权限。

**改动点**:
- `server/src/agents/toolRegistry.ts`：新增导入和注册
- `server/src/agents/approvalPolicy.ts`：Planner/Reviewer 白名单更新

### T6: 验证

**步骤**: `pnpm typecheck` → `pnpm --filter @ai-novel/server test:planner` → `pnpm test`

---

## DoD

- 4 个工具均可获取、category 正确、权限正确
- 类型检查 + 全量测试通过

---

## 验证步骤

1. `pnpm typecheck`
2. `pnpm --filter @ai-novel/server test:planner`
3. `pnpm test`

---

## 执行记录

| 日期 | 任务 | 状态 |
| ---- | ---- | ---- |

---

## 当前门禁

- [x] 待激活
- [x] 待启动 T1
