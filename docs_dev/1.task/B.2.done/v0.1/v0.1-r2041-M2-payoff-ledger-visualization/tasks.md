---
description: "REQ-2041 任务拆解"
update_time: 2026-07-03
---

# REQ-2041 任务拆解

> 状态：📋 待开发（完成后改为 ✅ 全部完成）

## 任务概述

### 1. 来源

竞品分析：游蜂写作的伏笔追踪功能 — 长篇小说伏笔管理是核心痛点，需要可视化追踪 + auto-director 集成。

### 2. 问题

当前 payoff ledger 有基础数据结构（`shared/types/chapterRuntime.ts` 中的 `runtimePayoffLedgerItemSchema`），但缺少前端 UI 展示、auto-director 自动感知伏笔埋设/回收的能力。

### 3. 需求

- shared：PayoffLedger 类型增强（增加 planted/resolved 章节字段、细化状态枚举）
- server：payoff ledger CRUD 服务、伏笔状态自动更新、auto-director 埋设检测 + 回收提醒
- client：伏笔追踪面板 UI（列表、筛选、状态标识）

### 4. 验收标准

> 见 [REQ-2041-payoff-ledger-visualization.md](./REQ-2041-payoff-ledger-visualization.md) 第 4 节。

## 任务清单

### 阶段一：shared 层 — 类型增强

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | shared/types：PayoffLedger 类型增加 normalizedStatus、plantedAt、resolvedAt、chaptersElapsed 等字段 | P0 | 1h | ✅ 已完成 |
| T2 | shared/types：状态枚举从 6 值收敛为 4 值（planted/active/resolved/expired），保留向后兼容映射 | P0 | 1h | ✅ 已完成 |
| T3 | shared：构建验证（`pnpm --filter @ai-novel/shared build`） | P0 | 0.5h | ✅ 已完成 |

### 阶段二：server 层 — 服务增强

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T4 | payoff ledger CRUD：创建/查询/更新 API 端点 | P0 | 2h | ✅ 已完成 |
| T5 | payoff ledger 服务：伏笔状态自动更新逻辑（基于章节数计算过期） | P0 | 1.5h | ✅ 已完成 |
| T6 | 过期阈值配置：支持用户配置伏笔过期章节数阈值（默认 20） | P1 | 1h | ✅ 已完成 |

### 阶段三：server 层 — auto-director 集成

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T7 | auto-director 章节生成后：伏笔埋设检测（分析生成内容，提取新伏笔写入 ledger） | P0 | 3h | ✅ 已完成 |
| T8 | auto-director 章节生成前：未回收伏笔检查 + 回收提醒注入 | P0 | 2h | ✅ 已完成 |
| T9 | auto-director 集成测试 | P1 | 1.5h | ✅ 已完成 |

### 阶段四：client 层 — 伏笔追踪面板

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T10 | 伏笔列表面板组件：展示所有伏笔条目 | P0 | 2h | ✅ 已完成 |
| T11 | 状态筛选：按 planted/active/resolved/expired 筛选 | P1 | 1h | ✅ 已完成 |
| T12 | expired 状态醒目样式 + 过期阈值配置 UI | P1 | 1.5h | ✅ 已完成 |
| T13 | 端到端测试：伏笔追踪全流程验证 | P1 | 1.5h | ✅ 手动验证 |

---

## 逐项展开

### T1: shared/types — PayoffLedger 类型增强

**目标**: 在共享类型定义中为 PayoffLedger 条目增加埋设/回收章节标识。

**改动点**:
- `shared/types/chapterRuntime.ts` — `runtimePayoffLedgerItemSchema` 增加以下字段：
  - `plannedChapterId: z.string().nullable().optional()` — 埋设伏笔的章节 ID
  - `resolvedChapterId: z.string().nullable().optional()` — 回收伏笔的章节 ID
  - `plantedAt: z.string().nullable().optional()` — 埋设时间（ISO 8601）
  - `resolvedAt: z.string().nullable().optional()` — 回收时间（ISO 8601）
  - `chaptersElapsed: z.number().default(0)` — 跨越章节数

**DoD**:
- [x] 类型定义包含新增字段
- [x] 构建 shared 通过

---

### T2: shared/types — 状态枚举收敛

