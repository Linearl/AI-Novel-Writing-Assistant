---
description: "REQ-2006 自动导演失败状态重试入口缺失 — 原始需求冻结副本"
---

# REQ-2006 自动导演失败状态重试入口缺失

> 版本：v1.0（冻结）
> 创建时间：2026-06-26T22:50:00+08:00

---

## 1. 问题描述

### 1.1 现象

自动导演任务因 Prisma 超时（`autoDirectorAutoApprovalRecord.upsert()` Operation has timed out）进入 `failed` 状态后：

- 自动导演面板（`NovelAutoDirectorProgressPanel`）只显示失败摘要和恢复建议
- 可用操作仅有"查看执行详情"（打开 TaskDrawer）和"从最近进度恢复"（也跳转到 TaskDrawer）
- **没有直接的"重试"按钮**
- TaskDrawer 中的重试按钮需要用户手动打开才能看到

### 1.2 影响

用户无法自助恢复失败的自动导演任务，被迫通过 CLI 调用 `POST /api/tasks/:kind/:id/retry` 或请求开发者协助。

### 1.3 复现路径

1. 启动自动导演执行（auto_to_execution 模式）
2. 等待任务因外部错误（如 DB 超时、LLM 限流）进入 `failed` 状态
3. 观察自动导演面板 —— 无直接重试入口

---

## 2. 根因分析

### 2.1 服务端

`DirectorDashboardViewBuilder.buildActions()` 对 `mode === "failed"` 的处理：

```typescript
if (mode === "failed") {
  return {
    primaryAction: action("open_task_center", "查看执行详情", "primary"),
    secondaryActions: [action("resume_from_checkpoint", "从最近进度恢复", "secondary")],
  };
}
```

**缺失 `retry` 类型 action**。而 projection 层的 `secondaryActions` 已经包含 retry 动作，但 `dashboardView` 没有暴露。

### 2.2 客户端

`NovelAutoDirectorProgressPanel.resolveDashboardAction()` 的 switch：

- `confirm_and_continue` → 映射到 `onConfirmAndContinue`
- `background_continue` → 映射到 `onBackgroundContinue`
- `open_task_center` → 映射到 `onOpenTaskCenter`
- `resume_from_checkpoint` / `retry` → 映射到 `onOpenTaskCenter`（仅跳转，不触发重试）

**`retry` 和 `resume_from_checkpoint` 都被映射为打开 TaskDrawer，而非触发重试操作。**

### 2.3 数据流

```
Server: DirectorDashboardViewBuilder (failed mode)
  → dashboardView: { primaryAction: open_task_center, secondaryActions: [resume_from_checkpoint] }
  → ❌ 没有 retry action

Client: NovelAutoDirectorProgressPanel
  → resolveDashboardAction(resume_from_checkpoint)
  → { onClick: onOpenTaskCenter }  // 只是打开 TaskDrawer
  → ❌ 用户需要再手动点重试
```

---

## 3. 期望行为

1. `failed` 状态的 `dashboardView` 包含 `retry` 类型的 primary action（如"重试任务"）
2. "从最近进度恢复"应触发 resume 重试（`retryTask` with `resume: true`），而非仅打开 TaskDrawer
3. 面板上同时提供重试和查看详情两个入口
