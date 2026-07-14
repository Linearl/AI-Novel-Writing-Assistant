---
description: "上游项目 JSON 软引用 FK 缺失问题 — 供上游作者参考的 issue 分析"
date: 2026-06-30
---

# Issue: Prisma Schema 中 19 个 `*IdsJson` 字段缺乏 FK 约束，导致数据完整性风险

## 问题描述

Prisma schema 中有 19 个字段使用 `String @default("[]")` 存储 JSON 数组形式的实体 ID 引用，缺乏数据库层面的引用完整性保护。

受影响字段分布在 8 个模型中：

| 模型 | 字段 | 引用目标 |
|------|------|----------|
| StoryTimelineEvent | `participantIdsJson` | Character |
| StoryTimelineEvent | `factionIdsJson` | Faction |
| StoryTimelineEvent | `prerequisiteIdsJson` | StoryTimelineEvent（自引用） |
| StoryTimelineEvent | `consequenceIdsJson` | StoryTimelineEvent（自引用） |
| ChapterTimeAnchor | `startsAfterIdsJson` | StoryTimelineEvent |
| ChapterTimeAnchor | `plannedEventIdsJson` | StoryTimelineEvent |
| ChapterTimeAnchor | `endedWithIdsJson` | StoryTimelineEvent |
| ChapterTimeAnchor | `previousHookIdsJson` | TimelineHook |
| ChapterTimeAnchor | `nextHookIdsJson` | TimelineHook |
| ChapterTimeAnchor | `forbiddenEventIdsJson` | StoryTimelineEvent |
| TimelineHook | `relatedEventIdsJson` | StoryTimelineEvent |
| TimelineHook | `participantIdsJson` | Character |
| TimelineConstraint | `relatedEventIdsJson` | StoryTimelineEvent |
| TimelineConstraint | `relatedHookIdsJson` | TimelineHook |
| TimelineConstraint | `relatedCharacterIdsJson` | Character |
| OpenConflict | `affectedCharacterIdsJson` | Character |
| CharacterResourceLedgerItem | `knownByCharacterIdsJson` | Character |
| StoryPlan | `sourceIssueIdsJson` | OpenConflict |
| CanonicalStateVersion | `acceptedProposalIdsJson` | StateChangeProposal |

## 根因分析

这些字段使用 JSON 序列化/反序列化方式存储图边数据（`stringifyJson` / `parseJsonArray`），而非 Prisma 的 `@relation` 外键。这导致三个层面的数据完整性问题：

### 1. 悬空引用（Dangling References）

删除被引用实体时，引用方的 JSON 字段不会级联清理。例如删除一个 `StoryTimelineEvent` 后，其他事件的 `prerequisiteIdsJson` 中仍保留其 ID。

### 2. 双向一致性无保证

`StoryTimelineEvent` 的 `prerequisiteIdsJson` ↔ `consequenceIdsJson` 是互逆关系，但写入时各自独立序列化（`timeline.repository.ts:370-371`），无事务保证。事件 A 写入 `consequenceIdsJson: ["B"]` 不保证事件 B 同步写入 `prerequisiteIdsJson: ["A"]`。

### 3. 无法索引和查询

JSON 数组存为 `String`，无法对边的源/目标建索引。查询 "哪些事件以 B 为前提？" 需要全表扫描 + JSON 解析。多跳遍历（因果链追踪）在应用层实现，效率低下。

## 复现步骤

1. 创建两个 StoryTimelineEvent（A 和 B）
2. 设置 A 的 `consequenceIdsJson` 为 `["B的ID"]`
3. 删除事件 B
4. 观察 A 的 `consequenceIdsJson` 仍包含 B 的 ID（悬空引用）

## 修复方案建议

将 JSON 软引用迁移为独立的 Prisma 边表，以 `TimelineEventEdge` 为例：

```prisma
model TimelineEventEdge {
  id        String   @id @default(cuid())
  novelId   String
  sourceId  String
  targetId  String
  edgeType  String   // "prerequisite" | "consequence" | "forbidden"
  createdAt DateTime @default(now())

  novel     Novel    @relation(fields: [novelId], references: [id], onDelete: Cascade)
  source    StoryTimelineEvent @relation("EventEdgeSource", fields: [sourceId], references: [id], onDelete: Cascade)
  target    StoryTimelineEvent @relation("EventEdgeTarget", fields: [targetId], references: [id], onDelete: Cascade)

  @@unique([sourceId, targetId, edgeType])
  @@index([novelId, edgeType])
  @@index([targetId])
}
```

优势：
- FK 级联删除自动清理边
- 唯一约束防止重复边
- 索引支持高效查询
- 事务内写入保证双向一致性

## 变更文件

- `server/src/prisma/schema.prisma` — 新增边表模型，移除 JSON 字段
- `server/src/modules/timeline/timeline.repository.ts` — 从边表查询替代 JSON 解析
- `server/src/services/world/worldStructure.ts` — World 关系数据提取为独立表
- `server/src/services/world/worldVisualization.ts` — 适配新数据源
- 新增迁移脚本：存量 JSON 数据 → 边表
