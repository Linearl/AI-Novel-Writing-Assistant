---
description: "REQ-2025 任务分解 - 高风险自动处理策略配置"
---

# REQ-2025 任务分解

## 阶段 0：需求与设计

- [x] T0.1 需求文档完成（REQ-2025.md）
- [x] T0.2 设计文档完成（design.md）
- [x] T0.3 决策日志完成（decision_log.md）

## 阶段 1：共享类型

- [ ] T1.1 在 `shared/types/novelDirector.ts` 中新增 `DirectorHighRiskHandlingStrategy` 类型和 `DirectorHighRiskStrategyConfig` 接口
- [ ] T1.2 在 `DirectorAutoExecutionPlan` 接口中新增可选字段 `highRiskStrategy`
- [ ] T1.3 构建 shared 包验证类型无误

## 阶段 2：后端逻辑

- [ ] T2.1 修改 `DirectorQualityLoopBudgetLedgerService`：`resolveDirectorQualityLoopBudgetNextAction` 接受高风险策略配置参数
- [ ] T2.2 实现 2 倍 budget 上限逻辑（当 strategy === "auto_eliminate"）
- [ ] T2.3 实现重试阈值检查（同一 issue signature 累计达到 maxAutoEliminateRetries 时强制 defer_and_continue）
- [ ] T2.4 修改 `novelDirectorAutoExecutionRuntime.ts`：从 autoExecution 状态读取 highRiskStrategy 并传递给 budget 逻辑
- [ ] T2.5 单元测试：覆盖 manual_review（默认）、auto_eliminate 两种策略、阈值耗尽回退场景

## 阶段 3：前端 UI

- [ ] T3.1 在 `NovelAutoDirectorDialog.tsx` 高级配置区域新增"风险控制"卡片组件
- [ ] T3.2 实现策略选择（人工审核 / 自动消除）+ 重试阈值配置（选择自动消除时显示）
- [ ] T3.3 仅在 `full_book_autopilot` 模式下显示风险控制卡片
- [ ] T3.4 将 highRiskStrategy 写入 autoExecutionDraft 状态
- [ ] T3.5 验证 seedPayload 中正确包含 highRiskStrategy 配置

## 阶段 4：集成验证

- [ ] T4.1 类型检查通过（pnpm typecheck）
- [ ] T4.2 单元测试通过（pnpm test）
- [ ] T4.3 手动验证：默认策略（人工审核）行为不变
- [ ] T4.4 手动验证：自动消除策略下高风险章节走修复链且 budget 放宽
- [ ] T4.5 手动验证：重试阈值耗尽后回退为阻断
