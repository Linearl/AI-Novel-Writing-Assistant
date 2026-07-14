---
description: "核心 ER 关系说明 — 按域列出模型间的主要关系链路，不逐条枚举外键"
---

# 核心 ER 关系说明

> 基于 `server/src/prisma/schema.prisma`，以 Novel 为中心的星型关系结构。
> 完整 FK 定义见 Prisma schema，本文聚焦**业务关系脉络**。

---

## 1. 顶层关系总览

```text
NovelGenre ──┐
             ├──→ Novel ←── NovelStoryMode (primary/secondary)
NovelWorld ──┘      │
                    ├──→ Chapter ──→ ChapterSummary
                    ├──→ Character ──→ CharacterRelation
                    ├──→ World (via worldId)
                    ├──→ VolumePlan ──→ VolumeChapterPlan
                    ├──→ GenerationJob
                    ├──→ NovelWorkflowTask ──→ DirectorRun
                    ├──→ StorylineVersion
                    └──→ (40+ 下属模型)
```

**Novel 是整个系统的根节点**，几乎所有业务模型都通过 `novelId` 直接或间接关联到 Novel。

---

## 2. 小说 → 章节链路

```text
Novel  1 ──→ N Chapter
               │
               ├── 1:1 ChapterSummary（章节摘要）
               ├── 1:N ChapterRepairVersion（修复版本历史）
               ├── 1:N ChapterArtifactSyncCheckpoint（产物同步）
               ├── 1:N ConsistencyFact（一致性事实）
               ├── 1:N QualityReport（质量评分）
               ├── 1:N AuditReport ──→ N AuditIssue
               └── 1:N StoryPlan（故事计划）
```

**关键约束**：`Chapter` 通过 `novelId + order` 唯一确定章节顺序。

---

## 3. 小说 → 角色链路

```text
Novel  1 ──→ N Character
               │
               ├── 1:N CharacterTimeline（角色时间线）
               ├── 1:N CharacterFactionTrack（阵营变迁）
               ├── 1:N CharacterVolumeAssignment ──→ VolumePlan
               ├── 1:N CharacterSyncProposal（同步提案）
               ├── 1:1 CharacterLibraryLink → BaseCharacter（角色库链接）
               │
               ├── N:M CharacterRelation（二元关系）
               │         sourceCharacter → Character
               │         targetCharacter → Character
               │         └── 1:N CharacterRelationStage（关系阶段）
               │
               └── 1:N CharacterState（状态快照，经由 StoryStateSnapshot）
```

**关键约束**：`CharacterRelation` 通过 `@@unique(novelId, sourceCharacterId, targetCharacterId)` 保证同对角色关系唯一。

---

## 4. 小说 → 世界观链路

```text
World  1 ──→ N Novel（通过 Novel.worldId）
              │
              ├── 1:1 NovelWorld（小说专属世界观副本）
              │         ├── 1:N WorldSyncRecord（同步记录）
              │         └── 1:N WorldAsset（资产）
              │
              ├── 1:N WorldSnapshot（世界观快照）
              ├── 1:N WorldDeepeningQA（深化问答）
              ├── 1:N WorldConsistencyIssue（一致性问题）
              ├── 1:N WorldPropertyLibrary（属性库）
              ├── 1:N WorldForceRelation（势力关系）
              ├── 1:N WorldLocationControl（势力-地点）
              └── 1:N WorldLocationConnection（地点连接）
```

**设计要点**：`World` 是跨小说共享的世界观模板；`NovelWorld` 是小说绑定的专属实例，通过 `sourceWorldId` 指向模板。

---

## 5. 小说 → 故事规划链路

```text
Novel  1 ──→ N StorylineVersion（故事线版本）
Novel  1 ──→ N VolumePlanVersion
              │   └── 1:N VolumePlan
              │         └── 1:N VolumeChapterPlan ──→ Chapter
              │
Novel  1 ──→ 1 StoryMacroPlan（宏观规划）
Novel  1 ──→ 1 BookContract（读者契约）
```

**版本化策略**：StorylineVersion 和 VolumePlanVersion 通过 `@@unique(novelId, version)` 保证版本号唯一。

---

## 6. 小说 → 状态追踪链路

```text
Novel  1 ──→ N StoryStateSnapshot
              │
              ├── 1:N CharacterState ──→ Character
              ├── 1:N RelationState ──→ Character (source + target)
              ├── 1:N InformationState（信息状态）
              ├── 1:N ForeshadowState ──→ Chapter (setup + payoff)
              └── 1:N OpenConflict
                    └── N:M OpenConflictCharacter ──→ Character

Novel  1 ──→ N CanonicalStateVersion（规范状态版本）
              └── 1:N StateChangeProposal

Novel  1 ──→ N PayoffLedgerItem（伏笔回收台账）
              └── → Chapter (setup/payoff/lastTouched)
```

