---
description: "索引设计概览 — 按查询场景归类索引策略，不逐条枚举 285 个索引"
---

# 索引设计概览

> 基于 `server/src/prisma/schema.prisma`，共 **285** 个索引 + **47** 个唯一约束。
> 本文按**查询场景**归类索引设计意图，完整定义见 Prisma schema。

---

## 1. 索引设计原则

| 原则 | 说明 |
|------|------|
| **Novel 为中心** | 几乎所有业务表都有 `novelId` 索引，支持按小说维度查询 |
| **状态 + 时间** | 任务类表普遍使用 `(status, updatedAt)` 复合索引，支持按状态筛选后时间排序 |
| **幂等键** | 异步任务表使用 `idempotencyKey` 唯一约束，防止重复执行 |
| **租户隔离** | RAG 相关表使用 `tenantId` 前缀索引，支持多租户场景 |
| **lease 模式** | 任务调度表使用 `(leaseOwner, leaseExpiresAt)` 索引，支持分布式锁竞争查询 |

---

## 2. 按域分类的索引策略

### 2.1 小说核心域

| 表 | 索引 | 查询场景 |
|----|------|----------|
| `Novel` | `[genreId]`, `[worldId]`, `[writingMode]`, `[sourceNovelId]` | 按类型/世界/模式/续作源筛选小说 |
| `NovelBible` | `novelId(UQ)` | 按小说查圣经（1:1，隐含索引） |

### 2.2 章节域

| 表 | 索引 | 查询场景 |
|----|------|----------|
| `Chapter` | `[novelId, order]` | 按小说查章节列表（核心查询路径） |
| `ChapterSummary` | `chapterId(UQ)`, `[novelId]` | 按章节查摘要；按小说批量查摘要 |
| `ChapterRepairVersion` | `[novelId, chapterId, createdAt]` | 按章节查修复历史 |
| `ChapterArtifactSyncCheckpoint` | `[novelId, chapterId, artifactType, updatedAt]` | 按章节查特定类型的同步状态 |

### 2.3 角色域

| 表 | 索引 | 查询场景 |
|----|------|----------|
| `Character` | `[novelId]`, `[baseCharacterId]` | 按小说查角色；按库条目反查 |
| `CharacterRelation` | `[novelId, updatedAt]`, `[sourceCharacterId]`, `[targetCharacterId]` | 按小说查关系列表；按角色查出入关系 |
| `CharacterRelationStage` | `[novelId, isCurrent, updatedAt]`, `[sourceCharacterId, targetCharacterId, isCurrent]` | 查当前关系阶段 |
| `CharacterTimeline` | `[characterId, chapterOrder]` | 按角色查时间线（核心路径） |
| `CharacterVolumeAssignment` | `[novelId, volumeId, isCore]` | 按卷查角色分配（含核心角色筛选） |
| `CharacterCandidate` | `[novelId, status, updatedAt]` | 按状态查候选角色（待处理优先） |
| `CharacterResourceLedgerItem` | `[novelId, status, updatedAt]`, `[holderCharacterId, status]` | 按持有者查资源；按状态查资源 |
| `CharacterResourceEvent` | `[resourceId, createdAt]`, `[novelId, createdAt]` | 按资源查事件历史 |

### 2.4 世界观域

| 表 | 索引 | 查询场景 |
|----|------|----------|
| `NovelWorld` | `[sourceWorldId]` | 按源世界查小说实例 |
| `WorldDeepeningQA` | `[worldId, status]` | 按状态查深化问答 |
| `WorldConsistencyIssue` | `[worldId, status]`, `[worldId, severity]` | 按严重度/状态查一致性问题 |
| `WorldAsset` | `[worldId, assetType]`, `[novelWorldId, assetType]` | 按类型查世界资产 |

### 2.5 生成与任务调度域

| 表 | 索引 | 查询场景 |
|----|------|----------|
| `GenerationJob` | `[novelId, status]` | 按小说查任务状态 |
| `NovelWorkflowTask` | `[novelId, status, updatedAt]`, `[status, updatedAt]`, `[lane, updatedAt]` | 任务调度器按状态+时间轮询 |
| `AgentRun` | `[status, updatedAt]`, `[sessionId, createdAt]` | 按会话查运行历史 |
| `AgentStep` | `runId(UQ seq)`, `[runId, idempotencyKey]` | 按运行查步骤；幂等去重 |
| `AgentApproval` | `[runId, status]`, `[status, expiresAt]` | 按运行查审批；查过期审批 |

