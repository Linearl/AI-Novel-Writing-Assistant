
---
reqId: 7065
title: "导演引擎 P0 Pipeline 闭环收口 — 需求文档（工作副本）"
status: requirements_ready
priority: P0
complexity: C1
estimatedEffort: "4-5天"
version: v0.2
created: 2026-07-14
updated: 2026-07-14
---

# REQ-7065: 导演引擎 P0 Pipeline 闭环收口

## 1. 需求背景

### 1.1 问题描述

2026-05-05 完成的 P0 基础层改造（DirectorCommandInterpreter、PipelineEngine、StateReader/Committer、WorkflowStepModule 契约扩展）已经解决了"Web API 被长任务拖死"和"任务假运行"的核心问题。

但当前 Pipeline 仍处于"过渡态"：旧 phase service adapter 仍在包裹核心步骤执行，StateCommitter 未覆盖完整生命周期，DIRECTOR_PROGRESS 固定百分比仍在所有 phase 文件中作为进度来源，Worker 持久化回写仍为全量重建。

方案文档明确要求：
- "Pipeline 内部仍有旧 service adapter 过渡调用，尚未把四个核心步骤全部改成只通过 `buildInput -> execute -> validateOutput -> commit` 自闭环执行"
- "DirectorStateCommitter 还没有覆盖全部 step lifecycle 写入"
- "Artifact Ledger 已有读写网关，但 stale / protected / dependency 影响分析还没有接入 Workspace Analyzer"
- "旧 DIRECTOR_PROGRESS 固定百分比仍需继续降级为纯 fallback"
- "Worker 持久化 delta 写入、projection 响应体大小约束仍需在下一阶段补齐"

### 1.2 影响范围

- 导演 Pipeline 执行路径（directorPlanningStepModules.ts、directorExecutionStepModules.ts）
- 状态提交层（DirectorStateCommitter.ts）
- Artifact Ledger 与 Workspace Analyzer 集成
- ~10 个 phase 文件中的 DIRECTOR_PROGRESS 引用
- Worker 持久化层（DirectorRuntimeStore.ts、DirectorRuntimePersistence.ts）

## 2. 需求定义

### 2.1 功能需求

#### FR-1: 去除旧 Pipeline Adapter 过渡

**当前状态**：四个核心步骤通过 `getDirectorStageNodeAdapter` / `getDirectorExecutionNodeAdapter` 包装旧 phase service 执行，未直接走 `buildInput → execute → validateOutput → commit` 标准契约。

**目标**：story.macro.plan、book.contract.create、chapter.task_sheet.plan、chapter.draft.write 四个核心 StepModule 改为自闭环执行，不再依赖旧 adapter。

**涉及文件**：
- `server/src/services/novel/director/workflowStepRuntime/directorPlanningStepModules.ts`
- `server/src/services/novel/director/workflowStepRuntime/directorExecutionStepModules.ts`
- `server/src/services/novel/director/phases/novelDirectorStageNodeAdapters.ts`

#### FR-2: StateCommitter 生命周期全覆盖

**当前状态**：DirectorStateCommitter 仅完成 pipeline dispatch 事件入口和事实源接口骨架。

**目标**：补齐 start/complete/fail/block/cancel 全生命周期的状态写入。

**涉及文件**：`server/src/services/novel/director/DirectorStateCommitter.ts`

#### FR-3: Artifact Ledger 接入 Workspace Analyzer

**当前状态**：ArtifactReader / ArtifactWriter 网关已有，但 stale/protected/dependency 影响分析未落地。

**目标**：手动编辑正文或核心设定后，系统能基于 Artifact Ledger 识别受影响产物，由 Workspace Analyzer 给出受影响范围和最小修复路径。

**涉及文件**：
- `server/src/services/novel/director/DirectorArtifactLedger.ts`
- `server/src/services/novel/director/runtime/DirectorWorkspaceAnalyzer.ts`

#### FR-4: DIRECTOR_PROGRESS 降级为纯 Fallback

**当前状态**：`novelDirectorProgress.ts` 定义的固定百分比仍在 ~10 个 phase 文件中作为主进度来源。

**目标**：保留 DIRECTOR_PROGRESS 作为旧 UI 兼容层，StepModule.inspectProgress() 成为主进度来源。

**涉及文件**：`novelDirectorCandidateStage.ts`、`novelDirectorPipelinePhases.ts`、`novelDirectorStoryMacroPhase.ts`、`novelDirectorStructuredOutlinePhase.ts` 等

#### FR-5: Worker 持久化 Delta 写入

**当前状态**：Runtime 持久化每次 mutation 全量重建 steps/events/artifacts。

**目标**：改为增量 delta 写入，projection 查询轻量化。

**涉及文件**：
- `server/src/services/novel/director/runtime/DirectorRuntimeStore.ts`
- `server/src/services/novel/director/runtime/DirectorRuntimePersistence.ts`

### 2.2 非功能需求

- 不改动数据库 schema
- 不引入新依赖包
- 现有测试套件全部通过
- `pnpm typecheck` 零错误

## 3. 验收标准

- [ ] 四个核心 StepModule 执行路径不再经过旧 adapter
- [ ] DirectorStateCommitter 覆盖 start/complete/fail/block/cancel 五种生命周期事件
- [ ] Workspace Analyzer 能基于 Artifact Ledger 输出 stale/protected/dependency 分析
- [ ] DIRECTOR_PROGRESS 仅作为 UI 兼容 fallback，inspectProgress 为主进度源
- [ ] Worker 持久化改为 delta 写入
- [ ] 现有所有导演相关测试通过
- [ ] `pnpm typecheck` 零错误
