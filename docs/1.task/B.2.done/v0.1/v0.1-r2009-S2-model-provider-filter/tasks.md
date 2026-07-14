---
description: "REQ-2009 任务拆解"
---

# REQ-2009 任务拆解

> 状态：⏳ 进行中

## 任务清单

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | ModelRoutesPage：应用 isRunnableProviderConfig 过滤 | P0 | 0.5h | ⬜ 待开始 |
| T2 | ModelRoutesPage：保护已有路由引用的厂商 | P0 | 0.5h | ⬜ 待开始 |
| T3 | ModelRouteFields：增加 unavailableProviders prop | P0 | 0.5h | ⬜ 待开始 |
| T4 | ModelRouteFields：不可用厂商灰色标记 + "未配置"标签 | P0 | 0.5h | ⬜ 待开始 |
| T5 | ModelRouteFields：空状态提示 + 跳转链接 | P1 | 0.5h | ⬜ 待开始 |
| T6 | 验证：新建路由只能选可用厂商 | P1 | 0.25h | ⬜ 待开始 |
| T7 | 验证：编辑已有路由时当前厂商可见 | P1 | 0.25h | ⬜ 待开始 |

---

### T1: 应用过滤

**改动点**: `client/src/pages/settings/ModelRoutesPage.tsx` (line 113-118)
**DoD**: `providerOptions` 仅包含 `isRunnableProviderConfig` 通过的厂商

### T2: 保护已有引用

**改动点**: `client/src/pages/settings/ModelRoutesPage.tsx`
**DoD**: 编辑已有路由时，当前厂商始终出现在下拉框中（即使不可用）

### T3-T4: 下拉框 UI

**改动点**: `client/src/pages/settings/ModelRouteFields.tsx`
**DoD**: 不可用厂商显示为灰色 + "未配置"标签，disabled 状态

### T5: 空状态

**改动点**: `client/src/pages/settings/ModelRouteFields.tsx`
**DoD**: 无可用厂商时显示提示文案和跳转链接

### T6-T7: 验证

**DoD**: 新建路由只能选可用厂商；编辑已有路由时当前厂商可见
