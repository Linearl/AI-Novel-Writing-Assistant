# README — REQ-7082 Pipeline 清理与合并

- **编号**: REQ-7082
- **标题**: Pipeline 服务清理与合并
- **优先级**: C2
- **版本**: 0.2
- **状态**: done
- **创建日期**: 2026-07-17
- **更新日期**: 2026-07-17

## 概述

`services/novel/` 下存在四个 pipeline 相关服务，功能重叠、调用链 4 层委托。本次清理：删除 deprecated facade，合并核心 service + executor，将 pipeline 文件从 4 个减至 2-3 个，调用链从 4 层减至 2-3 层。

## 四件套现状

| 文件 | 行数 | 状态 | 职责 |
|------|------|------|------|
| `NovelPipelineService.ts` | 65 | **@deprecated** | Facade 封装 |
| `novelCorePipelineService.ts` | 568 | 活跃 | Pipeline 核心逻辑 |
| `novelCorePipelineExecutor.ts` | 610 | 活跃 | Pipeline 执行器 |
| `NovelPipelineRuntimeService.ts` | 108 | 活跃 | Pipeline 运行时适配 |

## 调用链

```
调用方 → NovelPipelineService(deprecated) → NovelCoreService → novelCorePipelineService(568行) → novelCorePipelineExecutor(610行) → NovelPipelineRuntimeService(108行) → runtime层
```

## 方案

1. **阶段1**：删除 deprecated facade `NovelPipelineService.ts`，更新引用
2. **阶段2**：合并 `novelCorePipelineService` + `novelCorePipelineExecutor`，拆分为策略 + 执行
3. **预期收益**：文件 4→2-3，调用链 4→2-3，deprecated 代码归零

## 六件套

| 文件 | 状态 |
|------|------|
| README.md | ✅ |
| REQ-7082-pipeline-cleanup.md | ✅ |
| REQ-7082-pipeline-cleanup-original.md | ✅ |
| design.md | ✅ |
| tasks.md | ✅ |
| decision_log.md | ✅ |
| run_result.json | ✅ |
