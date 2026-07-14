---
reqId: 7062
title: "LLM 基础设施增强"
status: requirements_ready
priority: P2
complexity: S1
estimatedEffort: "2天"
version: v0.2
created: 2026-07-14
updated: 2026-07-14
---

# REQ-7062: LLM 基础设施增强

## 概述

LLM 调用层的 4 项基础设施增强：Token 用量追踪（含 DB 持久化）、请求限制器热重载、Prompt 执行级 Token 追踪、验收状态规范化。上游仓库有完备参考实现可直接移植。

## 任务包六件套

| 文件 | 说明 |
|------|------|
| [REQ-7062.md](./REQ-7062-llm-infrastructure.md) | 需求文档（工作副本） |
| [REQ-7062-llm-infrastructure-original.md](./REQ-7062-llm-infrastructure-original.md) | 冻结副本 |
| [design.md](./design.md) | 技术设计 |
| [tasks.md](./tasks.md) | 任务清单 |
| [decision_log.md](./decision_log.md) | 决策日志 |
| [run_result.json](./run_result.json) | 执行状态 |
| README.md | 本文件 |

## 状态

- 当前阶段：requirements_ready
- 复杂度：S1
- 优先级：P2
- 预估工时：2 天
- 依赖：无
- 预估影响文件：4-6 个

## 上游参考

| 上游路径 | 说明 | 行数 |
|----------|------|------|
| `server/src/llm/usageTracking.ts` | Token 用量追踪 | 412 |
| `server/src/llm/structuredInvoke.ts` | 结构化调用（Token 追踪集成点） | 439 |
| `server/src/llm/requestLimiter.ts` | 请求限制器（热重载） | 164 |
| `server/src/prompting/prompts/novel/chapterAcceptance.prompts.ts` | 验收状态规范化 | 356 |
