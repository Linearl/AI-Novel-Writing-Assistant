---
id: REQ-7082
title: "Pipeline 服务清理与合并"
status: requirements_ready
priority: C2
version: "0.2"
created: "2026-07-17"
updated: "2026-07-17"
---

# REQ-7082 — Pipeline 服务清理与合并

## 1. 目标

清理 `services/novel/` 下四个 pipeline 相关服务的功能重叠，消除 deprecated 代码，减少调用链嵌套层数，使 pipeline 模块职责清晰、可维护。

## 2. 背景

`services/novel/` 下存在四个 pipeline 相关服务：

| 文件 | 行数 | 状态 | 职责 |
|------|------|------|------|
| `NovelPipelineService.ts` | 65 | @deprecated | Facade 封装，转发到 NovelCoreService |
| `novelCorePipelineService.ts` | 568 | 活跃 | Pipeline 核心逻辑（策略、条件判断） |
| `novelCorePipelineExecutor.ts` | 610 | 活跃 | Pipeline 执行器（节点调度、状态管理） |
| `NovelPipelineRuntimeService.ts` | 108 | 活跃 | Pipeline 运行时适配层 |

### 调用链

```
调用方 → NovelPipelineService(deprecated) → NovelCoreService → novelCorePipelineService(568行) → novelCorePipelineExecutor(610行) → NovelPipelineRuntimeService(108行) → runtime层
```

4 层委托链，中间两层（service + executor）职责边界模糊。

## 3. 范围

### 包含

- 删除 `NovelPipelineService.ts`（@deprecated facade）
- 更新所有引用方改为 `NovelCoreService` 或 `createNovelApplicationServices()`
- 合并 `novelCorePipelineService` + `novelCorePipelineExecutor`
- 或拆分为：`novelPipelineStrategy.ts`（策略定义）+ `novelPipelineExecutor.ts`（执行逻辑）
- `NovelPipelineRuntimeService` 保留为适配层

### 不包含

- Pipeline 业务逻辑变更
- Pipeline 阶段顺序或执行模式调整
- 新功能

## 4. 非目标

- 不改变 pipeline 的对外接口语义
- 不修改 runtime 层的任何代码
- 不引入新的设计模式或抽象框架

## 5. EARS 验收条目

| ID | 验收条件 |
|----|----------|
| AC-1 | `NovelPipelineService.ts` 已删除，无残留引用 |
| AC-2 | `novelCorePipelineService.ts` 和 `novelCorePipelineExecutor.ts` 已合并为一个文件或两个职责清晰的文件 |
| AC-3 | 所有原有调用方功能正常，行为不变 |
| AC-4 | `NovelPipelineRuntimeService.ts` 不变（保留为适配层） |
| AC-5 | `pnpm typecheck` 通过，零新增类型错误 |
| AC-6 | `pnpm test` 通过，无回归 |
| AC-7 | Pipeline 文件数从 4 减至 2 或 3 |

## 6. 风险与未决项

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 合并后单文件行数超 700 | 中 | 按职责拆分为 strategy + executor 两个文件 |
| 引用方遗漏未更新 | 高 | Grep 全量搜索 NovelPipelineService 引用，逐个更新 |
| 合并后行为回归 | 高 | 全量跑 server 测试 + 手动验证 pipeline 流程 |
