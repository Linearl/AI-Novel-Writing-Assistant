---
reqId: 7055
title: "RAG 质量提升"
status: requirements_ready
priority: P0
complexity: C1
estimatedEffort: "3-4天"
version: v0.2
created: 2026-07-14
updated: 2026-07-14
---

# REQ-7055: RAG 质量提升

## 概述

五层 RAG 增强 — 分面检索（7 维 facet）、上下文分块（Anthropic 风格 contextual retrieval）、交叉编码重排（reranker）、检索追踪（observability）、追踪清理。

## 任务包六件套

| 文件 | 说明 |
|------|------|
| [REQ-7055.md](./REQ-7055.md) | 需求文档（工作副本） |
| [REQ-7055-original.md](./REQ-7055-original.md) | 需求文档（冻结副本） |
| [design.md](./design.md) | 技术设计 |
| [tasks.md](./tasks.md) | 任务清单 |
| [decision_log.md](./decision_log.md) | 决策日志 |
| README.md | 本文件 |

## 状态

- 当前阶段：需求就绪
- 复杂度：C1
- 优先级：P0（直接提升检索质量）
- 预估工时：3-4天
- 依赖：Qdrant 服务已部署

## 上游参考

本功能的 5 个核心组件均可直接参考上游实现：

| 组件 | 上游文件 | 行数 |
|------|----------|------|
| 分面检索 | `server/src/services/rag/chunkFacets.ts` | ~60 |
| 上下文分块 | `server/src/services/rag/RagContextualChunkService.ts` | ~200 |
| 交叉编码重排 | `server/src/services/rag/RagRerankerService.ts` | ~150 |
| 检索追踪 | `server/src/services/rag/RagRetrievalTracer.ts` | ~200 |
| 追踪清理 | `server/src/services/rag/RagRetrievalTraceRetention.ts` | ~45 |
| Prompt | `server/src/prompting/prompts/rag/contextualChunk.prompts.ts` | ~100 |
