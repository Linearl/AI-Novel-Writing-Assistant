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
