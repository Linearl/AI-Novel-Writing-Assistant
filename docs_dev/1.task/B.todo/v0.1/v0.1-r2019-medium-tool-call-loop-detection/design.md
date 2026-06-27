---
description: "REQ-2019 方案设计"
---

# REQ-2019 方案设计

> 最后更新：2026-06-27

---

## 1. 架构决策

### 1.1 检测层级选择

**选择**：在 `RunExecutionService.runActionPlan` 层检测

**理由**：
- 该层是工具调用的唯一入口，所有 `ToolCall` 都经过此处
- 可直接访问结构化的 `call.tool` + `call.input`，无需解析文本
- 与现有重试逻辑（`executeToolWithRetry`）同层，错误处理一致

**备选方案**：在 `StreamingRepetitionDetector` 文本层扩展  
**否决原因**：文本层无法可靠解析 JSON 结构（空格、字段顺序差异），误报率高

### 1.2 循环 Key 设计

```typescript
function buildToolCallKey(call: ToolCall): string {
  return `${call.tool}:${stableStringify(call.input)}`;
}
```

使用 `stableStringify`（排序 key 的 JSON.stringify）确保相同语义的 input 产生相同 key。

### 1.3 阈值选择

**选择**：3 次

**理由**：
- 2 次可能是合理的重试（如第一次失败后换参数重试）
- 3 次相同参数基本确认是循环
- 阈值可配置（环境变量 `TOOL_CALL_LOOP_THRESHOLD`）

## 2. 数据流设计

```
RunExecutionService.runActionPlan
  │
  ├── toolCallHistory: Map<string, number>  (新增，跨 action 累积)
  │
  ├── for each action:
  │     for each call:
  │       ├── key = buildToolCallKey(call)
  │       ├── count = toolCallHistory.get(key) ?? 0
  │       ├── if count >= 3:
  │       │     throw AgentToolError("LOOP_DETECTED", "...")
  │       ├── toolCallHistory.set(key, count + 1)
  │       └── executeToolCall(call)  (现有逻辑)
  │
  └── (正常执行)
```

## 3. 边界情况

| 场景 | 处理 |
|------|------|
| 工具调用失败后重试（不同参数） | key 不同，不触发 |
| 工具调用失败后重试（相同参数） | 计数 +1，第 3 次触发 |
| 不同 action 中的相同调用 | 跨 action 累积，仍触发 |
| dryRun 调用 | 计入历史（防止 dryRun 循环） |
| 并行工具调用 | runActionPlan 是串行的，无并发问题 |

## 4. 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `server/src/agents/runtime/RunExecutionService.ts` | 修改 | 新增 `toolCallHistory` + 检测逻辑 |
| `server/src/agents/types.ts` | 不改 | 复用现有 `AgentToolError` |
| `server/tests/agents/toolCallLoopDetection.test.js` | 新建 | 单元测试 |
