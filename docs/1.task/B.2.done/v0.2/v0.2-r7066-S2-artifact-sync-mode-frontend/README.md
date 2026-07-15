---
description: "REQ-7066: artifactSyncMode 前端选择器 — 任务包 README"
reqId: 7066
title: "artifactSyncMode 前端选择器"
status: requirements_ready
priority: P2
complexity: S2
estimatedEffort: "1天"
version: v0.2
created: 2026-07-14
updated: 2026-07-14
---

## 概要

为章节产出管线的 artifactSyncMode（adaptive/deferred/strict）补齐前端 UI 选择器。

## 背景

后端已完整实现三种同步模式（adaptive/deferred/strict），覆盖 ChapterArtifactBackgroundSyncService、ChapterArtifactSyncService、chapterRuntimePipeline 等 15+ 文件。Shared 类型 `artifactSyncModeSchema` 已定义。

前端仅在 `client/src/api/novel/production.ts` 导入了类型，用户无法选择模式。

## 关联

- 架构方案：`docs/2.tech/architecture/chapter-editor/chapter-output-pipeline-optimization-plan.md`
