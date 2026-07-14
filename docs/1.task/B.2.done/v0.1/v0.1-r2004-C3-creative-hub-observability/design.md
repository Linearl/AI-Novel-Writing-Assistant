---
description: "REQ-2004 方案设计"
---

# REQ-2004 方案设计

## 1. 方案概述

在现有 Creative Hub 三栏布局的右侧栏中新增"执行追踪"区域，通过增强 SSE 帧数据和复用 AgentTraceStore，实现 AI 执行过程的实时可观测性。核心改动分为后端 SSE 帧增强、前端步骤面板组件、token 消耗仪表三部分。

### 1.1 设计目标

1. 实时性：步骤状态随 SSE 帧实时更新，无需轮询
2. 渐进增强：SSE 帧新增字段全部 optional，兼容旧客户端
3. 复用优先：复用 AgentTraceStore 和 agent-runs API，不新建追踪表
4. 低侵入：不改变 CreativeHubLangGraph 的图结构，仅在回调中增加数据

### 1.2 关键决策

1. **步骤面板放在右侧栏而非底部**：Creative Hub 已有三栏布局，右侧栏（CreativeHubSidebar）当前承载上下文、生产状态、debug 信息，新增执行追踪 Tab 与其定位一致
2. **SSE 帧增强而非新增帧类型**：在现有 `tool_call`、`tool_result`、`run_status` 帧中增加字段，避免新增帧类型导致客户端解析复杂度上升
3. **token 数据分两阶段获取**：实时阶段从 SSE 帧增量累加，Run 结束后从 `/api/agent-runs/:id` 获取完整 metrics 校准
4. **错误分类基于 errorCode 字段**：复用 `tool_result` 帧已有的 `errorCode` 字段，扩展其枚举值

### 1.3 不在范围

- 历史 Run 浏览器
- AgentRun replay UI
- DirectorLlmUsageRecord 完整 dashboard
- Creative Hub 线程历史时间线

## 2. 实现细节

### 2.1 后端：SSE 帧增强

#### 2.1.1 `shared/types/api.ts` — 扩展帧类型

在 `CreativeHubStreamFrame` 联合类型中，扩展 `tool_call`、`tool_result`、`run_status` 的 data 类型，新增字段全部标记为 optional。

#### 2.1.2 `server/src/creativeHub/CreativeHubLangGraph.ts` — 回调增强

在 `toolExecuteNode` 的回调中，从 `AgentStep` 记录中提取 `model`、`durationMs`、`tokenUsage`、`costUsd`，注入到 SSE 帧数据中。

关键改动点：
- `onToolCall` 回调（line 285-289）：从当前 step 获取 model，注入到 frame
- `onToolResult` 回调（line 291-299）：从 step 获取 durationMs、tokenUsage、costUsd
- `run_status` 推送（line 321-326）：增加 currentStepName、currentStepSeq、completedSteps

#### 2.1.3 `server/src/creativeHub/toolEventPayloads.ts` — 输出截断

确保新增的 tokenUsage 字段在 `sanitizeCreativeHubToolOutput` 中被正确处理（不需要截断，但需要确保类型安全）。

#### 2.1.4 `server/src/routes/agentRuns.ts` — 新增 LLM usage 端点

新增 `GET /api/agent-runs/:id/llm-usage` 端点，查询 `DirectorLlmUsageRecord` 表：

```typescript
// 返回类型
interface LlmUsageRecord {
  id: string;
  promptAssetKey?: string;
  modelRoute?: string;
  provider?: string;
  model?: string;
  durationMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  recordedAt: string;
}
```

### 2.2 前端：执行追踪面板

#### 2.2.1 新组件：`CreativeHubRunTracker.tsx`

位置：`client/src/pages/creativeHub/components/CreativeHubRunTracker.tsx`

职责：
- 从 `useCreativeHubRuntime` hook 获取实时 SSE 帧数据
- 维护步骤列表状态（基于 `tool_call` / `tool_result` / `run_status` 帧）
- 渲染步骤列表（pipeline 风格）
- 渲染 token 消耗仪表

状态管理：
```typescript
interface RunStep {
  id: string;
  seq: number;
  toolName: string;
  inputSummary: string;
  model?: string;
  status: "running" | "success" | "failed" | "pending_approval";
  durationMs?: number;
  tokenUsage?: { prompt?: number; completion?: number; total?: number };
  costUsd?: number;
  errorCode?: string;
  errorMessage?: string;
  startedAt: number;
}

interface RunMetrics {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalCostUsd: number;
  totalDurationMs: number;
  models: string[];
  stepCount: number;
  successCount: number;
  failureCount: number;
}
```

#### 2.2.2 步骤项组件：`RunStepItem.tsx`

位置：`client/src/pages/creativeHub/components/RunStepItem.tsx`

