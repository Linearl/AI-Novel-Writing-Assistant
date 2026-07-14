---
reqId: 7054
title: "Book Analysis 拆书系统"
status: requirements_ready
priority: P2
complexity: C2
estimatedEffort: "8-10天"
version: v0.2
created: 2026-07-14
updated: 2026-07-14
---

# REQ-7054: Book Analysis 拆书系统

## 概述

AI 驱动的书籍分析工作台，导入文档后自动分段分析（情节、人物、世界观、主题、风格），支持角色提取 12 维画像 + 外貌追踪 + 肖像生成。

## 任务包六件套

| 文件 | 说明 |
|------|------|
| [REQ-7054.md](./REQ-7054.md) | 需求文档（工作副本） |
| [REQ-7054-original.md](./REQ-7054-original.md) | 需求文档（冻结副本） |
| [design.md](./design.md) | 技术设计 |
| [tasks.md](./tasks.md) | 任务清单 |
| [decision_log.md](./decision_log.md) | 决策日志 |
| README.md | 本文件 |

## 状态

- 当前阶段：需求就绪
- 复杂度：C2（最大功能）
- 优先级：P2（高复杂度，建议后期开发）
- 预估工时：8-10天
- 依赖：RAG 基础设施、角色外貌图像生成能力

## 上游参考

本功能可大量借鉴上游仓库 `AI-Novel-Writing-Assistant-main` 的实现：

| 模块 | 上游路径 | 文件数 |
|------|----------|--------|
| HTTP 路由 | `server/src/modules/bookAnalysis/http/` | 1 |
| 业务服务 | `server/src/services/bookAnalysis/` | ~32 |
| 前端页面 | `client/src/pages/bookAnalysis/` | ~28 |
| Prompt | `server/src/prompting/prompts/bookAnalysis/` | 3 |
| Prisma 模型 | `server/prisma/schema.prisma` | 7 个新模型 |
