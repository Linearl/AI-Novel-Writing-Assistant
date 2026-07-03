---
description: "REQ-2025 设计文档 - 高风险自动处理策略配置的技术方案"
---

# REQ-2025 设计文档

## 1. 架构概览

本次变更涉及三层：配置 UI → 共享类型 → 后端执行逻辑。

```
用户配置 UI（NovelAutoDirectorDialog 高级配置）
  ↓ 写入
DirectorAutoExecutionPlan.highRiskStrategy
  ↓ 随 seedPayload 持久化
后端 AutoExecution Runtime 读取策略
  ↓ 影响
DirectorQualityLoopBudgetLedgerService（budget 上限调整）
  ↓ 影响
质量循环修复链行为（阻断 vs 继续修复）
```

## 2. 数据结构变更

### 2.1 新增类型（shared/types/novelDirector.ts）

```typescript
export type DirectorHighRiskHandlingStrategy = "manual_review" | "auto_eliminate";

export interface DirectorHighRiskStrategyConfig {
  /** 高风险处理策略：人工审核（默认）或自动消除 */
  strategy: DirectorHighRiskHandlingStrategy;
  /** 自动消除时的最大重试次数（同一 issue signature），默认 3 */
  maxAutoEliminateRetries?: number;
}

// 在 DirectorAutoExecutionPlan 中新增：
export interface DirectorAutoExecutionPlan {
  // ...existing fields...
  /** 高风险处理策略配置 */
  highRiskStrategy?: DirectorHighRiskStrategyConfig;
}
```

### 2.2 Budget 上限倍率

当 `strategy === "auto_eliminate"` 时，qualityLoop budget 上限调整为正常值的 2 倍：

| budget 项 | 正常值 | 高风险自动消除时 |
|-----------|--------|----------------|
| patchRepair | 2 | 4 |
| chapterRewrite | 1 | 2 |
| windowReplan | 1 | 2 |

## 3. 后端逻辑变更

### 3.1 DirectorQualityLoopBudgetLedgerService

修改 `resolveDirectorQualityLoopBudgetNextAction` 函数，接受可选的 `highRiskStrategyConfig` 参数：

- 当 `strategy === "auto_eliminate"` 时，使用 2 倍 budget 上限
- 当 `strategy === "manual_review"`（默认）时，行为不变

新增 `maxAutoEliminateRetries` 检查：
- 当同一 issue signature 的累计尝试次数（patchRepair + chapterRewrite + windowReplan）达到 `maxAutoEliminateRetries`（默认 3）时，强制返回 `defer_and_continue`（回退为阻断/跳过）

### 3.2 novelDirectorAutoExecutionRuntime.ts

在 `runFromReady` 方法中，从 `autoExecution` 状态读取 `highRiskStrategy`，传递给 budget 计算逻辑。

当 `strategy === "auto_eliminate"` 且 qualityLoop 返回 `invalid`（高风险）时：
- 不立即阻断，走修复链（与当前 patch_repair 路径一致，但使用放宽的 budget）
- 重试阈值耗尽后，行为与 `manual_review` 一致（阻断或跳过）

### 3.3 向后兼容

- `highRiskStrategy` 为可选字段，默认 `undefined` 等同于 `{ strategy: "manual_review" }`
- 现有 seedPayload 中无此字段时，行为完全不变

## 4. 前端变更

### 4.1 NovelAutoDirectorDialog.tsx

在高级配置区域（现有 autoReview/autoRepair/artifactSyncMode 配置之后）新增"风险控制"卡片：

```
┌─────────────────────────────────┐
│ 风险控制                         │
│                                  │
│ 高风险处理策略:                    │
│ ○ 人工审核（默认）                  │
│ ○ 自动消除风险                     │
│                                  │
│ [当选择"自动消除"时显示]            │
│ 重试阈值: [3] (同一问题最多重试次数)  │
│                                  │
│ 提示：自动消除模式下修复预算自动     │
│ 放宽为正常值的 2 倍                 │
└─────────────────────────────────┘
```

### 4.2 显示条件

- 仅当 `runMode === "full_book_autopilot"` 时显示
- 其他模式下隐藏或禁用（因为只有全书自动驾驶模式才会走 qualityLoop budget 链）

### 4.3 状态管理

在 `autoExecutionDraft` 状态中新增 `highRiskStrategy` 字段，随 `buildDirectorAutoExecutionPlanFromDraft` 写入 `DirectorAutoExecutionPlan`。

## 5. 关键决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 阈值粒度 | 按 issue signature | 同一类问题重试 N 次无果后应停下来，不同问题独立计数 |
| 默认策略 | 人工审核 | 向后兼容，用户主动选择自动消除 |
| budget 倍率 | 2 倍 | 平衡 token 消耗与修复充分性 |
| 是否支持忽略 | 不支持 | 高风险不应被忽略，必须通过审核或消除 |
| 阈值耗尽行为 | 回退到阻断/跳过 | 安全兜底，防止无限重试 |
