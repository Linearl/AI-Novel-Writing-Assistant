---
description: "REQ-7022 Services 目录收敛与大文件拆分 —— README"
update_time: 2026-07-10
status: requirements_ready
---

# REQ-7022 Services 目录收敛与大文件拆分

## 概述

services/ 有 516 个文件、62 个子目录，其中 17 个文件超过 650 行接近强制重构线（最大 719 行）。对 8 个 >680 行的文件执行拆分，评估 director 子目录收敛（debug/ + commands/ -> operations/），审计 services/novel/ 下 34 个子目录的模块内聚性。

## 任务包六件套

| 文件 | 说明 |
|------|------|
| [REQ-7022-services-directory-consolidation.md](./REQ-7022-services-directory-consolidation.md) | 需求文档 |
| [design.md](./design.md) | 技术设计 |
| [tasks.md](./tasks.md) | 任务清单 |
| [decision_log.md](./decision_log.md) | 决策日志 |
| [run_result.json](./run_result.json) | 执行状态 |
| README.md | 本文件 |

## 状态

- 当前阶段：需求就绪
- 复杂度：C2（中等复杂度）
- 预估影响文件：15-25 个
