---
description: "REQ-3013 导演跟进任务列表全选与批量清理 — 设计方案"
---

# REQ-3013 设计方案

## 现状分析

- 列表面板已有 `onToggleSelected` 回调和单个 checkbox
- 批量操作栏已有 `onClear` 和 `onExecute`，但只支持 `continue_auto_execution` 和 `retry_with_task_model`
- 后端 `POST /api/tasks/batch-archive` 已存在，接收 `{ tasks: [{kind, id}] }`

## 设计

### 全选

在 `AutoDirectorFollowUpListPanel` 表头增加 checkbox：
- `indeterminate` 状态：部分选中
- `checked` 状态：全选
- 点击逻辑：全选/取消当前页所有 item 的 selectionKey

新增 props：
```typescript
onSelectAll: (checked: boolean) => void;
isAllSelected: boolean;
isIndeterminate: boolean;
```

### 批量归档

在 `AutoDirectorFollowUpBatchBar` 增加"批量归档"按钮：
- 判断条件：所选 items 的 status 全部为 `succeeded` | `failed` | `cancelled`
- 调用已有的 `batchArchiveTasks` API
- 归档后 invalidate queries 刷新列表

新增 mutation：
```typescript
const batchArchiveMutation = useMutation({
  mutationFn: (items: AutoDirectorFollowUpItem[]) =>
    batchArchiveTasks(items.map(i => ({ kind: "novel_workflow" as const, id: i.taskId }))),
  onSuccess: (_, items) => {
    toast.success(`已归档 ${items.length} 项任务`);
    queryClient.invalidateQueries({ queryKey: ["auto-director-follow-ups"] });
    onClear();
  },
});
```

### 文件变更清单

| 文件 | 变更 |
|------|------|
| `AutoDirectorFollowUpList.tsx` | 表头增加全选 checkbox |
| `AutoDirectorFollowUpBatchBar.tsx` | 增加批量归档按钮 |
| `AutoDirectorFollowUpCenterPage.tsx` | 全选状态管理 + 归档 mutation |
