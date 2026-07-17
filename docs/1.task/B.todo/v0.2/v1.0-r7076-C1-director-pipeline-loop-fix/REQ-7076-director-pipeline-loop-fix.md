---
id: REQ-7076
title: "Auto-Director Structured Outline Pipeline 死循环修复"
status: in_progress
priority: C1
version: "1.0"
created: "2026-07-16"
updated: "2026-07-16"
---

# REQ-7076 — Auto-Director Structured Outline Pipeline 死循环修复

## 1. 目标

修复 Auto-Director 在 structured_outline 阶段（节奏板 → 拆章 → 细化）的死循环问题，确保 pipeline 能正确推进到章节执行阶段。

## 2. 范围

### 包含

- 修复 `resolveAssetFirstRecoveryFromSnapshot` 路由逻辑
- 修复 `persistStructuredOutlineVolumeSnapshot` 后的数据验证
- 修复 `mergeVolumeWorkspaceInput` 中 beat sheet 误清空问题
- 相关单元测试

### 不包含

- Pipeline 架构重构（模块粒度拆分属后续优化）
- 新增功能

## 3. 非目标

- 不改变 pipeline 的整体阶段顺序
- 不修改 beat sheet 生成逻辑本身

## 4. EARS 验收条目

| ID | 验收条件 |
|----|----------|
| AC-1 | structured_outline 阶段完成后，点击"确认继续"不再重入 beat_sheet 步骤 |
| AC-2 | `beatSheetReady` 标志在 beat sheet 持久化后为 true |
| AC-3 | `mergeVolumeWorkspaceInput` 在 volumeLevelStructureChanged 为 true 时不清空已有的 beat sheets |
| AC-4 | pipeline 能从 structured_outline 正常推进到 chapter_execution |
| AC-5 | 所有相关单元测试通过 |

## 5. 风险与未决项

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 修复可能影响现有正常 pipeline 流程 | 高 | 先跑全量测试，再手动验证端到端流程 |
| cursor 计算逻辑复杂，修改可能引入新 bug | 中 | 保持最小改动原则，仅修复确认的根因 |
