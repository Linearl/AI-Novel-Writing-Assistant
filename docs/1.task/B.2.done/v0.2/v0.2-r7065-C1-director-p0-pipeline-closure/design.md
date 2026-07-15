---
description: "REQ-7065 导演引擎 P0 Pipeline 闭环收口 — 技术设计"
update_time: 2026-07-14
---

## 技术设计

### 1. 整体策略

本轮改动是 P0 基础层闭环收口，不是新一轮架构改造。核心原则：
- **补齐未闭合的接口**，不新增模块/表/路由
- **逐步降级旧路径**，不一次性删除（降低回归风险）
- **每个 FR 独立可测**，可分批提交

### 2. FR-1: 去旧 Adapter

当前四个核心步骤的执行路径：
```
PipelineEngine.dispatch()
  → StepModule.adapter (getDirectorStageNodeAdapter)
    → 旧 phase service（novelDirectorPipelinePhases 等）
      → 写业务表 + reportProgress
```

目标路径：
```
PipelineEngine.dispatch()
  → StepModule.buildInput(context)
  → StepModule.execute(input, runtime)
  → StepModule.validateOutput(output, context)
  → StepModule.commit(output, context)
```

实现方式：在 `directorPlanningStepModules.ts` 和 `directorExecutionStepModules.ts` 中为四个核心步骤实现完整的 StepModule 契约方法，将旧 adapter 中的核心逻辑提取到 execute/commit 方法中。

Adapter 保留为 deprecated 标记，待验证无回归后清理。

### 3. FR-2: StateCommitter 生命周期

DirectorStateCommitter 新增方法：
- `commitStepStarted(runId, stepId, input)`
- `commitStepCompleted(runId, stepId, output, artifacts)`
- `commitStepFailed(runId, stepId, error)`
- `commitStepBlocked(runId, stepId, reason)`
- `commitStepCancelled(runId, stepId)`

### 4. FR-3: Artifact Ledger × Workspace Analyzer

ArtifactLedger 新增：
- `analyzeStaleArtifacts(protectedArtifactIds)` → 返回受影响的 downstream artifacts
- `analyzeDependencies(artifactId)` → 返回依赖链

DirectorWorkspaceAnalyzer 在 `analyzeWorkspace()` 中调用上述方法，将结果合并到 workspace analysis 输出中。

### 5. FR-4: DIRECTOR_PROGRESS 降级

保留 `novelDirectorProgress.ts` 不动（旧 UI 兼容）。新增优先级逻辑：

```
progress = StepModule.inspectProgress(context) ?? DIRECTOR_PROGRESS[key]
```

Phase 文件中移除非 fallback 用途的 DIRECTOR_PROGRESS 引用，改用 StepModule.inspectProgress 返回的结构化进度。

### 6. FR-5: Worker Delta 写入

DirectorRuntimeStore 改为：
- `appendStepRun(delta)` — 增量追加 step run
- `appendEvent(delta)` — 增量追加 event
- `appendArtifact(delta)` — 增量追加 artifact

不再全量序列化 runtime snapshot 到 seedPayloadJson。Projection 查询时只返回摘要字段，不包含大体积 text/prompt/workspace 字段。
