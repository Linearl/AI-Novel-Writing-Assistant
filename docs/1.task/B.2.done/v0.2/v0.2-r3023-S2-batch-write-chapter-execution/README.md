# README — REQ-3023 步骤6批量写作

- **编号**: REQ-3023
- **标题**: 步骤6章节执行面板批量写作
- **优先级**: S2
- **版本**: 0.2
- **状态**: done
- **创建日期**: 2026-07-17
- **更新日期**: 2026-07-17

## 概述

在步骤6（章节执行）面板新增「批量写作」入口，复用现有 `runNovelPipeline` API，UI 交互参照步骤5的批量细化。用户可按范围（连续 N 章 / 可见章节 / 全卷）批量生成正文，每章自动完成写作→审核→修复→状态同步全流水线。

## 关键发现

后端零改动：`POST /novels/:id/pipeline/run` 已完全支持按范围批量写作 + 审核修复循环。纯前端新增 4-5 个文件。

## 六件套

| 文件 | 状态 |
|------|------|
| README.md | ✅ |
| REQ-3023-batch-write-chapter-execution.md | ✅ |
| REQ-3023-batch-write-chapter-execution-original.md | ✅ |
| design.md | ✅ |
| tasks.md | ✅ |
| decision_log.md | ✅ |
| run_result.json | ✅ |
