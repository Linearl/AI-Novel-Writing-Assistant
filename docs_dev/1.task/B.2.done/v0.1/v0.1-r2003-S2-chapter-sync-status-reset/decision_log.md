---
description: "REQ-2003 决策留痕"
---

# REQ-2003 决策日志

## D1: 判定依据为执行合同存在性

| 字段 | 内容 |
| ---- | ---- |
| 日期 | 2026-06-26 |
| 决策人 | AI |
| 决策 | 以 `taskSheet` 或 `sceneCards` 非空作为"已细化"的判定标准 |
| 原因 | taskSheet 和 sceneCards 是步骤5细化的核心产出物，代表章节已具备执行条件。与 `plannerPersistence.ts` 中已有的判定逻辑对齐。 |
| 影响 | 仅需在同步层增加简单判定，不引入新的状态枚举或复杂依赖 |
| 备选方案 | 检查 `purpose`/`boundary` 字段 — 这些字段更偏向规划语义，不如 taskSheet/sceneCards 直接代表"可执行" |

## D2: 不修改 `volumePlanChangeDetection.ts`

| 字段 | 内容 |
| ---- | ---- |
| 日期 | 2026-06-26 |
| 决策人 | AI |
| 决策 | 保持 `preserveWorkflowState` 的计算逻辑不变，在 `VolumeChapterSyncService` 的更新分支中增加中间判定 |
| 原因 | `preserveWorkflowState` 的语义是"是否保留已有工作流状态"，对于无内容章节它正确返回 `false`（因为确实没有需要保留的状态）。问题在于重置时不应一律设为 `unplanned`，而应检查执行合同。因此修改点在消费端而非计算端。 |
| 影响 | 改动范围更小，不影响其他消费 `preserveWorkflowState` 的路径 |
| 备选方案 | 修改 `volumePlanChangeDetection.ts` 让 `preserveWorkflowState` 也考虑执行合同 — 会改变该字段的语义，影响面更大 |

## D3: 新建章节也应用相同规则

| 字段 | 内容 |
| ---- | ---- |
| 日期 | 2026-06-26 |
| 决策人 | AI |
| 决策 | 新建章节同步时，若有执行合同则直接设置 `chapterStatus: "pending_generation"` |
| 原因 | 保持更新和创建两条路径的行为一致性。如果更新路径会将有执行合同的章节设为 `pending_generation`，新建路径也应如此。 |
| 影响 | 新建章节不再需要额外的 `plannerPersistence` 调用来推进状态 |
| 备选方案 | 新建章节统一设为 `unplanned`，依赖后续流程推进 — 增加不必要的状态转换步骤 |
