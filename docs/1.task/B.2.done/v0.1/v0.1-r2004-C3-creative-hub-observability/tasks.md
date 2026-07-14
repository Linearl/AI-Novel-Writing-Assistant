---
description: "REQ-2004 任务拆解"
---

# REQ-2004 任务拆解

> 状态：⏳ 进行中（完成后改为 ✅ 全部完成）

## 任务概述

### 1. 来源

用户反馈 — Creative Hub 发出指令后只能看到"规划中..."/"执行中..."，无法得知 AI 正在执行哪个步骤、调用了什么工具、消耗了多少 token。

### 2. 问题

后端已有完整的追踪基础设施（AgentTraceStore、usageTracking、SSE 帧），但前端未充分利用，用户端体验仍是黑盒。

### 3. 需求

- 后端：SSE 帧增强 + LLM usage 查询 API
- 前端：执行追踪面板 + token 消耗仪表
- 共享：类型定义扩展

### 4. 验收标准

> 见 [REQ-2004.md](./REQ-2004.md) 第 4 节。

## 任务清单

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | 扩展共享类型：CreativeHubStreamFrame 帧类型增强 | P0 | 0.5h | ⬜ 待开始 |
| T2 | 后端：CreativeHubLangGraph 回调注入 model/durationMs/tokenUsage | P0 | 1.5h | ⬜ 待开始 |
| T3 | 后端：run_status 帧增加步骤进度信息 | P0 | 1h | ⬜ 待开始 |
| T4 | 后端：新增 GET /api/agent-runs/:id/llm-usage 端点 | P1 | 1h | ⬜ 待开始 |
| T5 | 前端：useCreativeHubRuntime hook 增强，解析新增 SSE 字段 | P0 | 1.5h | ⬜ 待开始 |
| T6 | 前端：CreativeHubRunTracker 主组件（步骤列表 + 状态管理） | P0 | 2h | ⬜ 待开始 |
| T7 | 前端：RunStepItem 步骤项组件 | P0 | 1h | ⬜ 待开始 |
| T8 | 前端：RunStepError 错误详情组件 | P1 | 1h | ⬜ 待开始 |
| T9 | 前端：RunTokenMeter token 仪表组件 | P1 | 1.5h | ⬜ 待开始 |
| T10 | 前端：集成到 CreativeHubSidebar（Tab 切换） | P0 | 1h | ⬜ 待开始 |
| T11 | 前端：ActivityFeed 过滤逻辑调整（tool_call/tool_result 可见性开关） | P1 | 0.5h | ⬜ 待开始 |
| T12 | 编写单元测试 | P1 | 2h | ⬜ 待开始 |
| T13 | 端到端验证：Creative Hub 完整流程 | P1 | 1h | ⬜ 待开始 |

---

## 逐项展开

### T1: 扩展共享类型

**目标**: 在 `shared/types/api.ts` 中扩展 `CreativeHubStreamFrame` 类型定义。

**改动点**:
- `shared/types/api.ts` — tool_call、tool_result、run_status 的 data 类型扩展

**DoD**:
- 新增字段全部标记为 optional
- TypeScript 编译通过
- shared 包 build 成功

---

### T2: 后端 SSE 帧增强 — tool_call/tool_result

**目标**: 在 `CreativeHubLangGraph` 的回调中注入步骤级元数据。

**改动点**:
- `server/src/creativeHub/CreativeHubLangGraph.ts` — onToolCall、onToolResult 回调
- `server/src/creativeHub/toolEventPayloads.ts` — 确保新字段不被截断

**DoD**:
- `tool_call` 帧包含 `model`、`stepSeq` 字段
- `tool_result` 帧包含 `durationMs`、`tokenUsage`、`costUsd` 字段
- 新字段从 AgentStep 记录中正确提取

---

### T3: 后端 run_status 帧增强

**目标**: 在 run_status 帧中增加步骤进度信息。

**改动点**:
- `server/src/creativeHub/CreativeHubLangGraph.ts` — 所有 emitFrame 调用点

