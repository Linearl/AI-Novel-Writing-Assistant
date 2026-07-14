
---
reqId: 7067
title: "角色资源账本前端可视化管理 — 需求文档（冻结副本）"
status: requirements_ready
priority: P2
complexity: S2
estimatedEffort: "2天"
version: v0.2
created: 2026-07-14
updated: 2026-07-14
---

# REQ-7067: 角色资源账本前端可视化管理

## 1. 需求背景

CharacterResourceLedger（角色资源账本）是记录角色拥有/使用/失去/隐藏资源的核心系统。后端全栈已完备：

- `CharacterResourceLedgerService`：CRUD + 风险级别计算 + 阻塞状态检查
- `CharacterResourceExtractionService`：AI 自动从章节提取资源变化
- `CharacterResourceValidationService`：校验规则
- 路由 `novelCharacterResourceRoutes.ts`：完整 REST API
- Prisma 迁移 `character_resource_ledger` 表
- Shared 类型：`CharacterResourceLedgerItem`、`CharacterResourceUpdatePayload`、`CharacterResourceRiskSignal`

前端仅有嵌入在章节洞察面板中的只读展示（`ResourceRiskPanel.tsx`），4 条截断，无独立管理能力。

## 2. 需求定义

### FR-1: 资源账本管理面板

**位置**：角色详情页或独立 tab（如 `CharacterAssetWorkspace.tsx` 扩展）
**功能**：
- 列出当前小说的所有角色资源条目（按角色分组/筛选）
- 显示资源名称、类型、状态、风险级别、摘要
- 手动添加/编辑/删除资源条目
- 状态流转：标记已消耗、已丢失、已获得等

### FR-2: 风险信号可视化

**功能**：
- 在账本列表中高亮风险条目（颜色编码：低/中/高/阻塞）
- 显示阻塞状态的资源及其影响的章节

### FR-3: 与现有组件的整合

**功能**：
- 从角色详情页可直达账本管理
- 从章节洞察的 ResourceRiskPanel 可点击跳转到完整账本

## 3. 非功能需求

- 复用现有 `client/src/api/novel/characters.ts` 中的 API 客户端
- 复用 `@ai-novel/shared` 中的类型定义
- 不新增后端路由

## 4. 验收标准

- [ ] 账本列表页正确渲染所有角色的资源条目
- [ ] 支持按角色筛选
- [ ] 手动添加/编辑/删除功能正常
- [ ] 风险信号颜色编码正确
- [ ] 从 ResourceRiskPanel 可跳转到完整账本
- [ ] `pnpm typecheck` + `pnpm test:client` 通过