### 2.6 Director 运行时域

| 表 | 索引 | 查询场景 |
|----|------|----------|
| `DirectorRuntimeInstance` | `[novelId, status, updatedAt]`, `[status, updatedAt]` | 运行时调度器轮询 |
| `DirectorRuntimeCommand` | `[status, priority, runAfter, createdAt]`, `[leaseOwner, leaseExpiresAt]` | 优先级队列调度 + 分布式锁竞争 |
| `DirectorRuntimeExecution` | `[runtimeId, status, updatedAt]`, `[workerId, status, updatedAt]` | 按运行时/Worker 查执行记录 |
| `DirectorRuntimeCheckpoint` | `runtimeId(UQ version)` | 按版本查检查点（恢复用） |
| `DirectorRuntimeEvent` | `[runtimeId, occurredAt]`, `[novelId, occurredAt]`, `[type, occurredAt]` | 事件溯源查询 |
| `DirectorRunCommand` | `[status, runAfter, updatedAt]`, `[leaseOwner, leaseExpiresAt]` | 旧版命令调度（同上模式） |
| `DirectorArtifact` | `[novelId, artifactType, status]`, `[targetType, targetId]` | 按类型/目标查产物 |
| `DirectorLlmUsageRecord` | `[novelId, recordedAt]`, `[attributionStatus, recordedAt]` | LLM 用量统计 + 归属追踪 |

### 2.7 状态追踪域

| 表 | 索引 | 查询场景 |
|----|------|----------|
| `StoryStateSnapshot` | `novelId(UQ sourceChapterId)`, `[novelId, createdAt]` | 按小说/章节查状态快照 |
| `CharacterState` | `snapshotId(UQ characterId)`, `[characterId, createdAt]` | 按快照查角色状态；按角色查历史 |
| `RelationState` | `snapshotId(UQ source+target)`, `[sourceCharacterId, targetCharacterId]` | 按角色对查关系状态 |
| `ForeshadowState` | `[snapshotId, status]`, `[setupChapterId]`, `[payoffChapterId]` | 按状态查伏笔；按章节反查 |
| `OpenConflict` | `[novelId, status, updatedAt]`, `novelId(UQ chapterId+sourceType+conflictKey)` | 按状态查未解决冲突 |
| `PayoffLedgerItem` | `novelId(UQ ledgerKey)`, `[novelId, currentStatus, updatedAt]`, `[novelId, normalizedStatus]` | 伏笔回收状态追踪 |
| `CanonicalStateVersion` | `novelId(UQ version)`, `[novelId, createdAt]` | 规范状态版本查询 |
| `StateChangeProposal` | `[status, riskLevel, createdAt]` | 按风险等级+状态查提案 |

### 2.8 写作与风格域

| 表 | 索引 | 查询场景 |
|----|------|----------|
| `StyleProfile` | `[status, updatedAt]`, `[sourceType, sourceRefId]` | 按状态查画像；按来源反查 |
| `StyleBinding` | `[targetType, targetId, enabled]` | 按绑定目标查启用的风格（核心路径） |
| `AntiAiRule` | `[type, enabled]`, `[globalBaselineEnabled, enabled]` | 按类型/全局基线查规则 |
| `AtmosphereCard` | `[category, enabled]` | 按分类查启用的氛围卡 |
| `VocabularyRule` | `[category, enabled]`, `[weight]` | 按分类查词汇规则 |
| `PromptAddendum` | `[scope, promptId, enabled]`, `[novelId, promptId, enabled]` | 按 Prompt ID 查附加条目 |
| `PromptSlotOverride` | `scope+novelId+promptId(UQ)` | 按 Prompt ID 查槽位覆盖 |

### 2.9 知识库与 RAG 域