**DoD**:
- run_status 帧包含 `currentStepName`、`currentStepSeq`、`completedSteps`
- 图节点名称正确映射为用户可读的步骤名

---

### T4: 后端 LLM usage 查询端点

**目标**: 新增 `GET /api/agent-runs/:id/llm-usage` 端点。

**改动点**:
- `server/src/routes/agentRuns.ts` — 新增路由

**DoD**:
- 端点返回指定 run 的所有 DirectorLlmUsageRecord
- 返回字段包含 model、durationMs、promptTokens、completionTokens、totalTokens
- 按 recordedAt 排序

---

### T5: 前端 hook 增强

**目标**: 在 `useCreativeHubRuntime` 中解析新增 SSE 字段，维护步骤状态。

**改动点**:
- `client/src/pages/creativeHub/hooks/useCreativeHubRuntime.ts`

**DoD**:
- 维护 `RunStep[]` 状态，从 tool_call/tool_result 帧更新
- 维护 `RunMetrics` 累计状态
- Run 结束时触发 API 校准

---

### T6: 前端执行追踪主组件

**目标**: 创建 `CreativeHubRunTracker` 组件。

**改动点**:
- `client/src/pages/creativeHub/components/CreativeHubRunTracker.tsx` — 新增

**DoD**:
- 渲染步骤列表（pipeline 风格）
- 当前步骤高亮
- 底部显示 token 消耗摘要
- 支持折叠/展开

---

### T7: 前端步骤项组件

**目标**: 创建 `RunStepItem` 组件。

**改动点**:
- `client/src/pages/creativeHub/components/RunStepItem.tsx` — 新增

**DoD**:
- 显示状态图标、工具名称、模型标签、耗时
- 可展开查看输入参数摘要
- 进行中状态有动画

---

### T8: 前端错误详情组件

**目标**: 创建 `RunStepError` 组件。

**改动点**:
- `client/src/pages/creativeHub/components/RunStepError.tsx` — 新增

**DoD**:
- 根据 errorCode 显示用户友好文案和建议操作
- 详细错误信息可展开

---

### T9: 前端 Token 仪表组件

**目标**: 创建 `RunTokenMeter` 组件。

**改动点**:
- `client/src/pages/creativeHub/components/RunTokenMeter.tsx` — 新增

**DoD**:
- 显示 prompt/completion/total token 数
- 显示估算费用
- 显示使用的模型列表
- 实时更新

---

### T10: 集成到侧栏

**目标**: 在 `CreativeHubSidebar` 中集成执行追踪 Tab。

**改动点**:
- `client/src/pages/creativeHub/components/CreativeHubSidebar.tsx`

**DoD**:
- 侧栏顶部增加 Tab 切换（上下文 / 执行追踪）
- Tab 状态持久化到 Zustand store
- 执行追踪 Tab 渲染 CreativeHubRunTracker

---

### T11: ActivityFeed 过滤调整

**目标**: 让 tool_call 和 tool_result 在 ActivityFeed 中可选可见。

**改动点**:
- `client/src/pages/creativeHub/components/CreativeHubActivityFeed.tsx`

**DoD**:
- 增加 store 开关控制是否显示工具调用事件
- 默认关闭（保持现有行为）

---

### T12: 单元测试

**目标**: 覆盖新增逻辑。

**改动点**:
- `server/tests/` — 新增 SSE 帧增强相关测试
- `client/` — 新增组件渲染测试

**DoD**:
- 后端：SSE 帧包含新增字段
- 后端：llm-usage 端点返回正确数据
- 前端：步骤列表正确渲染
- 前端：错误详情正确分类显示

---

### T13: 端到端验证

**目标**: 在真实环境中验证完整流程。

**验证步骤**:
1. 启动 `pnpm dev`
2. 打开 Creative Hub
3. 发出一个会触发多步骤执行的指令
4. 观察执行追踪面板实时更新
5. 验证 token 消耗仪表数据
6. 模拟一个失败场景，验证错误详情

**DoD**:
- 步骤列表实时更新
- token 数据与后端一致
- 错误分类正确显示
