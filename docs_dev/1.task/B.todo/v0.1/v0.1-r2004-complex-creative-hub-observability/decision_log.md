---
description: "REQ-2004 决策留痕"
---

# REQ-2004 决策日志

## D1: 步骤面板放在右侧栏而非底部

| 字段 | 内容 |
| ---- | ---- |
| 日期 | 2026-06-27 |
| 决策人 | AI |
| 决策 | 执行追踪面板集成到 CreativeHubSidebar 中，作为 Tab 或折叠区域 |
| 原因 | Creative Hub 已有三栏布局（左侧线程列表、中间对话、右侧上下文），右侧栏当前承载上下文和 debug 信息，执行追踪与其定位一致。底部空间已被对话输入框占据，增加面板会压缩对话区域。 |
| 影响 | 复用现有布局，不引入新的页面结构 |
| 备选方案 | 底部抽屉面板 — 会压缩对话区域，且与现有三栏布局不协调 |

## D2: SSE 帧增强而非新增帧类型

| 字段 | 内容 |
| ---- | ---- |
| 日期 | 2026-06-27 |
| 决策人 | AI |
| 决策 | 在现有 `tool_call`、`tool_result`、`run_status` 帧中增加 optional 字段，不新增帧类型 |
| 原因 | 新增帧类型需要客户端增加新的事件处理器，增加解析复杂度。在现有帧中增加 optional 字段是渐进增强，旧客户端忽略新字段即可。 |
| 影响 | 共享类型定义需要扩展，但所有新增字段 optional，不破坏现有接口 |
| 备选方案 | 新增 `creative_hub/step_progress` 帧类型 — 更干净但需要客户端增加新事件处理逻辑 |

## D3: token 数据分两阶段获取

| 字段 | 内容 |
| ---- | ---- |
| 日期 | 2026-06-27 |
| 决策人 | AI |
| 决策 | 实时阶段从 SSE 帧增量累加 token 数据，Run 结束后从 `/api/agent-runs/:id` 获取完整 metrics 校准 |
| 原因 | SSE 帧中的 token 数据是每个步骤的增量，可能存在精度问题（如中间步骤未完全记录）。Run 结束后 AgentTraceStore 已计算完整的 AgentRunMetrics，用其做最终校准更准确。 |
| 影响 | 前端需要维护增量状态 + 最终校准两层逻辑 |
| 备选方案 | 仅在 Run 结束后展示 token 数据 — 实时性差，用户等待时间长时体验不好 |

## D4: 错误分类基于 errorCode 字段

| 字段 | 内容 |
| ---- | ---- |
| 日期 | 2026-06-27 |
| 决策人 | AI |
| 决策 | 复用 `tool_result` 帧已有的 `errorCode` 字段，扩展其枚举值来区分错误类型 |
| 原因 | errorCode 字段已存在于帧定义中，扩展枚举值比新增字段更简洁。后端在 catch 块中设置对应的 errorCode 即可。 |
| 影响 | 需要定义 errorCode 枚举值与用户可见文案的映射表 |
| 备选方案 | 新增 `errorCategory` 字段 — 增加字段数量，语义与 errorCode 重叠 |

## D5: 不新建追踪表，复用 AgentTraceStore

| 字段 | 内容 |
| ---- | ---- |
| 日期 | 2026-06-27 |
| 决策人 | AI |
| 决策 | 不新建任何追踪相关的 Prisma 表，完全复用已有的 AgentRun / AgentStep / AgentApproval |
| 原因 | AgentTraceStore 已经记录了完整的 Run/Step 数据，包括 provider、model、tokenUsage、costUsd、durationMs。新增表只会增加维护成本和数据不一致风险。 |
| 影响 | 前端通过 SSE 帧获取实时数据，通过 API 获取历史数据，两者数据源一致 |
| 备选方案 | 新建 `CreativeHubRunTrace` 表 — 数据冗余，且与 AgentTraceStore 语义重叠 |
