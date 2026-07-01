---
description: "REQ-2030 任务拆解（复杂版）"
---

# REQ-2030 任务拆解

> 状态：⏳ 进行中（完成后改为 ✅ 全部完成）
> 模板类型：**复杂版** — 全栈跨模块任务

## 任务概述

### 1. 来源

REQ-2029 后续迭代。现有 `conflictLevel` / `revealLevel` 数据已就绪，缺图表可视化和调整入口。

### 2. 问题

用户无法直观查看全书节奏起伏，无法判断冲突高潮位置，未写章节的节奏参数没有可视化编辑入口。

### 3. 需求

- 后端聚合 API + 前端折线图 + 未写章节节奏调整
- 复用现有 `VolumeChapterPlan` / `Chapter` 字段，不改数据库

### 4. 验收标准

> 见 [REQ-2030.md](./REQ-2030.md) 第 4 节。

## 里程碑

- **M1**：后端 API + 共享类型（T1）
- **M2**：前端图表 + 调整功能（T2-T3）
- **M3**：集成验证（T4）

---

## 任务清单

| # | 任务 | 优先级 | 预估 | 依赖 | 产物 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | 后端 API — 节奏数据聚合端点 + 共享类型 | P0 | 45min | — | paceCurveHttp.ts + shared/types 更新 | ⬜ 待开始 |
| T2 | 前端图表组件 — PaceCurveChart 折线图 | P0 | 60min | T1 | PaceCurveChart.tsx + recharts 安装 | ⬜ 待开始 |
| T3 | 前端调整功能 — 未写章节节奏参数编辑 | P1 | 30min | T2 | PaceAdjustModal.tsx | ⬜ 待开始 |
| T4 | 集成验证 — 类型检查 + 前端测试 + E2E | P1 | 30min | T1-T3 | 测试通过报告 | ⬜ 待开始 |

---

## 逐项展开

### T1: 后端 API + 共享类型

**目标**: 新增 `GET /api/novels/:novelId/pace-curve` 端点，返回全书各卷各章节的节奏数据。

**改动点**:
- 新建 `server/src/modules/novel/http/paceCurveHttp.ts`：聚合 `VolumeChapterPlan` + `Chapter` 数据
- `server/src/modules/novel/http/` 路由注册：挂载新端点
- `shared/types/novel.ts`：新增 `PaceCurveChapter` / `PaceCurveVolume` / `PaceCurveData` 接口

### T2: 前端节奏曲线图表

**目标**: 用 recharts 渲染双折线图，展示 conflictLevel 和 revealLevel 全书走势。

**改动点**:
- 检查项目是否已有 recharts，如无则 `pnpm add recharts`
- 新建 `client/src/components/novel/PaceCurveChart.tsx`
- 集成到 beat sheet 页面或章节执行面板
- 使用 TanStack Query 调用 pace-curve API

### T3: 未写章节节奏参数编辑

**目标**: 点击未写章节空心点弹出滑块，调整后保存到 VolumeChapterPlan。

**改动点**:
- 新建 `client/src/components/novel/PaceAdjustModal.tsx`
- 调用已有的 `PATCH /chapter-plans/:order` 端点
- PaceCurveChart 集成点击事件和弹窗逻辑

### T4: 集成验证

**验证步骤**:
1. `pnpm typecheck` — 无新增类型错误
2. `pnpm test:client` — 前端测试通过
3. 手动 E2E：`pnpm dev` → 打开已有小说 → 查看节奏曲线 → 调整未写章节 → 刷新验证

---

## 风险与缓解

| 风险 | 影响 | 概率 | 缓解措施 |
| --- | --- | --- | --- |
| recharts 与 React 19 不兼容 | 需换图表库 | 低 | 先检查兼容性，备选 visx / nivo / 纯 SVG |
| 大量章节（100+）渲染性能差 | 图表卡顿 | 低 | 首屏只渲染当前卷，支持卷切换 |

---

## DoD

- 全书节奏曲线正确渲染
- 未写章节可点击编辑，已写章节只读
- 调整后数据持久化
- 类型检查 + 前端测试通过

---

## 依赖

- 前置：无
- 关联：REQ-2029（narrative_advisor）
- 后继：AI 节奏建议（后续迭代）

---

## 验证步骤

1. `pnpm typecheck`
2. `pnpm test:client`
3. `pnpm dev` 手动验证节奏曲线显示和编辑

---

## 执行记录

| 日期 | 任务 | 状态 |
| ---- | ---- | ---- |

---

## 当前门禁

- [x] 待激活
- [x] 待创建双副本
- [x] 待启动 M1

---

## 完成判定

所有里程碑达成、DoD 全部满足后，REQ-2030 达到"已完成"状态。
