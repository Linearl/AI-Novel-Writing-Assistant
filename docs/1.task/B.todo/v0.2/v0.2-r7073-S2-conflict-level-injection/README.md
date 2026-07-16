---
reqId: 7073
title: "冲突等级约束注入"
status: in_progress
priority: P2
complexity: S2
estimatedEffort: "0.2天"
version: v0.2
created: 2026-07-16
updated: 2026-07-16
---

# REQ-7073: 冲突等级约束注入

## 概述

将 `conflictLevel`（0-100 冲突强度值）作为显式约束注入章节写作 prompt。前端 UI 由 REQ-7063 处理，本包仅做后端约束注入。

## 六件套

| 文件 | 说明 |
|------|------|
| [REQ-7073-conflict-level-injection.md](./REQ-7073-conflict-level-injection.md) | 需求文档（工作副本） |
| [REQ-7073-conflict-level-injection-original.md](./REQ-7073-conflict-level-injection-original.md) | 冻结副本 |
| [tasks.md](./tasks.md) | 任务清单 |
| [run_result.json](./run_result.json) | 执行状态 |
| README.md | 本文件 |

> 简单任务（S2 复杂度，2 文件改动），省略 design.md 和 decision_log.md。

## 状态

- 当前阶段：in_progress
- 复杂度：S2
- 优先级：P2
- 预估工时：0.2 天
- 前置依赖：无（conflictLevel 字段已存在）
- 改动文件：2 个（chapterLayeredContextHelpers.ts + chapterWriter.prompts.ts）
