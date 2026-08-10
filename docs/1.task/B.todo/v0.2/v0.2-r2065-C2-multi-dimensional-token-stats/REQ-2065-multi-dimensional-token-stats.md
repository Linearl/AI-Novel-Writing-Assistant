---
description: "REQ-2065 多维度 Token 统计功能 — 需求工作副本"
---

# REQ-2065: 多维度 Token 统计功能

## 1. 需求概述

### 1.1 背景

项目已有 LLM Token 追踪基础设施（`usageTracking.ts` monkey-patch + 多表写入），但存在三个维度的覆盖缺陷：

- **数据丢失**：Creative Hub（创作工作台）的所有 LLM 调用（对话、工具执行、规划）未接入 `runWithLlmUsageTracking`，Token 消耗完全不记录
- **统计口径不全**：小说级聚合（`novelTokenUsageSummary`）仅查 `NovelWorkflowTask` + `GenerationJob` 两张表，遗漏 `LlmTokenUsage` 表中的数据
- **步骤类型缺失**：无法按操作类型（撰写/修复/审校/对话等）分组统计 Token 消耗

### 1.2 需求目标

1. 补全所有 LLM 调用路径的 Token 采集，确保手动和自动操作均计入
2. `LlmTokenUsage` 表增加 `stepType` 字段，支持按步骤类型分组
3. 重写小说级统计为以 `LlmTokenUsage` 为唯一真相源
4. 新增步骤级 Token 占比查询 API
5. 在创作工作台侧边栏增加 Token 统计面板

### 1.3 非目标

- 不做章节级 Token 统计（后续迭代）
- 不做 Token-to-USD 成本计算（需要维护定价表，后续迭代）
- 不做 worldBuilding/outline 等无 novelId 的 graph 节点 Token 追踪
- 不修改 `NovelWorkflowTask` / `GenerationJob` 的计数器逻辑（保留用于任务级实时计数）

---

## 2. 验收条目（EARS 格式）

### 2.1 数据采集层

| ID | 验收条目 |
| ---- | ---- |
| EARS-01 | WHEN `AgentRuntime.start()` 执行规划阶段（`createStructuredPlan`），产生的 LLM 调用自动写入 `LlmTokenUsage` 表，`novelId` 正确，`stepType` 为 `"planning"` |
| EARS-02 | WHEN `AgentRuntime.start()` 执行工具执行阶段（`executor.runActionPlan`），工具内部产生的 LLM 调用自动写入 `LlmTokenUsage` 表，`novelId` 正确，`stepType` 为 `"tool"` |
| EARS-03 | WHEN 用户在 Creative Hub 发送对话消息（`chat.ts` 直接对话路径），且 `novelId` 存在时，产生的 LLM 调用写入 `LlmTokenUsage` 表，`stepType` 为 `"chat"` |
| EARS-03b | WHEN Director 流水线执行时，已有的 `runWithLlmUsageTracking` context 包含 stepType 映射（根据 nodeKey），LlmTokenUsage 记录的 stepType 非 NULL |
| EARS-04 | WHEN 角色补充/一致性检测/角色导入流程执行 LLM 调用，写入 `LlmTokenUsage` 表，`stepType` 为 `"character"` |
| EARS-05 | `recordTrackedLlmUsage` 守卫逻辑允许仅有 `novelId`（无需 `workflowTaskId` 或 `generationJobId`）的 context 通过 |
| EARS-06 | `LlmTokenUsage` 表新增 `stepType` 字段（String?），迁移脚本正常执行 |

### 2.2 查询层

| ID | 验收条目 |
| ---- | ---- |
| EARS-07 | `novelTokenUsageSummary` 以 `LlmTokenUsage` 表为数据源，返回的 `totalTokens` 覆盖所有 LLM 调用（含创作工作台） |
| EARS-08 | `GET /api/novels/:novelId/token-stats` 返回 `{ total, byStep }` 结构，`byStep` 按 `stepType` 分组，每项包含 `inputTokens`、`outputTokens`、`totalTokens`、`callCount`、`percentage` |
| EARS-09 | 步骤占比计算正确：每个 stepType 的 `percentage = stepTotalTokens / grandTotalTokens`，所有百分比之和为 1 |

### 2.3 前端展示层

