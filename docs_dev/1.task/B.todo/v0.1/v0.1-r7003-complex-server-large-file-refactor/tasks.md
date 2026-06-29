---
description: "REQ-7003 任务拆解"
---

# REQ-7003 任务拆解

> 状态：⏳ 进行中

## 任务概述

### 1. 来源

2026-06-28 健康检查报告 — 债务健康度评估

### 2. 问题

server/src/ 18 个文件超 800 行，最大 1311 行，影响开发效率和代码审查。

### 3. 需求

- 按功能域分 5 批拆分
- 每批独立可验证
- 纯结构重构

### 4. 验收标准

> 见 [REQ-7003.md](./REQ-7003.md) 第 4 节。

## 任务清单

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | Batch 1: world 域（3 文件，最大 1311 行） | P2 | 4h | ⬜ 待开始 |
| T2 | Batch 2: prompting 域（4 文件，最大 1296 行） | P2 | 4h | ⬜ 待开始 |
| T3 | Batch 3: novel/director 域（5 文件，最大 1047 行） | P2 | 6h | ⬜ 待开始 |
| T4 | Batch 4: rag + planner + styleEngine（3 文件） | P3 | 3h | ⬜ 待开始 |
| T5 | Batch 5: novel/core + runtime + volume（3 文件） | P3 | 3h | ⬜ 待开始 |
| T6 | 全量验证 | P0 | 30min | ⬜ 待开始 |

---

## 逐项展开

### T1: Batch 1 — world 域

**目标**: 拆分 worldStructure.ts（1311行）、worldVisualization.ts（1082行）、WorldService.ts（837行）至 ≤ 600 行/文件。

**改动点**:
- `server/src/services/world/worldStructure.ts` — 提取子模块
- `server/src/services/world/worldVisualization.ts` — 提取渲染逻辑
- `server/src/services/world/WorldService.ts` — 提取服务方法

### T2: Batch 2 — prompting 域

**目标**: 拆分 world.prompts.ts（1296行）、promptRunner.ts（1122行）、chapterLayeredContext.ts（1086行）、style.prompts.ts（806行）。

**改动点**:
- `server/src/prompting/prompts/world/world.prompts.ts` — 按 prompt 类型拆分
- `server/src/prompting/core/promptRunner.ts` — 提取运行时逻辑
- `server/src/prompting/prompts/novel/chapterLayeredContext.ts` — 提取上下文构建
- `server/src/prompting/prompts/style/style.prompts.ts` — 按风格类型拆分

### T3: Batch 3 — novel/director 域

**目标**: 拆分 5 个导演相关文件，最大 1047 行。

**改动点**:
- `server/src/services/novel/director/runtime/novelDirectorTakeover.ts`
- `server/src/services/novel/director/runtime/DirectorWorkspaceAnalyzer.ts`
- `server/src/services/novel/director/commands/DirectorCommandService.ts`
- `server/src/services/novel/characterPrep/CharacterPreparationService.ts`
- `server/src/services/novel/director/workflowStepRuntime/directorExecutionStepModules.ts`

### T4: Batch 4 — rag + planner + styleEngine

**目标**: 拆分 RagIndexService.ts（1072行）、PlannerService.ts（978行）、StyleProfileService.ts（911行）。

### T5: Batch 5 — novel/core + runtime + volume

**目标**: 拆分 novelCorePipelineService.ts（1046行）、ChapterArtifactDeltaService.ts（905行）、NovelVolumeService.ts（803行）。

### T6: 全量验证

**目标**: 确认所有拆分后文件 ≤ 600 行，typecheck + test + build 全部通过。

---

## DoD（Definition of Done）

- 18 个文件全部 ≤ 600 行
- `pnpm typecheck` + `pnpm test` + `pnpm build` 通过
- 无新增 `any` 类型

---

## 依赖

- 建议在 REQ-7001（测试修复）之后执行，确保测试基线绿色

---

## 验证步骤

1. 每批完成后：`pnpm typecheck` + `pnpm test`
2. 全部完成后：`pnpm build`
3. 行数检查：`find server/src -name "*.ts" -exec wc -l {} + | sort -rn | head -20`
