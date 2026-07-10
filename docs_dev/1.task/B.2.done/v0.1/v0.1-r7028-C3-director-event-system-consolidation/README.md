---
description: "REQ-7028 Director 事件系统收敛——README"
update_time: 2026-07-10
status: requirements_ready
---

# REQ-7028 Director 事件系统收敛

## 概述

Director 子系统有两套并行的事件基础设施——全局 EventBus（7 种事件类型）和 Director 专用的 `DirectorEventProjectionService` + `DirectorEventProjectionHelpers.ts`（581行）。本任务明确职责分工、消除重复、收敛 takeover 文件。

## 任务包六件套

| 文件 | 说明 |
|------|------|
| [REQ-7028-director-event-system-consolidation.md](./REQ-7028-director-event-system-consolidation.md) | 需求文档 |
| [REQ-7028-director-event-system-consolidation-original.md](./REQ-7028-director-event-system-consolidation-original.md) | 冻结副本 |
| [design.md](./design.md) | 技术设计 |
| [tasks.md](./tasks.md) | 任务清单 |
| [decision_log.md](./decision_log.md) | 决策日志 |
| [run_result.json](./run_result.json) | 执行状态 |
| README.md | 本文件 |

## 状态

- 当前阶段：需求就绪
- 复杂度：C3（高复杂度系统重构）
- 预估影响文件：20-30 个
