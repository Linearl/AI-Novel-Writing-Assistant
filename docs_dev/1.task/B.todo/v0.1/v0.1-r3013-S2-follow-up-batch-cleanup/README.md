---
description: "导演跟进任务列表全选与批量清理 — REQ-3013 任务包总线"
---

# REQ-3013：导演跟进任务列表全选与批量清理

| 字段 | 值 |
|------|-----|
| 编号 | REQ-3013 |
| 优先级 | P2 |
| 复杂度 | simple |
| 状态 | requirements_ready |
| 版本 | v0.1 |
| 创建 | 2026-07-11 |
| 更新 | 2026-07-11 |
| 来源 | 用户反馈 |

## 概述

导演跟进任务列表（`/auto-director/follow-ups`）当前支持单选和批量执行动作，但缺少：
1. **全选**功能 — 当前只能逐个勾选
2. **批量清理/归档**功能 — 已完成或已取消的任务无法批量清除

## 文件结构

| 文件 | 说明 |
|------|------|
| `REQ-3013-follow-up-batch-cleanup.md` | 需求工作副本 |
| `REQ-3013-follow-up-batch-cleanup-original.md` | 需求冻结副本 |
| `tasks.md` | 任务拆解 |
| `design.md` | 设计方案 |
| `decision_log.md` | 决策日志 |
| `run_result.json` | 执行快照 |

## 关联

- 前端页面：`client/src/pages/autoDirectorFollowUps/AutoDirectorFollowUpCenterPage.tsx`
- 列表面板：`client/src/pages/autoDirectorFollowUps/components/AutoDirectorFollowUpList.tsx`
- 批量操作栏：`client/src/pages/autoDirectorFollowUps/components/AutoDirectorFollowUpBatchBar.tsx`
- 后端 API：`server/src/modules/tasks/http/tasks.ts`（已有 `batch-archive` 端点）
