---
reqId: 7074
title: "资源上下文重构"
status: requirements_ready
priority: P3
complexity: M3
estimatedEffort: "0.5天"
version: v0.2
created: 2026-07-16
---

# REQ-7074: 资源上下文重构

## 概述

将章节生成的 4 个分层上下文文件（chapterLayeredContext / blocks / helpers / shared）收敛为 2-3 个文件，统一上下文块构建接口。为 REQ-7075 提供干净的扩展点。

## 六件套

| 文件 | 说明 |
|------|------|
| [REQ-7074-resource-context-refactor.md](./REQ-7074-resource-context-refactor.md) | 需求文档（工作副本） |
| [REQ-7074-resource-context-refactor-original.md](./REQ-7074-resource-context-refactor-original.md) | 冻结副本 |
| [tasks.md](./tasks.md) | 任务清单 |
| [design.md](./design.md) | 技术设计 |
| [decision_log.md](./decision_log.md) | 决策日志 |
| [run_result.json](./run_result.json) | 执行状态 |
| README.md | 本文件 |

## 状态

- 当前阶段：requirements_ready
- 复杂度：M3
- 优先级：P3
- 预估工时：0.5 天
- 前置依赖：无（可独立执行）
- 为 REQ-7075 提供前置
