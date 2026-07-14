---
description: "REQ-7021 Zod Schema 去重与共享化 —— README"
update_time: 2026-07-10
status: pass
---

# REQ-7021 Zod Schema 去重与共享化

## 概述

审计 server 层 121 个文件中的 407 个 zod 调用，识别与 shared 层重复的 schema 定义，将可合并的迁移到 shared，消除至少 50% 的重复（server 侧独立 zod 减少至 200 以下）。建立"新 schema 先去 shared"规则，防止未来再次分化。

## 任务包六件套

| 文件 | 说明 |
|------|------|
| [REQ-7021-zod-schema-deduplication.md](./REQ-7021-zod-schema-deduplication.md) | 需求文档 |
| [design.md](./design.md) | 技术设计 |
| [tasks.md](./tasks.md) | 任务清单 |
| [decision_log.md](./decision_log.md) | 决策日志 |
| [run_result.json](./run_result.json) | 执行状态 |
| README.md | 本文件 |

## 状态

- 当前阶段：需求就绪
- 复杂度：M2（中等复杂度，高优先级）
- 预估影响文件：30-50 个
