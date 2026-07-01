---
description: "REQ-2032 任务拆解（复杂版）"
---

# REQ-2032 任务拆解

> 状态：⏳ 进行中（完成后改为 ✅ 全部完成）
> 模板类型：**复杂版** — 全栈跨模块

## 任务概述

### 1. 来源

REQ-2029 后续迭代。REQ-2031 提供后端数据，本需求做前端可视化。

### 2. 问题

用户无法直观查看角色弧光发展轨迹和角色关系网络，缺乏可视化图表。

### 3. 需求

后端聚合 API + 前端时间线图 + 关系网络图。

### 4. 验收标准

> 见 [REQ-2032.md](./REQ-2032.md) 第 4 节。

## 里程碑

- **M1**：后端 API（T1）
- **M2**：前端可视化组件（T2-T3）
- **M3**：集成验证（T4）

---

## 任务清单

| # | 任务 | 优先级 | 预估 | 依赖 | 产物 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | 后端 API — 角色弧光 + 关系网络端点 | P0 | 40min | REQ-2031 | characterArcHttp.ts | ⬜ 待开始 |
| T2 | 前端时间线图 — CharacterArcTimeline | P0 | 60min | T1 | CharacterArcTimeline.tsx | ⬜ 待开始 |
| T3 | 前端关系网络图 — CharacterRelationNetwork | P1 | 50min | T1 | CharacterRelationNetwork.tsx | ⬜ 待开始 |
| T4 | 集成 + 验证 | P1 | 30min | T1-T3 | 类型检查 + 测试 | ⬜ 待开始 |

---

## 逐项展开

### T1: 后端 API

**目标**: 新增 `character-arcs` 和 `character-relations` 两个端点。

**改动点**:
- 新建 `server/src/modules/novel/http/characterArcHttp.ts`
- 路由注册到 novel 模块

### T2: 角色弧光时间线图

**目标**: 用 recharts 渲染某角色的弧光事件节点 + stressLevel 曲线。

**改动点**:
- 新建 `client/src/components/novel/CharacterArcTimeline.tsx`
- 使用 `ComposedChart`（Area + Scatter）
- TanStack Query 调用 `/character-arcs` API

### T3: 角色关系网络图

**目标**: 渲染角色关系网络，节点=角色，边=关系强度。

**改动点**:
- 新建 `client/src/components/novel/CharacterRelationNetwork.tsx`
- 对于 <15 角色用简单布局，>=15 用 `@visx/network`
- TanStack Query 调用 `/character-relations` API

### T4: 集成 + 验证

**改动点**:
- 集成到角色管理页面（新增标签页）
- `pnpm typecheck` + `pnpm test:client` + 手动 E2E

---

## DoD

- 弧光时间线图和关系网络图正确渲染
- hover 显示详情
- 类型检查 + 前端测试通过

---

## 依赖

- 前置：REQ-2031（后端查询工具）
- 关联：REQ-2030（节奏曲线，同属可视化体系）

---

## 验证步骤

1. `pnpm typecheck`
2. `pnpm test:client`
3. `pnpm dev` 手动验证

---

## 执行记录

| 日期 | 任务 | 状态 |
| ---- | ---- | ---- |

---

## 当前门禁

- [x] 待激活
- [x] 待启动 M1
