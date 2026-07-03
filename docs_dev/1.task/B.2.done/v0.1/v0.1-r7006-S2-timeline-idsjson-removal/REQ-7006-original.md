---
description: "REQ-7006 移除时间线旧 JSON 字段 — 需求冻结副本"
---

# REQ-7006 移除时间线旧 JSON 字段

> 创建日期：2026-06-30
> 最后更新：2026-06-30
> 复杂度：simple
> 分类：7xxx（技术债务和重构）
> 优先级：P1
> 父需求：REQ-7004

---

## 1. 目标

移除 Prisma schema 中 15 个已迁移的时间线 `*IdsJson` 字段，清理 timeline.repository.ts 中的 JSON fallback 逻辑，完成 P0 迁移的最终收口。

## 2. 范围

### 2.1 移除的字段

| 模型 | 字段 |
|------|------|
| StoryTimelineEvent | participantIdsJson, factionIdsJson, prerequisiteIdsJson, consequenceIdsJson |
| ChapterTimeAnchor | startsAfterIdsJson, plannedEventIdsJson, endedWithIdsJson, previousHookIdsJson, nextHookIdsJson, forbiddenEventIdsJson |
| TimelineHook | relatedEventIdsJson, participantIdsJson |
| TimelineConstraint | relatedEventIdsJson, relatedHookIdsJson, relatedCharacterIdsJson |

### 2.2 代码变更

- `timeline.repository.ts`：移除 `parseJsonArray` 函数、`edgeOrJson` fallback 函数、mapper 中的 fallback 分支
- `timeline.repository.ts`：移除写入方法中的 `stringifyJson` 调用
- Prisma schema（双 schema）：移除 15 个字段定义
- shared/types/timeline：如类型中有 JSON 相关字段则同步清理

## 3. 非目标

- 不处理 P1（World.structureJson）和 P2（其他零散字段）
- 不修改导出模块

## 4. EARS 验收条目

| # | 验收条件 | 验证方式 |
|---|---------|---------|
| E1 | prisma validate 通过 | 命令行 |
| E2 | typecheck + test + build 全绿 | CI |
| E3 | 无残留 IdsJson 引用（grep 确认） | grep 搜索 |

## 5. 风险

| 风险 | 影响 | 缓解 |
|------|------|------|
| 遗漏某个消费方仍在读 JSON 字段 | 中 | grep "IdsJson" 全量搜索确认 |
| 迁移 SQL 可能需要数据备份 | 低 | SQLite 为 dev 环境，PostgreSQL 生产前先备份 |
