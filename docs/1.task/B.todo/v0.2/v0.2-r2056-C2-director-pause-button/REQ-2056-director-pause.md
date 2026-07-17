---
id: REQ-2056
title: "自动导演暂停按钮"
status: in_progress
priority: C2
version: "0.2"
created: "2026-07-17"
updated: "2026-07-17"
---

# REQ-2056 — 自动导演暂停按钮

## 1. 目标

在创作工作台增加暂停按钮，用户可随时暂停 AI 自动导演推进，暂停后可恢复继续。

## 2. 范围

### 包含

- 后端 pause API（记录 waiting_approval + checkpointType: user_paused）
- while 循环顶端暂停标记检查
- autoDirectorFollowUpReasonResolver 新增 user_paused 分支
- 前端暂停/恢复按钮 UI

### 不包含

- 新增任务状态枚举
- Schema 变更
- 定时自动暂停

## 3. EARS 验收条目

| ID | 验收条件 |
|----|----------|
| AC-1 | running 状态任务显示"暂停"按钮，点击后任务变为 waiting_approval |
| AC-2 | 暂停后任务 checkpointType = user_paused，checkpointSummary 提示为用户手动暂停 |
| AC-3 | 暂停后可通过"继续"按钮恢复，从当前 cursor 位置继续 |
| AC-4 | 暂停不丢失已完成的成果 |

## 4. 风险与未决项

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 暂停信号传递到 while 循环有延迟 | 低 — while 循环每轮都会检查 |
