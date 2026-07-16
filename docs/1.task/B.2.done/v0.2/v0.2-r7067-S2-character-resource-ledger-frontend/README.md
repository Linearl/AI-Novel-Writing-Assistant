
---
description: "REQ-7067: 角色资源账本前端可视化管理 — 任务包 README"
reqId: 7067
title: "角色资源账本前端可视化管理"
status: requirements_ready
priority: P2
complexity: S2
estimatedEffort: "2天"
version: v0.2
created: 2026-07-14
updated: 2026-07-14
---

## 概要

为角色资源账本（CharacterResourceLedger）补齐前端管理界面。后端全栈已完备，前端仅 `ResourceRiskPanel.tsx` 提供只读嵌入展示。

## 背景

后端 `CharacterResourceLedgerService`（CRUD + 风险计算）、`CharacterResourceExtractionService`（AI 提取）、`CharacterResourceValidationService`（校验规则）、路由、Prisma 迁移、PromptAsset 均已完成。32 个文件引用。

前端现状：
- `ResourceRiskPanel.tsx`：章节洞察中只读卡片展示，4 条截断
- `ChapterManagementTab.tsx`：嵌入 glimpse
- 无独立管理入口、编辑能力、状态流转操作

## 关联

- 架构方案：`docs/2.tech/architecture/character-system/character-resource-ledger-plan.md`
