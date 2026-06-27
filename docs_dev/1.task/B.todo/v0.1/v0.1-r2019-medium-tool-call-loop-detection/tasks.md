---
description: "REQ-2019 任务拆解"
---

# REQ-2019 任务拆解

## 阶段零：准备

- [x] 阅读现有 `RunExecutionService.runActionPlan` 代码
- [x] 理解 `ToolCall` 接口和 `AgentToolError` 用法

## 阶段一：实现

- [ ] T1 新增 `buildToolCallKey` 辅助函数（stableStringify 排序 key）
- [ ] T2 在 `runActionPlan` 中新增 `toolCallHistory: Map<string, number>`
- [ ] T3 在工具调用前检查 count ≥ 3 → 抛出 `AgentToolError("LOOP_DETECTED", ...)`
- [ ] T4 支持环境变量 `TOOL_CALL_LOOP_THRESHOLD` 配置阈值（默认 3）

## 阶段二：测试

- [ ] T5 单元测试：正常调用不触发
- [ ] T6 单元测试：相同参数第 3 次触发 LOOP_DETECTED
- [ ] T7 单元测试：不同参数不触发（即使同一工具）
- [ ] T8 单元测试：阈值可配置

## 阶段三：验证

- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test` 通过
- [ ] 新测试全部通过
