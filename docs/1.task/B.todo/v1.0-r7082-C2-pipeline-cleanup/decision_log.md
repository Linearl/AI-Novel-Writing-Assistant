# 决策日志 — REQ-7082 Pipeline 清理与合并

## 决策 1：阶段1 — 删除 deprecated facade

- **决策点**：`NovelPipelineService.ts` 是删除还是保留
- **选择**：删除
- **理由**：该文件已标记 @deprecated，仅做转发封装，无独立逻辑。删除后调用方直接引用 NovelCoreService，减少一层委托
- **日期**：2026-07-17
- **决策者**：用户

## 决策 2：阶段2 — 合并 vs 拆分

- **决策点**：`novelCorePipelineService` + `novelCorePipelineExecutor` 是合并为一个文件还是拆分
- **选择**：拆分为两个职责清晰的文件：`novelPipelineStrategy.ts`（策略定义）+ `novelPipelineExecutor.ts`（执行逻辑）
- **理由**：两个原文件合计 1178 行，合并为一个文件超项目 700 行限制。拆分为策略+执行器双文件，职责边界清晰，各自不超 700 行
- **日期**：2026-07-17
- **决策者**：用户

## 决策 3：NovelPipelineRuntimeService 保留

- **决策点**：`NovelPipelineRuntimeService.ts` 是否也合并
- **选择**：保留不变
- **理由**：该文件是 runtime 层的适配封装（108 行），职责明确且独立，不属于本次清理范围
- **日期**：2026-07-17
- **决策者**：用户
