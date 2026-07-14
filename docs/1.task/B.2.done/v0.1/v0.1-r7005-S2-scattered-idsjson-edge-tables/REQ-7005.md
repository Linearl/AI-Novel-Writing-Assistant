---
description: "REQ-7005 P2 零散 IdsJson 字段迁移为边表 — 需求工作副本"
---

# REQ-7005 P2 零散 IdsJson 字段迁移为边表

> 创建日期：2026-06-30
> 最后更新：2026-06-30
> 复杂度：simple
> 分类：7xxx（技术债务和重构）
> 优先级：P2
> 父需求：REQ-7004

---

## 1. 目标

将 4 个模型中的零散 `*IdsJson` JSON 软引用字段迁移为独立 FK 边表，与 P0 时间线边表保持一致的架构模式。

## 2. 范围

### 2.1 新增边表

| 源模型 | JSON 字段 | 新边表 | 引用目标 | FK |
|--------|----------|--------|---------|-----|
| OpenConflict | affectedCharacterIdsJson | OpenConflictCharacter | Character | Cascade |
| CharacterResourceLedgerItem | knownByCharacterIdsJson | CharacterResourceKnownBy | Character | Cascade |
| StoryPlan | sourceIssueIdsJson | StoryPlanIssue | ConsistencyFact | Cascade |
| CanonicalStateVersion | acceptedProposalIdsJson | StateVersionProposal | StateChangeProposal | Cascade |

### 2.2 写入点（7 处）

| 文件 | 行 | 字段 | 操作 |
|------|---|------|------|
| OpenConflictService.ts | 259 | affectedCharacterIdsJson | update 分支 |
| OpenConflictService.ts | 276 | affectedCharacterIdsJson | create 分支 |
| PayoffLedgerSyncService.ts | 320 | affectedCharacterIdsJson | 空数组写入 |
| CharacterResourceLedgerService.ts | 181 | knownByCharacterIdsJson | stringifyJson |
| plannerPersistence.ts | 223 | sourceIssueIdsJson | update 分支 |
| plannerPersistence.ts | 247 | sourceIssueIdsJson | create 分支 |
| plannerPlanMetadata.ts | 218 | sourceIssueIdsJson | enrichStoryPlan |
| StateVersionLog.ts | 48 | acceptedProposalIdsJson | createVersion |

### 2.3 读取点（6 处）

| 文件 | 行 | 字段 | 操作 |
|------|---|------|------|
| chapterRuntimePackageBuilders.ts | 315 | affectedCharacterIdsJson | mapOpenConflictForRuntime |
| characterResourceShared.ts | 120 | knownByCharacterIdsJson | mapCharacterResourceRow |
| plannerPlanMetadata.ts | 194 | sourceIssueIdsJson | readPlanMetadataFromPlan |
| GenerationContextAssembler.ts | 160 | sourceIssueIdsJson | runtime 包组装 |
| StateVersionLog.ts | 61 | acceptedProposalIdsJson | createVersion 后解析 |

## 3. 非目标

- 不移除旧 JSON 字段（需生产数据迁移后另做）
- 不修改导出模块的 JSON 透传逻辑
- 不修改 Prompt 模板中嵌入的 JSON 字符串

## 4. EARS 验收条目

| # | 验收条件 | 验证方式 |
|---|---------|---------|
| E1 | 删除被引用实体后，边表自动级联删除 | 单元测试 |
| E2 | 边表支持按 sourceId/targetId 索引查询 | prisma validate |
| E3 | 存量数据迁移后记录数一致 | 迁移脚本校验 |
| E4 | typecheck + test + build 全绿 | CI 验证 |

## 5. 风险

| 风险 | 影响 | 缓解 |
|------|------|------|
| sourceIssueIdsJson 引用 ConsistencyFact 可能不存在 | 低 | FK 用 SetNull 而非 Cascade |
| 导出模块依赖原始 JSON 字符串 | 低 | 导出暂不改，保持 JSON 透传 |