| ID | 验收条目 |
| ---- | ---- |
| EARS-10 | Creative Hub 侧边栏显示 Token 统计面板，包含总量卡片组（累计 Token / 调用次数 / 平均消耗）和步骤占比饼图 |
| EARS-11 | 当未绑定小说时，统计面板不显示或显示空状态提示 |
| EARS-12 | 统计面板数据随小说绑定自动加载，支持手动刷新 |

### 2.4 历史数据

| ID | 验收条目 |
| ---- | ---- |
| EARS-13 | 回填脚本可执行，根据 `promptName` 推断历史记录的 `stepType`，无法推断的保持 NULL |

---

## 3. 影响范围

### 3.1 修改文件清单

| 分类 | 文件 | 改动类型 |
| ------ | ---- | ---- |
| Prisma | `server/src/prisma/schema.prisma` | 修改（加 stepType） |
| 迁移 | `server/src/prisma/migrations/` | 自动生成 |
| LLM 基建 | `server/src/llm/usageTracking.ts` | 修改（context + 守卫 + 写入） |
| Creative Hub | `server/src/orchestration/agent/runtime/AgentRuntime.ts` | 修改（2 处注入） |
| Director | `server/src/orchestration/pipeline/NovelDirectorService.ts` | 修改（buildDirectorUsageContext 增加 stepType） |
| Director | `server/src/orchestration/pipeline/runtime/core/DirectorNodeRunner.ts` | 修改（line 134 增加 stepType） |
| Chat | `server/src/modules/chat/http/chat.ts` | 修改（直接对话路径 1 处注入） |
| Character | `server/src/services/character/preparation/characterPreparationSupplemental.ts` | 修改（3 处注入） |
| Character | `server/src/services/character/consistency/detector.ts` | 修改（1 处注入） |
| Character | `server/src/services/novel/novelCoreCharacterService.ts` | 修改（1 处注入） |
| 查询 | `server/src/services/novel/novelTokenUsageSummary.ts` | 修改（切换数据源） |
| 查询 | `server/src/services/novel/novelTokenUsageByStep.ts` | **新增** |
| API | `server/src/modules/llm/http/llm.ts` | 修改（新增端点） |
| Shared | `shared/types/tokenUsage.ts` 或 `shared/types/task.ts` | 修改/新增 |
| 前端 API | `client/src/api/llm/tokenUsage.ts` | **新增** |
| 前端组件 | `client/src/pages/creativeHub/components/CreativeHubTokenStatsPanel.tsx` | **新增** |
| 前端布局 | `client/src/pages/creativeHub/components/CreativeHubSidebar.tsx` | 修改（插入面板） |
| 回填脚本 | `scripts/data/backfill-step-type.ts` | **新增** |

### 3.2 涉及模块

- `server/src/llm/` — Token 追踪基建
- `server/src/orchestration/agent/` — Creative Hub Agent Runtime
- `server/src/modules/chat/` — 对话 HTTP 入口
- `server/src/services/character/` — 角色服务
- `server/src/services/novel/` — 小说查询服务
- `server/src/modules/llm/` — LLM API 端点
- `shared/types/` — 共享类型
- `client/src/pages/creativeHub/` — 创作工作台 UI

---

## 4. 风险与约束

| 风险 | 等级 | 应对 |
| ---- | ---- | ---- |
| AsyncLocalStorage 嵌套 merge 策略导致 stepType 混淆 | 中 | `mergeContextValue` 取非空优先（内层覆盖外层），需验证 AgentRuntime 包裹后的传播链 |
| 切换 novelTokenUsageSummary 数据源导致旧 UI 数值变化 | 中 | 先写集成测试验证新旧口径差异 |
| Creative Hub 接入后 DB 写入量增加 | 低 | 写入已是 fire-and-forget，现有基础设施可承受 |
| 历史数据回填推断不准确 | 低 | 无法推断的保持 NULL，不影响新数据 |

---

## 5. 假设

1. 创作工作台的 LLM 调用均经过 `structuredInvoke.ts` 或 `promptRunner.ts`，能被 monkey-patch 捕获
2. `runWithLlmUsageTracking` 的 AsyncLocalStorage 在 `AgentRuntime.start()` 的同步包裹后能正确传播到所有异步子调用
3. `recharts` 饼图能满足步骤占比可视化需求（项目已有 recharts ^3.9.1）
