---
description: "REQ-2006 方案设计"
---

# REQ-2006 方案设计

## 1. 方案概述

在 `VolumePlan` 接口新增 `targetChapterCount` 字段，前端在步骤4卷卡片中提供数字输入控件，后端在分配和节奏板生成逻辑中优先使用手动值。

### 1.1 关键决策

1. **字段为 optional nullable**：`null` 表示使用自动分配，有值表示手动覆盖
2. **不自动重算其他卷**：用户调一卷不影响其他卷的分配
3. **超出总预算时仅提示不阻断**：尊重用户的创作自由

## 2. 实现细节

### 2.1 共享类型

`shared/types/novel.ts` — `VolumePlan` 接口新增：

```typescript
targetChapterCount?: number | null;
```

### 2.2 后端：分配逻辑

`server/src/services/novel/volume/volumeChapterBudgetAllocation.ts`

修改 `allocateChapterBudgets()`：

```typescript
function allocateChapterBudgets(totalBudget, volumes) {
  // 1. 先扣除手动设置的卷
  const manualTotal = volumes
    .filter(v => v.targetChapterCount != null)
    .reduce((sum, v) => sum + v.targetChapterCount!, 0);
  
  // 2. 剩余预算分配给未手动设置的卷
  const autoVolumes = volumes.filter(v => v.targetChapterCount == null);
  const remainingBudget = Math.max(totalBudget - manualTotal, autoVolumes.length * 3);
  const autoAllocation = distributeEvenly(remainingBudget, autoVolumes.length);
  
  // 3. 合并结果
  return volumes.map(v => 
    v.targetChapterCount ?? autoAllocation.shift()!
  );
}
```

### 2.3 后端：节奏板生成

`server/src/services/novel/volume/volumeBeatSheetGeneration.ts`

修改 `resolveBeatSheetTargetChapterCount()`：

```typescript
function resolveBeatSheetTargetChapterCount(volume, budgetedCount) {
  return volume.targetChapterCount 
    ?? Math.max(volume.chapters?.length ?? 0, budgetedCount);
}
```

### 2.4 前端：卷卡片 UI

`client/src/pages/novels/components/OutlineTab.tsx`（或卷卡片组件）

在每卷卡片中新增：

```tsx
<div>
  <label>目标章节数</label>
  <Input
    type="number"
    min={3}
    max={50}
    value={volume.targetChapterCount ?? ""}
    placeholder={`自动: ${budgetedCount}章`}
    onChange={e => onVolumeChange(volume.id, { 
      targetChapterCount: e.target.value ? Number(e.target.value) : null 
    })}
  />
  {volume.targetChapterCount && (
    <Button variant="ghost" onClick={() => onVolumeChange(volume.id, { targetChapterCount: null })}>
      恢复自动
    </Button>
  )}
</div>
```

## 3. 涉及文件

| 文件 | 改动类型 | 说明 |
| ---- | ---- | ---- |
| `shared/types/novel.ts` | 修改 | VolumePlan 新增 targetChapterCount |
| `server/src/services/novel/volume/volumeChapterBudgetAllocation.ts` | 修改 | allocateChapterBudgets 尊重手动值 |
| `server/src/services/novel/volume/volumeBeatSheetGeneration.ts` | 修改 | resolveBeatSheetTargetChapterCount 优先手动值 |
| `client/src/pages/novels/components/OutlineTab.tsx` | 修改 | 卷卡片新增章节数输入 |
