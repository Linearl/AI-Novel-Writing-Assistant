---
reqId: 7066
title: "artifactSyncMode 前端选择器 — 需求文档（工作副本）"
status: requirements_ready
priority: P2
complexity: S2
estimatedEffort: "1天"
version: v0.2
created: 2026-07-14
updated: 2026-07-14
---

# REQ-7066: artifactSyncMode 前端选择器

## 1. 需求背景

章节产出管线优化后，后端支持三种工件同步模式：`adaptive`（智能自适应）、`deferred`（延迟同步）、`strict`（严格同步）。Shared 类型 `artifactSyncModeSchema` 已在 `shared/types/novel.ts` 定义，后端全链路透传。

前端仅在 `client/src/api/novel/production.ts` 导入类型，无 UI 控件供用户选择。

## 2. 需求定义

### FR-1: artifactSyncMode 选择器

**位置**：导演配置面板或章节设置（具体 UI 位置由实现确定）
**交互**：下拉/RadioGroup，三个选项：
- `adaptive` — 智能自适应（推荐）
- `deferred` — 延迟同步（写作优先）
- `strict` — 严格同步（数据优先）

**数据流**：读 → 选 → 写 `artifactSyncMode` 字段

## 3. 验收标准

- [ ] 三个模式选项正确渲染
- [ ] 默认值 `adaptive`
- [ ] 选择保存 + 刷新保持
- [ ] `pnpm typecheck` + `pnpm test:client` 通过
