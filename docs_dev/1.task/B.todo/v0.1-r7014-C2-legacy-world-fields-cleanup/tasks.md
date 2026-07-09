---
description: "REQ-7014 清理 Novel 旧版世界字段——任务清单"
update_time: 2026-07-08
---

# REQ-7014 任务清单

## Phase 1: 数据回填（前置条件）

- [ ] 1.1 编写一次性回填脚本，将 `Novel.storyWorldSliceJson` 数据迁移到 `NovelWorld.storySliceJson`
- [ ] 1.2 运行回填脚本并验证数据一致性（count 对比）
- [ ] 1.3 验证 `ensureFromLegacyNovel()` 对已有 NovelWorld 的 short-circuit 行为正确

## Phase 2: 消除双写

- [ ] 2.1 `NovelWorldSliceService.persistSlice()` — 移除对 `Novel.storyWorldSliceJson` 的写入
- [ ] 2.2 `NovelWorldSliceService.persistOverrides()` — 移除对 `Novel.storyWorldSliceOverridesJson` 的写入（如存在）
- [ ] 2.3 验证：创建新小说 → 生成世界 → 检查 NovelWorld 有数据、Novel 旧字段为 null

## Phase 3: 迁移 fallback 读取

- [ ] 3.1 `NovelWorldSliceService.getActiveWorldSource()` (line 132-134) — 移除 `Novel.world` fallback
- [ ] 3.2 `NovelWorldSliceService.getWorldSliceView()` (line 264) — 移除 `novel.storyWorldSliceJson` fallback
- [ ] 3.3 `NovelWorldSliceService.ensureStoryWorldSlice()` (line 303,307) — 移除 fallback
- [ ] 3.4 `NovelWorldSliceService.refreshWorldSlice()` (line 335) — 移除 fallback
- [ ] 3.5 `novelCoverPromptSupport.ts` (line 118) — 改读 NovelWorld
- [ ] 3.6 `NovelWorldInstanceService.ensureFromLegacyNovel()` — 简化为纯 NovelWorld 检查
- [ ] 3.7 `novelCoreCrudService.ts` (line 440,442) — 移除旧字段 null 写入

## Phase 4: 移除 Schema 列

- [ ] 4.1 从 `schema.prisma` 移除 `storyWorldSliceJson`、`storyWorldSliceOverridesJson`、`storyWorldSliceSchemaVersion`
- [ ] 4.2 从 `schema.sqlite.prisma` 移除同上
- [ ] 4.3 执行 `prisma migrate dev --name remove-legacy-world-slice-fields`
- [ ] 4.4 `pnpm typecheck` 通过
- [ ] 4.5 `pnpm test` 通过

## Phase 5: 验证与收尾

- [ ] 5.1 手动验证：创建小说 → 生成世界 → 世界设定正常显示 → 刷新后数据不丢失
- [ ] 5.2 检查是否有遗漏的旧字段引用（grep `storyWorldSlice`）
- [ ] 5.3 更新相关文档（如有）
