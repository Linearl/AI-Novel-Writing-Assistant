---
description: "REQ-7004 JSON 软引用 FK 缺失修复 — 原始需求冻结副本"
---

# REQ-7004 JSON 软引用 FK 缺失修复（原始副本）

> 冻结日期：2026-06-30
> 来源：2026-06-30 图数据库能力诊断报告

## 问题描述

Prisma schema 中有 19 个 `*IdsJson` 字段（分布在 7 个模型中），以 `String @default("[]")` 存储 JSON 数组形式的实体 ID 引用，存在三层问题：

### 问题 1：悬空引用（Dangling References）

删除被引用实体后，引用方的 JSON 字段不会级联清理，产生悬空 ID。

### 问题 2：双向一致性无保证

互逆关系（如 `prerequisiteIdsJson` ↔ `consequenceIdsJson`）各自独立序列化，无事务保证。

### 问题 3：无法索引和查询

JSON 数组存为 String，无法建索引、无法 JOIN、无法多跳遍历。

## 受影响模型

| 模型 | JSON 字段数 | 字段列表 |
|------|------------|----------|
| StoryTimelineEvent | 4 | participantIdsJson, factionIdsJson, prerequisiteIdsJson, consequenceIdsJson |
| ChapterTimeAnchor | 6 | startsAfterIdsJson, plannedEventIdsJson, endedWithIdsJson, previousHookIdsJson, nextHookIdsJson, forbiddenEventIdsJson |
| TimelineHook | 2 | relatedEventIdsJson, participantIdsJson |
| TimelineConstraint | 3 | relatedEventIdsJson, relatedHookIdsJson, relatedCharacterIdsJson |
| OpenConflict | 1 | affectedCharacterIdsJson |
| CharacterResource | 1 | knownByCharacterIdsJson |
| StoryPlan | 1 | sourceIssueIdsJson |
| CanonicalStateVersion | 1 | acceptedProposalIdsJson |

## 修复目标

将 JSON 软引用迁移为独立的 Prisma 边表，实现 FK 约束、索引、级联删除和双向一致性。
