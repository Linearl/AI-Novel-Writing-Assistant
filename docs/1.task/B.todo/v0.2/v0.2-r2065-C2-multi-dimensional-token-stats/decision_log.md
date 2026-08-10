---
description: "REQ-2065 多维度 Token 统计功能 — 决策日志"
---

# REQ-2065 决策日志

## D1: 统计真相源选择

- **日期**: 2026-07-24
- **决策**: 以 `LlmTokenUsage` 表为唯一统计真相源，而非 `NovelWorkflowTask`/`GenerationJob` 的计数器
- **理由**: `LlmTokenUsage` 是逐条记录（per-call），粒度最细，已包含 `novelId`、`chapterId`、`promptName` 等维度；计数器表只做增量累加，无法按步骤类型分组
- **备选方案**: 在 `NovelWorkflowTask` 上增加 `stepType` 列做分组计数 → 否决，因为需要维护多张表的 stepType 一致性，且无法回溯单条记录
- **影响**: `novelTokenUsageSummary` 需要重写查询逻辑

## D2: stepType 传播方式

- **日期**: 2026-07-24
- **决策**: 通过 `runWithLlmUsageTracking` 的 `AsyncLocalStorage` context 传播 `stepType`，不在 `LlmUsageTrackingMeta` 中传递
- **理由**: `stepType` 是调用链级别的语义（整个 planning 阶段都是 "planning"），不是单次 LLM 调用级别的参数。context 的 merge 策略（内层覆盖外层）正好满足"外层设 tool，内层工具自行设更具体值"的需求
- **备选方案**: 在 factory.ts 的 `LlmUsageTrackingMeta` 中传递 → 否决，因为需要每个 LLM 实例化时都指定 stepType，改动面太大

## D3: 守卫逻辑放宽策略

- **日期**: 2026-07-24
- **决策**: 仅将 `novelId` 加入守卫通过条件，不移除其他条件
- **理由**: 保持向后兼容——没有 `novelId` 也没有 `workflowTaskId` 的调用（如诊断、连通性测试）仍然不记录，避免噪声数据
- **风险**: 低——Creative Hub 调用目前完全不记录，放宽后是纯增量

## D4: 前端面板位置

- **日期**: 2026-07-24
- **决策**: 在 Creative Hub 侧边栏（右侧 320px）的 `CreativeHubRunTracker` 下方插入 Token 统计面板
- **理由**: 侧边栏已是元数据和状态展示区域，RunTracker 已有实时逐条数据，统计面板是其持久化补充
- **备选方案**: 在小说详情页内嵌统计区块 → 保留为后续迭代，当前优先在 Creative Hub 内闭环

## D5: Director 流水线 stepType 映射策略

- **日期**: 2026-07-24
- **决策**: 在 Director 已有的 `runWithLlmUsageTracking` context 中增加 stepType，通过 `nodeKey` 映射
- **理由**: Director 流水线已有完整的 tracking 注入，只缺 stepType。`nodeKey`（如 `chapter_draft`、`quality_review`）包含足够的语义信息来推断 stepType
- **备选方案 A**: 不改 Director 注入，仅靠回填脚本推断 → 否决，新数据仍然没有 stepType
- **备选方案 B**: 在 `DirectorLlmUsageRecord` 表增加 stepType 列 → 否决，该表已有 nodeKey 覆盖类似语义，且本次以 LlmTokenUsage 为唯一统计源

## D6: chat.ts 双路径处理

- **日期**: 2026-07-24
- **决策**: 仅在直接对话路径（非 agent 模式）注入 `runWithLlmUsageTracking`，且仅在 `body.novelId` 存在时生效
- **理由**: agent 模式路径已通过 AgentRuntime 注入（T1.5）覆盖；`novelId` 可选，无 novelId 时不记录（符合非目标约束）
- **风险**: 低——全局模式对话的 Token 消耗不记录是预期行为

## D7: novelTokenUsageSummary 数据源切换保留 fallback

- **日期**: 2026-07-24
- **决策**: `novelTokenUsageSummary` 以 `LlmTokenUsage` 为主数据源，但当该表无数据时回退到旧查询（NovelWorkflowTask + GenerationJob）
- **理由**: Director 流水线的历史调用已写入 LlmTokenUsage（workflowTaskId 能通过守卫），但 GenerationJob 中不属于任何 WorkflowTask 的极旧记录可能未写入。保留 fallback 确保零数据丢失
- **备选方案**: 一次性迁移所有旧数据到 LlmTokenUsage → 否决，工作量大且风险不可控，fallback 更安全
