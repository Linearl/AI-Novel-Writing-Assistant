---
description: 步骤6批量写作任务拆解
---

# Tasks — REQ-3023 步骤6批量写作

## 阶段一：工具函数

- [ ] 1.1 在 `chapterExecution.shared.tsx` 新增 `resolveBatchWriteRange()` 函数
  - 输入：selectedChapter、visibleChapters、volumeChapters、batchMode、batchCount
  - 输出：`{ startOrder, endOrder, label } | null`
  - 参照 `StructuredChapterDetailCard` 中的 `batchPlan` 计算逻辑
  - DoD：函数可正确计算三种范围模式的 startOrder/endOrder

## 阶段二：类型与 Props

- [ ] 2.1 在 `NovelEditView.types.ts` 的 chapterTab props 中新增字段
  - `onBatchWrite: (startOrder: number, endOrder: number) => void`
  - `batchWriteJob: PipelineJob | null`
  - `isBatchWriting: boolean`
  - `hasActiveDirectorTask: boolean`
  - DoD：类型检查通过

- [ ] 2.2 在 `NovelEdit.tsx` 中将 `runPipelineMutation` 和 `pipelineJobQuery` 传入 chapterTab
  - 从已有的 `runPipelineMutation` 和 `pipelineJobQuery` 取值
  - 检查 `activeAutoDirectorTask` 判断是否有活跃导演任务
  - DoD：chapterTab props 完整传入

## 阶段三：UI 组件

- [ ] 3.1 在 `ChapterExecutionActionPanel.tsx` 新增 `BatchWriteCard` 区块
  - 范围选择器（select + 数字输入）
  - 批量写作按钮（AiButton）
  - 进度展示（运行中时显示阶段 + 进度条）
  - 禁用逻辑（有导演任务 / 流水线运行中）
  - DoD：UI 可交互，按钮触发 onBatchWrite

## 阶段四：验证

- [ ] 4.1 `pnpm typecheck` 通过
- [ ] 4.2 步骤6面板可见批量写作区块
- [ ] 4.3 范围选择器三种模式可用
- [ ] 4.4 点击后调用 pipeline API 并展示进度
- [ ] 4.5 有活跃导演任务时按钮禁用
