---
description: "REQ-7021 Zod Schema 去重与共享化 —— 需求文档（冻结副本）"
update_time: 2026-07-10
---

# REQ-7021 Zod Schema 去重与共享化

## 基本信息

| 字段 | 内容 |
|------|------|
| 需求编号 | REQ-7021 |
| 优先级 | P1 |
| 版本 | 0.1 |
| 状态 | 📋 待办 |
| 来源 | 2026-07-10 全量架构诊断报告 第4条发现 |

---

## 1. 背景与问题

shared 层在 14 个文件中定义了 1,695 个 zod 调用，server 层在 121 个文件中另有 407 个 zod 调用。两处独立定义存在潜在重复——当 shared schema 变更时，server 侧独立定义可能遗漏更新，导致运行时类型不匹配。

典型场景：
- shared `characterResource.ts` 有 130 个 zod 调用、`canonicalState.ts` 有 177 个
- server 侧多处重复定义了角色、世界设定、章节等 schema
- 同样的业务实体在 shared 和 server 各有一份 zod 定义，来源不同步

**不改会怎样**：随着功能迭代，两份定义差异逐渐累积，最终出现 shared 类型声明与 server 运行时校验不一致的隐蔽 bug。

---

## 2. 目标与范围

### 2.1 目标

1. 审计 server 侧全部 407 处 zod 调用（121 文件），标注每处"可合并到 shared"或"纯 server 内部"
2. 将可合并的 schema 迁移到 shared 对应文件，server 侧改为 `sharedSchema.extend()` 或直接引用
3. 消除至少 50% 的重复：server 侧独立 zod 调用减少至 200 以下
4. 建立"新 schema 先去 shared"的规则

### 2.2 In Scope

- `shared/types/` 下现有 schema 文件的扩展
- `server/src/` 下 121 个含 zod 调用的文件
- 审计报告（标注每处调用的归类）
- 架构规则更新（CLAUDE.md / AGENTS.md）

### 2.3 Out of Scope

- 不修改 zod 库版本或语法
- 不迁移 shared 中已废弃但保留的 schema
- 不触及 client/ 端 zod 调用

---

## 3. 需求详情

### 3.1 审计分类标准

每个 server 侧 zod 调用分三类：

| 分类 | 判断标准 | 处理方式 |
|------|----------|----------|
| **可迁移** | 与 shared 某文件语义一致或为子集，可 `extend()` 覆盖 | 迁移到 shared，server 侧改为引用 |
| **纯内部** | 仅 server 内部使用的 DTO/配置/请求校验 | 保留在 server |
| **过度重复** | 两个以上文件定义了相同 schema | 合并到 shared 或创建 shared 新文件 |

### 3.2 迁移策略

**优先级 1**：直接重复——server 侧完整复制了 shared 已有 schema
**优先级 2**：子集重复——server 侧定义了 shared schema 的子集/变体
**优先级 3**：语义重复——不同文件定义了语义相同的不同 schema

### 3.3 shared 文件映射

| server 领域 | 对应 shared 文件 |
|------------|-----------------|
| 角色相关 | `shared/types/characterResource.ts` |
| 状态相关 | `shared/types/canonicalState.ts` |
| 世界设定 | `shared/types/world.ts` |
| 章节相关 | `shared/types/novel.ts` |
| 配置相关 | `shared/types/config.ts` |

---

## 4. 验收标准

- [ ] 审计报告完整，标注了全部 407 处 zod 调用的分类
- [ ] server 侧独立 zod 调用从 407 减少至 200 以下（减少 50%+）
- [ ] 所有迁移后的 schema 单元测试通过
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test` 通过
- [ ] CLAUDE.md / AGENTS.md 已更新"新 schema 先去 shared"规则
- [ ] 无新增 lint 告警

---

## 5. 风险与缓解

| 风险 | 缓解 |
|------|------|
| 迁移过程中 shared schema 膨胀 | 保持粒度：一个业务实体一个文件，避免单文件过大 |
| server .extend() 行为不同 | 迁移后逐条验证 extend 行为与原一致 |
| 循环依赖风险 | shared 不 import server，方向天然安全 |

---

## 6. 变更记录

| 日期 | 变更 | 说明 |
|------|------|------|
| 2026-07-10 | 创建 | 基于架构诊断报告生成需求文档 |
