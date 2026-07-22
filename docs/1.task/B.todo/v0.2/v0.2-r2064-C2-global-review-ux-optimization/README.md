---
description: "REQ-2064 全局审校用户体验优化 — README"
reqId: 2064
title: "全局审校用户体验优化"
status: pending
priority: P1
complexity: C2
estimatedEffort: "1天"
version: v0.2
created: 2026-07-19
updated: 2026-07-19T15:00:00.000Z
---

# REQ-2064: 全局审校用户体验优化

## 概要

优化全局审校页面的布局、进度显示和状态反馈。

## 改动范围

- `client/src/pages/novels/GlobalReviewPage.tsx` — 三栏布局、进度格式
- `client/src/pages/novels/components/` — 可能新增筛选面板组件
- `server/src/modules/novel/production/http/novelReviewRoutes.ts` — AI复核 API
