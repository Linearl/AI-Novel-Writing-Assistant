---
reqId: 7066
title: "artifactSyncMode 前端选择器 — 需求文档（冻结副本）"
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

章节产出管线经过优化后，后端支持三种工件同步模式：

| 模式 | 行为 | 后端状态 |
|------|------|---------|
| `adaptive` | 智能自适应，高频变更时延迟同步 | ✅ 已实现 |
| `deferred` | 延迟异步同步，写作时不阻塞 | ✅ 已实现 |
| `strict` | 严格同步，每章写完后立即同步全部工件 | ✅ 已实现 |

Shared 类型 `artifactSyncModeSchema = z.enum(["adaptive", "deferred", "strict"])` 已在 `shared/types/novel.ts` 定义，后端所有层级已透传此字段。

但前端目前没有任何 UI 控件让用户选择或查看当前模式，用户完全无法感知此能力。

## 2. 需求定义

### FR-1: artifactSyncMode 选择器 UI

**位置**：导演配置面板或章节设置区域
**交互**：下拉选择器或 RadioGroup，三个选项带中文说明：
- `adaptive` — 智能自适应（推荐）
- `deferred` — 延迟同步（写作优先）
- `strict` — 严格同步（数据优先）

**数据流**：读取当前值 → 用户选择 → 写入 novel/autoExecution plan 的 `artifactSyncMode` 字段

## 3. 验收标准

- [ ] 选择器渲染三个模式选项
- [ ] 默认值显示为 `adaptive`
- [ ] 选择后能正确保存到后端
- [ ] 刷新页面后保持用户选择
- [ ] `pnpm typecheck` + `pnpm test:client` 通过
