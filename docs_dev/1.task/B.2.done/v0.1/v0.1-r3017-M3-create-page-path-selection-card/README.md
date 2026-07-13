---
description: "REQ-3017 创建页面路径选择卡片"
update_time: 2026-07-13
---

# REQ-3017 创建页面路径选择卡片

## 概述

在创建小说页面顶部新增路径选择卡片，统一AI自动导演开书、素材导入、手动填写三种路径，简化用户选择流程。

## 六件套

| 文件 | 必填 | 用途 |
| --- | --- | --- |
| [README.md](README.md) | ✅ | 任务总线（本文件） |
| [REQ-3017-create-page-path-selection-card.md](REQ-3017-create-page-path-selection-card.md) | ✅ | 需求文档（工作副本） |
| [REQ-3017-create-page-path-selection-card-original.md](REQ-3017-create-page-path-selection-card-original.md) | ✅ | 原始需求冻结副本 |
| [tasks.md](tasks.md) | ✅ | 任务拆解 |
| [design.md](design.md) | 简单可省 | 方案设计 |
| [decision_log.md](decision_log.md) | 无决策可省 | 决策留痕 |
| [run_result.json](run_result.json) | ✅ | 执行快照（供 req-sync.js 同步） |

> 简单任务（≤3 文件、无架构决策）可省略 `design.md` 和 `decision_log.md`。
> 但 `README.md`、`REQ-*.md`、`tasks.md`、`run_result.json` 始终不可省略。

## 关联

- [步骤0 素材导入设计文档](../../../../../../docs/design/step0-material-import-design.md)
- [AI 自动导演 vs 手动创建对比分析](../../../../../../docs/design/ai-vs-manual-comparison.md)
- [文件导入功能实现计划](../../../../../../docs/design/step0-file-import-plan.md)
