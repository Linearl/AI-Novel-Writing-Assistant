---
description: "REQ-7024 客户端共享 Hooks 抽象与大文件拆分——README"
update_time: 2026-07-10
status: requirements_ready
---

# REQ-7024 客户端共享 Hooks 抽象与大文件拆分

## 概述

创建 `useApiMutation` / `useApiQuery` 封装重复的 mutation 模式（~20 处），拆分 `NovelWorkspaceRail.tsx`（678 行 god component）及 3 个 >800 行文件。目标：消除 inline 重复模式，每个文件 <600 行。

## 任务包六件套

| 文件 | 说明 |
|------|------|
| [REQ-7024-client-shared-hooks-abstraction.md](./REQ-7024-client-shared-hooks-abstraction.md) | 需求文档 |
| [REQ-7024-client-shared-hooks-abstraction-original.md](./REQ-7024-client-shared-hooks-abstraction-original.md) | 冻结副本 |
| [design.md](./design.md) | 技术设计 |
| [tasks.md](./tasks.md) | 任务清单 |
| [decision_log.md](./decision_log.md) | 决策日志 |
| [run_result.json](./run_result.json) | 执行状态 |
| README.md | 本文件 |

## 状态

- 当前阶段：需求就绪
- 复杂度：M2（中等复杂度重构）
- 预估影响文件：10-15 个
