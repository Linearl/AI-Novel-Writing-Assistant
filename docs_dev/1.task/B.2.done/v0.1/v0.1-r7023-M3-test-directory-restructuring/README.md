---
description: "REQ-7023 测试目录重构与覆盖率接入 —— README"
update_time: 2026-07-10
status: requirements_ready
---

# REQ-7023 测试目录重构与覆盖率接入

## 概述

server/tests/ 有 ~220 个测试文件平铺在根目录，仅字母排序，集成测试和单元测试混在一起。重构测试目录按领域分级，引入覆盖率工具（c8 或 Node 22+ 内置），评估 tsx 直接跑 TS 源的可行性，配置 CI 覆盖率门禁。

## 任务包六件套

| 文件 | 说明 |
|------|------|
| [REQ-7023-test-directory-restructuring.md](./REQ-7023-test-directory-restructuring.md) | 需求文档 |
| [design.md](./design.md) | 技术设计 |
| [tasks.md](./tasks.md) | 任务清单 |
| [decision_log.md](./decision_log.md) | 决策日志 |
| [run_result.json](./run_result.json) | 执行状态 |
| README.md | 本文件 |

## 状态

- 当前阶段：需求就绪
- 复杂度：M3（中等复杂度，较低优先级）
- 预估影响文件：50-100 个（含测试文件移动 + import 路径更新）
