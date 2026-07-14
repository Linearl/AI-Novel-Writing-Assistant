---
description: "REQ-7014 清理 Novel 旧版世界字段——决策日志"
update_time: 2026-07-08
---

# REQ-7014 决策日志

## D1: 不清理 Novel.worldId

**日期**：2026-07-08
**决策**：本次不清理 `Novel.worldId` 字段
**原因**：`worldId` 仍在活跃使用 — 客户端 UI 直接写入、RAG upsert 触发、`NovelWorldSliceService.getActiveWorldSource()` fallback。清理需要更大范围的重构（涉及客户端表单、RAG 系统、基础信息保存流程），风险和工作量不成比例。
**影响**：`worldId` 保留，三个 slice 相关字段移除。

## D2: 一次性回填优先于 on-read 迁移

**日期**：2026-07-08
**决策**：先执行一次性数据回填，再移除 fallback 路径
**原因**：`ensureFromLegacyNovel()` 已实现 on-read 迁移，但它只在读取时触发。如果先移除 fallback 路径再回填，中间窗口期可能导致数据丢失。先回填确保所有数据已在 NovelWorld 中，再安全移除 fallback。
**影响**：Phase 1 回填是 Phase 3 移除 fallback 的前置条件。

## D3: 保留 NovelWorldInstanceService.ensureFromLegacyNovel() 但简化

**日期**：2026-07-08
**决策**：保留 `ensureFromLegacyNovel()` 方法，但移除其对旧字段的读取
**原因**：该方法仍负责检查 NovelWorld 是否存在并按需创建（从 World 源创建），只是不再从 Novel 旧字段迁移数据。完全删除该方法需要重构所有调用方，不值得。
**影响**：方法保留，内部逻辑简化。

## D4: NovelWorldSliceService 从未读取 NovelWorld.storySliceJson——迁移路径被绕过

**日期**：2026-07-10
**决策**：Phase 3 移除 fallback 读取前，必须先将 `NovelWorldSliceService` 的切片读取路径切换到 `NovelWorld.storySliceJson`。
**原因**：代码审查发现一个核心矛盾——`NovelWorldSliceService` 中所有读取切片数据的方法（`getActiveWorldSource()`、`getWorldSliceView()`、`ensureStoryWorldSlice()`、`refreshWorldSlice()`）只从 `NovelWorld.structuredDataJson` 读取结构化数据，切片数据（`storySliceJson`、`storySliceOverridesJson`）则直接回退到 `novel.storyWorldSliceJson` / `novel.storyWorldSliceOverridesJson`，完全不读 `NovelWorld.storySliceJson`。这意味着：

- `persistSlice()` 虽然已双写到 `NovelWorld.storySliceJson`（第 242-253 行），但**没有任何代码读取它**。
- `NovelWorldInstanceService.ensureFromLegacyNovel()` 已实现从 Noval 旧字段到 `NovelWorld.storySliceJson` 的一次性迁移，但迁移后的数据被 `NovelWorldSliceService` 完全绕过了。
- 如果直接移除 Noval 旧字段，切片读取逻辑会全部断裂。

**影响**：Phase 3 的工作量需要增加——不仅要删除 fallback 代码，还要新增从 `NovelWorld.storySliceJson` 的读取路径。这是 Phase 1~3 的前置修正项，必须先让 `NovelWorldSliceService` 读 `NovelWorld` 自己的列，才能安全移除 Noval 旧字段。

**修复顺序修正**：
1. **新增**：让 `NovelWorldSliceService` 从 `NovelWorld.storySliceJson` / `NovelWorld.storySliceOverridesJson` 读取切片数据
2. 然后：移除对 `novel.storyWorldSliceJson` 的 fallback 读取（原 Phase 3）
3. 然后：移除 `persistSlice()` 中写 Noval 旧字段的逻辑（原 Phase 2）
4. 其余 Phase 不变
