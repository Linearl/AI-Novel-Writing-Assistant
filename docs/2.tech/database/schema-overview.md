---
description: "数据库 Schema 模型总览 — 132 个 Prisma 模型按域分组，每个模型简述与关键字段"
---

# 数据库 Schema 模型总览

> 基于 `server/src/prisma/schema.prisma`，PostgreSQL（生产）/ SQLite（开发）。
> 共 **132** 个模型，**44** 个 enum，**285** 个索引，**47** 个唯一约束。

---

## 1. 核心小说域（Novel Core）

小说是系统的顶级实体，所有创作数据围绕 Novel 展开。

| 模型 | 简述 | 关键字段 |
|------|------|----------|
| `Novel` | 小说主表，所有数据的根节点 | title, status, projectMode, writingMode, genreId, worldId |
| `NovelGenre` | 小说类型（支持层级） | name, parentId → NovelGenre（自关联树） |
| `NovelStoryMode` | 故事模式（主线/副线） | name, profileJson, parentId（自关联树） |
| `NovelBible` | 小说圣经（核心设定） | novelId(UQ), coreSetting, mainPromise, characterArcs |
| `NovelSnapshot` | 小说状态快照 | novelId, snapshotData, triggerType |
| `CreativeDecision` | 创作决策记录 | novelId, category, content, importance |
| `BookContract` | 读者契约（核心卖点承诺） | novelId(UQ), readingPromise, coreSellingPoint |
| `StoryMacroPlan` | 宏观故事规划 | novelId(UQ), expansionJson, decompositionJson |

---

## 2. 章节域（Chapter）

章节是小说的线性内容单元，承载生成、审核、修复全流程。

| 模型 | 简述 | 关键字段 |
|------|------|----------|
| `Chapter` | 章节主表 | novelId, order, title, content, generationState, chapterStatus |
| `ChapterSummary` | 章节摘要 | chapterId(UQ), summary, keyEvents |
| `ChapterArtifactSyncCheckpoint` | 章节产物同步检查点 | chapterId, contentHash, artifactType, syncMode |
| `ChapterRepairVersion` | 章节修复版本历史 | chapterId, versionIndex(UQ), content, repairMode |

---

## 3. 角色域（Character）

角色系统包含角色定义、关系、时间线、阵营追踪、资源台账等。

| 模型 | 简述 | 关键字段 |
|------|------|----------|
| `Character` | 角色主表 | novelId, name, role, gender, tier, exitStatus |
| `CharacterRelation` | 角色二元关系 | sourceCharacterId, targetCharacterId, surfaceRelation, trustScore |
| `CharacterRelationStage` | 关系阶段演变 | relationId, sourceCharacterId, stageLabel, isCurrent |
| `CharacterTimeline` | 角色时间线事件 | characterId, chapterId, title, content |
| `CharacterCandidate` | 新角色候选项（AI 识别） | proposedName, matchedCharacterId, confidence |
| `CharacterVolumeAssignment` | 角色分卷分配 | characterId, volumeId(UQ), responsibility, isCore |
| `CharacterFactionTrack` | 角色阵营变迁追踪 | characterId, factionLabel, chapterId |
| `CharacterCastOption` | 选角方案 | novelId, title, summary, status |
| `CharacterCastOptionMember` | 选角方案成员 | optionId, name, role, storyFunction |
| `CharacterCastOptionRelation` | 选角方案关系 | optionId, sourceName, targetName |
| `CharacterSyncProposal` | 角色同步提案（库↔小说） | direction, status, summary |
| `CharacterState` | 角色状态快照 | snapshotId, characterId(UQ), emotion, currentGoal |
| `CharacterResourceLedgerItem` | 角色资源台账 | resourceKey, name, resourceType, ownerCharacterId |
| `CharacterResourceEvent` | 角色资源事件 | resourceId, eventType, summary |
| `CharacterResourceKnownBy` | 资源认知关系 | resourceId, characterId(UQ) |
| `OpenConflictCharacter` | 冲突-角色关联 | conflictId, characterId(UQ) |

---

## 4. 角色库域（Base Character Library）

跨小说的角色库，支持版本管理和同步。

| 模型 | 简述 | 关键字段 |
|------|------|----------|
| `BaseCharacter` | 角色库条目 | name, role, personality, category |
| `BaseCharacterRevision` | 角色库版本 | baseCharacterId, version(UQ), snapshotJson |
| `CharacterLibraryLink` | 小说角色↔角色库链接 | characterId(UQ), baseCharacterId, syncPolicy |

