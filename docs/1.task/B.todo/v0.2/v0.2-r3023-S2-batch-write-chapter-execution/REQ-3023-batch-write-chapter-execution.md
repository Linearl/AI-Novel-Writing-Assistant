---
description: 在步骤6章节执行面板新增「批量写作」功能，复用现有 Pipeline API，UI 类似步骤5批量细化
---

# REQ-3023 — 步骤6批量写作

## 1. 背景

当前步骤5（节奏/拆章）有完整的「批量细化」UI（`StructuredChapterDetailCard`），支持按范围批量生成章节执行计划。但步骤6（章节执行）只有单章写作入口（`onGenerateSelectedChapter`），批量写正文只能走自动导演（auto-director）。

用户需求：在步骤6手动流程中加入「批量写作」，范围选择器类似步骤5批量细化，写完自动跑审核+修复循环（全流水线）。

### 1.1 现有能力分析

**后端 API 已完备（无需改动）**：

| API | 路径 | 用途 |
|-----|------|------|
| `runNovelPipeline` | `POST /novels/:id/pipeline/run` | 按章节范围启动全流水线 |
| `getNovelPipelineJob` | `GET /novels/:id/pipeline/jobs/:jobId` | 轮询流水线进度 |

`runNovelPipeline` 参数：
- `startOrder` / `endOrder` — 章节序号范围
- `autoReview: true` — 写完自动审核
- `autoRepair: true` — 审核后自动修复
- `skipCompleted: true` — 跳过已完成章节
- `qualityThreshold` — 质量阈值
- `provider` / `model` / `temperature` — LLM 配置

**前端已有基础设施**：
- `useNovelEditMutations` 中 `runPipelineMutation` 已封装 `runNovelPipeline`
- `pipelineJobQuery` 已封装进度轮询
- `PipelineTab` 已有完整的进度展示组件
- 步骤5 `StructuredChapterDetailCard` 的批量细化 UI 模式可复用

## 2. 目标

在步骤6章节执行面板中新增「批量写作」入口，让用户在手动流程中也能按范围批量生成正文，每章写完自动跑审核+修复循环。

## 3. 范围

### 包含

- 在 `ChapterExecutionActionPanel` 新增「批量写作」UI 区块
- 范围选择器：从当前章起连续 N 章 / 当前可见章节 / 本卷全部章节
- 复用 `runNovelPipeline` API 启动全流水线
- 复用 `pipelineJobQuery` 展示进度
- 有活跃自动导演任务时禁用按钮

### 不包含

- 后端 API 改动（已有完备支持）
- 自动导演相关改动
- PipelineJob 系统改动
- 新增审核/修复逻辑（复用现有流水线）

## 4. 非目标

- 不替代自动导演的全书自动化能力
- 不支持跨卷批量写作（按卷为单位）
- 不支持自定义审核/修复策略（使用默认配置）

## 5. EARS 验收条目

1. **WHEN** 用户在步骤6章节执行面板，**THEN** 可见「批量写作」区块
2. **WHEN** 用户选择范围（连续 N 章 / 可见 / 全卷），**THEN** 按钮文案反映选中章节数
3. **WHEN** 用户点击批量写作，**THEN** 调用 `runNovelPipeline` 并展示实时进度
4. **WHEN** 流水线运行中，**THEN** 按钮禁用，显示当前阶段和进度
5. **WHEN** 有活跃自动导演任务，**THEN** 批量写作按钮禁用并提示原因
6. **WHEN** 流水线完成，**THEN** 章节状态与自动导演产出一致（含审核+修复）

## 6. 风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 与自动导演并发冲突 | 中 | 数据不一致 | 有活跃导演任务时禁用 |
| 大批量 LLM 费用 | 低 | 费用超预期 | 显示章节数让用户确认 |
| 流水线中途失败 | 低 | 部分章节未完成 | PipelineJob 已有 skipCompleted 机制 |