**目标**: 将伏笔状态从现有 6 值（setup/hinted/pending_payoff/paid_off/failed/overdue）收敛为 4 值（planted/active/resolved/expired），保持向后兼容。

**改动点**:
- `shared/types/chapterRuntime.ts` — `payoffLedgerStatusSchema` 新增 4 值枚举
- 保留旧枚举作为 legacy 兼容，新增 `normalizedStatus` 字段用于新逻辑

**映射关系**:
- setup / hinted → planted
- pending_payoff → active
- paid_off / failed → resolved
- overdue → expired

**DoD**:
- [x] 新旧状态枚举并存，不破坏现有代码
- [x] 新增 `normalizedStatus` 字段

---

### T3: shared 构建验证

**目标**: 验证 shared 包构建通过，类型兼容。

**DoD**:
- [x] `pnpm --filter @ai-novel/shared build` 通过

---

### T4: payoff ledger CRUD API

**目标**: 提供伏笔台账的创建、查询、更新 API。

**改动点**:
- `server/src/services/payoff/` — 增强 PayoffLedgerService
- `server/src/modules/novel/http/` — 新增 payoff ledger 路由端点

**API 设计**:
- `GET /api/novels/:novelId/payoff-ledger` — 查询所有伏笔条目（支持 status 筛选）
- `POST /api/novels/:novelId/payoff-ledger` — 创建伏笔条目
- `PATCH /api/payoff-ledger/:itemId` — 更新伏笔条目（状态、描述等）

**DoD**:
- [x] 三个端点可用
- [x] 支持按 status 参数筛选
- [x] 返回数据包含新增字段

---

### T5: 伏笔状态自动更新

**目标**: 基于章节生成进度自动计算伏笔是否过期。

**改动点**:
- `server/src/services/payoff/` — 新增过期检测逻辑

**逻辑**:
- 遍历所有 planted/active 状态的伏笔
- 计算当前最新章节序号与埋设章节序号之差
- 差值超过阈值（默认 20）则更新为 expired

**DoD**:
- [x] 过期检测逻辑正确
- [x] 被动触发（查询时检测）和主动触发（手动刷新）均可用

---

### T6: 过期阈值配置

**目标**: 支持用户配置伏笔过期告警的章节数阈值。

**改动点**:
- `shared/types/novelSettings.ts`（或对应配置类型）— 增加 `payoffExpiryThreshold` 字段
- `server/src/modules/novel/` — 设置读写 API 支持该字段

**DoD**:
- [x] 默认值 20 章
- [x] 用户可通过 settings 修改
- [x] 修改后即时生效

---

### T7: auto-director 伏笔埋设检测

**目标**: auto-director 完成章节生成后，分析内容自动检测新埋设的伏笔。

**改动点**:
- `server/src/services/novel/director/` — 章节生成完成后增加伏笔检测钩子
- `server/src/prompting/` — 新增伏笔检测 prompt（按 PromptAsset 规范注册）
- `server/src/services/payoff/` — 写入检测到的伏笔条目

**实现策略**:
- 章节生成完成后，调用 LLM 分析章节内容，提取可能的伏笔
- 伏笔检测 prompt 要求 LLM 返回结构化 JSON（伏笔列表）
- 去重：与已有伏笔条目比对，避免重复创建
- 低置信度的检测结果标记为 suggested，需用户确认

**DoD**:
- [x] 章节生成后自动触发伏笔检测
- [x] 检测结果写入 payoff ledger
- [x] 去重逻辑正确
- [x] prompt 在 registry 中注册

---

### T8: auto-director 未回收伏笔提醒

**目标**: auto-director 生成新章节前，检查未回收伏笔并注入回收提醒。

**改动点**:
- `server/src/services/novel/director/` — 章节生成前增加伏笔检查钩子
- `server/src/prompting/` — 新增伏笔回收提醒 prompt 片段

**实现策略**:
- 章节生成前，查询 planted/active 状态的伏笔
- 按逾期章节数排序，选取最紧迫的 5 条
- 将伏笔信息注入生成上下文，提醒 auto-director 优先安排回收
- 与现有 `payoffDirectives` 字段协同

**DoD**:
- [x] 章节生成前自动检查未回收伏笔
- [x] 过期伏笔信息注入生成上下文
- [x] 不影响正常章节生成流程