---

## 5. 世界观域（World）

世界观定义小说的背景设定，包含层级结构、资产、一致性检查等。

| 模型 | 简述 | 关键字段 |
|------|------|----------|
| `World` | 世界观主表 | name, worldType, status, axioms, magicSystem, politics |
| `NovelWorld` | 小说专属世界观实例 | novelId(UQ), sourceWorldId, storySliceJson |
| `WorldSyncRecord` | 世界观同步记录 | novelWorldId, direction, diffSummary |
| `WorldAsset` | 世界观资产（地图/设定图等） | worldId/novelWorldId, assetType, thumbnailUrl |
| `WorldPropertyLibrary` | 世界观属性库 | name, category, usageCount |
| `WorldSnapshot` | 世界观快照 | worldId, data |
| `WorldDeepeningQA` | 世界观深化问答 | worldId, question, answer, status |
| `WorldConsistencyIssue` | 世界观一致性问题 | worldId, severity, code, message |
| `WorldForceRelation` | 势力关系边表 | worldId, sourceForceId, targetForceId |
| `WorldLocationControl` | 势力-地点控制关系 | worldId, forceId, locationId |
| `WorldLocationConnection` | 地点连接边表 | worldId, sourceLocationId, targetLocationId |

---

## 6. 故事结构与规划域（Story Planning）

故事线版本、分卷规划、章节规划、重规划等。

| 模型 | 简述 | 关键字段 |
|------|------|----------|
| `StorylineVersion` | 故事线版本 | novelId, version(UQ), status, content |
| `VolumePlanVersion` | 分卷规划版本 | novelId, version(UQ), status, contentJson |
| `VolumePlan` | 分卷规划 | novelId, sortOrder(UQ), title, mainPromise |
| `VolumeChapterPlan` | 分卷内章节规划 | volumeId, chapterOrder(UQ), title, summary |
| `StoryPlan` | 故事计划（多层级） | novelId, level(book/arc/chapter), title, objective |
| `ChapterPlanScene` | 计划场景 | planId, sortOrder, title, objective |
| `ReplanRun` | 重规划记录 | novelId, triggerType, reason |
| `StoryPlanIssue` | 计划-问题关联 | planId, issueId(UQ) |

---

## 7. 状态追踪域（State Tracking）

小说叙事状态的版本化管理：角色状态、关系状态、伏笔、冲突、伏笔回收台账。

| 模型 | 简述 | 关键字段 |
|------|------|----------|
| `StoryStateSnapshot` | 叙事状态快照 | novelId, sourceChapterId(UQ), summary |
| `RelationState` | 关系状态 | snapshotId, sourceCharacterId, trustScore |
| `InformationState` | 信息状态（谁知道什么） | snapshotId, holderType, fact, status |
| `ForeshadowState` | 伏笔状态 | snapshotId, title, status, setupChapterId |
| `OpenConflict` | 未解决冲突 | novelId, conflictType, title, severity |
| `PayoffLedgerItem` | 伏笔回收台账 | novelId, ledgerKey(UQ), currentStatus |
| `CanonicalStateVersion` | 规范状态版本 | novelId, version(UQ), snapshotJson |
| `StateChangeProposal` | 状态变更提案 | sourceType, proposalType, riskLevel, status |

---

## 8. AI 生成与流水线域（Generation Pipeline）

章节生成任务、Agent 运行、Creative Hub 对话等。

| 模型 | 简述 | 关键字段 |
|------|------|----------|
| `GenerationJob` | 批量生成任务 | novelId, startOrder, endOrder, status, runMode |
| `AgentRun` | Agent 运行实例 | sessionId, goal, entryAgent, status |
| `AgentStep` | Agent 步骤 | runId, seq(UQ), agentName, stepType, status |
| `AgentApproval` | Agent 审批点 | runId, approvalType, status, decider |
| `CreativeHubThread` | Creative Hub 对话线程 | title, status, archived |
| `CreativeHubCheckpoint` | 对话检查点 | threadId, checkpointId(UQ), messagesJson |

---

## 9. Auto-Director 域（导演系统）

AI 导演系统的核心运行时：工作流任务、导演运行、步骤、命令、产物等。

