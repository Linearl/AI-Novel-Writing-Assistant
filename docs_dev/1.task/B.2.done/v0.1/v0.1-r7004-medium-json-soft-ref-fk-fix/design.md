---
description: "REQ-7004 JSON 软引用 FK 缺失修复 — 方案设计"
---

# REQ-7004 Design

## 1. 整体策略

**渐进式迁移**：新增边表 → 双写过渡 → 适配读取 → 移除旧字段。每个阶段独立可验证，不破坏现有功能。

## 2. 边表设计模式

统一采用以下模式（以 TimelineEventEdge 为参考）：

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

**设计要点**：
- 每条边一行（非 JSON 数组）
- FK 级联删除（删除实体自动清理边）
- 唯一约束防止重复边
- 按 targetId 索引支持反向查询

## 3. 双向一致性方案

对于互逆关系（prerequisite ↔ consequence），写入时在事务内同时创建两条边：

```ts
await prisma.$transaction([
  prisma.timelineEventEdge.create({ data: { sourceId: A, targetId: B, edgeType: 'prerequisite' } }),
  prisma.timelineEventEdge.create({ data: { sourceId: B, targetId: A, edgeType: 'consequence' } }),
]);
```

读取时只需按一个方向查询，避免冗余。

## 4. 数据迁移方案

### 4.1 迁移脚本结构

```
server/src/prisma/migrations/
  └── xxx_json_soft_ref_fk_fix/
      ├── migration.sql          # Prisma 自动生成
      └── migrate-json-to-edges.ts  # 数据迁移脚本
```

### 4.2 迁移逻辑

1. 读取所有 StoryTimelineEvent 的 `prerequisiteIdsJson`
2. 对每个 JSON 数组，展开为 `(sourceId, targetId, 'prerequisite')` 行
3. 批量 INSERT 到 TimelineEventEdge
4. 校验：JSON 数组元素总数 == 新表行数

### 4.3 回滚策略

迁移脚本支持反向操作：读取边表 → 重建 JSON 字段。迁移完成并验证前不删除旧 JSON 字段。

## 5. World.structureJson 提取方案

### 5.1 过渡期双写

- 写入时：同时写新表 + 更新 structureJson
- 读取时：优先从新表读取，fallback 到 structureJson

### 5.2 最终状态

- 新表为唯一数据源
- structureJson 保留非关系数据（forces, locations, factions 的属性数据）

## 6. 服务层适配

### 6.1 timeline.repository.ts

当前：
```ts
prerequisiteEventIds: parseJsonArray(row.prerequisiteIdsJson),
```

改为：
```ts
// 查询边表
const edges = await prisma.timelineEventEdge.findMany({
  where: { sourceId: row.id, edgeType: 'prerequisite' },
  select: { targetId: true },
});
prerequisiteEventIds: edges.map(e => e.targetId),
```

### 6.2 批量优化

对列表查询场景，使用 `findMany` + `groupBy` 或 IN 子查询批量获取边数据，避免 N+1。

## 7. 不做的事

- 不引入图数据库
- 不修改前端组件
- 不改变 API 契约
- 不迁移 `stateChangesJson` 和 `issuesJson`（存储的是描述对象，非 FK ID）
