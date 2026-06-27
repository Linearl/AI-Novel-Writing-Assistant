---
description: "REQ-2016 方案设计"
---

# REQ-2016 方案设计

> 最后更新：2026-06-26T22:50:00+08:00

---

## 1. 架构决策

### 1.1 retry vs resume_from_checkpoint 的语义区分

- **retry**（重试）：从头开始重试任务，`retryTask(id, { resume: false })`
- **resume_from_checkpoint**（从检查点恢复）：从最近检查点恢复，`retryTask(id, { resume: true })`

当任务处于 `failed` 状态时，推荐用户使用"从最近进度恢复"（resume），因为这会保留已完成的工作。"重试任务"作为备选，用于 resume 失败时的兜底。

### 1.2 Dashboard Action 类型扩展

当前 `DirectorDashboardAction.type` 已包含 `retry` 类型（从 projection 层传递），客户端只需要在 `resolveDashboardAction` 中处理它。

## 2. 数据流设计

```
Server: DirectorDashboardViewBuilder
  failed mode → {
    primaryAction: retry("重试任务"),
    secondaryActions: [resume_from_checkpoint("从最近进度恢复"), open_task_center("查看执行详情")]
  }

Client: NovelAutoDirectorProgressPanel
  resolveDashboardAction(retry) → { onClick: onRetry, disabled: retryPending }
  resolveDashboardAction(resume_from_checkpoint) → { onClick: onRetryWithResume, disabled: retryPending }
  resolveDashboardAction(open_task_center) → { onClick: onOpenTaskCenter }

Client: NovelEdit.tsx
  <NovelAutoDirectorProgressPanel
    onRetry={() => retryAutoDirectorWithTaskModelMutation.mutate()}
    onRetryWithResume={() => retryAutoDirectorWithTaskModelMutation.mutate()}  // resume: true is default
    retryPending={retryAutoDirectorWithTaskModelMutation.isPending}
  />
```

## 3. 边界情况

| 场景 | 处理 |
|------|------|
| 重试中用户再次点击 | 按钮 disabled，mutation.isPending 保护 |
| 重试失败 | toast.error 提示，按钮恢复可用 |
| 重试成功 | 面板自动切换到 running 状态（query refetch） |
| task 为 null（未加载） | 面板不渲染 action 按钮 |