| 模型 | 简述 | 关键字段 |
|------|------|----------|
| `NovelWorkflowTask` | 工作流任务 | novelId, lane(manual/auto_director), status |
| `DirectorRun` | 导演运行实例 | taskId(UQ), policyJson |
| `DirectorRunCommand` | 导演命令（旧版） | taskId, commandType, idempotencyKey, status |
| `DirectorStepRun` | 导演步骤运行 | runId, nodeKey, label, status |
| `DirectorEvent` | 导演事件 | runId, type, summary, severity |
| `DirectorArtifact` | 导演产物 | novelId, artifactType, targetType, contentTable |
| `DirectorArtifactDependency` | 产物依赖关系 | artifactId, dependsOnArtifactId(UQ) |
| `DirectorLlmUsageRecord` | LLM 用量记录 | novelId, provider, model, promptTokens |
| `AutoDirectorAutoApprovalRecord` | 自动审批记录 | taskId, eventId(UQ), summary |
| `AutoDirectorFollowUpActionLog` | 后续动作日志 | taskId, actionCode, resultCode |
| `AutoDirectorFollowUpNotificationLog` | 后续通知日志 | taskId, channelType, status |

---

## 10. Director Runtime 域（运行时引擎）

Director 运行时的命令调度、执行锁、检查点、事件系统。

| 模型 | 简述 | 关键字段 |
|------|------|----------|
| `DirectorRuntimeInstance` | 运行时实例 | novelId, status, currentStep |
| `DirectorRuntimeCommand` | 运行时命令 | runtimeId, commandType, idempotencyKey, priority |
| `DirectorRuntimeExecution` | 运行时执行记录 | runtimeId, stepType, status, workerId |
| `DirectorRuntimeCheckpoint` | 运行时检查点 | runtimeId, version(UQ), stateJson |
| `DirectorRuntimeEvent` | 运行时事件 | runtimeId, type, summary, occurredAt |

---

## 11. 质量与审核域（Quality & Audit）

章节质量评分、审核报告、全局审校、风险追踪。

| 模型 | 简述 | 关键字段 |
|------|------|----------|
| `QualityReport` | 质量评分报告 | novelId, chapterId, coherence/pacing/voice/engagement 评分 |
| `AuditReport` | 审核报告 | novelId, chapterId, auditType, overallScore |
| `AuditIssue` | 审核问题项 | reportId, severity, code, description, status |
| `GlobalReviewIssue` | 跨章节审校问题 | novelId, reviewRunId, severity, category, status |
| `NovelRisk` | 小说风险 | novelId, type, severity, status, title |
| `RiskAuditLog` | 风险审计日志 | riskId, action, prevStatus, newStatus |

---

## 12. 时间线域（Timeline）

故事时间线事件、钩子、约束、时间锚点。

| 模型 | 简述 | 关键字段 |
|------|------|----------|
| `StoryTimelineEvent` | 时间线事件 | novelId, eventOrder, title, type, status |
| `TimelineEventEdge` | 事件因果边 | sourceId, targetId, edgeType |
| `TimelineEventParticipant` | 事件参与者 | eventId, characterId(UQ) |
| `TimelineEventFaction` | 事件涉及势力 | eventId, factionId(UQ) |
| `ChapterTimeAnchor` | 章节时间锚点 | novelId, chapterId(UQ), timeLabel |
| `TimelineHook` | 时间线钩子 | novelId, title, status, resolveMode, blocking |
| `TimelineConstraint` | 时间线约束 | novelId, type, severity, active |
| `TimelineCheckReport` | 时间线检查报告 | novelId, chapterId, score, issuesJson |
| `TimelineAnchorEventLink` | 锚点-事件关联 | anchorId, eventId, linkType |
| `TimelineHookEventLink` | 钩子-事件关联 | hookId, eventId(UQ) |
| `TimelineHookParticipant` | 钩子参与者 | hookId, characterId(UQ) |
| `TimelineConstraintLink` | 约束关联 | constraintId, refType, refId |

---

## 13. 写作与风格域（Writing & Style）

风格画像、反 AI 规则、写作技法、词汇规则、氛围卡等。

