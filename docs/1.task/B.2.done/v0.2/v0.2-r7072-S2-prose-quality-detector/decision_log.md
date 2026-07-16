---
reqId: 7072
title: "散文质量检测器 — 决策日志"
status: requirements_ready
priority: P2
complexity: S2
estimatedEffort: "0.7天"
version: v0.2
created: 2026-07-16
---

# REQ-7072: 散文质量检测器 — 决策日志

## 决策1: 检测方式

**决策**：纯 regex（方案A），不做 LLM 复核。

**理由**：
1. 上游已验证 regex 方案效果可接受
2. 零 LLM 成本，可高频调用（每章生成后自动执行）
3. 后续可迭代加入 LLM 复核

## 决策2: 集成点选择

**决策**：`ChapterContentFinalizationService.finalizeChapterContent()` 内部，runAcceptanceGateOnly 之后、buildRuntimePackage 之前。

**理由**：此时章节正文已定稿，检测结果可直接纳入 runtimePackage，不需要额外管道步骤。

## 决策3: 从 REQ-7069 拆分为独立包

**理由**：纯函数模块，零依赖，可独立开发测试。和 FR-1（创建向导）无代码关系。
