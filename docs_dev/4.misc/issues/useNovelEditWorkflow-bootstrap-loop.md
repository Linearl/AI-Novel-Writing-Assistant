# useNovelEditWorkflow bootstrapMutation 冗余调用

## 问题描述

`useNovelEditWorkflow` hook 中的 `bootstrapMutation` useEffect 依赖 `workflowTaskId`，导致每次页面加载会触发 **2 次** bootstrap API 调用（1 次必要 + 1 次冗余）。

## 根因分析

`client/src/pages/novels/hooks/useNovelEditWorkflow.ts` 第 55-60 行：

```typescript
useEffect(() => {
    if (!novelId) {
      return;
    }
    bootstrapMutation.mutate();
  }, [novelId, workflowTaskId]);
```

**执行链路：**

| 步骤 | workflowTaskId | 服务端返回 id | 守卫 id === workflowTaskId | 结果 |
| --- | --- | --- | --- | --- |
| 1st mutation | `""` (空) | `"task-ABC"` | `"task-ABC" === ""` → false | `setSearchParams` 添加 `workspaceTaskId=task-ABC` |
| 2nd mutation | `"task-ABC"` | `"task-ABC"` | `"task-ABC" === "task-ABC"` → true | 早返回，不修改 URL |

**守卫条件 `nextTaskId === workflowTaskId` 能终止循环**，所以不会无限循环。但第 2 次 mutation 是冗余的网络请求。

## 副作用

第 2 次 bootstrap 调用虽然不修改 URL，但服务端会：

1. 合并 `seedPayload`（`mergeSeedPayload`）到已存在的 task
2. 更新 `heartbeatAt` 时间戳
3. 返回完整的 task 数据

这些都是不必要的副作用。

## 为什么我们的 fork 出现了无限循环

在 fork 版本中，useEffect 依赖为 `[novelId, workflowTaskId, bootstrapMutation]`。`useMutation` 返回的对象引用在某些情况下可能不稳定，导致 useEffect 更频繁触发。此外，fork 中的服务端 bootstrap 端点行为可能与原版不同（如返回不同的 task ID），导致守卫条件失效。

## 影响评估

- **原版**：每次页面加载 1 次冗余 API 调用 + 1 次不必要的 seedPayload 合并
- **fork（修复前）**：无限循环，344 个请求
- **fork（修复后）**：仅 1 次必要调用

## 建议修复

将 useEffect 依赖改为仅 `[novelId]`，mutation 仅在页面首次加载时执行一次：

```typescript
useEffect(() => {
    if (!novelId) {
      return;
    }
    bootstrapMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [novelId]);
```

`workflowTaskId` 不应作为依赖：mutation 的职责是"确保 workflow 存在并获取 ID"，只需在 `novelId` 变化时执行。

## 环境

- React Query v5 (`@tanstack/react-query`)
- React Router v6 (`useSearchParams`)
- 所有浏览器均受影响
