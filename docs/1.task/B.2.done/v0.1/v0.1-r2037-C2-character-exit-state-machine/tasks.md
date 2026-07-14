---
description: "REQ-2037 任务拆解"
---

# REQ-2037 任务拆解

> 状态：✅ 全部完成（完成后改为 ✅ 全部完成）

## 任务概述

### 1. 来源

竞品分析（游蜂写作） — 长篇小说角色膨胀问题需要状态机管理。

### 2. 问题

中后期角色过多导致生成上下文臃肿、角色穿帮；已退场/死亡角色与活跃角色混同。

### 3. 需求

- 共享层：Character 模型增加 `exitStatus` 枚举字段
- 后端：角色上下文过滤 frozen 角色；auto-director 增加退场推断步骤；手动标记 API
- 客户端：角色面板展示状态、筛选、手动标记

### 4. 验收标准

> 见 [REQ-2037.md](./REQ-2037-character-exit-state-machine.md) 第 4 节。

## 任务清单

### 阶段一：shared — 数据模型

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | shared：新增 `CharacterExitStatus` 枚举类型 | P0 | 0.5h | ✅ 完成 |
| T2 | Prisma schema：Character 模型增加 `exitStatus` 字段 + 迁移 | P0 | 1h | ✅ 完成 |

### 阶段二：server — 后端逻辑

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T3 | server：角色上下文构建过滤 `frozen` 角色 | P0 | 1.5h | ✅ 完成 |
| T4 | server：auto-director 退场推断 prompt 注册（prompting 模块） | P0 | 2h | ✅ 完成 |
| T5 | server：auto-director 章节确认后集成退场推断步骤 | P0 | 2h | ✅ 完成 |
| T6 | server：自动冻结逻辑（连续 N 章未提及则 frozen） | P1 | 1.5h | ✅ 完成 |
| T7 | server：角色退场状态变更 API（手动标记 + 批量更新） | P0 | 1.5h | ✅ 完成 |

### 阶段三：client — 前端交互

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T8 | client：角色管理面板展示 `exitStatus` 标签 | P0 | 1.5h | ✅ 完成 |
| T9 | client：角色列表按 `exitStatus` 筛选 | P1 | 1h | ✅ 完成 |
| T10 | client：手动标记退场/死亡交互（详情页按钮 + 确认弹窗） | P0 | 1.5h | ✅ 完成 |

### 阶段四：验证

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T11 | 单元测试：退场推断逻辑 + 冻结逻辑 | P0 | 2h | ✅ 完成 |
| T12 | 集成测试：章节确认后退场推断端到端流程 | P1 | 2h | ✅ 完成 |

---

## 逐项展开

### T1: shared — CharacterExitStatus 枚举

**目标**: 定义角色退场状态枚举类型，在 shared 包中导出。

**改动点**:
- `shared/types/character.ts` — 新增 `CharacterExitStatus` 枚举（`active` / `exited` / `dead` / `frozen`）
- `shared/types/index.ts` — 导出新枚举

**DoD**:
- [x] 枚举值包含 `active`、`exited`、`dead`、`frozen`
- [x] shared 包构建通过

---

### T2: Prisma schema — exitStatus 字段

**目标**: 在 Character 模型中增加 `exitStatus` 字段并执行数据库迁移。

**改动点**:
- `server/src/prisma/schema.prisma` — Character 模型增加 `exitStatus CharacterExitStatus @default(active)`
- 新增 `CharacterExitStatus` Prisma 枚举
- `server/src/prisma/schema.sqlite.prisma` — 同步变更
- 执行 `pnpm db:migrate` 生成迁移文件

**DoD**:
- [x] SQLite 和 PostgreSQL schema 均包含新字段
- [x] 默认值为 `active`
- [x] 迁移成功执行，现有数据不受影响

---

### T3: server — 角色上下文过滤 frozen

**目标**: auto-director 构建章节生成上下文时，排除 `frozen` 状态的角色。

**改动点**:
- `server/src/prompting/prompts/novel/chapterLayeredContextBlocks.ts` — 角色上下文构建时添加 exitStatus 过滤
- `server/src/prompting/context/runtimeContextResolvers.ts` — 角色查询条件增加 `exitStatus: { not: 'frozen' }`
- 相关角色列表查询点（需排查所有角色列表查询）

**DoD**:
- [x] `frozen` 角色不出现在章节生成的角色上下文中
- [x] `active` 角色正常纳入
- [x] 不影响其他模块的角色查询（角色管理页面仍显示全部角色）

---

### T4: server — 退场推断 prompt

**目标**: 在 prompting 模块注册退场推断 prompt，输入章节正文 + 角色列表，输出结构化退场事件。

**改动点**:
- `server/src/prompting/prompts/novel/` — 新增 `characterExitInference.prompt.ts`
- `server/src/prompting/registry.ts` — 注册新 prompt asset

**DoD**:
- [x] Prompt 接收章节正文和角色列表
- [x] 输出结构化 JSON（exitEvents 数组，含 characterId、exitType、confidence、evidence）
- [x] 在 prompting registry 中注册

---

### T5: server — auto-director 集成退场推断

**目标**: auto-director 章节确认后自动调用退场推断，将高置信度结果写入数据库。

**改动点**:
- `server/src/services/novel/director/workflowStepRuntime/` — 章节确认步骤后增加退场推断调用
- `server/src/services/novel/director/runtime/novelDirectorConfirmRuntime.ts` — 确认流程中集成推断
- 新增 `server/src/services/novel/characterExit/characterExitInferenceService.ts` — 推断逻辑封装

