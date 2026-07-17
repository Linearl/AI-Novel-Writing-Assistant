# 设计文档 — REQ-2056 自动导演暂停按钮

## 1. 架构设计

复用现有 `waiting_approval` + `checkpointType` 机制，无需新增状态枚举。

```
用户点击"暂停"
  → POST /api/director/pause { taskId }
  → markTaskWaitingApproval(checkpointType: "user_paused")
  → while 循环下一轮检查到 waiting_approval → break
  → 前端轮询检测到 waiting_approval + user_paused → 显示"继续"按钮

用户点击"继续"
  → 走现有 continueTask 流程
  → cursor 从之前位置恢复 → 继续推进
```

## 2. 后端变更

### 2.1 暂停端点

新增 API 路由 `POST /api/director/pause`：

```typescript
async pauseTask(taskId: string) {
  const row = await workflowService.findTask(taskId);
  if (row.status !== "running") throw new AppError("只能暂停运行中的任务");
  await workflowService.recordCheckpoint(taskId, {
    checkpointType: "user_paused",
    checkpointSummary: "用户手动暂停",
    stage: row.currentStage,
    itemKey: row.currentItemKey,
  });
}
```

### 2.2 while 循环检查

在 `runDirectorStructuredOutlinePhase` while 循环顶端增加状态检查，检测到 `waiting_approval` 就 break。

### 2.3 followUp 新增分支

`autoDirectorFollowUpReasonResolver.ts` 新增 `user_paused` 分支：

```typescript
if (input.checkpointType === "user_paused") {
  return finalizeResolvedReason({
    reason: "user_paused",
    priority: "P2",
    availableActions: [
      mutationAction({
        code: "continue_generic",
        label: "继续执行",
        riskLevel: "low",
        requiresConfirm: false,
      }),
      navigationAction({
        code: "open_detail",
        label: "查看详情",
      }),
    ],
  });
}
```

## 3. 前端变更

### 3.1 NovelTaskDrawer

running 状态下新增"暂停"按钮，调用 pause API。

### 3.2 TaskCenterPage

同上。
