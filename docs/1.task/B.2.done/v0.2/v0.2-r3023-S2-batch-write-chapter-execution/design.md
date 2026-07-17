---
description: 步骤6批量写作方案设计——纯前端实现，复用 Pipeline API，UI 参照步骤5批量细化
---

# Design — REQ-3023 步骤6批量写作

## 1. 架构决策

### 1.1 后端复用

**决策**：不新增后端 API，直接复用 `runNovelPipeline`。

**理由**：
- `POST /novels/:id/pipeline/run` 已支持 `startOrder`/`endOrder` 范围、`autoReview`/`autoRepair` 全流水线、`skipCompleted` 跳过已完成
- PipelineJob 进度轮询已有 `getNovelPipelineJob`
- 自动导演的章节执行也基于同一套 PipelineJob 系统

### 1.2 UI 模式复用

**决策**：参照 `StructuredChapterDetailCard` 的批量细化 UI 模式。

**理由**：
- 用户已熟悉步骤5的范围选择交互（连续 N 章 / 可见 / 全卷）
- 保持步骤5和步骤6的交互一致性
- 减少用户学习成本

### 1.3 与自动导演互斥

**决策**：有活跃自动导演任务时禁用批量写作按钮。

**理由**：
- 自动导演和批量写作都会操作 PipelineJob，同时运行可能冲突
- 自动导演有更完整的状态管理和恢复机制
- 避免两套流水线同时修改章节数据

## 2. 数据流

```
用户选择范围 → 计算 startOrder/endOrder
  → runPipelineMutation.mutate({
      startOrder, endOrder,
      autoReview: true,
      autoRepair: true,
      skipCompleted: true,
      provider, model, temperature,
    })
  → pipelineJobQuery 轮询进度
  → UI 展示当前阶段 + 已完成/总数
```

## 3. 涉及文件

### 3.1 修改文件

| 文件 | 改动内容 |
|------|----------|
| `ChapterExecutionActionPanel.tsx` | 新增 `BatchWriteCard` 子组件，新增 `onBatchWrite` / `batchWriteJob` / `hasActiveDirectorTask` props |
| `chapterExecution.shared.tsx` | 新增 `resolveBatchWriteRange()` 工具函数，计算 startOrder/endOrder |
| `NovelEdit.tsx` | 将 `runPipelineMutation` + `pipelineJobQuery` 传入 chapterTab |
| `NovelEditView.types.ts` | chapterTab props 类型新增批量写作字段 |

### 3.2 不改动文件

- 后端 API（`runNovelPipeline` 已满足）
- PipelineJob 系统
- 自动导演代码
- PipelineTab（不重复其完整进度面板）

## 4. UI 设计

### 4.1 批量写作卡片布局

```
┌─────────────────────────────────────────────────────┐
│ 批量写作                                              │
│ 从当前章起连续写作，每章自动完成审核+修复循环。         │
│                                                       │
│ 范围: [从当前章起连续写作 ▼]  章节数: [5]              │
│                                                       │
│ [▶ 批量写作 5 章]                                      │
│ 会从第3章开始，顺次写接下来的 5 章。                     │
│                                                       │
│ ── 运行中 ──                                          │
│ 阶段: 正在写第3/5章  ████████░░ 60%                   │
└─────────────────────────────────────────────────────┘
```

### 4.2 范围选项

| 选项 | 说明 | 条件 |
|------|------|------|
| `count` | 从当前章起连续 N 章 | 有后续章节 |
| `visible_all` | 当前可见章节（按筛选） | 可见 > 1 章 |
| `volume_all` | 本卷全部章节 | 卷内 > 1 章 |

### 4.3 禁用条件

- 有活跃自动导演任务 → 按钮禁用 + 提示"自动导演运行中"
- 流水线正在运行 → 按钮禁用 + 显示进度
- 无选中章节 → 隐藏批量写作区块

## 5. 错误处理

- `runNovelPipeline` 失败 → toast 提示错误信息
- 流水线中途某章失败 → PipelineJob 已有 skipCompleted 机制，失败章节记录在 job payload
- 网络断开 → pipelineJobQuery 自动重试轮询
