---
description: "REQ-7041: 模型备用切换 — 任务包README"
update_time: "2026-07-11"
status: todo
---

# REQ-7041: 模型备用切换

## 概述

主模型失败时根据错误类型自动切换到最合适的备用模型，支持多级备用链，切换过程不中断生成。在 `invokeStructuredLlmDetailed` 的 `structuredFallbackSettings` 基础上扩展，支持按错误类型（429限流/401认证/503不可用/网络错误/格式错误）自动选择不同Provider或不同模型进行切换。

## 任务包六件套

| 文件 | 说明 |
|------|------|
| [REQ-7041.md](./REQ-7041.md) | 需求文档 |
| [design.md](./design.md) | 技术设计 |
| [tasks.md](./tasks.md) | 任务清单 |
| [decision_log.md](./decision_log.md) | 决策日志 |
| [run_result.json](./run_result.json) | 执行状态 |
| README.md | 本文件 |

## 状态

- 当前阶段：需求就绪
- 复杂度：S1
- 优先级：P1
- 预估工时：1天
- 依赖：REQ-7040
- 预估影响文件：2-3个