| 表 | 索引 | 查询场景 |
|----|------|----------|
| `KnowledgeDocument` | `[status, updatedAt]`, `[title]` | 按状态/标题查文档 |
| `KnowledgeDocumentVersion` | `[documentId, createdAt]`, `[contentHash]` | 按文档查版本；按哈希去重 |
| `KnowledgeBinding` | `[targetType, targetId]`, `[documentId]` | 按绑定目标/文档查关联 |
| `KnowledgeChunk` | `[tenantId, ownerType, ownerId]`, `[chunkHash]` | RAG 检索核心路径 |
| `RagIndexJob` | `[status, runAfter]` | 索引任务调度 |
| `BookAnalysis` | `[documentId, status]`, `[status, updatedAt]` | 按文档/状态查分析任务 |
| `BookAnalysisSection` | `[analysisId, sortOrder]` | 按分析任务查章节（保序） |

### 2.10 时间线域

| 表 | 索引 | 查询场景 |
|----|------|----------|
| `StoryTimelineEvent` | `[novelId, eventOrder]`, `[novelId, status]`, `[novelId, eventKey]` | 按小说查时间线事件 |
| `TimelineEventEdge` | `[sourceId]`, `[targetId]` | 因果图正向/反向遍历 |
| `TimelineHook` | `[novelId, status]`, `[novelId, resolveMode, blocking]` | 按状态/类型查钩子 |
| `TimelineConstraint` | `[novelId, active]` | 查活跃约束 |
| `TimelineCheckReport` | `[novelId, chapterIndex]`, `[novelId, status]` | 按章节查检查报告 |

### 2.11 异步任务通用模式

| 表 | 索引 | 查询场景 |
|----|------|----------|
| `NovelSideEffectJob` | `[status, runAfter]`, `[leaseOwner, leaseExpiresAt]` | 通用任务调度 + 分布式锁 |
| `ImageGenerationTask` | `[sceneType, status]`, `[novelId, createdAt]` | 按场景类型/状态查生成任务 |
| `StyleExtractionTask` | `[status, updatedAt]` | 按状态查提取任务 |
| `BookAnalysis` | `[status, updatedAt]` | 按状态查分析任务 |

---

## 3. 唯一约束汇总

唯一约束在 Prisma 中会自动创建唯一索引，同时保证数据完整性。

