---
description: "REQ-2035 大纲终稿锁定 需求文档（工作副本）"
update_time: 2026-07-03
---

# REQ-2035 大纲终稿锁定

> 状态：📋 待开发

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-2035 |
| 优先级 | P1 |
| 来源 | 竞品分析 — 游蜂写作大纲终稿功能 |
| 关联需求 | 无 |
| 分类 | 2xxx 核心功能开发 |
| 复杂度 | complex |

---

## 1. 背景与问题

auto-director 在 replan / 审查 / 补充关系网 / 补充时间线等阶段，会自动修改章节的标题、摘要、大纲等字段。当用户已经手动调整并确认某些章节的内容后，auto-director 的后续操作可能覆盖用户已确认的内容，导致用户不信任系统、不敢放手让 AI 工作。

目前没有机制让用户标记"这些章节已经满意了，不要再改了"，用户只能眼睁睁看着自己精心打磨的内容被 auto-director 回滚或覆盖。

---

## 2. 目标与范围

### 2.1 目标

1. 用户可将章节标记为"已锁定"，auto-director 的修改操作跳过已锁定章节
2. 锁定状态在 UI 上有明确的视觉标识，用户可一键切换锁定/解锁

### 2.2 In Scope

**共享层（shared）**：
- Chapter 类型定义增加 `locked` 字段

**后端（server）**：
- Prisma schema 增加 `locked` Boolean 字段，数据库迁移
- auto-director 各阶段增加 locked 过滤逻辑：
  - replan（重新规划大纲）
  - full_audit（章节审查）
  - 补充关系网（character relations enrichment）
  - 补充时间线（timeline enrichment）
  - 章节标题修复（chapter title fix）
- 提供切换锁定状态的 API 端点

**前端（client）**：
- 章节列表中的每个章节增加锁定按钮（lock/unlock icon）
- 已锁定章节显示锁定状态标识（如锁图标、置灰样式等）

### 2.3 Out of Scope

- 字段级锁定（锁定章节内的特定字段如标题、摘要等）— 粒度过细，需求不明确
- 自动锁定（如 auto-director 验证通过后自动锁定章节）
- 锁定策略配置（如"新章节默认锁定"等可配置项）

---

## 3. 需求详情

### 3.1 锁定标记

WHEN 用户在章节列表中选择一个未锁定的章节
THE SYSTEM SHALL 提供"锁定"操作（按钮/图标），将该章节标记为 locked = true。

WHEN 用户选择一个已锁定的章节
THE SYSTEM SHALL 提供"解锁"操作，将该章节标记为 locked = false。

### 3.2 锁定状态的 UI 标识

WHEN 章节处于 locked 状态
THE SYSTEM SHALL 在章节列表中显示锁定标识（锁图标），且该章节的行/卡片样式与未锁定章节有明显区分。

### 3.3 锁定范围

WHEN auto-director 执行以下操作时
THE SYSTEM SHALL 跳过所有 locked 章节：
1. replan（重新规划大纲）— 不修改已锁定章节的标题、摘要、大纲
2. full_audit（章节审查）— 不对已锁定章节生成审查意见或自动修改
3. 补充关系网（character relations enrichment）— 不为已锁定章节新增或修改角色关系
4. 补充时间线（timeline enrichment）— 不为已锁定章节新增或修改时间线条目
5. 章节标题修复（chapter title fix）— 不修改已锁定章节的标题

### 3.4 不锁定范围

锁定不影响以下只读操作：
1. 正文阅读
2. 导出
3. 查看统计
4. 搜索

---

## 4. 验收标准

- [ ] Chapter 类型有 `locked` 字段（Boolean，默认 false）
- [ ] 数据库 schema 包含 locked 字段，迁移可正常执行
- [ ] 章节列表显示锁定按钮，点击可切换锁定状态
- [ ] 已锁定章节有明确的视觉标识
- [ ] PATCH /chapters/:id/lock 端点可用，能正确切换 locked 状态
- [ ] auto-director replan 跳过 locked 章节
- [ ] auto-director full_audit 跳过 locked 章节
- [ ] auto-director 补充关系网跳过 locked 章节
- [ ] auto-director 补充时间线跳过 locked 章节
- [ ] auto-director 章节标题修复跳过 locked 章节
- [ ] 锁定/解锁操作即时生效，无需刷新

---

## 5. 风险与约束

| 风险 | 缓解 |
| ---- | ---- |
| auto-director 的 replan 可能因为太多章节被锁定而无法生成足够的新内容 | 当所有章节都被锁定时，replan 应跳过而非报错（等价于用户不想让 AI 改任何内容） |
| locked 字段需要数据库迁移，在有大量章节数据时迁移时间可能较长 | Boolean 字段添加有默认值（false），SQLite 和 PostgreSQL 均支持在线 ALTER TABLE |
| 锁定状态的并发修改（用户手动修改 + auto-director 同时操作） | 使用 optimistic locking 或简单的 last-write-wins，锁定状态变更冲突概率极低 |

---

## 6. 关联与边界

- 与 auto-director 的关系：auto-director 是锁定机制的主要消费方，在各阶段执行前查询 locked 状态并过滤
- 与章节 CRUD 的关系：锁定/解锁是章节的属性修改，复用现有章节更新 API 或新增专用端点
- 与导出模块的关系：锁定状态随导出数据一起保存（作为 Chapter 的普通字段）

---

## 7. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-07-03 | 创建 | 初始版本 — 竞品分析驱动 |
