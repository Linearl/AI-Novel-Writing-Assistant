---
description: "REQ-2040 资产 TXT 导入导出任务包 README"
status: pending
priority: p2
created: 2026-07-03
updated: 2026-07-03
---

# REQ-2040: 资产 TXT 导入导出

## 基本信息

| 字段 | 值 |
|------|-----|
| 编号 | REQ-2040 |
| 标题 | 资产 TXT 导入导出 |
| 类型 | 核心功能开发 (2xxx) |
| 复杂度 | M2 (medium) |
| 优先级 | p2 |
| 状态 | pending |
| 目标版本 | v0.1 |
| 创建日期 | 2026-07-03 |

## 概述

关键资产（设定/大纲/关系网/章节正文）增加独立的 TXT 导入导出功能，便于用户在不同工具间迁移和备份，防止 vendor lock-in。

## 核心功能

1. **设定 TXT 导入导出**：世界设定以 `字段名=值` 格式导出为 TXT，支持从同格式 TXT 导入回写
2. **大纲/章节 TXT 导入导出**：大纲导出为"章节标题-----章节摘要"格式，支持导入
3. **关系网 TXT 导入导出**：角色档案和关系数据导出为 `角色名|关系|状态` 纯文本格式
4. **正文 TXT 导出**：章节正文补充纯 TXT 纯文本导出（已有 markdown/json）

## 文件清单

| 文件 | 说明 |
|------|------|
| [README.md](README.md) | 本文件 |
| [REQ-2040-asset-txt-import-export-original.md](REQ-2040-asset-txt-import-export-original.md) | 需求文档（冻结副本） |
| [REQ-2040-asset-txt-import-export.md](REQ-2040-asset-txt-import-export.md) | 需求文档（工作副本） |
| [tasks.md](tasks.md) | 任务拆解 |
| [design.md](design.md) | 技术设计 |
| [decision_log.md](decision_log.md) | 决策日志 |
| [run_result.json](run_result.json) | 运行结果 |

## 来源

竞品分析-游蜂写作 → `docs_dev/3.analysis/report/2026-07-03-竞品分析-游蜂写作.md`