| 模型 | 简述 | 关键字段 |
|------|------|----------|
| `StyleProfile` | 风格画像 | name, sourceType, status, extractedFeaturesJson |
| `StyleTemplate` | 风格模板 | key(UQ), name, category |
| `StyleBinding` | 风格绑定（画像→目标） | styleProfileId, targetType, targetId |
| `AntiAiRule` | 反 AI 检测规则 | key(UQ), type, severity, detectPatternsJson |
| `StyleProfileAntiAiRule` | 画像-规则关联 | styleProfileId, antiAiRuleId(UQ), weight |
| `WritingFormula` | 写作公式 | name, genre, style, formulaSteps |
| `WritingTechnique` | 写作技法 | key(UQ), name, category |
| `WritingTechniqueProfileBinding` | 技法-画像绑定 | styleProfileId, writingTechniqueId(UQ) |
| `WritingTechniqueNovelBinding` | 技法-小说绑定 | novelId, writingTechniqueId(UQ) |
| `AtmosphereCard` | 氛围卡 | key(UQ), name, filePath, category |
| `VocabularyRule` | 词汇规则 | key(UQ), pattern, matchType, category, weight |
| `TitleLibrary` | 标题库 | title, genreId, clickRate |
| `PromptAddendum` | Prompt 附加条目 | scope, novelId, promptId, content |
| `PromptSlotOverride` | Prompt 槽位覆盖 | scope, novelId, promptId(UQ), slots |

---

## 14. 知识库与 RAG 域（Knowledge）

知识文档管理、RAG 索引、图书分析。

| 模型 | 简述 | 关键字段 |
|------|------|----------|
| `KnowledgeDocument` | 知识文档 | title, status, latestIndexStatus |
| `KnowledgeDocumentVersion` | 文档版本 | documentId, versionNumber(UQ), contentHash |
| `KnowledgeBinding` | 文档绑定（→小说/世界） | targetType, targetId, documentId |
| `KnowledgeChunk` | RAG 知识分块 | ownerType, ownerId, chunkText, embedProvider |
| `RagIndexJob` | RAG 索引任务 | jobType, ownerType, ownerId, status |
| `BookAnalysis` | 图书分析任务 | documentId, status, progress |
| `BookAnalysisSourceCache` | 分析源缓存 | documentVersionId, provider, model |
| `BookAnalysisSection` | 分析章节 | analysisId, sectionKey(UQ), aiContent |

---

## 15. 图像生成域（Image）

角色图像、小说封面、章节插图的生成与资产管理。

| 模型 | 简述 | 关键字段 |
|------|------|----------|
| `ImageGenerationTask` | 图像生成任务 | sceneType, provider, model, status |
| `ImageAsset` | 图像资产 | taskId, sceneType, url, isPrimary |
| `StyleExtractionTask` | 风格提取任务 | sourceText, provider, model, status |

---

## 16. 配置与系统域（Config）

系统设置、API Key、模型路由配置。

| 模型 | 简述 | 关键字段 |
|------|------|----------|
| `APIKey` | API 密钥管理 | provider(UQ), key, model, concurrencyLimit |
| `AppSetting` | 应用设置 KV | key(PK), value |
| `ModelRouteConfig` | 模型路由配置 | taskType(UQ), provider, model, temperature |

---

## 17. 事实与风险域（Fact & Risk）

小说中不可逆事实的账本，以及风险追踪。

| 模型 | 简述 | 关键字段 |
|------|------|----------|
| `NovelFactEntry` | 事实账本条目 | novelId, chapterOrder, text, category |
| `NovelRisk` | 风险记录 | novelId, type, severity, status |
| `RiskAuditLog` | 风险审计日志 | riskId, action, prevStatus, newStatus |

---

## 18. 其他支撑域

| 模型 | 简述 | 关键字段 |
|------|------|----------|
| `PlotBeat` | 情节节拍 | novelId, beatType, title, status |
| `ConsistencyFact` | 一致性事实 | novelId, chapterId, category, content |
| `StoryStateSnapshot` | 叙事状态快照 | novelId, sourceChapterId(UQ) |
| `NovelSideEffectJob` | 小说副作用异步任务 | jobType, status, idempotencyKey(UQ) |
| `TaskCenterArchive` | 任务中心归档 | taskKind, taskId(UQ) |

---

## 附录：模型数量统计

| 域 | 模型数 | 占比 |
|----|--------|------|
| 角色域 | 16 | 12.1% |
| 世界观域 | 11 | 8.3% |
| 时间线域 | 12 | 9.1% |
| 写作与风格域 | 14 | 10.6% |
| Auto-Director 域 | 11 | 8.3% |
| Director Runtime 域 | 5 | 3.8% |
| 状态追踪域 | 8 | 6.1% |
| 知识库与 RAG 域 | 8 | 6.1% |
| AI 生成与流水线域 | 6 | 4.5% |
| 其他（核心/章节/配置等） | 41 | 31.1% |
| **合计** | **132** | **100%** |
