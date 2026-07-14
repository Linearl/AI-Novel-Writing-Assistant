---
reqId: 7062
title: "LLM 基础设施增强 — 需求文档（冻结副本）"
status: requirements_ready
priority: P2
complexity: S1
estimatedEffort: "2天"
version: v0.2
created: 2026-07-14
updated: 2026-07-14
---

# REQ-7062: LLM 基础设施增强 — 冻结副本

> 此为需求冻结副本。工作副本见 `REQ-7062-llm-infrastructure.md`。

## 功能需求概要

| 编号 | 功能 | 优先级 | 预估 |
|------|------|--------|------|
| FR-1 | Token 用量追踪（AsyncLocalStorage + DB 持久化） | P2 | 0.8 天 |
| FR-2 | 请求限制器热重载（evictSharedLimiters） | P2 | 0.3 天 |
| FR-3 | Prompt 执行级 Token 追踪 | P2 | 0.2 天 |
| FR-4 | 验收状态规范化（normalizeAcceptanceStatus） | P2 | 0.2 天 |

## 上游参考

| 上游路径 | 说明 |
|----------|------|
| `server/src/llm/usageTracking.ts` | Token 用量追踪（412 行） |
| `server/src/llm/structuredInvoke.ts` | 结构化调用（439 行） |
| `server/src/llm/requestLimiter.ts` | 请求限制器（164 行） |
| `server/src/prompting/prompts/novel/chapterAcceptance.prompts.ts` | 验收状态（356 行） |

## 冻结日期

2026-07-14
