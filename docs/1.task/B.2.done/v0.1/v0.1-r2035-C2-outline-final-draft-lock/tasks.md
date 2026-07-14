---
description: "REQ-2035 任务拆解"
update_time: 2026-07-03
---

# REQ-2035 任务拆解

> 状态：📋 待开发（完成后改为 ✅ 全部完成）

## 任务概述

### 1. 来源

竞品分析：游蜂写作的"大纲终稿"功能 — 用户可锁定已满意的章节，防止 auto-director 覆盖。

### 2. 问题

auto-director 在 replan / 审查 / 补充关系网等阶段可能改动用户已确认的章节内容，导致用户不信任系统。

### 3. 需求

- shared：Chapter 类型增加 locked 字段
- server：Prisma schema 迁移 + auto-director 各阶段过滤 locked 章节 + 锁定状态切换 API
- client：章节列表增加锁定按钮和状态标识

### 4. 验收标准

> 见 [REQ-2035-outline-final-draft-lock.md](./REQ-2035-outline-final-draft-lock.md) 第 4 节。

## 任务清单

### 阶段一：shared 层

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | shared/types：Chapter 类型增加 locked 字段 | P0 | 0.5h | ✅ 已完成 |
| T2 | Prisma schema：Chapter 模型增加 locked Boolean 字段 | P0 | 0.5h | ✅ 已完成 |
| T3 | 数据库迁移：执行 prisma migrate dev | P0 | 0.5h | ✅ 已完成 |

### 阶段二：server 层

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T4 | API 端点：PATCH /chapters/:id/lock 切换锁定状态 | P0 | 1h | ✅ 已完成 |
| T5 | auto-director replan：过滤 locked 章节 | P0 | 1.5h | ✅ 已完成 |
| T6 | auto-director full_audit：过滤 locked 章节 | P0 | 1h | ✅ 已完成 |
| T7 | auto-director 补充关系网：过滤 locked 章节 | P1 | 1h | ✅ 已完成 |
| T8 | auto-director 补充时间线：过滤 locked 章节 | P1 | 1h | ✅ 已完成 |
| T9 | auto-director 章节标题修复：过滤 locked 章节 | P1 | 0.5h | ✅ 已完成 |

### 阶段三：client 层

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T10 | 章节列表：锁定按钮组件 | P0 | 1.5h | ✅ 已完成 |
| T11 | 章节列表：锁定状态视觉标识 | P0 | 1h | ✅ 已完成 |
| T12 | 集成测试：锁定/解锁端到端流程 | P1 | 1h | ✅ 已完成 |

---

## 逐项展开

### T1: shared/types — Chapter 类型增加 locked 字段

**目标**: 在共享类型定义中为 Chapter 增加 `locked: boolean` 字段。

**改动点**:
- `shared/types/novel.ts`（或对应 Chapter 类型定义文件）— 在 Chapter 类型中增加 `locked: boolean`

**DoD**:
- [x] Chapter 类型包含 `locked: boolean` 字段
- [x] 构建 shared 通过（`pnpm --filter @ai-novel/shared build`）

---

### T2: Prisma schema — Chapter 模型增加 locked 字段

**目标**: 在 Prisma schema 中为 Chapter 模型增加 `locked` Boolean 字段，默认值为 false。

**改动点**:
- `server/src/prisma/schema.prisma` — Chapter model 增加 `locked Boolean @default(false)`

**DoD**:
- [x] schema 文件包含 locked 字段定义
- [x] prisma generate 通过

---

### T3: 数据库迁移

**目标**: 执行 Prisma 迁移，生成并应用数据库变更。

**改动点**:
- `server/src/prisma/migrations/` — 自动生成迁移文件

**DoD**:
- [x] `pnpm db:migrate` 执行成功
- [x] 迁移文件包含 ALTER TABLE 添加 locked 列

---

### T4: API 端点 — PATCH /chapters/:id/lock

**目标**: 提供切换章节锁定状态的 API 端点。

**改动点**:
- `server/src/modules/novel/http/` — 新增或扩展现有章节路由，增加 lock 端点
- `server/src/modules/novel/novel.service.ts`（或对应章节 service）— 增加 toggleLock 逻辑

**DoD**:
- [x] PATCH /api/chapters/:id/lock 可用
- [x] 请求体支持 `{ locked: boolean }`
- [x] 返回更新后的章节数据
- [x] chapterId 不存在时返回 404

---

### T5: auto-director replan — 过滤 locked 章节

