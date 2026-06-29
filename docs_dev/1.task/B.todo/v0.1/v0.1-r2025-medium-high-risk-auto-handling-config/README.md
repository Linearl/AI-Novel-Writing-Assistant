---
description: "自动导演高风险自动处理策略配置 - 允许用户选择高风险章节是人工审核还是自动消除"
id: REQ-2025
title: 自动导演高风险自动处理策略配置
version: 0.1
status: requirements_ready
priority: p2
complexity: medium
created: 2026-06-29
updated: 2026-06-29
tags:
  - auto-director
  - risk-control
  - quality-loop
  - user-config
related_requirements:
  - REQ-2018
  - REQ-2020
---

# REQ-2025: 自动导演高风险自动处理策略配置

## 问题背景

自动导演模式下，章节质量循环评估为高风险时，处理策略是硬编码的（修复→重写→重规划→跳过/阻断）。用户无法配置"遇到高风险时自动重写消除"的策略，且高风险修复预算与中风险共用同一套阈值。

## 目标

在高级配置中新增风险控制面板，允许配置高风险自动处理策略。

## 六件套

| 文件 | 状态 |
|------|------|
| [REQ-2025.md](REQ-2025.md) | ✅ 需求工作副本 |
| [REQ-2025-original.md](REQ-2025-original.md) | ✅ 需求冻结副本 |
| [design.md](design.md) | ✅ 设计文档 |
| [tasks.md](tasks.md) | ✅ 任务分解 |
| [decision_log.md](decision_log.md) | ✅ 决策日志 |
| [run_result.json](run_result.json) | ✅ 运行结果 |

## 状态

- `status`: requirements_ready
- `created`: 2026-06-29
- `updated`: 2026-06-29
