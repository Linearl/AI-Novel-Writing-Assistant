---
description: "REQ-2065 多维度 Token 统计功能 — 任务包 README"
update_time: 2026-07-24
---

# REQ-2065: 多维度 Token 统计功能

## 元信息

| 字段 | 内容 |
| ---- | ---- |
| 任务编号 | REQ-2065 |
| 版本 | v0.2 |
| 复杂度 | C2 |
| 优先级 | P2 |
| 状态 | ✅ 验证通过（V5 待实际 Director 运行确认） |
| 创建日期 | 2026-07-24 |
| 更新日期 | 2026-07-24 |

## 问题概述

当前项目 Token 统计存在三个核心缺陷：

1. **创作工作台（Creative Hub）LLM 调用未接入 tracking** — 所有对话和工具调用的 Token 消耗 = 0
2. **小说级统计仅覆盖自动导演流水线** — `novelTokenUsageSummary` 只查 `NovelWorkflowTask` + `GenerationJob`，遗漏创作工作台和独立服务调用
3. **无步骤类型区分** — `LlmTokenUsage` 缺少 `stepType` 字段，无法区分撰写/修复/审校/对话等步骤类型的 Token 消耗

## 文件清单

| 文件 | 说明 |
| ---- | ---- |
| [README.md](README.md) | 本文件 |
| [REQ-2065-multi-dimensional-token-stats.md](REQ-2065-multi-dimensional-token-stats.md) | 工作副本 |
| [REQ-2065-multi-dimensional-token-stats-original.md](REQ-2065-multi-dimensional-token-stats-original.md) | 冻结副本 |
| [tasks.md](tasks.md) | 任务分解（3 阶段 17 项 + 7 项验证） |
| [design.md](design.md) | 技术设计 |
| [decision_log.md](decision_log.md) | 决策日志 |
| [run_result.json](run_result.json) | 执行状态 |

## 关键设计

- `LlmTokenUsage` 表新增 `stepType` 字段，枚举值覆盖 draft/repair/review/outline/planning/style/chat/tool/character
- 放宽 `recordTrackedLlmUsage` 守卫逻辑，`novelId` 单独即可通过
- `AgentRuntime.start()` 包裹 `runWithLlmUsageTracking`，打通 Creative Hub → LlmTokenUsage 写入链路
- Director 流水线已有的 `runWithLlmUsageTracking` 增加 stepType 映射（根据 nodeKey）
- `chat.ts` 直接对话路径（非 agent 模式）条件注入 tracking
- 新增 `/api/novels/:novelId/token-stats` API，返回总量 + 按步骤分组的 Token 统计
- `novelTokenUsageSummary` 切换到 `LlmTokenUsage` 为主数据源，保留 fallback 兼容旧数据
- 前端在 Creative Hub 侧边栏插入 Token 统计面板，使用 recharts 饼图展示步骤占比
