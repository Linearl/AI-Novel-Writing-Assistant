---
reqId: 7069
title: "Auto-Director 增强 — 技术设计（FR-1 仅）"
status: requirements_ready
priority: P1
complexity: C1
estimatedEffort: "3.5天"
version: v0.2
created: 2026-07-14
updated: 2026-07-16
---

# REQ-7069: Auto-Director 增强 — FR-1 技术设计

> 本次仅实现 FR-1（5 步创建向导），FR-2~FR-7 后续处理。
> 整合方案：方案 C — Modal 内嵌可跳过引导式步骤。

## 1. 现有架构

```
NovelAutoDirectorDialog.tsx (492行)     ← 模态容器，状态总管
  ├── NovelAutoDirectorCandidateSelectionContent  ← 单卡片：idea + 全部设置
  │     └── NovelAutoDirectorSetupPanel            ← 实际表单
  ├── NovelAutoDirectorCandidateDialog            ← 候选方案弹窗
  └── NovelAutoDirectorProgressPanel              ← 执行进度面板

数据层（3个独立hook，合计 ~885行）：
  useDirectorTaskQuery.ts (279行)                 ← 读侧
  useDirectorWorkflowMutations.ts (359行)          ← 写侧
  useNovelAutoDirectorCandidateMutations.ts (227行) ← 候选CRUD
```

## 2. 目标架构

```
NovelAutoDirectorDialog.tsx (重构后 ~200行)    ← 模态容器，状态轻量化
  ├── [新增] DirectorCreateStepBar.tsx           ← 步骤摘要栏
  ├── [新增] StageIdea.tsx                        ← 步骤1
  ├── [新增] StageBasicSetup.tsx                  ← 步骤2
  ├── [新增] StageWorldStyle.tsx                  ← 步骤3
  ├── [新增] StageModelRun.tsx                    ← 步骤4
  ├── [新增] StageCandidates.tsx                  ← 步骤5
  ├── NovelAutoDirectorCandidateDialog            ← 保持不变
  └── NovelAutoDirectorProgressPanel              ← 保持不变

数据层（统一为一个hook）：
  useAutoDirectorCreateController.ts (~500行)     ← 合并所有现有hook逻辑
```

**控制流**：一个 controller，两种 UI 皮肤（快速模式 / 引导模式），共用同一套状态和 mutation。

## 3. 组件详细设计

### 3.1 useAutoDirectorCreateController（重构核心）

合并 `useDirectorTaskQuery` + `useDirectorWorkflowMutations` + `useNovelAutoDirectorCandidateMutations`。

**新增步骤状态**：
- `activeStep: AutoDirectorCreateStepKey` — 当前所在步骤
- `completedSteps: Set<AutoDirectorCreateStepKey>` — 已完成步骤集合
- `markStepCompleted(step): void` — 标记步骤完成

**步骤定义**：
```typescript
type AutoDirectorCreateStepKey = "idea" | "basic" | "world_style" | "model_run" | "candidates";

const CREATE_STEPS = [
  { key: "idea", order: 0, label: "起始想法" },
  { key: "basic", order: 1, label: "导演起始设置" },
  { key: "world_style", order: 2, label: "世界与写法" },
  { key: "model_run", order: 3, label: "模型与运行方式" },
  { key: "candidates", order: 4, label: "方向候选" },
];
```

**返回值接口**（关键字段）：
```typescript
interface AutoDirectorCreateController {
  // 步骤
  activeStep, setActiveStep, completedSteps, markStepCompleted,
  // 核心状态（继承自现有）
  idea, setIdea, batches, directorBasicForm, workflowTaskId, dialogMode,
  // 配置
  runMode, setRunMode, worldSetupMode, setWorldSetupMode,
  autoExecutionDraft, setAutoExecutionDraft, autoApprovalDraft,
  selectedStyleProfileId, selectedStyleSummary, styleProfiles,
  // 查询
  directorTask, hasActiveDirectorTask, isBlockingExecutionView, triggerLabel,
  // 灵感
  ideaInspirations, isGeneratingIdeaInspirations, generateIdeaInspirations,
  // 候选操作
  generateMutation, patchCandidateMutation, refineTitleMutation,
  selectedPresets, feedback, togglePreset, applyCandidateTitleOption,
  // 确认
  confirmMutation, continueMutation, retryMutation, handleConfirmCandidate,
  // 回调
  handleBackgroundContinue, handleOpenTaskCenter,
}
```

### 3.2 DirectorCreateStepBar.tsx（新增）

位于 Modal 顶部，渲染一行可点击的步骤摘要卡片。参考上游 `StageSummaryCard` 但适配本项目（无 framer-motion）。

```typescript
interface DirectorCreateStepBarProps {
  steps: Array<{ key: string; order: number; label: string }>;
  activeStep: string;
  completedSteps: Set<string>;
  summaries: Record<string, string>;
  onStepClick: (step: string) => void;
}
```

交互规则：
- 点击已完成或当前步骤 → 跳转
- 点击未完成步骤 → 无反应
- 生成候选后自动标记前 4 步完成，跳转步骤 5

### 3.3 Stage 组件