渲染：
- 左侧：状态图标（Spinner/CheckCircle/XCircle/Clock）
- 中间：工具名称 + 模型标签
- 右侧：耗时
- 展开后：输入参数摘要 + token 用量

#### 2.2.3 错误详情组件：`RunStepError.tsx`

位置：`client/src/pages/creativeHub/components/RunStepError.tsx`

渲染：
- 错误类型图标 + 文案
- 建议操作
- 详细错误信息（可展开）

#### 2.2.4 Token 仪表组件：`RunTokenMeter.tsx`

位置：`client/src/pages/creativeHub/components/RunTokenMeter.tsx`

渲染：
- 进度条风格的 token 消耗可视化
- prompt / completion 分开展示
- 费用和模型列表

#### 2.2.5 集成到 `CreativeHubSidebar.tsx`

在侧栏中新增 Tab 或折叠区域：
- "上下文" Tab（现有内容）
- "执行追踪" Tab（新增）

Tab 切换使用 Zustand store 持久化。

#### 2.2.6 Hook 增强：`useCreativeHubRuntime.ts`

在 SSE 帧处理循环中（lines 210-243），增加对 `tool_call`、`tool_result`、`run_status` 新字段的解析，维护 `RunStep[]` 状态。

### 2.3 共享类型

#### 2.3.1 `shared/types/api.ts` — 帧类型扩展

```typescript
// tool_call 增强
| {
    event: "creative_hub/tool_call";
    data: {
      runId?: string;
      stepId?: string;
      toolName: string;
      inputSummary: string;
      model?: string;
      stepSeq?: number;
      totalSteps?: number;
    };
  }

// tool_result 增强
| {
    event: "creative_hub/tool_result";
    data: {
      runId?: string;
      stepId?: string;
      toolName: string;
      outputSummary: string;
      success: boolean;
      output?: Record<string, unknown>;
      errorCode?: string;
      durationMs?: number;
      tokenUsage?: { prompt?: number; completion?: number; total?: number };
      costUsd?: number;
    };
  }

// run_status 增强
| {
    event: "creative_hub/run_status";
    data: {
      runId?: string;
      status: string;
      message?: string;
      currentStepName?: string;
      currentStepSeq?: number;
      completedSteps?: number;
    };
  }
```

## 3. 数据流

```
用户发出指令
  |
  v
CreativeHubLangGraph.run()
  |
  |-- coordinator_plan 节点
  |     |-- emitFrame: run_status { status: "planning", currentStepName: "coordinator_plan", currentStepSeq: 1 }
  |
  |-- tool_execute 节点
  |     |-- onToolCall: tool_call { toolName, inputSummary, model, stepSeq: 2 }
  |     |-- onToolResult: tool_result { toolName, success, durationMs, tokenUsage, costUsd }
  |     |-- emitFrame: run_status { status: "executing", currentStepName: "tool_execute", completedSteps: 1 }
  |
  |-- task_sync 节点
  |     |-- emitFrame: run_status { status: "finalizing", currentStepName: "task_sync" }
  |     |-- emitFrame: turn_summary
  |
  v
前端 useCreativeHubRuntime
  |
  |-- 解析 SSE 帧，维护 RunStep[] 状态
  |-- 累加 RunMetrics
  |
  v
CreativeHubRunTracker 组件
  |
  |-- RunStepItem[] 步骤列表
  |-- RunTokenMeter token 仪表
  |-- RunStepError 错误详情
  |
  v
Run 结束后
  |
  |-- GET /api/agent-runs/:id → 校准最终 metrics
  |-- GET /api/agent-runs/:id/llm-usage → 补充详细 LLM 调用记录
```

## 4. 涉及文件

| 文件 | 改动类型 | 说明 |
| ---- | ---- | ---- |
| `shared/types/api.ts` | 修改 | 扩展 CreativeHubStreamFrame 类型 |
| `server/src/creativeHub/CreativeHubLangGraph.ts` | 修改 | 回调中注入 model、durationMs、tokenUsage |
| `server/src/creativeHub/toolEventPayloads.ts` | 可能修改 | 确保新字段类型安全 |
| `server/src/routes/agentRuns.ts` | 修改 | 新增 llm-usage 端点 |
| `client/src/pages/creativeHub/components/CreativeHubRunTracker.tsx` | 新增 | 执行追踪面板主组件 |
| `client/src/pages/creativeHub/components/RunStepItem.tsx` | 新增 | 步骤项组件 |
| `client/src/pages/creativeHub/components/RunStepError.tsx` | 新增 | 错误详情组件 |
| `client/src/pages/creativeHub/components/RunTokenMeter.tsx` | 新增 | Token 仪表组件 |
| `client/src/pages/creativeHub/components/CreativeHubSidebar.tsx` | 修改 | 集成执行追踪 Tab |
| `client/src/pages/creativeHub/hooks/useCreativeHubRuntime.ts` | 修改 | 解析新增 SSE 字段，维护步骤状态 |