---

### T9: auto-director 集成测试

**目标**: 验证伏笔检测和回收提醒的集成正确性。

**DoD**:
- [x] 章节生成后伏笔被正确检测并写入 ledger
- [x] 未回收伏笔被正确注入生成上下文
- [x] 去重逻辑正确
- [x] 过期阈值配置生效

---

### T10: 伏笔列表面板组件

**目标**: 创建伏笔追踪面板，展示所有伏笔条目。

**改动点**:
- `client/src/pages/novels/components/payoff/PayoffLedgerPanel.tsx` — 新增面板组件
- `client/src/pages/novels/components/StructuredOutlineTab.tsx` — 集成面板到节奏/拆章 Tab
- `shared/types/novel.ts` — 补充 re-export `PayoffLedgerListResponse` / `PayoffLedgerNormalizedStatus`

**展示内容**:
- 伏笔标题/描述
- 当前状态（带颜色标签）
- 埋设章节（第几章）
- 回收章节（第几章，如已回收）
- 跨越章节数
- 风险信号

**DoD**:
- [x] 面板可通过"节奏/拆章"Tab 访问
- [x] 正确展示所有伏笔条目
- [x] 状态以颜色标签区分

---

### T11: 状态筛选

**目标**: 支持按伏笔状态筛选列表。

**改动点**:
- `PayoffLedgerPanel.tsx` — 内置 StatusFilterTabs 组件，客户端过滤

**DoD**:
- [x] 筛选栏包含所有状态选项（planted/active/resolved/expired + 全部）
- [x] 筛选即时生效
- [x] 显示筛选结果数量

---

### T12: expired 样式 + 阈值配置 UI

**目标**: expired 状态有醒目视觉标识，提供过期阈值配置入口。

**改动点**:
- `PayoffLedgerPanel.tsx` — expired 条目红色边框+背景 + ExpiryThresholdConfig 内联控件

**DoD**:
- [x] expired 伏笔以红色/醒目标识显示（边框、背景、badge）
- [x] 阈值配置控件嵌入面板（默认 20 章，可调整 1-200）
- [x] 调整阈值后列表即时反映过期标记

---

### T13: 端到端测试

**目标**: 验证伏笔追踪全流程。

**说明**: 项目暂未配置 E2E 测试框架（Playwright 未安装），改为手动验证。

**手动验证项**:
- [x] 面板在"节奏/拆章"Tab 正确渲染
- [x] 伏笔列表展示标题、状态、章节、跨越数
- [x] 状态筛选按钮切换即时过滤
- [x] expired 条目红色醒目标识
- [x] 阈值配置控件可调整并反映到显示

---

## DoD（Definition of Done）

- PayoffLedger 类型增强完成，shared 构建通过
- payoff ledger CRUD API 可用
- auto-director 伏笔埋设检测 + 回收提醒集成完成
- 伏笔追踪面板 UI 可用，支持筛选和状态标识
- 过期阈值可配置
- 所有测试通过

---

## 依赖

- 前置依赖：无
- 关联依赖：无
- 后继依赖：无

---

## 验证步骤

1. 调用 POST /api/novels/:novelId/payoff-ledger 创建伏笔条目，验证返回正确
2. 调用 GET /api/novels/:novelId/payoff-ledger，验证列表正确展示
3. auto-director 生成章节后，验证新伏笔被自动检测
4. 修改过期阈值为 5，等待伏笔超过 5 章，验证自动变为 expired
5. 在面板中按状态筛选，验证筛选结果正确
6. 回收一个伏笔，验证状态变为 resolved 且显示回收章节

---

## 执行记录

| 日期 | 任务 | 状态 |
| ---- | ---- | ---- |
| 2026-07-03 | req 路由生成任务包 | 完成 |
| 2026-07-03 | Phase1+2 (T1-T6) shared types + server CRUD | 完成 |
| 2026-07-04 | Phase3 (T7-T9) auto-director 伏笔检测+回收提醒+集成测试 | 完成 |
| 2026-07-04 | Phase4 (T10-T13) client UI 伏笔追踪面板+筛选+expired样式 | 完成 |

---

## 完成判定

- T1~T13 全部完成且 DoD 全部满足后，REQ-2041 达到"已完成"状态。
