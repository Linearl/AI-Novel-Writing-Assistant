---
description: 在步骤6章节执行面板新增「批量写作」功能，复用现有 Pipeline API，UI 类似步骤5批量细化
---

# REQ-3023 — 步骤6批量写作（原始冻结副本）

> 本文件为 REQ 工作副本的初始版本冻结，后续修改仅更新工作副本。

## 1. 背景

当前步骤5（节奏/拆章）有完整的「批量细化」UI（`StructuredChapterDetailCard`），支持按范围批量生成章节执行计划。但步骤6（章节执行）只有单章写作入口（`onGenerateSelectedChapter`），批量写正文只能走自动导演（auto-director）。

用户需求：在步骤6手动流程中加入「批量写作」，范围选择器类似步骤5批量细化，写完自动跑审核+修复循环（全流水线）。

### 1.1 现有能力分析

**后端 API 已完备（无需改动）**：

| API | 路径 | 用途 |
|-----|------|------|
| `runNovelPipeline` | `POST /novels/:id/pipeline/run` | 按章节范围启动全流水线 |
| `getNovelPipelineJob` | `GET /novels/:id/pipeline/jobs/:jobId` | 轮询流水线进度 |

**前端已有基础设施**：
- `useNovelEditMutations` 中 `runPipelineMutation` 已封装
- `pipelineJobQuery` 已封装进度轮询
- 步骤5 `StructuredChapterDetailCard` 的批量细化 UI 模式可复用

## 2. 目标

在步骤6章节执行面板中新增「批量写作」入口，让用户在手动流程中也能按范围批量生成正文。

## 3. 范围

### 包含

- `ChapterExecutionActionPanel` 新增批量写作 UI 区块
- 范围选择器：连续 N 章 / 当前可见 / 本卷全部
- 复用 `runNovelPipeline` API
- 有活跃自动导演任务时禁用

### 不包含

- 后端 API 改动
- 自动导演相关改动

## 4. 非目标

- 不替代自动导演
- 不支持跨卷批量写作

## 5. EARS 验收条目

1. 步骤6面板可见「批量写作」区块
2. 范围选择器反映章节数
3. 点击后调用 `runNovelPipeline` 并展示进度
4. 运行中按钮禁用
5. 有活跃导演任务时禁用并提示
6. 完成后章节状态与自动导演产出一致
