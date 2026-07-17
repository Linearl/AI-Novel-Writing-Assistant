# 设计文档 — REQ-7076 Director Pipeline 死循环修复

## 1. 问题诊断

### 1.1 死循环触发链

```
用户点击"确认继续"
  → continueTask() → resolveAssetFirstRecoveryFromSnapshot()
  → line 162: 有 volumeStrategyPlan → 强制返回 phase: "structured_outline"  ← 根因 A
  → runPipeline(startPhase: "structured_outline")
  → runStructuredOutlineNode() → beat_sheet 模块 inspectCompletion()
  → inspectStructuredOutlineFactState → beatSheetReady 检查
  → 如果 workspace 中 beatSheets 为空 → beatSheetReady = false  ← 根因 B
  → 重新执行 beat sheet 生成 → 再次进入 while 循环 → 循环
```

### 1.2 根因分析

| 根因 | 文件 | 行号 | 问题描述 |
|------|------|------|----------|
| A: 路由层 | `novelDirectorRecovery.ts` | 162 | `resolveAssetFirstRecoveryFromSnapshot` 在 volumeStrategyPlan 存在时无条件返回 `phase: "structured_outline"`，即使 outline 已完成 |
| B: 持久化层 | `volumeWorkspaceDocument.ts` | 483-487 | `mergeVolumeWorkspaceInput` 在 `volumeLevelStructureChanged` 为 true 时清空 `beatSheets` 数组 |
| C: 校验层 | `DirectorFactSummaryService.ts` | 262 | `beatSheetReady` 是动态计算值，不持久化，每次从 DB 重新读取 |

## 2. 修复方案

### 2.1 修复路由层（方案 A）

**文件**: `server/src/services/novel/director/recovery/novelDirectorRecovery.ts`

**修改**: 在 `resolveAssetFirstRecoveryFromSnapshot` 第 162 行的条件判断中，增加 structured outline 完成检查：

```typescript
// 修改前
if (input.hasVolumeStrategyPlan && (input.structuredOutlineRecoveryStep || input.volumeCount > 0)) {
    return { type: "phase", phase: "structured_outline" };
}

// 修改后
if (input.hasVolumeStrategyPlan && (input.structuredOutlineRecoveryStep || input.volumeCount > 0)) {
    // 检查 structured outline 是否已完成
    const cursor = input.structuredOutlineRecoveryStep;
    if (cursor && (cursor.step === "completed" || cursor.step === "chapter_sync")) {
        // outline 已完成，跳到下一阶段
        return { type: "phase", phase: "chapter_execution" };
    }
    return { type: "phase", phase: "structured_outline" };
}
```

### 2.2 修复持久化验证（方案 B）

**文件**: `server/src/services/novel/director/phases/novelDirectorStructuredOutlinePhase.ts`

**修改**: 在 `persistStructuredOutlineVolumeSnapshot` 调用后，添加回读验证：

```typescript
// 在 persistStructuredOutlineVolumeSnapshot 调用后（约第 209 行）
result = await persistStructuredOutlineVolumeSnapshot({...});

// 新增：回读验证 beat sheet 是否正确持久化
const verificationWorkspace = await getVolumeWorkspace({ novelId, taskId });
const verificationBeatSheet = getBeatSheet(verificationWorkspace, targetVolume.id);
if (!verificationBeatSheet || verificationBeatSheet.beats.length === 0) {
    logger.error("[structured-outline] beat sheet persistence verification failed", {
        volumeId: targetVolume.id,
    });
    throw new Error("Beat sheet persistence verification failed");
}
```

### 2.3 修复 beat sheet 误清空（方案 C）

**文件**: `server/src/services/novel/volume/volumeWorkspaceDocument.ts`

**修改**: 在 `mergeVolumeWorkspaceInput` 第 483 行，增加 beat sheet 保护：

```typescript
// 修改前
const beatSheets = strategyChanged || volumeLevelStructureChanged
    ? []
    : record.beatSheets !== undefined
        ? record.beatSheets
        : currentDocument.beatSheets;

// 修改后：仅在 strategy 真正改变时清空 beat sheets，结构变更不清空
const beatSheets = strategyChanged
    ? []
    : record.beatSheets !== undefined
        ? record.beatSheets
        : currentDocument.beatSheets;
```

## 3. 影响分析

| 修复 | 影响范围 | 风险 |
|------|----------|------|
| 路由层 | `novelDirectorRecovery.ts` | 低 — 仅影响 continue 流程的 phase 选择 |
| 持久化验证 | `novelDirectorStructuredOutlinePhase.ts` | 低 — 新增验证逻辑，失败时抛异常 |
| beat sheet 保护 | `volumeWorkspaceDocument.ts` | 中 — 改变了 merge 策略，需验证现有流程不受影响 |

## 4. 测试策略

- 单元测试：验证 `resolveAssetFirstRecoveryFromSnapshot` 在 outline 完成时返回正确 phase
- 单元测试：验证 `mergeVolumeWorkspaceInput` 在 structure 变更时保留 beat sheets
- 集成测试：验证 pipeline 能从 structured_outline 推进到 chapter_execution
- E2E 测试：手动验证完整的自动导演流程
