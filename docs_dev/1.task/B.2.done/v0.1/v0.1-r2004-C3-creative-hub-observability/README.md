---
description: "REQ-2004 Creative Hub Agent 执行可观测性增强 任务总线"
---

# REQ-2004 Creative Hub Agent 执行可观测性增强

> 创建日期：2026-06-27
> 目标版本：v0.1
> 状态：⏳ 进行中

---

## 1. 任务概述

### 1.1 需求来源

用户反馈：在 Creative Hub 中发出指令后，界面上只能看到"规划中..."或"执行中..."等笼统状态，无法得知 AI 正在执行哪个具体步骤、调用了什么工具、消耗了多少 token。后端已有完整的追踪基础设施（AgentTraceStore、usageTracking、SSE 帧），但前端未充分利用。

### 1.2 核心内容

1. SSE 帧增强：`tool_call`、`tool_result`、`run_status` 帧增加 model、durationMs、tokenUsage 等字段
2. 前端执行追踪面板：在 Creative Hub 右侧栏新增可折叠的步骤列表面板
3. Token 消耗仪表：实时显示本次 Run 的 token 消耗和估算费用
4. 错误详情：失败时显示具体错误类型和建议操作
5. LLM usage 查询 API：新增端点暴露 DirectorLlmUsageRecord 数据

### 1.3 前置条件

- AgentTraceStore 已正确记录 Run/Step 数据
- CreativeHubLangGraph SSE 帧推送链路稳定
- `/api/agent-runs` 路由已可用
- CreativeHubSidebar 组件可扩展

---

## 2. 任务包结构

| 文件 | 说明 | 可否省略 |
| ---- | ---- | -------- |
| `README.md` | 本任务总线 | 否 |
| `REQ-2004-original.md` | 需求原始冻结副本 | 否 |
| `REQ-2004.md` | 需求工作副本（持续更新） | 否 |
| `tasks.md` | 任务拆解 | 否 |
| `design.md` | 方案设计 | 否 |
| `decision_log.md` | 决策留痕 | 否 |
| `run_result.json` | 执行快照 | 否 |

---

## 3. 任务状态

| 时间 | 状态 | 说明 |
| ---- | ---- | ---- |
| 2026-06-27 | 🆕 激活 | req 路由创建任务包 |
| 2026-06-27 | ⏳ 进行中 | requirements / design / tasks 生成中 |

---

## 4. 执行清单

- [x] 生成 REQ-2004.md（需求工作副本）
- [x] 生成 REQ-2004-original.md（需求冻结副本）
- [x] 生成 design.md
- [x] 生成 tasks.md
- [x] 生成 decision_log.md
- [x] 生成 run_result.json
- [ ] dev 路由推进实现
