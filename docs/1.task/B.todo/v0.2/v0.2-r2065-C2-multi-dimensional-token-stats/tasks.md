---
description: "REQ-2065 多维度 Token 统计功能 — 任务分解"
---

# REQ-2065 任务分解

## 阶段一：数据层修复（预计 1-2 天）

- [x] **T1.1** Prisma Schema 增加 `stepType` 字段 + 复合索引，生成迁移
  - 文件：`server/src/prisma/schema.prisma`
  - 验证：`pnpm db:migrate` 成功，`prisma studio` 可见新字段

- [x] **T1.2** `LlmUsageTrackingContext` 增加 `stepType` 字段
  - 文件：`server/src/llm/usageTracking.ts`（interface + merge 逻辑）
  - 验证：`pnpm typecheck` 通过

- [x] **T1.3** 放宽 `recordTrackedLlmUsage` 守卫逻辑
  - 文件：`server/src/llm/usageTracking.ts` line 288
  - 改动：`novelId` 单独可通过守卫
  - 验证：单元测试验证仅有 novelId 的 context 不被丢弃

- [x] **T1.4** `recordTrackedLlmUsage` 写入 `LlmTokenUsage` 时传递 `stepType`
  - 文件：`server/src/llm/usageTracking.ts` line 299 的 `create` data
  - 验证：写入后 DB 中 `stepType` 字段有值

- [x] **T1.5** `AgentRuntime.start()` 注入 `runWithLlmUsageTracking`（规划阶段 + 工具执行阶段）
  - 文件：`server/src/orchestration/agent/runtime/AgentRuntime.ts` line 148, 206
  - 验证：Creative Hub 对话后 `LlmTokenUsage` 表有对应记录

- [x] **T1.6** `chat.ts` 直接对话路径注入 `runWithLlmUsageTracking`
  - 文件：`server/src/modules/chat/http/chat.ts` line ~234（直接对话模式的 `llm.stream()` 调用）
  - 注意：仅包裹直接对话路径（line 160+），agent 模式路径已被 T1.5 覆盖
  - 注意：`body.novelId` 是可选的，需要条件判断——有 novelId 时包裹，无 novelId 时跳过
  - 验证：直接对话（非 agent 模式）+ 有 novelId → `LlmTokenUsage` 表有 `stepType: "chat"` 记录

- [x] **T1.7** Character 服务注入 `runWithLlmUsageTracking`（6 个调用点）
  - 文件：`characterPreparationSupplemental.ts`（3 处）、`detector.ts`（1 处）、`novelCoreCharacterService.ts`（1 处）
  - 验证：角色相关操作后 `LlmTokenUsage` 表有 `stepType: "character"` 记录

- [x] **T1.8** Director 流水线现有 `runWithLlmUsageTracking` 注入增加 stepType 映射
  - 文件：`NovelDirectorService.ts`（`buildDirectorUsageContext`）、`DirectorNodeRunner.ts`（line 134）
  - 改动：根据 `nodeKey`/`contract.nodeKey` 映射 stepType（含 draft→draft, repair→repair, review→review, outline→outline）
  - 注意：DirectorLlmUsageRecord 表不需要改 schema，stepType 信息已有 nodeKey 覆盖
  - 验证：Director 运行后 LlmTokenUsage 记录的 stepType 非 NULL

## 阶段二：查询层 + API（预计 1 天）

- [x] **T2.1** Shared Types 新增 `StepTokenUsageSummary` 和 `NovelTokenStatsResponse`
  - 文件：`shared/types/tokenUsage.ts`（新增）或 `shared/types/task.ts`（追加）
  - 验证：`pnpm --filter @ai-novel/shared build` 通过

- [x] **T2.2** 重写 `novelTokenUsageSummary`，以 `LlmTokenUsage` 为数据源
  - 文件：`server/src/services/novel/novelTokenUsageSummary.ts`
  - 注意：保留 fallback — 当 `LlmTokenUsage` 无数据时回退到旧查询（NovelWorkflowTask + GenerationJob），确保老数据不丢失
  - 验证：小说列表页 Token 显示值覆盖所有 LLM 调用（含 Creative Hub）

- [x] **T2.3** 新增 `novelTokenUsageByStep` 步骤级聚合查询
  - 文件：`server/src/services/novel/novelTokenUsageByStep.ts`（新增）
  - 验证：单元测试验证分组和百分比计算

- [x] **T2.4** 新增 `GET /api/novels/:novelId/token-stats` API 端点
  - 文件：`server/src/modules/llm/http/llm.ts`
  - 验证：`curl` 调用返回正确的 `{ total, byStep }` 结构

- [x] **T2.5** 集成测试：验证新旧口径一致性
  - 验证：新 `novelTokenUsageSummary` 返回值 >= 旧值（因新增 creative hub 数据）
  - 注：主测试 `volumeChapterListChunking.test.js` 存在已有失败（与本次改动无关）；planner 测试 62/62 通过；typecheck + build 全量通过

## 阶段三：前端展示（预计 1-2 天）

- [x] **T3.1** 新增前端 API 调用函数
  - 文件：`client/src/api/llm/tokenUsage.ts`（新增）
  - 验证：类型正确，TanStack Query 集成

- [x] **T3.2** 新增 `CreativeHubTokenStatsPanel` 组件
  - 文件：`client/src/pages/creativeHub/components/CreativeHubTokenStatsPanel.tsx`（新增）
  - 内容：总量卡片组 + recharts 步骤占比饼图
  - 验证：组件渲染正确，空状态处理

- [x] **T3.3** 在 `CreativeHubSidebar` 中插入统计面板
  - 文件：`client/src/pages/creativeHub/components/CreativeHubSidebar.tsx`
  - 位置：`CreativeHubRunTracker` 下方
  - 验证：绑定小说后面板显示数据，未绑定时显示空状态

- [x] **T3.4** 历史数据回填脚本
  - 文件：`scripts/data/backfill-step-type.ts`（新增）
  - 验证：脚本执行后历史记录的 `stepType` 被正确推断

## 全量验证

- [x] **V1** `pnpm typecheck` 通过
- [x] **V2** `pnpm test:planner` 通过（62/62）；主测试 `volumeChapterListChunking` 存在已有失败（与本次无关）
- [x] **V3** `pnpm build` 通过
- [x] **V4** 手动验证：Creative Hub 对话 → 侧边栏 Token 统计面板显示数据
  - API 端点返回正确结构 `{ total, byStep }`，步骤分布: draft 83.2%, review 13.4%, character 2.0%, repair 1.4%
- [ ] **V5** 手动验证：auto-director 运行后 → 统计面板包含 draft/review 等步骤
  - 注：需实际触发 Director 运行验证；代码已通过 typecheck，mapNodeKeyToStepType 逻辑正确
- [x] **V6** 手动验证：Director 运行后 → LlmTokenUsage 记录的 stepType 与 nodeKey 映射一致
  - 数据库验证：novel.chapter.writer → draft, novel.world.generate_from_theme → draft
- [x] **V7** 手动验证：小说列表页 Token 显示值 >= 旧值（fallback 兼容）
  - 小说列表 API 返回: 14.8M / 2.5M / 0 tokens