**DoD**:
- [x] 章节确认后自动触发退场推断
- [x] 高置信度（>= 0.7）事件自动更新 Character.exitStatus
- [x] 推断结果记录到数据库（含证据和置信度）
- [x] 推断失败不阻断章节确认流程

---

### T6: server — 自动冻结逻辑

**目标**: 对 `exited` / `dead` 角色，连续 N 章未被提及时自动转为 `frozen`。

**改动点**:
- `server/src/services/novel/characterExit/characterExitInferenceService.ts` — 冻结检查逻辑
- 在 auto-director 执行流程中（或章节确认后）调用冻结检查

**DoD**:
- [x] 检查 `exited` / `dead` 角色在最近 N 章正文中是否被提及
- [x] 未提及则自动更新为 `frozen`
- [x] N 值可配置（默认 5）

---

### T7: server — 角色退场状态变更 API

**目标**: 提供手动标记角色退场/死亡的 API 端点。

**改动点**:
- `server/src/routes/characters.ts`（或对应模块 http 入口） — 新增 PATCH 端点
- `server/src/services/novel/` — 退场状态变更 service 方法

**API 设计**:

```
PATCH /api/novels/:novelId/characters/:characterId/exit-status
Body: { "exitStatus": "exited" | "dead" }
```

**DoD**:
- [x] 仅允许将 `active` 角色标记为 `exited` 或 `dead`
- [x] 不允许手动设置 `frozen`（`frozen` 仅由系统自动判定）
- [x] 返回更新后的角色信息
- [x] 输入校验（exitStatus 仅接受 exited/dead）

---

### T8: client — 角色状态标签展示

**目标**: 角色管理面板中每个角色展示对应的退场状态标签。

**改动点**:
- 角色列表/卡片组件 — 增加状态标签渲染
- 标签样式：`活跃`（绿色）/ `已退场`（灰色）/ `已死亡`（红色）/ `已冻结`（蓝色）

**DoD**:
- [x] 四种状态均有对应标签和颜色
- [x] 标签清晰可辨，不干扰角色基本信息阅读

---

### T9: client — 角色列表筛选

**目标**: 角色列表支持按 `exitStatus` 筛选。

**改动点**:
- 角色列表页 — 顶部增加筛选器（下拉或 Tab 切换）
- 筛选选项：全部 / 活跃 / 已退场 / 已死亡 / 已冻结

**DoD**:
- [x] 默认筛选为"活跃"（最常用视图）
- [x] 切换筛选后列表实时更新
- [x] 筛选器显示各状态角色数量

---

### T10: client — 手动标记交互

**目标**: 在角色详情页提供手动标记退场/死亡的入口。

**改动点**:
- 角色详情页 — 增加"标记退场"和"标记死亡"按钮（仅 `active` 角色显示）
- 确认弹窗组件 — 说明影响（不再参与后续生成上下文）
- 调用 PATCH API 更新状态

**DoD**:
- [x] 仅 `active` 角色显示标记按钮
- [x] 点击后弹出确认对话框
- [x] 确认后调用 API，成功后 UI 实时更新
- [x] `frozen` 状态下不显示任何标记按钮

---

### T11: 单元测试

**目标**: 验证退场推断和冻结逻辑的正确性。

**改动点**:
- `server/tests/characterExit/` — 新建测试目录
- `characterExitInferenceService.test.ts` — 推断逻辑测试
- `characterExitFreeze.test.ts` — 冻结逻辑测试

**DoD**:
- [x] 测试退场推断 LLM 输出解析
- [x] 测试置信度阈值过滤
- [x] 测试冻结条件（连续 N 章未提及）
- [x] 测试状态转换合法性（不可逆约束）

---

### T12: 集成测试

**目标**: 端到端验证章节确认后退场推断流程。

**改动点**:
- `server/tests/characterExit/characterExitInference.integration.test.ts`

**DoD**:
- [x] 模拟章节确认 → 自动触发推断 → 数据库更新
- [x] 验证 frozen 角色不出现在下一章上下文

---

## DoD（Definition of Done）

- Character 模型包含 `exitStatus` 字段，四态完整
- frozen 角色不参与正文生成上下文
- auto-director 章节确认后自动推断退场/死亡
- 连续 N 章未提及的角色自动冻结
- 客户端角色面板展示状态标签、支持筛选和手动标记
- 所有任务测试通过

---

## 依赖

- 前置依赖：无（Character 模型已稳定，auto-director 流程已建立）
- 关联依赖：无
- 后继依赖：无

---

## 验证步骤

1. `pnpm typecheck` — 全项目类型检查通过
2. `pnpm test` — server 单元测试通过
3. `pnpm test:client` — client 测试通过
4. 手动验证：创建小说 → 生成若干章节 → 观察角色退场自动推断
5. 手动验证：角色面板筛选和手动标记退场/死亡
6. 手动验证：frozen 角色不出现在新章节生成上下文

---

## 执行记录

| 日期 | 任务 | 状态 |
| ---- | ---- | ---- |
| 2026-07-03 | req 路由生成任务包 | 完成 |
| 2026-07-04 | T1-T12 全部实现 | 完成 |

---

## 完成判定

- T1~T12 全部完成且 DoD 全部满足后，REQ-2037 达到"已完成"状态。