---

## 7. 小说 → AI 生成链路

```text
Novel  1 ──→ N GenerationJob（批量生成任务）

Novel  1 ──→ N AgentRun（Agent 运行）
              ├── 1:N AgentStep（步骤）
              └── 1:N AgentApproval（审批点）

Novel  1 ──→ N NovelWorkflowTask（工作流任务）
              ├── 1:1 DirectorRun
              │     ├── 1:N DirectorStepRun
              │     ├── 1:N DirectorEvent
              │     ├── 1:N DirectorArtifact
              │     └── 1:N DirectorLlmUsageRecord
              ├── 1:N DirectorRunCommand
              └── 1:N AutoDirectorAutoApprovalRecord
```

---

## 8. Director Runtime 链路

```text
DirectorRuntimeInstance
  ├── 1:N DirectorRuntimeCommand（命令）
  ├── 1:N DirectorRuntimeExecution（执行记录）
  ├── 1:N DirectorRuntimeCheckpoint（检查点）
  └── 1:N DirectorRuntimeEvent（事件）
```

这是一个相对独立的子系统，通过 `workflowTaskId` 和 `novelId` 关联到主链路。

---

## 9. 知识库链路

```text
KnowledgeDocument
  ├── 1:N KnowledgeDocumentVersion（版本）
  ├── 1:N KnowledgeBinding → Novel / World（绑定）
  └── 1:N BookAnalysis
        └── 1:N BookAnalysisSection（分析章节）

KnowledgeChunk（RAG 分块）
  → ownerType: novel | chapter | world | character | bible | ...
  → ownerId 指向对应模型的 id
```

**多态关联**：`KnowledgeChunk.ownerType + ownerId` 构成多态外键，不使用数据库级 FK。

---

## 10. 角色库同步链路

```text
BaseCharacter（角色库条目）
  ├── 1:N BaseCharacterRevision（版本历史）
  ├── 1:N CharacterLibraryLink → Character（小说角色链接）
  └── 1:N CharacterSyncProposal（同步提案）
```

**同步方向**：
- `library_to_novel`：角色库 → 小说角色
- `novel_to_library`：小说角色 → 角色库

---

## 11. 写作风格绑定链路

```text
StyleProfile
  ├── 1:N StyleBinding → Novel / Chapter / Task（风格绑定）
  ├── 1:N StyleProfileAntiAiRule → AntiAiRule（规则关联）
  └── 1:N WritingTechniqueProfileBinding → WritingTechnique

Novel
  └── 1:N WritingTechniqueNovelBinding → WritingTechnique
```

**多态绑定**：`StyleBinding.targetType + targetId` 支持将风格画像绑定到不同粒度（小说/章节/任务）。

---

## 12. 时间线关系网络

```text
StoryTimelineEvent
  ├── N:M TimelineEventEdge（事件间因果边：source → target）
  ├── N:M TimelineEventParticipant → Character
  └── N:M TimelineEventFaction（势力关联）

ChapterTimeAnchor → Chapter
  └── 1:N TimelineAnchorEventLink → StoryTimelineEvent

TimelineHook → Novel
  ├── 1:N TimelineHookEventLink → StoryTimelineEvent
  └── 1:N TimelineHookParticipant → Character

TimelineConstraint → Novel
  └── 1:N TimelineConstraintLink（多态关联）
```

---

## 13. 关键设计模式总结

| 模式 | 使用场景 | 示例 |
|------|----------|------|
| **星型拓扑** | Novel 为中心，所有数据围绕 | 132 个模型中约 80% 直接或间接关联 Novel |
| **多态关联** | 绑定目标不固定 | StyleBinding.targetType, KnowledgeChunk.ownerType |
| **自关联树** | 层级结构 | NovelGenre.parentId, StoryPlan.parentId |
| **版本化** | 可追溯的状态变更 | StorylineVersion, VolumePlanVersion, CanonicalStateVersion |
| **快照模式** | 历史状态保存 | StoryStateSnapshot, WorldSnapshot, NovelSnapshot |
| **台账模式** | 可审计的状态追踪 | PayoffLedgerItem, CharacterResourceLedgerItem |
| **命令-执行分离** | 异步任务调度 | DirectorRuntimeCommand → DirectorRuntimeExecution |
