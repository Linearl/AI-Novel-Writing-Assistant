---
description: "REQ-3002 任务拆解"
---

# REQ-3002 任务拆解

> 状态：⏳ 进行中（完成后改为 ✅ 全部完成）

## 任务概述

### 1. 来源

用户体验 — 导演进度"缺少规划资源"警告只显示一个 Badge，缺少具体信息。

### 2. 问题

用户看到"缺少规划资源"但不知道具体缺哪些产物类型，无法判断下一步操作。

### 3. 需求

- 后端：透传 `missingArtifactTypes` 到 `DirectorRuntimeProjection`
- 前端：Badge 替换为可展开 Checklist + 中文名称映射

### 4. 验收标准

> 见 [REQ-3002.md](./REQ-3002.md) 第 4 节。

## 任务清单

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | 共享层：DirectorRuntimeProjection 新增 missingArtifactTypes 字段 | P0 | 0.25h | ⬜ 待开始 |
| T2 | 后端：DirectorEventProjectionService 透传 missingArtifactTypes | P0 | 0.5h | ⬜ 待开始 |
| T3 | 前端：新增 DIRECTOR_ARTIFACT_DISPLAY_LABELS 映射 + ArtifactMissingChecklist 组件 | P0 | 1.5h | ⬜ 待开始 |
| T4 | 前端：DirectorRuntimeProjectionCard 集成 Checklist 替换 Badge | P0 | 1h | ⬜ 待开始 |
| T5 | 前端：NovelAutoDirectorProgressPanel 中 Checklist 位置调整 | P1 | 0.5h | ⬜ 待开始 |
| T6 | 验证：类型检查 + 测试 + 手动验证 | P0 | 0.5h | ⬜ 待开始 |

---

## 逐项展开

### T1: 共享层 — DirectorRuntimeProjection 新增 missingArtifactTypes

**目标**: 在共享类型中为 `DirectorRuntimeProjection` 添加可选的 `missingArtifactTypes` 字段。

**改动点**:
- `shared/types/directorRuntime.ts` — `DirectorRuntimeProjection` 接口新增 `missingArtifactTypes?: DirectorArtifactType[]`

**DoD**:
- [ ] 类型定义正确，可选字段
- [ ] `pnpm --filter @ai-novel/shared build` 通过
- [ ] 不影响现有 projection 消费方

---

### T2: 后端 — 透传 missingArtifactTypes

**目标**: 在构建 DirectorRuntimeProjection 时，将 inventory 的 missingArtifactTypes 赋值到 projection。

**改动点**:
- `server/src/services/novel/director/runtime/DirectorEventProjectionService.ts` — projection 构建处新增赋值

**DoD**:
- [ ] `missingArtifactTypes` 在 inventory 有值时正确透传
- [ ] 空数组时不赋值（保持 undefined）
- [ ] `pnpm typecheck` 通过
- [ ] 现有 directorEventProjection 测试通过

---

### T3: 前端 — 产物映射 + Checklist 组件

**目标**: 实现产物类型的中文映射和可展开 Checklist 组件。

**改动点**:
- `client/src/components/autoDirector/DirectorRuntimeProjectionCard.tsx` — 新增常量和组件

**DoD**:
- [ ] `DIRECTOR_ARTIFACT_DISPLAY_LABELS` 覆盖全部 15 种 artifactType
- [ ] `ArtifactMissingChecklist` 组件折叠/展开交互正常
- [ ] 折叠态显示"缺少 N 项规划资源 ▸"
- [ ] 展开态显示每项的中文名 + artifactType 原文
- [ ] 配色与现有 warning Badge 一致

---

### T4: 前端 — 集成 Checklist 替换 Badge

**目标**: 在 DirectorRuntimeProjectionCard 中，当有 missingArtifactTypes 时用 Checklist 替换原 Badge。

**改动点**:
- `client/src/components/autoDirector/DirectorRuntimeProjectionCard.tsx` — 修改 visibleRiskBadges 渲染逻辑

**DoD**:
- [ ] 有 missingArtifactTypes 时，"缺少规划资源" Badge 不再单独显示
- [ ] Checklist 渲染在 Badge 区域下方
- [ ] 无 missingArtifactTypes 时行为不变
- [ ] missingArtifactTypes 字段缺失时（旧后端）退化为原有 Badge

---

### T5: 前端 — 位置调整

**目标**: 确保 Checklist 在"后台继续"按钮附近可见。

**改动点**:
- `client/src/pages/novels/components/NovelAutoDirectorProgressPanel.tsx` — 如需调整 Checklist 位置

**DoD**:
- [ ] Checklist 不遮挡 action 按钮
- [ ] 视觉上与进度面板其他元素协调

---

### T6: 验证

**目标**: 全链路验证。

**DoD**:
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm --filter @ai-novel/shared build` 通过
- [ ] `pnpm test` 通过
- [ ] 手动启动 `pnpm dev`，触发导演流程，验证 Checklist 显示

---

## DoD（Definition of Done）

- 后端透传 `missingArtifactTypes` 到 projection
- 前端"缺少规划资源"Badge 替换为可展开 Checklist
- Checklist 展开态显示所有缺失产物的中文名称
- 降级处理正确（旧后端不崩溃）
- 类型检查和测试通过

---

## 依赖

- 前置依赖：无
- 关联依赖：`DirectorEventProjectionService` 已有 `inventory.missingArtifactTypes` 计算逻辑
- 后继依赖：后续可扩展产物缺失的自动修复建议

---

## 验证步骤

1. 启动 `pnpm dev`，创建一个新小说
2. 触发自动导演，在规划阶段观察导演进度面板
3. 确认"缺少规划资源"Badge 被替换为 Checklist
4. 点击 Checklist 摘要行，确认展开/折叠交互
5. 确认展开态显示正确的中文产物名称
6. 等规划资源补齐后，确认 Checklist 消失

---

## 执行记录

| 日期 | 任务 | 状态 |
| ---- | ---- | ---- |
| 2026-06-26 | req 路由生成任务包 | 完成 |

---

## 完成判定

- T1~T6 全部完成且 DoD 全部满足后，REQ-3002 达到"已完成"状态。
