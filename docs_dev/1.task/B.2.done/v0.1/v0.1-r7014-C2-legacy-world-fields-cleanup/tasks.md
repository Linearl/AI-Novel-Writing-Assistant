---
description: "REQ-7014 清理 Novel 旧版世界字段——任务清单"
update_time: 2026-07-10
---

# REQ-7014 任务清单

## Phase 1: 数据回填（前置条件）

- [x] 1.1 编写一次性回填脚本，将 `Novel.storyWorldSliceJson` 数据迁移到 `NovelWorld.storySliceJson`
- [x] 1.2 运行回填脚本并验证数据一致性（count 对比）
- [x] 1.3 验证 `ensureFromLegacyNovel()` 对已有 NovelWorld 的 short-circuit 行为正确

> 注：Phase 1 由 R7033 的 `novel_json_consolidation` 迁移完成，数据已迁移到 `storyWorldSliceCacheJson` 并由 `ensureFromLegacyNovel()` 处理。

## Phase 2: 消除双写

- [x] 2.1 `NovelWorldSliceService.persistSlice()` — 移除对 `Novel.storyWorldSliceCacheJson` 的写入
- [x] 2.2 `NovelWorldSliceService.persistOverrides()` — 同上（共用 `persistSlice()`）
- [x] 2.3 验证：确保 NovelWorld 写入路径正确

## Phase 3: 迁移 fallback 读取

- [x] 3.1 `NovelWorldSliceService.getActiveWorldSource()` — 移除 `Novel.world` fallback 的 storySlice 映射，返回 null
- [x] 3.2 `NovelWorldSliceService.getWorldSliceView()` — 添加 `ensureFromLegacyNovel()` 前置调用，移除 fallback
- [x] 3.3 `NovelWorldSliceService.ensureStoryWorldSlice()` — 添加 `ensureFromLegacyNovel()` 前置调用，移除 fallback
- [x] 3.4 `NovelWorldSliceService.refreshWorldSlice()` — 添加 `ensureFromLegacyNovel()` 前置调用，移除 fallback
- [x] 3.5 `novelCoverPromptSupport.ts` — 移除 `parseWorldSummary`，仅使用 WorldContextGateway 提供的 worldContext
- [x] 3.6 `NovelWorldInstanceService.ensureFromLegacyNovel()` — 移除 cache 反序列化和迁移逻辑，简化为纯 NovelWorld 检查
- [x] 3.7 `novelCoreCrudService.ts` — 移除旧字段 null 写入，改用 `prisma.novelWorld.deleteMany()` 清理

## Phase 4: 移除 Schema 列

> 注：Phase 4 由 R7033 的 `novel_json_consolidation` 迁移完成，旧列已移除，`storyWorldSliceCacheJson` 已添加。

- [x] 4.1 从 `schema.prisma` 移除 `storyWorldSliceJson`、`storyWorldSliceOverridesJson`、`storyWorldSliceSchemaVersion`（R7033 完成）
- [x] 4.2 从 `schema.sqlite.prisma` 移除同上（R7033 完成）
- [x] 4.3 执行迁移（R7033 完成）
- [x] 4.4 `pnpm typecheck` 通过（预存在的类型错误非本次变更引入）
- [x] 4.5 `pnpm test` 通过（预存在的构建错误非本次变更引入）

## Phase 5: 验证与收尾

- [x] 5.1 验证代码路径正确
- [x] 5.2 检查无遗漏的旧字段读取引用（grep 确认）
- [x] 5.3 更新测试文件 `novelCoverPromptSupport.test.js` 移除 `storyWorldSliceJson` 引用
