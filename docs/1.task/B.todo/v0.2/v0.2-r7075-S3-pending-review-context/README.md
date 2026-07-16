---
reqId: 7075
title: "待审上下文注入"
status: in_progress
priority: P3
complexity: S3
estimatedEffort: "0.3天"
version: v0.2
created: 2026-07-16
updated: 2026-07-16
---

# REQ-7075: 待审上下文注入

## 概述

章节进入待审状态时，在审校 prompt 中注入前文摘要、角色状态、世界变更、主题连贯性四大上下文。前置依赖 REQ-7074（资源上下文重构），但因独立从 GenerationContextPackage 已有字段读取数据，无需等待 REQ-7074 完成。

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

- 当前阶段：in_progress
- 复杂度：S3
- 优先级：P3
- 预估工时：0.3 天
- 前置依赖：REQ-7074（资源上下文重构）— 不需等待
- 改动文件：
  - 新建：`server/src/services/novel/review/PendingReviewContextService.ts`
  - 修改：`server/src/services/novel/runtime/ChapterAcceptanceAssessmentService.ts`
