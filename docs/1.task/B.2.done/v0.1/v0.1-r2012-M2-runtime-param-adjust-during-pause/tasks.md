---
description: "REQ-2012 任务拆解"
---

# REQ-2012 任务拆解

> 状态：⏳ 进行中（完成后改为 ✅ 全部完成）

## 任务概述

### 1. 来源

[诊断报告](../../../3.analysis/diagnosis/01-active/2026-06-26-自动导演全自动模式能力诊断.md) 第 2.3.3 和 5.1 节。

### 2. 问题

自动导演任务创建时设定的 autoReview、autoRepair、artifactSyncMode、审批点配置一旦确认即锁定。用户暂停后无法调整这些参数，设错只能取消重建。此外 modelTier 和 artifactSyncMode 前端根本未暴露。

### 3. 需求

1. 暂停后通过任务中心"编辑高级设置"面板调整 autoReview、autoRepair、artifactSyncMode、审批点配置
2. 前端暴露 modelTier 选择器（纳入 TaskCenterRuntimePolicyCard）
3. 前端暴露 artifactSyncMode 选择器（创建时 + 暂停后）

### 4. 验收标准

> 见 [REQ-2012.md](./REQ-2012.md) 第 4 节。

- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test` 通过

## 任务清单

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | shared/types 扩展：新增 `DirectorUpdateExecutionSettingsRequest` 类型 | P0 | 小 | ⬜ 待开始 |
| T2 | 后端：新增 `update_execution_settings` 命令（interpreter + service + executor） | P0 | 中 | ⬜ 待开始 |
| T3 | 后端：HTTP schema 扩展（commandsSchema 新增分支） | P0 | 小 | ⬜ 待开始 |
| T4 | 前端：`DirectorAutoExecutionDraftState` 扩展 artifactSyncMode + UI 选择器 | P1 | 小 | ⬜ 待开始 |
| T5 | 前端：`TaskCenterRuntimePolicyCard` 增加 modelTier 下拉 | P1 | 小 | ⬜ 待开始 |
| T6 | 前端：新建 `DirectorAdvancedSettingsDialog` 模态面板 | P1 | 中 | ⬜ 待开始 |
| T7 | 前端：`TaskCenterPage` 增加"编辑高级设置"按钮 + 条件渲染 | P1 | 中 | ⬜ 待开始 |
| T8 | 前端：API 客户端新增 `updateDirectorExecutionSettings` 函数 | P1 | 小 | ⬜ 待开始 |
| T9 | 构建 + 类型检查 + 测试 | P1 | 小 | ⬜ 待开始 |
| T10 | 手动验证：暂停后修改 → continue → 验证新设置生效 | P2 | 小 | ⬜ 待开始 |

## 逐项展开

### T1: shared/types 扩展

**目标**: 在 `shared/types/directorRuntime.ts` 新增 `DirectorUpdateExecutionSettingsRequest` 类型。

**改动点**:
- `shared/types/directorRuntime.ts` — 新增接口定义，包含 `autoReview?`、`autoRepair?`、`artifactSyncMode?`、`approvalPointCodes?`
- `shared/types/index.ts` — 确保新类型被导出

### T2: 后端新增命令

**目标**: 在 DirectorCommandInterpreter、DirectorCommandService、DirectorCommandExecutor 中增加 `update_execution_settings` 命令支持。

**改动点**:
- `server/src/services/novel/director/commands/DirectorCommandInterpreter.ts` — 注册 `update_execution_settings` 为 `isControlOnly: true`
- `server/src/services/novel/director/commands/DirectorCommandService.ts` — 新增 `enqueueUpdateExecutionSettings` 方法
- `server/src/services/novel/director/commands/DirectorCommandExecutor.ts` — 新增 case，写入 seedPayload 和审批配置
- `server/src/services/novel/director/NovelDirectorService.ts` — 新增 `updateExecutionSettings` 方法（如需要）

### T3: HTTP schema 扩展

**目标**: 在 `commandsSchema` Zod discrimatedUnion 中新增 `update_execution_settings` 分支。

**改动点**:
- `server/src/services/novel/director/http/novelDirector.ts` — commandsSchema 新增分支

### T4: artifactSyncMode 前端暴露

**目标**: `DirectorAutoExecutionPlanFields` 增加 artifactSyncMode 下拉选择器。

**改动点**:
- `client/src/pages/novels/components/directorAutoExecutionPlan.shared.tsx` — 扩展 `DirectorAutoExecutionDraftState` 接口 + 默认值 + normalize + build 函数；UI 增加 Select 组件
- `buildDirectorAutoExecutionPlanFromDraft` — 输出包含 `artifactSyncMode`

### T5: modelTier 前端暴露

**目标**: `TaskCenterRuntimePolicyCard` 增加模型档次下拉。

**改动点**:
- `client/src/pages/tasks/components/TaskCenterRuntimePolicyCard.tsx` — 增加 modelTier Select（cheap_fast / balanced / high_quality），保存时包含在 policy_update 的 payload 中

### T6: DirectorAdvancedSettingsDialog

**目标**: 新建模态面板，包含 autoReview/autoRepair/artifactSyncMode + AutoDirectorApprovalStrategyPanel。

**改动点**:
- `client/src/components/autoDirector/DirectorAdvancedSettingsDialog.tsx` — 新建文件
  - Props: `taskId`, `currentAutoReview`, `currentAutoRepair`, `currentArtifactSyncMode`, `currentApprovalCodes`, `open`, `onClose`
  - 本地草稿状态
  - 复用 `AutoDirectorApprovalStrategyPanel` 和 `AutoDirectorApprovalPointMultiSelect`
  - 保存按钮调用 `updateDirectorExecutionSettings` mutation

### T7: TaskCenterPage 入口按钮

**目标**: 任务中心详情区增加"编辑高级设置"按钮。

**改动点**:
- `client/src/pages/tasks/TaskCenterPage.tsx` — 详情区增加按钮，条件：`task.type === "auto_director" && (status === "checkpoint_reached" || status === "failed")`
- 按钮 onClick → 打开 `DirectorAdvancedSettingsDialog`

### T8: API 客户端函数

**目标**: 新增前端 API 调用函数。

**改动点**:
- `client/src/api/novelDirector.ts` — 新增 `updateDirectorExecutionSettings(taskId, payload)` 函数

### T9: 构建 + 类型检查 + 测试

**目标**: 确保所有变更通过验证。

**改动点**:
- `pnpm --filter @ai-novel/shared build`
- `pnpm typecheck`
- `pnpm test`

### T10: 手动验证

**目标**: 端到端验证功能正确。

**验证步骤**:
1. 创建自动导演任务（full_book_autopilot 模式，autoReview=true, autoRepair=true）
2. 等待任务暂停（checkpoint）
3. 在任务中心打开"编辑高级设置"
4. 修改 autoReview=false, autoRepair=false, artifactSyncMode="strict"
5. 保存 → continue
6. 验证后续批次不自动审校、不自动修复

---

## DoD

- T1-T9 全部完成，T10 手动验证通过
- `pnpm typecheck` 零错误
- `pnpm test` 全部通过
- 任务中心可看到"编辑高级设置"按钮并可正常打开/保存

---

## 依赖

- 前置依赖：无
- 关联依赖：无
- 后继依赖：无

---

## 执行记录

| 日期 | 任务 | 状态 |
| ---- | ---- | ---- |
| 2026-06-26 | 创建任务包 | 完成 |

---

## 完成判定

- T1~T9 全部完成且 DoD 全部满足后，REQ-2012 达到"已完成"状态。
