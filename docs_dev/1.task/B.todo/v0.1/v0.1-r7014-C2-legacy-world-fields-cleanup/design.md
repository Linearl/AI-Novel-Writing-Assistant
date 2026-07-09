---
description: "REQ-7014 清理 Novel 旧版世界字段——技术设计"
update_time: 2026-07-08
---

# REQ-7014 技术设计

## 架构变更

### 变更前（当前状态）

```
写入路径: persistSlice() → Novel.storyWorldSliceJson + NovelWorld.storySliceJson (双写)
读取路径: NovelWorld.storySliceJson ?? Novel.storyWorldSliceJson (fallback)
```

### 变更后（目标状态）

```
写入路径: persistSlice() → NovelWorld.storySliceJson (单写)
读取路径: NovelWorld.storySliceJson (直接读取，无 fallback)
```

---

## 实施阶段

### Phase 1: 确保 NovelWorld 数据完整

**一次性回填脚本**：
- 查询所有有 `storyWorldSliceJson IS NOT NULL` 的 Novel
- 检查是否已有对应 `NovelWorld` 记录
- 若无，调用 `ensureFromLegacyNovel()` 创建
- 验证回填后数据一致性

**位置**：`server/src/scripts/backfill-novel-world.ts` 或作为一次性 SQL 脚本

### Phase 2: 消除双写

**修改文件**：`server/src/services/novel/storyWorldSlice/NovelWorldSliceService.ts`

**修改点**：
- `persistSlice()` (line 231-238)：移除对 `Novel` 表的写入，只保留 `NovelWorld` 写入
- `persistOverrides()`：同上

### Phase 3: 迁移 fallback 读取

**修改文件及具体点**：

1. `NovelWorldSliceService.ts:132-134` — `getActiveWorldSource()`
   - 当前：先查 `NovelWorld`，fallback 到 `Novel.world`
   - 改为：只查 `NovelWorld`，无数据返回 null

2. `NovelWorldSliceService.ts:264` — `getWorldSliceView()`
   - 当前：`activeWorld?.storySliceJson ?? novel.storyWorldSliceJson`
   - 改为：`activeWorld?.storySliceJson ?? null`

3. `NovelWorldSliceService.ts:303,307,335` — `ensureStoryWorldSlice()` / `refreshWorldSlice()`
   - 移除 `?? novel.storyWorldSliceOverridesJson` fallback

4. `novelCoverPromptSupport.ts:118` — `toNovelCoverPromptContext()`
   - 当前：直接读 `novel.storyWorldSliceJson`
   - 改为：通过 NovelWorld 查询获取

5. `NovelWorldInstanceService.ts:200-279` — `ensureFromLegacyNovel()`
   - 移除对 `storyWorldSliceJson` 和 `storyWorldSliceOverridesJson` 的读取
   - 简化为：检查 NovelWorld 是否存在，存在则返回，不存在则返回 null

6. `novelCoreCrudService.ts:440,442` — slice reset
   - 移除对旧字段的 null 写入

### Phase 4: 移除 Schema 列

**修改文件**：
- `server/src/prisma/schema.prisma` — 移除三个字段定义
- `server/src/prisma/schema.sqlite.prisma` — 同上

**执行**：`prisma migrate dev --name remove-legacy-world-slice-fields`

### Phase 5: 清理客户端（如适用）

**修改文件**：`client/src/pages/novels/novelBasicInfo.shared.ts`
- 检查 `worldId` 相关逻辑是否受影响（`worldId` 字段不在本次清理范围，但表单逻辑可能引用旧字段）

---

## 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 数据回填遗漏 | 低 | 高 | 回填后对比 count 验证 |
| fallback 移除后功能异常 | 中 | 中 | 逐个移除 + 类型检查 + 手动验证 |
| Prisma migration 失败 | 低 | 低 | SQLite 开发环境可随时重置 |

---

## 验证方案

1. 回填后：`SELECT COUNT(*) FROM Novel WHERE storyWorldSliceJson IS NOT NULL` vs `SELECT COUNT(*) FROM NovelWorld WHERE storySliceJson IS NOT NULL` — 数量一致
2. 消除双写后：创建新小说 → 生成世界 → 检查 NovelWorld 有数据、Novel 旧字段为 null
3. 移除 fallback 后：刷新页面 → 世界设定正常显示
4. Schema 移除后：`pnpm typecheck` + `pnpm test` 通过
