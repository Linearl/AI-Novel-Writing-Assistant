---
reqId: 7074
title: "资源上下文重构 — 决策日志"
status: requirements_ready
priority: P3
complexity: M3
estimatedEffort: "0.5天"
version: v0.2
created: 2026-07-16
---

# REQ-7074: 资源上下文重构 — 决策日志

## 决策1: 重构粒度

**决策**：4→2-3 文件，不合并为单一大文件。

**理由**：如果 4 个文件全部合并为一个，可能超过 700 行（项目规范红线）。保留 2-3 文件结构在可维护性和收敛度之间平衡。

## 决策2: facade 模式保留

**决策**：保留 `chapterLayeredContext.ts` 作为对外 facade，内部 import 调整但外部调用方零改动。

**理由**：下游有多个 prompt 文件依赖 `chapterLayeredContext` 的导出。facade 模式可以同时满足"内部收敛"和"外部稳定"两个目标。

## 决策3: 先于 REQ-7075 执行

**理由**：FR-6（待审上下文注入）需要在上下文中新增字段。如果先做 FR-6，需要在 4 个散落的文件中分别新增；如果先做本包，只需在 1 处新增。
