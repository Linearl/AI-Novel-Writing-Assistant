---
description: "REQ-7085 自动导演自主处理未细化章节 — 决策记录"
---

# decision_log.md — REQ-7085

## D1：修复位置选择

**决策**：在恢复逻辑层修复，而非在自动执行层

**理由**：
- 恢复逻辑是导演判断"下一步做什么"的核心入口
- 在恢复层修复可以让所有进入路径（`resume_from_checkpoint`、`approve_gate`、`continue`）都受益
- 自动执行层的 `prepareRequestedAutoExecutionState` 只负责范围计算，不应承担"是否需要补全细化"的判断

## D2：复用已有字段

**决策**：复用 `generatedChapterCount`、`chapterCount`、`hasMissingExecutionContractInRange` 等已有字段

**理由**：
- 这些字段已在 `loadDirectorTakeoverState` 中计算
- 不需要新增数据库查询或字段
- `hasMissingExecutionContractInRange` 专门用于检测目标范围内缺失细化的章节

## D3：不修改默认范围

**决策**：不修改 `resolveDirectorAutoExecutionRange` 的 `preferredChapterCount=10` 默认值

**理由**：
- 默认 10 章是合理的批次大小，避免单次执行范围过大
- 通过 `autoExecutionPlan: { mode: "book" }` 可以覆盖为全部章节
- 修改默认值可能影响现有的单卷执行流程
