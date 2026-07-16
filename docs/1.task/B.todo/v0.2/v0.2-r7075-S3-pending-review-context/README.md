---
reqId: 7075
title: "待审上下文注入"
status: requirements_ready
priority: P3
complexity: S3
estimatedEffort: "0.3天"
version: v0.2
created: 2026-07-16
---

# REQ-7075: 待审上下文注入

## 概述

章节进入待审状态时，在审校 prompt 中注入前文摘要、角色状态、世界变更、主题连贯性四大上下文。前置依赖 REQ-7074（资源上下文重构）。

## 六件套

| 文件 | 说明 |
|------|------|
| [REQ-7075-pending-review-context.md](./REQ-7075-pending-review-context.md) | 需求文档（工作副本） |
| [REQ-7075-pending-review-context-original.md](./REQ-7075-pending-review-context-original.md) | 冻结副本 |
| [tasks.md](./tasks.md) | 任务清单 |
| [run_result.json](./run_result.json) | 执行状态 |
| README.md | 本文件 |

> 简单任务（S3 复杂度，2 文件改动），省略 design.md 和 decision_log.md。

## 状态

- 当前阶段：requirements_ready
- 复杂度：S3
- 优先级：P3
- 预估工时：0.3 天
- 前置依赖：REQ-7074（资源上下文重构）
- 改动文件：2 个（审校 prompt 构建流程 + prompt 模板）
