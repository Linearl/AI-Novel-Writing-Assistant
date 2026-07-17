# 任务清单 — REQ-7082 Pipeline 清理与合并

## 阶段 0：需求确认

- [x] 需求文档已生成
- [x] 设计文档已生成
- [x] 任务清单已生成

## 阶段 1：删除 deprecated facade（阶段1）

### T1: 找出所有 NovelPipelineService 引用
- [x] Grep 全量搜索 `NovelPipelineService` 引用
- [x] 记录所有引用方文件路径和行号
- [x] 区分直接 import 和间接引用

### T2: 更新引用方
- [x] 将引用方改为 `NovelCoreService` 或 `createNovelApplicationServices()`
- [x] 确保每个引用方的调用接口兼容
- [x] `pnpm typecheck` 通过

### T3: 删除 deprecated facade
- [x] 删除 `NovelPipelineService.ts`
- [x] 删除对应的 barrel export（如有）
- [x] `pnpm typecheck` 通过

## 阶段 2：合并 core pipeline service + executor（阶段2）

### T4: 分析 service 与 executor 职责边界
- [x] 读取 `novelCorePipelineService.ts`（568行），列出所有导出函数及其职责
- [x] 读取 `novelCorePipelineExecutor.ts`（610行），列出所有导出函数及其职责
- [x] 标注每个函数的归属：策略层 or 执行层

### T5: 拆分/合并
- [x] 创建 `novelPipelineStrategy.ts`（策略定义：条件判断、阶段选择、状态决策）
- [x] 创建 `novelPipelineExecutor.ts`（执行逻辑：节点调度、运行时调用）
- [x] 将原 service 和 executor 的函数按职责迁移到对应新文件
- [x] 更新所有调用方引用
- [x] 确保两个新文件各自不超过 700 行

### T6: 清理旧文件
- [x] 删除 `novelCorePipelineService.ts`
- [x] 删除 `novelCorePipelineExecutor.ts`
- [x] 更新 barrel export
- [x] `pnpm typecheck` 通过

## 阶段 3：验证

### T7: 类型与构建验证
- [x] `pnpm typecheck` 通过，零新增类型错误
- [x] `pnpm build` 通过

### T8: 单元测试
- [x] 运行 `pnpm test` 确保无回归
- [x] 运行 `pnpm --filter @ai-novel/server test:runtime` 确保 runtime 测试通过
- [x] 如有失败，修复至全绿

### T9: 集成验证
- [x] 启动 `pnpm dev`
- [x] 手动验证 pipeline 流程：创建任务 → 执行 → 确认 pipeline 步骤正常推进
- [x] 验证章节执行流程完整

## 阶段 4：收尾

### T10: 文档与提交
- [x] 更新 `run_result.json` 状态为 `done`
- [x] 更新 `tasks.md` 所有任务勾选
- [x] 更新 `README.md` 状态
- [x] 提交变更
