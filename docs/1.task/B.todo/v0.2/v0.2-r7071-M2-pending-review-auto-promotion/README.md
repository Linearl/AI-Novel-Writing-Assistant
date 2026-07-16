---
reqId: 7071
title: "待审自动提升"
status: in_progress
priority: P2
complexity: M2
estimatedEffort: "0.7天"
version: v0.2
created: 2026-07-16
---

# REQ-7071: 待审自动提升

## 概述

自动检测超过 14 天未处理的待审提案，通过冲突检测后自动放行。参考上游 `PendingReviewAutoPromotionService.ts`（594 行）。

## 六件套

| 文件 | 说明 |
|------|------|
| [REQ-7071-pending-review-auto-promotion.md](./REQ-7071-pending-review-auto-promotion.md) | 需求文档（工作副本） |
| [REQ-7071-pending-review-auto-promotion-original.md](./REQ-7071-pending-review-auto-promotion-original.md) | 冻结副本 |
| [tasks.md](./tasks.md) | 任务清单 |
| [design.md](./design.md) | 技术设计 |
| [decision_log.md](./decision_log.md) | 决策日志 |
| [run_result.json](./run_result.json) | 执行状态 |
| README.md | 本文件 |

## 状态

- 当前阶段：requirements_ready
- 复杂度：M2
- 优先级：P2
- 预估工时：0.7 天
- 前置依赖：无（StateChangeProposal、OpenConflict、StateCommitService 已就绪）

## 上游参考

| 上游路径 | 说明 | 行数 |
|----------|------|------|
| `temp/AI-Novel-Writing-Assistant-main/server/src/services/novel/state/PendingReviewAutoPromotionService.ts` | 待审自动提升服务 | 594 |