5 个 Stage 组件参考上游 UI 结构，适配本项目：

| 组件 | 参考上游 | 关键适配 |
|------|----------|----------|
| `StageIdea.tsx` | StageIdea.tsx | 去 framer-motion，去打字动画，保留大文本区和灵感面板 |
| `StageBasicSetup.tsx` | StageBasicSetup.tsx | 复用现有 `SelectControl`、`FieldLabel`、`BasicInfoFormPrimitives` |
| `StageWorldStyle.tsx` | StageWorldStyle.tsx | 同上 |
| `StageModelRun.tsx` | StageModelRun.tsx | 复用现有 `DirectorAutoExecutionPlanFields`、`AutoDirectorApprovalStrategyPanel`、`LLMSelector` |
| `StageCandidates.tsx` | StageCandidates.tsx | 复用现有 `NovelAutoDirectorCandidateBatches`、`NovelAutoDirectorProgressPanel` |

每个 Stage 组件 Props 只包含该步骤需要的 controller 字段子集（按需注入），不传整个 controller。

Stage 组件接收 `onBack` 和 `onConfirm`/`onContinue` 回调，由 `NovelAutoDirectorDialog` 负责步骤切换逻辑。

### 3.4 NovelAutoDirectorDialog（重构）

重构后为薄容器：

```typescript
export default function NovelAutoDirectorDialog(props) {
  const controller = useAutoDirectorCreateController(props);

  // 根据 controller.activeStep 渲染对应 Stage
  // 根据 mode（引导/快速）决定是否显示步骤栏
  const showStepBar = controller.dialogMode === "candidate_selection"
    && (controller.activeStep !== "idea" || controller.completedSteps.size > 0);

  return (
    <Dialog>
      <AppDialogContent>
        {showStepBar && <DirectorCreateStepBar ... />}
        {controller.activeStep === "idea" && <StageIdea ... />}
        {controller.activeStep === "basic" && <StageBasicSetup ... />}
        {controller.activeStep === "world_style" && <StageWorldStyle ... />}
        {controller.activeStep === "model_run" && <StageModelRun ... />}
        {controller.activeStep === "candidates" && <StageCandidates ... />}
      </AppDialogContent>
    </Dialog>
  );
}
```

## 4. 步骤切换流程

```
用户进入 Modal
  → activeStep = "idea"，步骤栏不可见
  → 用户填写 idea

  [路径A: 引导式]
  → 点"继续完善设定" → activeStep = "basic" → 步骤栏出现
  → basic 完成 → activeStep = "world_style"
  → world_style 完成 → activeStep = "model_run"
  → 点"开始生成方向" → 标记前4步完成 → activeStep = "candidates"
  → 确认候选 → dialogMode = "execution_progress" → ProgressPanel

  [路径B: 快速]
  → 点"用默认设置直接生成方向" → 标记前4步完成 → activeStep = "candidates"
  → 确认候选 → ProgressPanel

  [路径C: QuickPreview回填]
  → idea 预填 → 可直接点快速生成 → 步骤栏可见但已全部标记完成
```

## 5. 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `useAutoDirectorCreateController.ts` | **新建** | 统一 controller hook |
| `DirectorCreateStepBar.tsx` | **新建** | 步骤摘要栏 |
| `StageIdea.tsx` | **新建** | 步骤1 |
| `StageBasicSetup.tsx` | **新建** | 步骤2 |
| `StageWorldStyle.tsx` | **新建** | 步骤3 |
| `StageModelRun.tsx` | **新建** | 步骤4 |
| `StageCandidates.tsx` | **新建** | 步骤5 |
| `NovelAutoDirectorDialog.tsx` | **重构** | 薄容器，使用新 controller |
| `useDirectorTaskQuery.ts` | **删除** | 逻辑移入 controller |
| `useDirectorWorkflowMutations.ts` | **删除** | 逻辑移入 controller |
| `useNovelAutoDirectorCandidateMutations.ts` | **删除** | 逻辑移入 controller |

**不变文件**：`NovelAutoDirectorCandidateBatches.tsx`、`NovelAutoDirectorCandidateDialog.tsx`、`NovelAutoDirectorProgressPanel.tsx`、`NovelAutoDirectorSetupPanel.tsx`（保留兼容，不再被 Modal 主路径使用）、`NovelAutoDirectorCandidateSelectionContent.tsx`（同上）、`NovelCreate.tsx`（路径A入口逻辑不变）、所有服务端文件、所有共享类型。

## 6. 风险评估

| 风险 | 影响 | 概率 | 缓解 |
|------|------|------|------|
| Controller 合并后文件膨胀（>600行） | 可维护性 | 中 | 按职责分子文件（core/mutations/candidates），controller 聚合导出 |
| 重构破坏现有快速路径 | 功能回归 | 中 | 阶段0先做controller提取+回归验证，确保现有行为不变 |
| Stage UI 与 SetupPanel 视觉不一致 | 体验 | 低 | 复用相同基础组件（SelectControl、Input、FieldLabel），只改布局 |
| 新增文件导致 `components/` 目录文件过多 | 组织 | 中 | 创建 `components/autoDirectorCreate/` 子目录收纳新文件 |
