---
reqId: 7061
title: "中文本地化 — 需求文档（冻结副本）"
status: requirements_ready
priority: P0
complexity: S1
estimatedEffort: "1天"
version: v0.2
created: 2026-07-14
updated: 2026-07-14
---

# REQ-7061: 中文本地化 — 冻结副本

> 此为需求冻结副本。工作副本见 `REQ-7061-chinese-localization.md`。

## 功能需求概要

| 编号 | 功能 | 优先级 | 预估 |
|------|------|--------|------|
| FR-1 | Context Group ID 中文标签映射（32 个） | P0 | 0.2 天 |
| FR-2 | 章节上下文块标签中文化 | P0 | 0.2 天 |
| FR-3 | toListBlock 空兜底文案 → "无" | P0 | 0.05 天 |
| FR-4 | 角色引导/关系阶段文本中文化 | P0 | 0.05 天 |

## 上游参考

| 上游路径 | 说明 |
|----------|------|
| `server/src/prompting/context/contextGroupLabels.ts` | 32 个 context group ID 中文映射 |
| `server/src/prompting/prompts/novel/chapterLayeredContextShared.ts` | 上下文块标签定义 |

## 冻结日期

2026-07-14
