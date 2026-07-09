---
description: "REQ-7014 清理 Novel 旧版世界字段——README"
update_time: 2026-07-08
status: requirements_ready
---

# REQ-7014 清理 Novel 旧版世界字段

## 概述

清理 `Novel` 模型上的三个旧版世界字段：`storyWorldSliceJson`、`storyWorldSliceOverridesJson`、`storyWorldSliceSchemaVersion`。消除 `NovelWorldSliceService.persistSlice()` 的双写模式，将所有 fallback 读取路径迁移到 `NovelWorld`，最终从 Prisma schema 中移除这三个列。

## 任务包六件套

| 文件 | 说明 |
|------|------|
| [REQ-7014-legacy-world-fields-cleanup.md](./REQ-7014-legacy-world-fields-cleanup.md) | 需求文档 |
| [design.md](./design.md) | 技术设计 |
| [tasks.md](./tasks.md) | 任务清单 |
| [decision_log.md](./decision_log.md) | 决策日志 |
| [run_result.json](./run_result.json) | 执行状态 |
| README.md | 本文件 |

## 状态

- 当前阶段：需求就绪
- 复杂度：C2（中等复杂度重构）
- 预估影响文件：15-20 个
