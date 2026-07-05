---
description: "REQ-2041 伏笔埋收可视化追踪 需求文档（冻结副本）"
update_time: 2026-07-03
---

# REQ-2041 伏笔埋收可视化追踪

> 状态：📋 待开发

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-2041 |
| 优先级 | P2 |
| 来源 | 竞品分析 — 游蜂写作伏笔追踪功能 |
| 关联需求 | 无 |
| 分类 | 2xxx 核心功能开发 |
| 复杂度 | M2 (medium) |

---

## 1. 背景与问题

长篇小说创作中，伏笔管理是核心痛点之一。作者在前期章节中埋下伏笔（悬念、承诺、冲突、线索），随着章节推进，需要在适当时机回收这些伏笔。然而：

1. **伏笔烂尾风险**：长篇小说动辄数百章，作者容易忘记早期埋下的伏笔，导致伏笔过期未回收，读者体验断崖式下降。
2. **现有 payoff ledger 缺少 UI**：当前 `shared/types/chapterRuntime.ts` 中已定义 payoff ledger 的数据结构（`runtimePayoffLedgerItemSchema`，包含 `currentStatus: "setup" | "hinted" | "pending_payoff" | "paid_off" | "failed" | "overdue"` 等状态），但缺少前端可视化展示和用户交互入口。
3. **auto-director 未集成伏笔感知**：章节生成过程中，auto-director 不会主动检测新埋设的伏笔，也不会在生成后续章节时主动提醒未回收的伏笔。

---

## 2. 目标与范围

### 2.1 目标

1. 提供伏笔列表面板，按状态筛选，直观展示所有伏笔的埋设与回收状态
2. auto-director 在章节生成后自动检测新埋设的伏笔，更新 payoff ledger
3. auto-director 在生成后续章节时主动检查未回收伏笔，提醒用户或自动安排回收
4. 跨越过多章节仍未回收的伏笔触发告警

### 2.2 In Scope

**共享层（shared）**：
- PayoffLedger 类型增强：增加/细化 status、埋设章节、回收章节等字段

**后端（server）**：
- payoff ledger CRUD 服务增强：创建、更新、查询伏笔条目
- 伏笔状态自动更新：基于章节内容变化自动更新伏笔状态
- auto-director 集成：埋设检测 + 回收提醒

**前端（client）**：
- 伏笔追踪面板 UI：列表展示、按状态筛选、显示埋设/回收章节信息

### 2.3 Out of Scope

- 伏笔关系图谱可视化（如伏笔之间的依赖/关联关系图）— 后续增强
- AI 自动撰写伏笔回收内容（仅提醒，不替代创作）
- 伏笔重要性自动评分

---

## 3. 需求详情

### 3.1 伏笔状态定义

| 状态 | 含义 | 触发条件 |
| ---- | ---- | ---- |
| planted | 已埋设 | 章节生成/用户手动标记时创建伏笔 |
| active | 进行中 | 伏笔已被提及或推进，但尚未正式回收 |
| resolved | 已回收 | 伏笔在后续章节中被正式回收/兑现 |
| expired | 过期未回收 | 伏笔跨越配置阈值（默认 20 章）仍未回收 |

### 3.2 伏笔状态流转

```
planted → active → resolved
planted → expired（超过阈值未处理）
active  → expired（超过阈值未处理）
```

### 3.3 UI 可视化

WHEN 用户打开伏笔追踪面板
THE SYSTEM SHALL 展示所有伏笔条目的列表，每条显示：
- 伏笔标题/描述
- 当前状态（planted / active / resolved / expired）
- 埋设章节（第几章 / 章节标题）
- 回收章节（如有，第几章 / 章节标题）
- 跨越章节数

WHEN 用户选择按状态筛选
THE SYSTEM SHALL 按选定状态过滤伏笔列表。

WHEN 伏笔状态为 expired
THE SYSTEM SHALL 在列表中以醒目样式标记该伏笔。

### 3.4 auto-director 集成

WHEN auto-director 完成一个章节的生成
THE SYSTEM SHALL 分析章节内容，检测新埋设的伏笔并写入 payoff ledger。

WHEN auto-director 开始生成一个新章节
THE SYSTEM SHALL 查询当前所有未回收（planted / active）伏笔，如果存在超过告警阈值的伏笔，在生成上下文中注入回收提醒指令。

WHEN 用户配置过期告警阈值
THE SYSTEM SHALL 允许用户设置伏笔过期的章节数阈值（默认 20 章），超过该阈值的伏笔标记为 expired。

### 3.5 过期未回收告警

WHEN 伏笔跨越的章节数超过用户配置的阈值
THE SYSTEM SHALL：
1. 将伏笔状态更新为 expired
2. 在伏笔追踪面板中醒目提示
3. 在 auto-director 生成新章节时优先安排该伏笔回收

---

## 4. 验收标准

- [ ] shared 类型中 PayoffLedger 条目包含 status（planted/active/resolved/expired）、plantedChapterId、resolvedChapterId 字段
- [ ] payoff ledger CRUD API 可用（创建、查询、更新状态）
- [ ] auto-director 章节生成后自动检测新伏笔并写入 ledger
- [ ] auto-director 生成新章节时检查未回收伏笔并注入回收提醒
- [ ] 过期阈值可配置（默认 20 章）
- [ ] 伏笔追踪面板展示所有伏笔条目
- [ ] 面板支持按状态筛选
- [ ] expired 状态伏笔有醒目视觉标识
- [ ] 所有测试通过

---

## 5. 风险与约束

| 风险 | 缓解 |
| ---- | ---- |
| AI 检测伏笔的准确性有限，可能误判 | 提供手动修正入口；AI 检测结果作为辅助，用户可确认/调整 |
| 伏笔数量过多时面板性能问题 | 分页加载 + 按状态预筛选 |
| auto-director 生成上下文增加伏笔提醒可能导致 token 消耗增加 | 仅注入最紧迫的过期伏笔（按逾期章节数排序，最多 5 条） |
| 与现有 payoff ledger 数据结构的兼容性 | 增量增强，不破坏现有字段，旧数据自动兼容 |

---

## 6. 关联与边界

- 与现有 payoff ledger 的关系：在现有数据结构基础上增强，增加状态流转和 UI 展示
- 与 auto-director 的关系：auto-director 是伏笔检测和回收提醒的执行方
- 与章节生成的关系：伏笔检测在章节生成完成后触发，回收提醒在章节生成前注入

---

## 7. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-07-03 | 创建 | 初始版本 — 竞品分析驱动 |