| 表 | 唯一约束 | 业务含义 |
|----|----------|----------|
| `Novel` | — | 无业务唯一键（靠 cuid 主键） |
| `Chapter` | — | 靠 `(novelId, order)` 索引保证顺序（未设 UQ，允许软删除后重建） |
| `CharacterRelation` | `(novelId, sourceCharacterId, targetCharacterId)` | 同对角色关系唯一 |
| `CharacterVolumeAssignment` | `(characterId, volumeId)` | 角色分卷唯一 |
| `CharacterLibraryLink` | `characterId` | 一个小说角色只能链接一个库条目 |
| `CharacterState` | `(snapshotId, characterId)` | 快照内角色状态唯一 |
| `RelationState` | `(snapshotId, sourceCharacterId, targetCharacterId)` | 快照内关系唯一 |
| `OpenConflict` | `(novelId, chapterId, sourceType, conflictKey)` | 同源同章冲突唯一 |
| `StoryStateSnapshot` | `(novelId, sourceChapterId)` | 每章一个快照 |
| `PayoffLedgerItem` | `(novelId, ledgerKey)` | 伏笔键唯一 |
| `CharacterResourceLedgerItem` | `(novelId, resourceKey)` | 资源键唯一 |
| `CanonicalStateVersion` | `(novelId, version)` | 规范状态版本号唯一 |
| `StorylineVersion` | `(novelId, version)` | 故事线版本号唯一 |
| `VolumePlanVersion` | `(novelId, version)` | 分卷规划版本号唯一 |
| `VolumePlan` | `(novelId, sortOrder)` | 分卷排序唯一 |
| `VolumeChapterPlan` | `(volumeId, chapterOrder)` | 卷内章节排序唯一 |
| `ChapterSummary` | `chapterId` | 每章一个摘要 |
| `NovelBible` | `novelId` | 每小说一本圣经 |
| `StoryMacroPlan` | `novelId` | 每小说一个宏观规划 |
| `BookContract` | `novelId` | 每小说一个读者契约 |
| `NovelWorld` | `novelId` | 每小说一个世界实例 |
| `DirectorRun` | `taskId` | 每任务一个导演运行 |
| `AgentStep` | `(runId, seq)` | 步骤序号唯一 |
| `CreativeHubCheckpoint` | `(threadId, checkpointId)` | 检查点 ID 唯一 |
| `DirectorRuntimeCheckpoint` | `(runtimeId, version)` | 检查点版本唯一 |
| `DirectorRuntimeExecution` | `activeLockKey` | 活跃锁唯一（分布式执行锁） |
| `KnowledgeDocumentVersion` | `(documentId, versionNumber)` | 文档版本号唯一 |
| `BookAnalysisSection` | `(analysisId, sectionKey)` | 分析章节键唯一 |
| `TimelineEventEdge` | `(sourceId, targetId, edgeType)` | 事件边唯一 |
| `TimelineHookEventLink` | `(hookId, eventId)` | 钩子-事件关联唯一 |
| `TimelineHookParticipant` | `(hookId, characterId)` | 钩子参与者唯一 |
| `TimelineAnchorEventLink` | `(anchorId, linkType, eventId)` | 锚点-事件关联唯一 |
| `TimelineConstraintLink` | `(constraintId, refType, refId)` | 约束关联唯一 |
| `TimelineEventParticipant` | `(eventId, characterId)` | 事件参与者唯一 |
| `TimelineEventFaction` | `(eventId, factionId)` | 事件势力唯一 |
| `TaskCenterArchive` | `(taskKind, taskId)` | 归档唯一 |
| `AppSetting` | `key(PK)` | 设置键主键唯一 |
| `APIKey` | `provider` | 每 Provider 一个密钥 |
| `ModelRouteConfig` | `taskType` | 每任务类型一个路由 |
| `StyleProfileAntiAiRule` | `(styleProfileId, antiAiRuleId)` | 画像-规则关联唯一 |
| `WritingTechniqueProfileBinding` | `(styleProfileId, writingTechniqueId)` | 技法-画像关联唯一 |
| `WritingTechniqueNovelBinding` | `(novelId, writingTechniqueId)` | 技法-小说关联唯一 |
| `KnowledgeBinding` | `(targetType, targetId, documentId)` | 绑定目标-文档唯一 |
| `BookAnalysisSourceCache` | 6 字段复合 UQ | 缓存参数唯一 |
| `StyleTemplate` | `key` | 模板键唯一 |
| `AntiAiRule` | `key` | 规则键唯一 |
| `AtmosphereCard` | `key` | 氛围卡键唯一 |
| `VocabularyRule` | `key` | 词汇规则键唯一 |
| `WritingTechnique` | `key` | 技法键唯一 |

---

## 4. 多态关联索引说明

项目中多态关联不使用数据库级 FK，而是通过 `targetType + targetId` 或 `ownerType + ownerId` 实现。这些字段的索引设计需要兼顾查询效率：

| 表 | 多态字段 | 索引 | 说明 |
|----|----------|------|------|
| `StyleBinding` | `targetType, targetId` | `[targetType, targetId, enabled]` | 按目标类型+ID 查绑定 |
| `KnowledgeBinding` | `targetType, targetId` | `[targetType, targetId]` | 按目标查知识文档 |
| `KnowledgeChunk` | `ownerType, ownerId` | `[tenantId, ownerType, ownerId]` | RAG 检索核心路径 |
| `DirectorArtifact` | `targetType, targetId` | `[targetType, targetId]` | 按目标查产物 |
| `DirectorRuntimeExecution` | `stepType` | (无独立索引) | 通过复合索引覆盖 |
| `TimelineConstraintLink` | `refType, refId` | 通过唯一约束覆盖 | 唯一约束 `(constraintId, refType, refId)` |
| `InformationState` | `holderType, holderRefId` | `[snapshotId, holderType]` | 按快照+持有者类型查信息 |

---

## 5. 索引维护建议

1. **定期检查 pg_stat_user_indexes**：关注 `idx_scan = 0` 的索引，评估是否为冗余索引
2. **关注高写入表的索引开销**：`CharacterResourceEvent`、`DirectorRuntimeEvent` 等事件表索引较多，写入时有额外开销
3. **复合索引字段顺序**：Prisma schema 中索引字段顺序即为 B-tree 最左前缀顺序，高频查询字段应靠前
4. **唯一约束 vs 普通索引**：唯一约束自动创建索引，无需额外添加；注意不要重复建索引
