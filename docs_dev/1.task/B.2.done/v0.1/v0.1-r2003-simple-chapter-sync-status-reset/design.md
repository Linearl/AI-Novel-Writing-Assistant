---
description: "REQ-2003 方案设计"
---

# REQ-2003 方案设计

## 1. 方案概述

修正 `VolumeChapterSyncService` 中的章节状态判定逻辑，增加对"无内容但有执行合同"这一中间状态的识别。核心改动局限在服务端同步层，不影响前端 UI 和下游过滤逻辑。

### 1.1 设计目标

1. 已细化章节（有 taskSheet/sceneCards 但无正文）同步后自动进入 `pending_generation`
2. 已有正文章节的状态不受影响
3. 新建章节也正确设置初始状态

### 1.2 关键决策

1. **判定依据为执行合同存在性**：以 `taskSheet` 或 `sceneCards` 非空作为"已细化"的判定标准，与现有 `plannerPersistence.ts` 逻辑对齐
2. **不修改 `preserveWorkflowState` 的计算逻辑**：保持 `volumePlanChangeDetection.ts` 不变，在 `VolumeChapterSyncService` 的更新分支中增加中间判定
3. **新建章节同步时也应用相同规则**：在 `create` 分支中增加执行合同检查

### 1.3 不在范围

- 前端同步面板 UI
- `chapterStatus` 枚举变更
- `volumePlanChangeDetection.ts` 逻辑修改

## 2. 实现细节

### 2.1 服务端：`VolumeChapterSyncService.ts`

#### 2.1.1 更新已有章节（lines 127-149）

**当前逻辑：**

```typescript
...(!item.preserveWorkflowState
  ? {
    generationState: "planned",
    chapterStatus: "unplanned",
  }
  : {}),
```

**修改后逻辑：**

```typescript
...(!item.preserveWorkflowState
  ? {
    generationState: "planned",
    chapterStatus: hasExecutionContract(item.chapter)
      ? "pending_generation"
      : "unplanned",
  }
  : {}),
```

其中 `hasExecutionContract` 辅助函数：

```typescript
function hasExecutionContract(chapter: ChapterSyncPayload): boolean {
  return Boolean(
    chapter.taskSheet?.trim() || chapter.sceneCards?.trim()
  );
}
```

#### 2.1.2 新建章节（lines 108-126）

**当前逻辑：** 创建时未设置 `chapterStatus`，默认为 `unplanned`。

**修改后逻辑：** 在 `create` 数据中增加：

```typescript
chapterStatus: hasExecutionContract(item.chapter)
  ? "pending_generation"
  : "unplanned",
```

### 2.2 数据流

```
步骤5: 章节细化完成
  |
  v  syncToChapterExecution: true
  |
VolumeChapterSyncService.syncVolumeChaptersWithOptions
  |
  |-- hasContent = true  → preserveWorkflowState = true  → 保留 chapterStatus ✓
  |-- hasContent = false 且有执行合同 → chapterStatus = "pending_generation" ✓
  |-- hasContent = false 且无执行合同 → chapterStatus = "unplanned" ✓
  |
  v
步骤6: 章节队列 → "待写作" 过滤器正确显示 ✓
```

### 2.3 下游兼容性

步骤6过滤逻辑（`chapterExecution.shared.tsx` lines 566-570）：

```typescript
if (filter === "draft") {
  return status === "pending_generation"
    || status === "generating"
    || (!hasText(chapter.content) && status !== "unplanned");
}
```

`pending_generation` 已被正确识别，无需修改。

---

## 3. 涉及文件

| 文件 | 改动类型 | 说明 |
| ---- | ---- | ---- |
| `server/src/services/novel/volume/VolumeChapterSyncService.ts` | 修改 | 更新/新建章节时增加执行合同判定 |
| `server/src/services/novel/volume/volumePlanChangeDetection.ts` | 不变 | `preserveWorkflowState` 逻辑保持原样 |
| `client/src/pages/novels/components/chapterExecution.shared.tsx` | 不变 | 过滤逻辑已兼容 |
