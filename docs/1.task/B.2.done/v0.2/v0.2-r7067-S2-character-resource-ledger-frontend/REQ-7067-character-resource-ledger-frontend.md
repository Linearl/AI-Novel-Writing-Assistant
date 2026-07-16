
---
reqId: 7067
title: "角色资源账本前端可视化管理 — 需求文档（工作副本）"
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

CharacterResourceLedger 后端全栈已完备（Service + AI 提取 + 校验 + 路由 + Prisma + Shared 类型），32 个文件引用。前端仅有嵌入的只读 `ResourceRiskPanel.tsx`，无独立管理能力。

## 2. 需求定义

### FR-1: 资源账本管理面板

**位置**：角色详情页或独立 tab
**功能**：
- 按角色分组列出所有资源条目
- 显示名称、类型、状态、风险级别、摘要
- 手动添加/编辑/删除
- 状态流转（已消耗/已丢失/已获得等）

### FR-2: 风险信号可视化

- 颜色编码（低/中/高/阻塞）
- 阻塞资源及影响章节展示

### FR-3: 与现有组件整合

- 角色详情页直达
- ResourceRiskPanel 点击跳转到完整账本

## 3. 验收标准

- [ ] 账本列表正确渲染
- [ ] 按角色筛选正常
- [ ] 增删改功能正常
- [ ] 风险信号颜色编码正确
- [ ] 从 ResourceRiskPanel 可跳转
- [ ] `pnpm typecheck` + `pnpm test:client` 通过
