---
reqId: 7069
title: "Auto-Director 增强 — 任务清单（FR-1 仅）"
status: in_progress
priority: P1
complexity: C1
estimatedEffort: "3.5天"
version: v0.2
created: 2026-07-14
updated: 2026-07-16
---

# REQ-7069: Auto-Director 增强 — 任务清单

> 本次仅实现 FR-1（5 步创建向导）。FR-2~FR-7 后续处理。
> 整合方案：方案 C — Modal 内嵌可跳过引导式步骤。

## 阶段零：需求就绪

- [x] 需求文档完成
- [x] 技术设计完成（2026-07-16 更新为方案 C）
- [x] 任务清单完成（2026-07-16 更新）
- [x] 决策日志完成（2026-07-16 追加 D6~D10）

## 阶段一：Controller 提取与重构（1 天）

> 将现有 3 个 hook 合并为统一 controller，保持现有功能完整可用。

- [x] T1: 新建 `useAutoDirectorCreateController.ts`，合并 `useDirectorTaskQuery` 所有读侧逻辑（0.3 天）
- [x] T2: 合并 `useDirectorWorkflowMutations` 所有写侧逻辑（0.2 天）
- [x] T3: 合并 `useNovelAutoDirectorCandidateMutations` 候选 CRUD 逻辑（0.1 天）
- [x] T4: 添加步骤状态（activeStep、completedSteps、markStepCompleted）和步骤定义（0.1 天）
- [x] T5: 重构 `NovelAutoDirectorDialog.tsx` 使用新 controller，替换 3 个 hook 调用（0.2 天）
- [x] T6: typecheck 通过（客户端部分），现有快速路径接口签名保持兼容（0.1 天）

## 阶段二：步骤 UI 组件（1.5 天）

> 新增步骤摘要栏和 5 个 Stage 组件，参考上游 UI 结构，适配本项目设计系统。

- [x] T7: 创建 `components/autoDirectorCreate/` 子目录（0.05 天）
- [x] T8: 创建 `DirectorCreateStepBar.tsx` — 步骤摘要栏（0.15 天）
- [x] T9: 创建 `StageIdea.tsx` — 步骤 1 起始想法（优化 textarea 体验 + 灵感面板展开逻辑）（0.25 天）
- [x] T10: 创建 `StageBasicSetup.tsx` — 步骤 2 导演起始设置（读者频道、视角、节奏、情绪、预计章数 + 折叠区：读者与卖点补充）（0.25 天）
- [x] T11: 创建 `StageWorldStyle.tsx` — 步骤 3 世界与写法（参考世界样本、世界处理二选一、书级默认写法）（0.2 天）
- [x] T12: 创建 `StageModelRun.tsx` — 步骤 4 模型与运行方式（运行模式三选一 + 执行范围/自动确认 + AI检测开关 + LLM设置折叠区）（0.2 天）
- [x] T13: 创建 `StageCandidates.tsx` — 步骤 5 方向候选（复用现有 `NovelAutoDirectorCandidateBatches` + `ProgressPanel` 切换逻辑）（0.1 天）
- [x] T14: 在 `NovelAutoDirectorDialog` 中集成步骤切换：根据 `controller.activeStep` 条件渲染对应 Stage，步骤栏显示/隐藏逻辑（0.1 天）

## 阶段三：整合与边界处理（0.5 天）

- [x] T15: 实现"快速生成"快捷路径：跳过步骤 2-4，标记完成，直接到步骤 5 candidates（0.1 天）
- [x] T16: 实现"回改设定"按钮：从步骤 5 跳回步骤 4 model_run（0.05 天）
- [x] T17: 恢复任务时自动定位：已有 batches 或 directorTask 时跳步骤 5（0.05 天）
- [x] T18: 步骤栏与"查看导演进度"按钮的显示互斥逻辑：有活跃任务时隐藏步骤栏（0.05 天）
- [x] T19: QuickPreview 回填 → Modal 预填 idea → 步骤栏可见（步骤 1 已完成）的逻辑（0.1 天）
- [x] T20: Modal 关闭时重置步骤状态（0.05 天）
- [x] T21: 清理旧文件：删除 `useDirectorTaskQuery.ts`、`useDirectorWorkflowMutations.ts`、`useNovelAutoDirectorCandidateMutations.ts`（保留 `NovelAutoDirectorSetupPanel` 和 `NovelAutoDirectorCandidateSelectionContent` 以备其他引用）（0.1 天）

## 阶段三附：独立页面版本（pages/novels/autoDirector/）

> 从上游复制并适配 9 个文件为独立全页面版本，作为 Modal 版本的补充入口。

- [x] T21a: 复制 `directorCreateStages.ts` — 阶段定义与摘要工具函数（0.05 天）
- [x] T21b: 复制 `StageSummaryCard.tsx` — 步骤摘要卡片（0.05 天）
- [x] T21c: 复制 `StageIdea.tsx` — 步骤 1 起始想法（0.1 天）
- [x] T21d: 复制 `StageBasicSetup.tsx` — 步骤 2 导演起始设置（适配：SelectControl → 原生 select）（0.1 天）
- [x] T21e: 复制 `StageWorldStyle.tsx` — 步骤 3 世界与写法（适配：SelectControl → 原生 select）（0.1 天）
- [x] T21f: 复制 `StageModelRun.tsx` — 步骤 4 模型与运行方式（0.1 天）
- [x] T21g: 复制 `StageCandidates.tsx` — 步骤 5 方向候选（0.1 天）
- [x] T21h: 复制 `AutoDirectorCreatePage.tsx` — 页面容器（0.15 天）
- [x] T21i: 复制 `useAutoDirectorCreateController.ts` — 控制器（适配：DirectorExecutionViewMode → DirectorDialogMode）（0.15 天）
- [x] T21j: typecheck 通过（0.1 天）

## 阶段四：测试与验证（0.5 天）

- [ ] T22: typecheck 全量通过 `pnpm typecheck`（0.1 天）
- [ ] T23: 引导式流程端到端验证（5 步 → 候选 → 确认 → 跳转 NovelEdit）（0.1 天）
- [ ] T24: 快速流程端到端验证（idea → 默认设置 → 候选 → 确认 → 跳转）（0.1 天）
- [ ] T25: QuickPreview 回填流程回归验证（0.05 天）
- [ ] T26: 恢复任务流程回归验证（0.05 天）
- [ ] T27: 路径 B/C（素材导入 / 手动填写）零改动回归确认（0.05 天）
- [ ] T28: `pnpm test:client` 通过（0.05 天）

## 阶段五：收尾

- [ ] T29: 更新 requirements.md（提交时由 hook 自动处理）
- [ ] T30: 更新任务包 README 状态
- [ ] T31: 更新 run_result.json 状态
- [ ] T32: 提交变更

## 完成标准

- [x] 所有阶段一、二任务完成
- [x] 阶段三除 T21（脏旧文件清理）外均已完成
- [ ] 阶段四完成
- [ ] 阶段五完成
- [x] typecheck 客户端部分通过（仅 pre-existing 错误，非本次变更引入）
- [ ] pnpm test:client 通过
- [ ] 引导式流程端到端可走通
- [ ] 快速流程端到端可走通
- [ ] QuickPreview 回填路径无回归
- [ ] 路径 B/C 无回归
