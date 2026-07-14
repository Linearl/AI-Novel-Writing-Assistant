---
description: "REQ-7007 World.structureJson 关系提取为独立表 — 需求原始冻结副本"
---

# REQ-7007 World.structureJson 关系提取为独立表

> 创建日期：2026-06-30
> 最后更新：2026-06-30
> 复杂度：medium
> 分类：7xxx（技术债务和重构）
> 优先级：P1
> 父需求：REQ-7004

---

## 1. 目标

将 World.structureJson 中的 relations 对象（forceRelations / locationControls / locationConnections）提取为独立 Prisma 边表，支持 FK 约束、级联删除和索引查询。

## 2. 范围

### 2.1 新增边表

| 边表 | 替代内容 | 源 → 目标 |
|------|---------|----------|
| WorldForceRelation | relations.forceRelations | sourceForceId → targetForceId |
| WorldLocationControl | relations.locationControls | forceId → locationId |
| WorldLocationConnection | relations.locationConnections | sourceLocationId → targetLocationId |

### 2.2 结构化字段

**WorldForceRelation**：sourceForceId, targetForceId, relation, tension, detail
**WorldLocationControl**：forceId, locationId, relation, detail
**WorldLocationConnection**：sourceLocationId, targetLocationId, connectionType, distanceHint, narrativeUse

### 2.3 消费方分析

| 文件 | 操作 | 影响 |
|------|------|------|
| WorldService.ts | 写入（2 处） | 需加双写 |
| worldTransfer.ts | 写入（3 处） | 需加双写 |
| worldStructureLegacy.ts | 写入（1 处） | 需加双写 |
| worldServiceHelpers.ts | 写入（2 处） | 需加双写 |
| worldDraftGeneration.ts | 写入（2 处） | 需加双写 |
| worldSnapshotService.ts | 写入（1 处） | 需加双写 |
| NovelWorldSyncService.ts | 读+写 | 双向适配 |
| NovelWorldInstanceService.ts | 读+写 | 双向适配 |
| NovelWorldLibrarySaveService.ts | 写入（2 处） | 需加双写 |
| worldVisualization.ts | 读取 | 需改为边表优先 |

### 2.4 worldVisualization 读取点

- 第 233 行：`structure.relations.forceRelations` → factionGraph edges
- 第 266 行：`structure.relations.locationConnections` → geography edges
- 第 276 行：`structure.relations.locationControls` → 回退 geography edges

## 3. 非目标

- 不迁移实体内的嵌入引用（forces.controlledLocationIds 等）
- 不移除旧 relations 子对象（过渡期保留）
- 不引入图数据库

## 4. EARS 验收条目

| # | 验收条件 | 验证方式 |
|---|---------|---------|
| E1 | 删除 World 后边表自动清理 | prisma validate（FK Cascade） |
| E2 | 存量数据迁移后记录数一致 | 迁移脚本校验 |
| E3 | 前端世界可视化正常 | 手动验证 |
| E4 | typecheck + test + build 全绿 | CI |

## 5. 风险

| 风险 | 影响 | 缓解 |
|------|------|------|
| 写入方过多（10+ 文件），遗漏双写 | 高 | 优先在 worldStructure facade 层统一拦截 |
| locationControls 回退边推导逻辑复杂 | 中 | 保留 JSON 回退路径，边表只用于显式连接 |
| force/location 无独立 Prisma 模型 | 中 | forceId/locationId 用 plain String，不建 FK |
