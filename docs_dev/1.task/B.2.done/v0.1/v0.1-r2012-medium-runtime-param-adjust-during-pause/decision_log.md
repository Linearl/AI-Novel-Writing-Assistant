---
description: "REQ-2012 决策留痕"
---

# REQ-2012 决策留痕

## 决策记录

### D-01：新增 commandType vs 扩展 policy_update

| 项目 | 内容 |
| ---- | ---- |
| 决策日期 | 2026-06-26 |
| 决策者 | 自行决定 |
| 决策内容 | 新增 `update_execution_settings` 命令类型，而非扩展现有 `policy_update` |
| 决策理由 | policy_update 操作 RuntimePolicySnapshot（运行时策略层），autoReview 等存储于 seedPayload（任务计划层）。两者存储位置、生命周期、持久化方式不同，合在一起违反单一职责。新增独立命令保持语义清晰，前端也可独立调用。 |
| 备选方案 | 方案 B：扩展 policy_update 包含所有字段，按字段路由到不同存储位置。拒绝原因：会导致一个 command 操作两种不同存储层，增加理解和维护成本。 |

### D-02：modelTier 放在哪里

| 项目 | 内容 |
| ---- | ---- |
| 决策日期 | 2026-06-26 |
| 决策者 | 自行决定 |
| 决策内容 | modelTier 下拉选择器放入 `TaskCenterRuntimePolicyCard`，与现有 `allowExpensiveReview` 相邻 |
| 决策理由 | modelTier 是运行时策略层参数（已由 policy_update 支持），不属于 autoExecutionPlan。放在策略卡中语义正确，且不需要新增后端代码。 |
| 备选方案 | 方案 B：将 modelTier 放入"编辑高级设置"面板。拒绝原因：高级设置面板聚焦于 seedPayload 层参数，modelTier 不属于该层。但可在面板中增加一个快捷入口链接到策略卡。 |

### D-03：暂停后修改是否允许在任意状态

| 项目 | 内容 |
| ---- | ---- |
| 决策日期 | 2026-06-26 |
| 决策者 | 自行决定 |
| 决策内容 | 仅允许在任务暂停（checkpoint_reached）或失败（failed）状态下修改执行设置 |
| 决策理由 | 运行中（running）修改可能会导致当前批次执行到一半时参数变化，行为难以预测。排队中（queued）修改可直接取消重新创建。暂停态是最安全的修改窗口。 |
| 备选方案 | 方案 B：允许在任意状态修改。拒绝原因：运行中修改风险高，需额外的状态协调逻辑，超出本次需求范围。 |
