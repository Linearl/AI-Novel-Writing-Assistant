---
description: "REQ-2019 决策日志"
---

# REQ-2019 决策日志

## D-01：检测层级——runtime 层 vs 文本层

- **日期**：2026-06-27
- **决策**：在 `RunExecutionService.runActionPlan` 层实现结构化检测
- **理由**：文本层无法可靠解析 JSON 结构，runtime 层有完整的 `ToolCall` 结构体
- **备选**：扩展 `StreamingRepetitionDetector`（否决：误报率高）

## D-02：循环 key 使用 stableStringify

- **日期**：2026-06-27
- **决策**：对 `call.input` 做 key 排序后 JSON.stringify
- **理由**：LLM 输出的 JSON 字段顺序可能不同，但语义相同应视为重复
- **备选**：直接 JSON.stringify（否决：`{a:1,b:2}` 和 `{b:2,a:1}` 会被判为不同）

## D-03：默认阈值 3 次

- **日期**：2026-06-27
- **决策**：默认 3 次，支持环境变量覆盖
- **理由**：2 次可能是合理重试，3 次基本确认循环
