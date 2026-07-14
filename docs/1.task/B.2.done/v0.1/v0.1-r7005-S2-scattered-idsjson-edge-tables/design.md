---
description: "REQ-7005 P2 零散 IdsJson 字段迁移为边表 — 方案设计"
---

# REQ-7005 Design

## 1. 整体策略

复用 P0（REQ-7004）的边表模式：新增边表 → 双写过渡 → 边表读取 + JSON fallback → 后续移除旧字段。

## 2. 边表设计

统一模式：

```prisma
model OpenConflictCharacter {
  id          String   @id @default(cuid())
  novelId     String
  conflictId  String
  characterId String
  createdAt   DateTime @default(now())

  conflict    OpenConflict @relation(fields: [conflictId], references: [id], onDelete: Cascade)
  character   Character    @relation(fields: [characterId], references: [id], onDelete: Cascade)

  @@unique([conflictId, characterId])
  @@index([novelId])
  @@index([characterId])
}
```

其余 3 表同理。StoryPlanIssue 的 target FK 使用 SetNull（issue 可能被删除但 plan 需保留）。

## 3. 双写策略

与 P0 相同：写入时事务内同时写 JSON 字段和边表。读取时从边表查询，无数据则 fallback 到 JSON 解析。

## 4. 不做的事

- 不移除旧 JSON 字段
- 不修改导出模块（novelExport.mappers.ts 的 JSON 透传）
- 不修改 Prompt 模板（replanWindowDecision.prompts.ts 的 JSON 嵌入）
