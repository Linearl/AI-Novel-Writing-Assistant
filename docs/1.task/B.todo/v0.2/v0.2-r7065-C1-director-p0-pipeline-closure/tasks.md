---
description: "REQ-7065 导演引擎 P0 Pipeline 闭环收口 — 任务清单"
update_time: 2026-07-14
---

## 阶段零：准备

- [x] 需求文档完成
- [x] 技术设计完成
- [x] 任务清单完成
- [x] 决策日志完成

## 阶段一：去旧 Adapter

- [ ] **Task 1.1** — 重构 directorPlanningStepModules 四个核心步骤为自闭环 `buildInput → execute → validateOutput → commit`
- [ ] **Task 1.2** — 重构 directorExecutionStepModules 核心步骤为自闭环
- [ ] **Task 1.3** — 移除 novelDirectorStageNodeAdapters 过渡调用（确认无其他引用后标记 deprecated）
- [ ] **Task 1.4** — 运行 `pnpm --filter @ai-novel/server test:planner` + `directorWorkflowStepModules.test.js` 验证

## 阶段二：StateCommitter 生命周期

- [ ] **Task 2.1** — DirectorStateCommitter 实现 start/complete/fail/block/cancel 五种生命周期事件写入
- [ ] **Task 2.2** — Pipeline dispatch 入口改为调用 StateCommitter 生命周期方法
- [ ] **Task 2.3** — 验证任意步骤失败后 StateCommitter 正确记录 fail 事件

## 阶段三：Artifact Ledger × Workspace Analyzer

- [ ] **Task 3.1** — ArtifactLedger 增加 stale/protected/dependency 影响分析方法
- [ ] **Task 3.2** — DirectorWorkspaceAnalyzer 接入 Artifact Ledger，输出受影响产物列表
- [ ] **Task 3.3** — 验证"手动编辑正文 → 标记 affected artifacts"链路

## 阶段四：DIRECTOR_PROGRESS 降级

- [ ] **Task 4.1** — 为四个核心 StepModule 实现 inspectProgress() 方法
- [ ] **Task 4.2** — Projection 层改为优先消费 inspectProgress 结果
- [ ] **Task 4.3** — DIRECTOR_PROGRESS 保留为 fallback，移除所有 phase 文件中非 fallback 用途的引用
- [ ] **Task 4.4** — 验证进度显示不退化（章节矩阵推导 vs 固定百分比对比）

## 阶段五：Worker 持久化 Delta 写入

- [ ] **Task 5.1** — DirectorRuntimeStore 改为增量 delta 写入（不再全量重建 steps/events/artifacts）
- [ ] **Task 5.2** — 移除 seedPayloadJson 全量 runtime snapshot 回写
- [ ] **Task 5.3** — Projection 查询限制响应体大小（不返回大体积 workspace/章节正文/prompt context）
- [ ] **Task 5.4** — 验证 Worker 长任务运行时 `/api/tasks/overview` 仍可响应

## 阶段六：验收

- [ ] 所有导演相关测试通过
- [ ] `pnpm typecheck` 零错误
- [ ] `pnpm build` 通过
- [ ] 验收场景：一句话灵感 → 自动导演 → 服务重启恢复 → 继续执行（全链路不退化）
