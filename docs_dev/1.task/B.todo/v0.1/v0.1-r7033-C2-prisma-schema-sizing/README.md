---
description: "REQ-7033 Prisma Schema 精简——README"
update_time: 2026-07-10
status: requirements_ready
---

# REQ-7033 Prisma Schema 精简

## 概述

schema.prisma 3,326 行、131 模型、43 枚举，Novel 模型 50+ 列趋于扁平化。评估将非核心模块拆分到独立 Prisma schema 文件，审计 Novel 宽表候选 JSON 列，统一迁移历史。

## 任务包六件套

| 文件 | 说明 |
|------|------|
| [REQ-7033-prisma-schema-sizing.md](./REQ-7033-prisma-schema-sizing.md) | 需求文档 |
| [REQ-7033-prisma-schema-sizing-original.md](./REQ-7033-prisma-schema-sizing-original.md) | 冻结副本 |
| [design.md](./design.md) | 技术设计 |
| [tasks.md](./tasks.md) | 任务清单 |
| [decision_log.md](./decision_log.md) | 决策日志 |
| [run_result.json](./run_result.json) | 执行状态 |
| README.md | 本文件 |

## 状态

- 当前阶段：需求就绪
- 复杂度：C2（中等复杂度 Schema 重构）
- 预估影响文件：5-10 个（含 Prisma schema 文件）
