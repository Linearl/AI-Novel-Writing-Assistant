---
description: "REQ-2060 全局审校问题驱动章节修复闭环 — 任务包 README"
req_id: "2060"
title: "全局审校问题驱动章节修复闭环"
version: "0.2"
status: "in_progress"
complexity: "C1"
priority: "P1"
created: "2026-07-18"
updated: "2026-07-18"
---

# v0.2-r2060-C1 全局审校问题驱动章节修复闭环

## 概述

打通全局审校（GlobalReviewIssue）与章节修复（ChapterRepair）之间的完整闭环，让全局审校发现的问题能够直接驱动章节修复，并在修复通过后自动标记已修复。

## 问题

- 全局审校发现问题后，用户必须手动复制描述、定位章节、触发修复、手动标记已修复
- 全局问题与章节修复之间没有代码通路，`GlobalReviewIssue.status='fixed'` 永远是人工翻转
- UI 只有"确认/标记/忽略"三个按钮，没有"执行修复"入口
- 章节修复不知道全局问题的存在，无法在修复 prompt 中获取跨章上下文

## 修复方向

1. repair schema 扩展 `globalReviewIssueIds` 字段
2. 修复运行时加载 GlobalReviewIssue 并合并到修复上下文
3. 修复通过后自动回写全局问题状态
4. UI 增加"执行修复""调整方案"按钮
5. 受影响章节全部 approved 后自动标记 fixed

## 文件

- [REQ-original](REQ-2060-global-review-to-chapter-repair-original.md) — 冻结副本
- [REQ](REQ-2060-global-review-to-chapter-repair.md) — 工作副本
- [tasks](tasks.md) — 任务清单
- [design](design.md) — 技术设计
- [decision_log](decision_log.md) — 决策记录
