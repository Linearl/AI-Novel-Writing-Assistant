---
description: "REQ-2019 重复工具调用循环检测"
---

# REQ-2019 重复工具调用循环检测

## 需求描述

在 Creative Hub Agent 执行管线中，当 LLM 反复输出相同参数的工具调用时（例如连续 3 次调用 `search_knowledge` 且 input 完全相同），系统应自动中断执行并返回明确的错误提示，引导模型换策略。

## 问题背景

现有的 `StreamingRepetitionDetector`（REQ-2002）工作在文本层，通过 n-gram 重复率检测 LLM 输出的死循环。但它对**结构级循环**覆盖不足：

- LLM 输出的 JSON 工具调用格式可能每次略有不同（空格、字段顺序），文本检测器可能不触发
- 工具调用的语义重复（相同 tool + 相同 input）需要结构化解析才能可靠检测

## 解决方案

在 `RunExecutionService.runActionPlan` 的工具调用循环中，维护一个 `Map<string, number>` 记录每个工具调用的出现次数。key 为 `${tool}:${JSON.stringify(sortedInput)}`，当 count ≥ 3 时中断。

## 验收标准

1. 同一工具 + 相同参数调用 3 次 → 打断执行，返回 `LOOP_DETECTED`
2. 不同参数的同一工具调用不触发
3. 不同工具的调用不触发
4. 错误消息为中文，引导模型换策略
5. 单元测试覆盖全部边界用例
