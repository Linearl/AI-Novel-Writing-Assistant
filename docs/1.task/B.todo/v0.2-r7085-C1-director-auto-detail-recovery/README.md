---
description: "REQ-7085 自动导演自主处理未细化章节 — 任务包 README"
req_id: "7085"
title: "自动导演自主处理未细化章节"
version: "0.2"
status: "in_progress"
complexity: "C1"
priority: "P1"
created: "2026-07-18"
updated: "2026-07-18"
---

# v0.2-r7085-C1 自动导演自主处理未细化章节

## 概述

修复自动导演在检测到目标章节缺少细化（taskSheet / sceneCards）时应自动回到拆章阶段补全，而不是报错停止。

## 问题

- 导演写完第 1 卷（10 章）后标记 `succeeded`，剩余 20 章无法自动继续
- 手动创建新任务时 `volume_chapter_detail_bundle_generate` 失败
- 恢复逻辑认为"产物完整"直接跳过，不检查待写章节是否已细化

## 修复方向

1. 恢复逻辑增加"待写章节是否已细化"检查
2. Pipeline 增加未细化章节自动触发
3. 拆章阶段失败时自动回到 `structured_outline` 补全

## 文件

- [REQ-original](REQ-7085-director-auto-detail-recovery-original.md) — 冻结副本
- [REQ](REQ-7085-director-auto-detail-recovery.md) — 工作副本
- [tasks](tasks.md) — 任务清单
- [design](design.md) — 技术设计
- [decision_log](decision_log.md) — 决策记录