**目标**: 在 replan 阶段，跳过所有 locked 章节，不修改其标题、摘要、大纲。

**改动点**:
- `server/src/services/novel/director/` 或 `server/src/graphs/` — replan 逻辑中增加 locked 过滤

**DoD**:
- [x] replan 不修改 locked 章节的任何字段
- [x] 非 locked 章节的 replan 行为不受影响

---

### T6: auto-director full_audit — 过滤 locked 章节

**目标**: 在章节审查阶段，不对 locked 章节生成审查意见或自动修改。

**改动点**:
- `server/src/services/novel/director/` — full_audit 逻辑中增加 locked 过滤

**DoD**:
- [x] full_audit 不对 locked 章节生成审查意见
- [x] 非 locked 章节的审查行为不受影响

---

### T7: auto-director 补充关系网 — 过滤 locked 章节

**目标**: 在补充关系网阶段，不为 locked 章节新增或修改角色关系。

**改动点**:
- `server/src/services/novel/director/` — 补充关系网逻辑中增加 locked 过滤

**DoD**:
- [x] 补充关系网不涉及 locked 章节
- [x] 非 locked 章节的行为不受影响

---

### T8: auto-director 补充时间线 — 过滤 locked 章节

**目标**: 在补充时间线阶段，不为 locked 章节新增或修改时间线条目。

**改动点**:
- `server/src/services/novel/director/` — 补充时间线逻辑中增加 locked 过滤

**DoD**:
- [x] 补充时间线不涉及 locked 章节
- [x] 非 locked 章节的行为不受影响

---

### T9: auto-director 章节标题修复 — 过滤 locked 章节

**目标**: 在章节标题修复阶段，不修改 locked 章节的标题。

**改动点**:
- `server/src/services/novel/director/` — 章节标题修复逻辑中增加 locked 过滤

**DoD**:
- [x] 标题修复不修改 locked 章节
- [x] 非 locked 章节的修复行为不受影响

---

### T10: 章节列表 — 锁定按钮组件

**目标**: 在章节列表的每个章节行/卡片中增加锁定/解锁按钮。

**改动点**:
- `client/src/pages/novels/` — 章节列表组件中增加 LockButton 组件

**DoD**:
- [x] 未锁定章节显示解锁图标，点击后切换为锁定状态
- [x] 已锁定章节显示锁定图标，点击后切换为解锁状态
- [x] 调用 PATCH /api/chapters/:id/lock 更新状态
- [x] 操作后章节列表即时更新

---

### T11: 章节列表 — 锁定状态视觉标识

**目标**: 已锁定章节在列表中有明确的视觉区分。

**改动点**:
- `client/src/pages/novels/` — 章节列表组件的行/卡片样式

**DoD**:
- [x] 已锁定章节显示锁图标
- [x] 已锁定章节的视觉样式与未锁定章节有明显区分（如置灰、边框色变化等）
- [x] hover 时显示 tooltip 说明锁定状态

---

### T12: 集成测试 — 锁定/解锁端到端流程

**目标**: 验证锁定/解锁功能的端到端流程。

**改动点**:
- `server/tests/` — 新增锁定相关测试

**DoD**:
- [x] 锁定章节后，replan 不修改该章节
- [x] 解锁章节后，replan 恢复修改该章节
- [x] 所有章节锁定时，replan 正常跳过不报错

---

## DoD（Definition of Done）

- Chapter 类型和数据库包含 locked 字段
- PATCH /chapters/:id/lock 端点可用
- 章节列表有锁定按钮和状态标识
- auto-director 5 个阶段均跳过 locked 章节
- 所有测试通过

---

## 依赖

- 前置依赖：无
- 关联依赖：无
- 后继依赖：无

---

## 验证步骤

1. 在章节列表中点击锁定按钮，验证章节状态变为已锁定
2. 运行 auto-director replan，验证已锁定章节未被修改
3. 运行 auto-director full_audit，验证已锁定章节无审查意见
4. 解锁章节后再次运行 replan，验证该章节恢复被修改
5. 全量章节锁定时运行 replan，验证无报错

---

## 执行记录

| 日期 | 任务 | 状态 |
| ---- | ---- | ---- |
| 2026-07-03 | req 路由生成任务包 | 完成 |
| 2026-07-04 | T1-T9 Phase1+2 shared+server 实现 | 完成 |
| 2026-07-04 | T10-T12 Phase3 client UI 实现 | 完成 |

---

## 完成判定

- T1~T12 全部完成且 DoD 全部满足后，REQ-2035 达到"已完成"状态。
