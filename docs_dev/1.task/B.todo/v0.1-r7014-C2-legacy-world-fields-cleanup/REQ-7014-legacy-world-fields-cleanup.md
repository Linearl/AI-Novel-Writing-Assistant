---
description: "REQ-7014 清理 Novel 旧版世界字段——需求文档"
update_time: 2026-07-08
---

# REQ-7014 清理 Novel 旧版世界字段

## 基本信息

| 字段 | 内容 |
|------|------|
| 需求编号 | REQ-7014 |
| 优先级 | P1 |
| 版本 | 当前版本 |
| 状态 | 📋 待办 |
| 来源 | 世界数据三层架构分析，发现旧版字段仍在活跃双写 |

---

## 1. 背景与问题

Novel 模型上存在三个与世界设定相关的旧版字段：

| 字段 | 类型 | 当前状态 |
|------|------|----------|
| `storyWorldSliceJson` | `TEXT?` | `persistSlice()` 仍在双写到此字段，4处 fallback 读取 |
| `storyWorldSliceOverridesJson` | `TEXT?` | 同上，3处 fallback 读取 |
| `storyWorldSliceSchemaVersion` | `Int @default(1)` | 写入常量，仅 migration bridge 读取 |

这些字段是 `NovelWorld` 表引入前的遗留设计。当前系统已有 `NovelWorld` 表作为每本小说的世界副本，但旧版字段仍被双写和 fallback 读取，造成：

1. **数据冗余**：同一份数据存两处，存在不一致风险
2. **代码复杂度**：每个读取点都要 `NovelWorld.field ?? Novel.legacyField` 双路径
3. **维护负担**：新开发者难以理解三层数据架构
4. **Schema 臃肿**：Novel 模型有3个不再需要的列

**不改会怎样**：随着 NovelWorld 功能持续迭代，双写路径会吸引更多 fallback 依赖，最终变成不可移除的"永久遗留"。

---

## 2. 目标与范围

### 2.1 目标

1. 消除 `NovelWorldSliceService.persistSlice()` 的双写模式，只写 `NovelWorld`
2. 将所有 fallback 读取路径迁移到 `NovelWorld`
3. 确保所有现有数据已迁移到 `NovelWorld`（一次性回填）
4. 从 Prisma schema 中移除三个旧版列
5. 清理 `NovelWorldInstanceService.ensureFromLegacyNovel()` 中对这三个字段的读取

### 2.2 In Scope

**后端**：
- `server/src/services/novel/storyWorldSlice/NovelWorldSliceService.ts` — 消除双写
- `server/src/services/novel/worldContext/NovelWorldInstanceService.ts` — 清理 migration bridge
- `server/src/services/novel/novelCoreCrudService.ts` — 清理 slice reset 中的旧字段写入
- `server/src/services/novel/characters/novelCoverPromptSupport.ts` — 迁移 fallback 读取
- `server/src/prisma/schema.prisma` + `schema.sqlite.prisma` — 移除列定义
- 一次性数据回填脚本

**前端**：
- `client/src/pages/novels/novelBasicInfo.shared.ts` — 清理 `worldId` 相关表单字段（如适用）

### 2.3 Out of Scope

- `Novel.worldId` 字段 — 仍在活跃使用（客户端 UI 写入 + RAG 触发），不在本次清理范围
- `NovelWorld` 表结构变更
- 世界生成提示词优化（已在另一个提交中完成）

---

## 3. 需求详情

### 3.1 消除双写

**现状**：`NovelWorldSliceService.persistSlice()` (line 231-238) 同时写入 `Novel.storyWorldSliceJson` 和 `NovelWorld.storySliceJson`。

**目标**：只写 `NovelWorld.storySliceJson`，不再写 `Novel.storyWorldSliceJson`。

### 3.2 迁移 fallback 读取

需要迁移的读取点：

| 文件 | 行号 | 当前逻辑 | 迁移目标 |
|------|------|----------|----------|
| `NovelWorldSliceService.ts` | 132-134 | `getActiveWorldSource()` fallback 到 `Novel.world` | 只读 `NovelWorld` |
| `NovelWorldSliceService.ts` | 264 | `getWorldSliceView()` fallback 到 `novel.storyWorldSliceJson` | 只读 `NovelWorld.storySliceJson` |
| `NovelWorldSliceService.ts` | 303,307,335 | `ensureStoryWorldSlice()` fallback | 只读 `NovelWorld` |
| `novelCoverPromptSupport.ts` | 118 | 直接读 `novel.storyWorldSliceJson` | 改读 `NovelWorld.storySliceJson` |

### 3.3 数据回填

确保所有有 `storyWorldSliceJson` 数据的 Novel 都有对应的 `NovelWorld` 记录。`ensureFromLegacyNovel` 已实现 on-read 迁移，但需要一次性显式回填以确保无遗漏。

### 3.4 移除 Schema 列

从 `schema.prisma` 和 `schema.sqlite.prisma` 中移除：
- `storyWorldSliceJson String?`
- `storyWorldSliceOverridesJson String?`
- `storyWorldSliceSchemaVersion Int @default(1)`

执行 `prisma migrate dev` 生成迁移。

---

## 4. 验收标准

1. `persistSlice()` 只写 `NovelWorld`，不再写 `Novel` 旧字段
2. 所有读取路径不再 fallback 到 `Novel` 旧字段
3. 现有数据完整迁移到 `NovelWorld`（无数据丢失）
4. Prisma schema 中三个列已移除
5. `pnpm typecheck` 通过
6. `pnpm test` 通过
7. 手动验证：创建小说 → 生成世界 → 世界设定正常显示 → 刷新后数据不丢失
