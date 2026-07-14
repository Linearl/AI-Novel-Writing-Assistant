---
description: "REQ-7007 World.structureJson 关系提取为独立表 — 方案设计"
---

# REQ-7007 Design

## 1. 整体策略

facade 层统一双写：在 structureJson 的写入入口加一层拦截，解析 relations 子对象并同步写入边表。读取层从边表查询，无数据则 fallback。

## 2. 写入拦截策略

`structureJson` 的写入方有 10+ 个文件，但最终都通过 `JSON.stringify(structuredData)` 写入 World.structureJson 字段。

**方案 A**（推荐）：在 WorldService 的 update/create 方法中统一拦截。所有写入最终经过 WorldService，只需在 1-2 个点加双写。

**方案 B**：在每个写入方单独加双写。改动多但互不影响。

## 3. 边表设计

```prisma
model WorldForceRelation {
  id            String   @id @default(cuid())
  worldId       String
  sourceForceId String
  targetForceId String
  relation      String
  tension       String
  detail        String
  createdAt     DateTime @default(now())

  world         World    @relation(fields: [worldId], references: [id], onDelete: Cascade)

  @@unique([worldId, sourceForceId, targetForceId])
  @@index([worldId])
}
```

注意：World 模型已有 `novels Novel[]` 等关系，新增 3 个 reverse relation 数组不会显著膨胀。

## 4. worldVisualization 适配

读取时先查边表，无数据则 fallback 到 structureJson.relations。locationControls 的回退边推导逻辑保持不变。

## 5. 不做的事

- 不迁移实体内嵌引用（controlledLocationIds 等）
- 不移除 relations 子对象
- 不修改前端代码
