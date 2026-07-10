---
description: "REQ-7033 Prisma Schema 精简 — 任务拆解"
---

# REQ-7033 任务拆解

> 状态：⏳ 进行中

## 任务概述

### 1. 来源

架构诊断报告 2026-07-10 第12条发现。schema.prisma 3,326 行、131 模型、Novel 50+ 列，drama-forge/comic 模块与核心管线松耦合。

### 2. 问题

Prisma schema 臃肿，Novel 模型趋于扁平化万能表，迁移历史冗余，缺乏增长治理规则。

### 3. 需求

宽表审计 → 多 schema 评估 → 迁移精简 → 治理规则。

## 任务清单

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | Novel 模型宽表审计（A/B/C 分类） | P0 | 1h | ⬜ 待开始 |
| T2 | 非核心模型依赖分析（drama-forge、comic） | P0 | 1h | ⬜ 待开始 |
| T3 | 多 schema 技术可行性评估 | P0 | 1h | ⬜ 待开始 |
| T4 | 宽表收敛实施（B 类字段 → JSON） | P1 | 1.5h | ⬜ 待开始 |
| T5 | 迁移历史统一/精简 | P1 | 1h | ⬜ 待开始 |
| T6 | Schema 增长治理规则文档化 | P1 | 30min | ⬜ 待开始 |
| T7 | 全量验证 | P0 | 30min | ⬜ 待开始 |

---

## 逐项展开

### T1: Novel 模型宽表审计

**目标**: 对 Novel 模型 50+ 列逐一分类。

**审计维度**:
- 列名、类型、默认值
- 是否高频查询条件
- 是否可收敛为 JSON 字段
- 是否与核心叙事管线直接相关

**产物**: 宽表审计报告（A/B/C 三分类表）

---

### T2: 非核心模型依赖分析

**目标**: 分析 drama-forge 和 comic 模块的模型是否被核心管线引用。

**检查项**:
- drama-forge 相关模型被哪些 service 文件 import
- comic 相关模型被哪些 service 文件 import
- 是否有跨模块的外键关系

---

### T3: 多 schema 技术可行性评估

**目标**: 评估 Prisma 7.x 多 schema 方案的可行性和风险。

**评估维度**:
- `prismaSchemaFolder` 特性在当前 Prisma 版本的支持情况
- SQLite vs PostgreSQL 的多 schema 处理差异
- Prisma Client 生成路径变化
- CI/CD 构建流程影响

---

### T4: 宽表收敛实施

**目标**: 将审计确认的 B 类字段收敛为结构化 JSON 列。

**改动点**:
- `schema.prisma` — 移除 B 类独立列，新增 1-2 个 JSON 列
- `schema.sqlite.prisma` — 同上（TEXT 列存储 JSON 字符串）
- 数据迁移脚本（将旧列数据合并到新 JSON 列）
- 更新所有读写 B 类字段的 service 代码
- 生成新的 Prisma migration

---

### T5: 迁移历史统一/精简

**目标**: 消除冗余迁移，统一双数据库迁移目录。

**改动点**:
- 审核 54+ 迁移的依赖链
- 如可行，squash 到基线迁移
- 确认 SQLite 和 PostgreSQL 迁移目录一致性

---

### T6: Schema 增长治理规则文档化

**目标**: 在 CLAUDE.md 中添加 Schema 增长治理规则。

**改动点**:
- `CLAUDE.md` 或 `AGENTS.md` — 新增 Schema 增长规则
- 规则内容：新模块必须自包含，禁止向核心 Novel 模型追加无关列，新增列需架构评审

---

### T7: 全量验证

**目标**: typecheck + test + db:migrate 全部通过。

**改动点**:
- `pnpm typecheck`
- `pnpm test`
- `pnpm db:migrate`

---

## DoD

- Novel 模型宽表审计报告产出
- 多 schema 拆分方案已评估（含是否采用建议）
- 宽表收敛已实施（如审计确认需要）
- 迁移历史已精简（如可行）
- Schema 增长治理规则已文档化
- typecheck + test + db:migrate 通过

---

## 验证步骤

1. `pnpm typecheck` — 零错误
2. `pnpm test` — 全量通过
3. `pnpm db:migrate` — 迁移执行成功
4. `pnpm db:studio` — 确认数据完整性

---

## 完成判定

- T1~T7 全部完成且 DoD 全部满足后，REQ-7033 达到"已完成"状态。
