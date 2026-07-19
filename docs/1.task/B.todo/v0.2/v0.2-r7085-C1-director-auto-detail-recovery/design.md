---
description: "REQ-7085 自动导演自主处理未细化章节 — 技术设计"
---

# design.md — REQ-7085

## 核心思路

在恢复逻辑的三个关键节点增加"未细化章节"检测，让导演能区分"规划完成"和"所有待写章节已细化"。

## 改动点

### 1. `novelDirectorContinueRuntime.ts` — resolveResumePhase

**现状**：`resolvePlanningPhaseFromTakeoverState` 返回 null → 直接抛 `DirectorRecoveryNotNeededError`

**修改**：在抛错前增加检查：
```typescript
const planningRecovery = this.resolvePlanningPhaseFromTakeoverState(takeoverState);
if (planningRecovery?.type === "phase") {
  return planningRecovery.phase;
}
// 新增：检查待写章节是否已细化
if ((takeoverState.snapshot.generatedChapterCount ?? 0) < (takeoverState.snapshot.chapterCount ?? 0)) {
  return "structured_outline";
}
throw new DirectorRecoveryNotNeededError();
```

### 2. `novelDirectorRecovery.ts` — resolveAssetFirstRecoveryFromSnapshot

**现状**：`structuredOutlineRecoveryStep === "completed"` 时直接返回 null

**修改**：利用已有的 `hasMissingExecutionContractInRange` 参数：
```typescript
if (input.structuredOutlineRecoveryStep === "completed" || input.structuredOutlineRecoveryStep === "chapter_sync") {
  // 如果目标范围内仍有未细化章节，回到 structured_outline
  if (input.hasMissingExecutionContractInRange) {
    return { type: "phase", phase: "structured_outline" };
  }
  return null;
}
```

### 3. `novelDirectorPipelineRuntime.ts` — maybeRunAutoApprovedChapters

**现状**：只检查 `approveAutoExecutionScope` 和 `shouldAutoApproveCheckpoint`

**修改**：增加未写入内容章节检测：
```typescript
const hasUnwrittenChapters = await this.hasUnwrittenChapters(input.novelId);
if (!input.approveAutoExecutionScope && !shouldAutoApproveCheckpoint && !hasUnwrittenChapters) {
  return;
}
```

`hasUnwrittenChapters` 方法通过查询 Chapter 表检查是否存在 content 为空的章节。

### 4. `novelDirectorAutoExecutionScopeRuntime.ts` — 拆章失败恢复

**现状**：`volume_chapter_detail_bundle_generate` 失败后直接报错

**修改**：捕获失败后自动回到 structured_outline 阶段重新进入拆章流程。

## 不改动

- `resolveDirectorAutoExecutionRange` 的默认 `preferredChapterCount=10` — 这是自动执行范围的默认值，通过 `autoExecutionPlan` 可以覆盖
- 卷战略阶段的多卷生成逻辑 — 不在本次范围
