---
description: "文笔体系自动闭环设计方案"
---

# 设计文档

## 补丁A 方案

在 `updateChapter` 保存成功后，异步调用 `ChapterEditDiffService.extractAntiAiRules`：
- 使用 `setImmediate` 或事件总线异步执行
- 提取结果自动写入关联的 StyleProfile
- 失败时记录日志，不影响保存响应

## 补丁B 方案

在 BookAnalysis pipeline 完成事件中，调用 `StyleProfileService.createFromBookAnalysis`：
- 监听 pipeline:completed 或在 pipeline 最后一步触发
- 自动生成的 StyleProfile sourceType = "from_book_analysis"
- 自动创建 StyleBinding 关联到对应小说

## 依赖

- styleEngine 模块已有完整基础设施
- ChapterEditDiffService 已实现 extractAntiAiRules 和 forkStyleFromDiff
- StyleProfileService.createFromBookAnalysis 已实现
