---
description: "REQ-7085 自动导演自主处理未细化章节 — 需求规格"
req_id: "7085"
title: "自动导演自主处理未细化章节"
version: "0.2"
status: "draft"
created: "2026-07-18"
---

# REQ-7085 自动导演自主处理未细化章节

## 1. 目标

自动导演在推进全书写作时，如果检测到目标章节缺少细化（taskSheet / sceneCards），应自动回到拆章阶段补全，而不是报错停止。

## 2. 背景与动机

当前自动导演在以下场景会报错停止：

1. 第 1 卷（1-10 章）写完后，导演标记任务 `succeeded`，剩余 20 章（11-30）保持 `planned` 状态。
2. 用户手动创建新 takeover 任务时，`volume_chapter_detail_bundle_generate` 步骤失败：`"did not produce the expected structured outline facts"`。
3. 导演的恢复逻辑（`resolvePlanningPhaseFromTakeoverState`）检测到 `structuredOutlineRecoveryStep === "completed"` 就认为"产物完整"，抛 `DirectorRecoveryNotNeededError`，不区分"1-10 章细化完成"和"全部待写章节已细化"。

**影响**：用户必须手动触发批量细化，导演无法自主完成全书写作流程。

## 3. 根因分析

### 3.1 恢复逻辑缺陷

`novelDirectorContinueRuntime.ts:549-553`：
```typescript
const planningRecovery = this.resolvePlanningPhaseFromTakeoverState(takeoverState);
if (planningRecovery?.type === "phase") {
  return planningRecovery.phase;
}
throw new DirectorRecoveryNotNeededError(); // ← 不区分"规划完成"和"执行完成"
```

`novelDirectorRecovery.ts:162-166`：
```typescript
if (input.structuredOutlineRecoveryStep === "completed" || input.structuredOutlineRecoveryStep === "chapter_sync") {
  return null; // ← 直接返回 null，不检查待写章节是否已细化
}
```

### 3.2 自动执行范围锁定

`novelDirectorAutoExecution.ts:196-198`：
```typescript
export function resolveDirectorAutoExecutionRange(
  chapters: DirectorAutoExecutionChapterRef[],
  preferredChapterCount = 10, // ← 默认只取 10 章
)
```

### 3.3 Pipeline 不触发章节执行

`novelDirectorPipelineRuntime.ts:294-298`：
```typescript
if (!input.approveAutoExecutionScope && !shouldAutoApproveCheckpoint && !hasUnwrittenChapters) {
  return; // ← 不检查未细化章节
}
```

## 4. 修复范围

### 4.1 在范围内

| 层 | 改动 |
|----|------|
| 恢复逻辑 | `resolvePlanningPhaseFromTakeoverState` 增加"待写章节是否已细化"检查 |
| 恢复逻辑 | `resolveAssetFirstRecoveryFromSnapshot` 增加缺失细化检测 |
| Pipeline | `maybeRunAutoApprovedChapters` 增加未细化章节触发 |
| 自动执行 | 拆章阶段失败时自动回到 `structured_outline` 补全细化 |
| 测试 | 单元测试覆盖"部分章节未细化"场景 |

### 4.2 不在范围内

- 卷战略阶段的多卷自动生成（当前只生成 1 个卷）
- 章节细化的 UI 交互变更
- 自动执行范围的智能分卷

## 5. 验收标准

- **EARS-1**：导演检测到待写章节缺少 taskSheet 时，自动回到拆章阶段补全细化
- **EARS-2**：细化完成后自动进入章节写作，无需用户手动干预
- **EARS-3**：已细化的章节不会被重复细化
- **EARS-4**：恢复逻辑能区分"规划完成但未执行"和"全部完成"
- **EARS-5**：现有测试全部通过，新增测试覆盖新场景

## 6. 关键代码位置

| 文件 | 函数 | 作用 |
|------|------|------|
| `novelDirectorContinueRuntime.ts` | `resolvePlanningPhaseFromTakeoverState` | 恢复阶段判断 |
| `novelDirectorContinueRuntime.ts` | `resolveResumePhase` | 恢复入口 |
| `novelDirectorRecovery.ts` | `resolveAssetFirstRecoveryFromSnapshot` | 资产恢复判断 |
| `novelDirectorPipelineRuntime.ts` | `maybeRunAutoApprovedChapters` | 章节执行触发 |
| `novelDirectorAutoExecution.ts` | `resolveDirectorAutoExecutionRange` | 范围计算 |
| `novelDirectorTakeoverExecution.ts` | `startDirectorTakeoverExecution` | 接管执行入口 |
