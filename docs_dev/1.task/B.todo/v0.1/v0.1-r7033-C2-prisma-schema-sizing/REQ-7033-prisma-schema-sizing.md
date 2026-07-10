---
description: "REQ-7033 Prisma Schema 精简"
---

# REQ-7033 Prisma Schema 精简

> 状态：⏳ 进行中

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-7033 |
| 优先级 | P1 |
| 来源 | 架构诊断报告 2026-07-10 第12条发现 |
| 关联需求 | 无 |

---

## 1. 背景与问题

当前 `schema.prisma` 存在以下臃肿问题：

| 指标 | 当前值 | 合理范围 |
|------|--------|----------|
| 总行数 | 3,326 | <1,500 |
| 模型数 | 131 | — |
| 枚举数 | 43 | — |
| Novel 模型列数 | 50+ | <30 |
| 迁移历史 | 54+ | — |
| 数据库目录 | 2（SQLite + PostgreSQL） | 1 逻辑源 |

具体问题：

1. **Novel 宽表**：50+ 列趋于扁平化，其中多个 JSON 列（`storyWorldSliceJson`、`storyWorldSliceOverridesJson` 等）可收敛为结构化 JSON 列
2. **非核心模块混入**：drama-forge、comic 模块与核心 novel 管线集成度低，但持续追加新模型家族到主 schema
3. **迁移冗余**：54+ 迁移，SQLite 和 PostgreSQL 双目录维护，部分迁移可 squash
4. **缺乏治理规则**：新模块可以随意往核心 Novel 模型追加列，无 Schema 增长约束

不改的后果：schema 持续膨胀至不可维护，迁移历史呈线性增长，Novel 模型最终成为"万能表"。

---

## 2. 目标与范围

### 2.1 目标

1. 评估将非核心模型（drama-forge、comic）拆分到独立 Prisma schema 文件（Prisma 多 schema 支持，`prismaSchemaFolder`）
2. Novel 表宽列审计——收敛为结构化 JSON 列（PostgreSQL `jsonb` / SQLite `text` json）的候选字段
3. 统一 SQLite + PostgreSQL 迁移历史，消除冗余
4. 制定 Schema 增长治理规则（新模块必须自包含，不追加到核心 Novel 模型）

### 2.2 In Scope

**审计与评估**：
- Novel 模型 50+ 列的宽表审计（分类：核心字段 vs 可收敛 JSON 字段 vs 可迁移字段）
- 非核心模型（drama-forge、comic）的依赖分析（是否被核心管线引用）
- 多 schema 方案的技术可行性评估（Prisma 版本兼容性、CI/CD 影响）

**实施**（评估通过后）：
- `server/src/prisma/schema.prisma` — 移除可收敛字段或拆分非核心模型
- `server/src/prisma/schema/` — 新建多 schema 目录（如采用）
- 新建 Prisma migration
- 更新 `server/src/config/` 中的数据库配置

**治理**：
- 在 CLAUDE.md 或 AGENTS.md 中添加 Schema 增长规则

### 2.3 Out of Scope

- 不修改 Prisma 版本
- 不修改数据库引擎（仍支持 SQLite + PostgreSQL 双引擎）
- 不修改已有业务逻辑的数据读写方式（仅改 schema 层）

---

## 3. 需求详情

### 3.1 Novel 宽表列审计

WHEN 审计 Novel 模型的 50+ 列，THE SYSTEM SHALL 将列按以下三类分类：

**A 类 — 核心字段**（保留在 Novel 表）：
- `id`、`title`、`createdAt`、`updatedAt` 等基础标识和时间戳
- 高频查询条件字段（`genre`、`status` 等）

**B 类 — 可收敛为 JSON 字段**：
- `storyWorldSliceJson` / `storyWorldSliceOverridesJson` — 已有独立 NovelWorld 表（REQ-7014 清理中），本次确认后可移除
- 其他低频、结构化松散的 JSON 字段

**C 类 — 可迁移到独立模型**：
- 与 Novel 核心管线松耦合的扩展字段

### 3.2 多 Schema 评估

WHEN 评估多 schema 方案，THE SYSTEM SHALL 考虑：

- drama-forge 和 comic 模块是否可完全独立于核心 novel 管线
- Prisma 7.x 的 `prismaSchemaFolder` 特性支持情况
- 拆分后 typecheck + test + build 是否受影响
- SQLite 和 PostgreSQL 的多 schema 支持差异

### 3.3 迁移历史统一

WHEN 存在 54+ 迁移，THE SYSTEM SHALL：
- 评估 squash 到基线迁移的可行性（保留可回滚的最后 N 个迁移）
- 确认 SQLite 和 PostgreSQL 迁移目录的差异并统一

### 3.4 Schema 增长治理规则

WHEN 制定治理规则，THE SYSTEM SHALL 在项目文档中明确：

> 新模块的数据模型必须自包含在独立的 Prisma schema 文件中。禁止向核心 Novel 模型追加与主叙事管线无关的列。向 Novel 模型新增列的 PR 必须附带架构评审。

---

## 4. 验收标准

- [ ] Novel 模型宽表审计报告（A/B/C 分类）
- [ ] 多 schema 拆分方案的技术评估文档（含是否采用建议）
- [ ] 如采用多 schema：非核心模型已拆分到独立 schema 文件，typecheck + test 通过
- [ ] 如不采用：宽表收敛为 JSON 列的方案已实施
- [ ] 迁移历史已统一/精简
- [ ] Schema 增长治理规则已写入项目文档
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test` 通过
- [ ] `pnpm db:migrate` 执行成功

---

## 5. 风险与约束

| 风险 | 缓解 |
| ---- | ---- |
| 多 schema 导致 Prisma Client 生成复杂化 | 评估阶段确认 `prismaSchemaFolder` 在生产环境的稳定性 |
| 宽表列收敛为 JSON 列后查询效率下降 | 仅收敛低频字段；高频查询条件字段保留为独立列 |
| 迁移 squash 后回滚能力丧失 | 保留 squash 前的迁移备份 |
| SQLite 不支持 jsonb 类型 | 使用 `TEXT` 列存储 JSON 字符串，应用层统一序列化/反序列化 |

---

## 6. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-07-10 | 创建 | 基于架构诊断报告生成需求文档 |
