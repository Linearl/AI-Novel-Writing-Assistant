---
reqId: 7070
title: "桌面通知系统"
status: in_progress
priority: P2
complexity: S2
estimatedEffort: "0.7天"
version: v0.2
created: 2026-07-16
updated: 2026-07-16
---

# REQ-7070: 桌面通知系统

## 概述

在自动导演任务状态变化时通过浏览器桌面通知提醒用户。参考上游 `autoDirectorPauseNotifications.ts`（114 行）。

## 六件套

| 文件 | 说明 |
|------|------|
| [REQ-7070-director-desktop-notification.md](./REQ-7070-director-desktop-notification.md) | 需求文档（工作副本） |
| [REQ-7070-director-desktop-notification-original.md](./REQ-7070-director-desktop-notification-original.md) | 冻结副本 |
| [tasks.md](./tasks.md) | 任务清单 |
| [run_result.json](./run_result.json) | 执行状态 |
| README.md | 本文件 |

> 简单任务（S2 复杂度，1-2 文件），省略 `design.md` 和 `decision_log.md`。

## 状态

- 当前阶段：in_progress
- 复杂度：S2
- 优先级：P2
- 预估工时：0.7 天
- 前置依赖：无（FR-1 完成后有活跃导演任务可测试）
- 主要文件：1-2 个新建，纯客户端

## 上游参考

| 上游路径 | 说明 | 行数 |
|----------|------|------|
| `temp/AI-Novel-Writing-Assistant-main/client/src/lib/autoDirectorPauseNotifications.ts` | 桌面通知管理器 | 114 |
