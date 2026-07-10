---
description: "REQ-7018 路由迁移至模块目录——README"
update_time: 2026-07-10
status: requirements_ready
---

# REQ-7018 路由迁移至模块目录

## 概述

清点 `routes/` 下所有文件和 `modules/` 现有覆盖，将仍活跃的 `routes/` 文件逐模块迁移到 `modules/` 对应子目录，统一 `app.ts` 的路由导入规范（仅从 `modules/` 导入路由注册函数），并制定新路由落位规则文档。

## 任务包六件套

| 文件 | 说明 |
|------|------|
| [REQ-7018-routes-migration-to-modules.md](./REQ-7018-routes-migration-to-modules.md) | 需求文档 |
| [design.md](./design.md) | 技术设计 |
| [tasks.md](./tasks.md) | 任务清单 |
| [decision_log.md](./decision_log.md) | 决策日志 |
| [run_result.json](./run_result.json) | 执行状态 |
| README.md | 本文件 |

## 状态

- 当前阶段：需求就绪
- 复杂度：C2（中等复杂度，高优先级）
- 预估影响文件：30+ 个
