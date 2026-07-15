---
reqId: 7061
title: "中文本地化"
status: requirements_ready
priority: P0
complexity: S1
estimatedEffort: "1天"
version: v0.2
created: 2026-07-14
updated: 2026-07-14
---

# REQ-7061: 中文本地化

## 概述

将系统内大量英文上下文块标签切换为中文显示，提升国内用户使用体验。主要涉及 prompt 上下文块标签、context group ID 映射标签、toListBlock 空兜底文案等。上游仓库有完整中文标签映射可直接复用。

## 任务包六件套

| 文件 | 说明 |
|------|------|
| [REQ-7061.md](./REQ-7061-chinese-localization.md) | 需求文档（工作副本） |
| [REQ-7061-chinese-localization-original.md](./REQ-7061-chinese-localization-original.md) | 冻结副本 |
| [design.md](./design.md) | 技术设计 |
| [tasks.md](./tasks.md) | 任务清单 |
| [decision_log.md](./decision_log.md) | 决策日志 |
| [run_result.json](./run_result.json) | 执行状态 |
| README.md | 本文件 |

## 状态

- 当前阶段：requirements_ready
- 复杂度：S1
- 优先级：P0（零成本高收益）
- 预估工时：1 天
- 依赖：无
- 预估影响文件：3-5 个

## 上游参考

| 上游路径 | 说明 | 行数 |
|----------|------|------|
| `server/src/prompting/prompts/novel/chapterLayeredContextShared.ts` | 上下文块标签定义 | 420 |
| `server/src/prompting/context/contextGroupLabels.ts` | 32 个 context group ID → 中文映射 | 38 |
