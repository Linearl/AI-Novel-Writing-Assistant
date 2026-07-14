---
reqId: 7060
title: "Auto-Director 增强"
status: requirements_ready
priority: P1
complexity: C1
estimatedEffort: "5-6天"
version: v0.2
created: 2026-07-14
updated: 2026-07-14
---

# REQ-7060: Auto-Director 增强

## 概述

Auto-Director 全链路体验增强，涵盖 5 步创建向导、桌面通知系统、待审自动提升、散文质量检测器、冲突等级曲线、待审上下文注入、资源上下文重构 7 个子功能。上游仓库有完备参考实现，可直接借鉴。

## 任务包六件套

| 文件 | 说明 |
|------|------|
| [REQ-7060.md](./REQ-7060-auto-director-enhance.md) | 需求文档（工作副本） |
| [REQ-7060-auto-director-enhance-original.md](./REQ-7060-auto-director-enhance-original.md) | 冻结副本 |
| [design.md](./design.md) | 技术设计 |
| [tasks.md](./tasks.md) | 任务清单 |
| [decision_log.md](./decision_log.md) | 决策日志 |
| [run_result.json](./run_result.json) | 执行状态 |
| README.md | 本文件 |

## 状态

- 当前阶段：requirements_ready
- 复杂度：C1
- 优先级：P1
- 预估工时：5-6 天
- 依赖：无
- 预估影响文件：15-20 个

## 上游参考

| 上游路径 | 说明 | 行数 |
|----------|------|------|
| `client/src/pages/novels/autoDirector/` | 5 步创建向导（9 文件） | ~2000 |
| `client/src/lib/autoDirectorPauseNotifications.ts` | 桌面通知系统 | 114 |
| `server/src/services/novel/state/PendingReviewAutoPromotionService.ts` | 待审自动提升 | 594 |
| `server/src/services/novel/runtime/proseQuality/ProseQualityDetector.ts` | 散文质量检测器 | 450 |
