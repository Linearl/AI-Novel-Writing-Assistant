# 任务清单 — REQ-3022 AutoDirector 共享 Stage 组件提取

## 阶段 0：需求确认

- [x] 需求文档已生成
- [x] 设计文档已生成
- [x] 任务清单已生成

## 阶段 1：提取共享常量与类型

### T1: 创建共享常量文件
- [x] 创建 `pages/novels/components/autoDirectorCreate/shared/stageConstants.ts`
- [x] 定位两套组件中的重复常量（`BASIC_INFO_FIELD_HINTS`、`EMOTION_OPTIONS`、`PACE_OPTIONS`、`POV_OPTIONS`、`READER_CHANNEL_OPTIONS`、`RUN_MODE_OPTIONS` 等）
- [x] 确定常量统一来源（优先引用已有 `novelBasicInfo.shared` 导出）
- [x] 收集仅在单一组件内部定义的局部常量，迁移到 `stageConstants.ts`
- [x] 更新两套组件的 import 引用至统一入口

### T2: 提取共享类型定义
- [x] 定义各 Core 组件的统一 Props 接口（`StageIdeaCoreProps`、`StageBasicSetupCoreProps` 等）
- [x] 类型文件放在 `shared/` 目录或内嵌于各 Core 组件

## 阶段 2：创建 Core 组件（按依赖顺序）

### T3: StageIdeaCore
- [x] 分析两套 `StageIdea.tsx` 的逻辑差异
- [x] 创建 `shared/StageIdeaCore.tsx`，提取共享渲染逻辑（标题、描述、Textarea、灵感面板）
- [x] 通过 Props 区分全屏 vs 紧凑布局

### T4: StageBasicSetupCore
- [x] 分析两套 `StageBasicSetup.tsx` 的逻辑差异
- [x] 创建 `shared/StageBasicSetupCore.tsx`，提取共享表单渲染字段（读者频道、叙事视角、节奏、情绪、章节数、BookFramingSection）
- [x] 通过 `layout` prop 区分全屏 vs 紧凑布局

### T5: StageWorldStyleCore
- [x] 分析两套 `StageWorldStyle.tsx` 的逻辑差异
- [x] 创建 `shared/StageWorldStyleCore.tsx`
- [x] 提取世界选择 + 风格配置共享逻辑

### T6: StageModelRunCore
- [x] 分析两套 `StageModelRun.tsx` 的逻辑差异
- [x] 创建 `shared/StageModelRunCore.tsx`
- [x] 提取模型选择 + 运行方式 + 执行计划配置共享逻辑

### T7: StageCandidatesCore
- [x] 分析两套 `StageCandidates.tsx` 的逻辑差异
- [x] 创建 `shared/StageCandidatesCore.tsx`
- [x] 提取方案列表渲染共享逻辑

## 阶段 3：适配包装组件

### T8: 重构子组件级包装（autoDirectorCreate/）
- [x] 重构 `StageIdea.tsx` → 引用 `StageIdeaCore`，传入紧凑布局 Props
- [x] 重构 `StageBasicSetup.tsx` → 引用 `StageBasicSetupCore`
- [x] 重构 `StageWorldStyle.tsx` → 引用 `StageWorldStyleCore`
- [x] 重构 `StageModelRun.tsx` → 引用 `StageModelRunCore`
- [x] 重构 `StageCandidates.tsx` → 引用 `StageCandidatesCore`
- [x] 确认外部 import 路径不变（`NovelAutoDirectorDialog.tsx` 等消费者无需改动）

### T9: 重构页面级包装（autoDirector/）
- [x] 重构 `StageIdea.tsx` → 引用 `StageIdeaCore`，传入全屏布局 Props
- [x] 重构 `StageBasicSetup.tsx` → 引用 `StageBasicSetupCore`
- [x] 重构 `StageWorldStyle.tsx` → 引用 `StageWorldStyleCore`
- [x] 重构 `StageModelRun.tsx` → 引用 `StageModelRunCore`
- [x] 重构 `StageCandidates.tsx` → 引用 `StageCandidatesCore`
- [x] 确认外部 import 路径不变（`AutoDirectorCreatePage.tsx` 等消费者无需改动）

## 阶段 4：验证

### T10: 类型与编译
- [x] `pnpm typecheck` 零错误
- [x] 确认无未使用的 import
- [x] 确认无循环依赖

### T11: 测试与行为验证
- [x] `pnpm test:client` 全部通过
- [x] 手动验证页面级创建流程（AutoDirectorCreatePage）功能正常
- [x] 手动验证子组件级创建流程（NovelAutoDirectorDialog）功能正常
- [x] 对比重构前后代码行数，确认减少 30% 以上

## 阶段 5：收尾

### T12: 文档与提交
- [x] 更新 `run_result.json` 状态为 `done`
- [x] 更新 `tasks.md` 所有任务勾选
- [x] 更新 `README.md` 状态
- [x] 提交变更
