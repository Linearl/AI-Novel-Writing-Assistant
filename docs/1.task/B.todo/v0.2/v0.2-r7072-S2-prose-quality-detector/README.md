---
reqId: 7072
title: "散文质量检测器"
status: requirements_ready
priority: P2
complexity: S2
estimatedEffort: "0.7天"
version: v0.2
created: 2026-07-16
---

# REQ-7072: 散文质量检测器

## 概述

实现 9 种问题码的纯正则文本检测器，零 LLM 成本，嵌入章节生成管道末尾。参考上游 `ProseQualityDetector.ts`（450 行）。

## 六件套

| 文件 | 说明 |
|------|------|
| [REQ-7072-prose-quality-detector.md](./REQ-7072-prose-quality-detector.md) | 需求文档（工作副本） |
| [REQ-7072-prose-quality-detector-original.md](./REQ-7072-prose-quality-detector-original.md) | 冻结副本 |
| [tasks.md](./tasks.md) | 任务清单 |
| [design.md](./design.md) | 技术设计 |
| [decision_log.md](./decision_log.md) | 决策日志 |
| [run_result.json](./run_result.json) | 执行状态 |
| README.md | 本文件 |

## 状态

- 当前阶段：requirements_ready
- 复杂度：S2
- 优先级：P2
- 预估工时：0.7 天
- 前置依赖：无（零外部依赖纯函数）
- 主要文件：2 个新建

## 上游参考

| 上游路径 | 说明 | 行数 |
|----------|------|------|
| `temp/AI-Novel-Writing-Assistant-main/server/src/services/novel/runtime/proseQuality/ProseQualityDetector.ts` | 散文质量检测器 | 450 |
