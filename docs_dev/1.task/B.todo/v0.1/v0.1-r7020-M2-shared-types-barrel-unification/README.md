---
description: "REQ-7020 共享类型 Barrel 统一导出——README"
update_time: 2026-07-10
status: pass
---

# REQ-7020 共享类型 Barrel 统一导出

## 概述

`shared/index.ts` 仅导出 32 个类型模块，`shared/types/index.ts` 导出 55 个。23 个类型模块仅在内层 barrel 可访问，使用者被迫用 `@ai-novel/shared/types/creativeHub` 深层导入。本任务统一两个 barrel 文件，拆分超长文件 `chapterRuntime.ts` (1,044行)，审计全项目 import 语句，为 shared 包添加基础 zod schema 验证测试。

## 任务包六件套

| 文件 | 说明 |
|------|------|
| [REQ-7020-shared-types-barrel-unification.md](./REQ-7020-shared-types-barrel-unification.md) | 需求文档 |
| [design.md](./design.md) | 技术设计 |
| [tasks.md](./tasks.md) | 任务清单 |
| [decision_log.md](./decision_log.md) | 决策日志 |
| [run_result.json](./run_result.json) | 执行状态 |
| README.md | 本文件 |

## 状态

- 当前阶段：需求就绪
- 复杂度：M2（中等复杂度，最高优先级 P0）
- 预估影响文件：约 500 个 import 语句 + shared 包内文件
