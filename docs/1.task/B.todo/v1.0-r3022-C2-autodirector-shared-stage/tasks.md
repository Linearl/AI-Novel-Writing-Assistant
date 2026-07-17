# 任务清单 — REQ-3022 AutoDirector 共享 Stage 组件提取

## 阶段 0：需求确认

- [ ] 需求文档已生成
- [ ] 设计文档已生成
- [ ] 任务清单已生成

## 阶段 1：提取共享常量与类型

### T1: 创建共享常量文件
- [ ] 创建 `pages/novels/components/autoDirectorCreate/shared/stageConstants.ts`
- [ ] 定位两套组件中的重复常量（`BASIC_INFO_FIELD_HINTS`、`EMOTION_OPTIONS`、`PACE_OPTIONS`、`POV_OPTIONS`、`READER_CHANNEL_OPTIONS`、`RUN_MODE_OPTIONS` 等）
- [ ] 确定常量统一来源（优先引用已有 `novelBasicInfo.shared` 导出）
- [ ] 收集仅在单一组件内部定义的局部常量，迁移到 `stageConstants.ts`
- [ ] 更新两套组件的 import 引用至统一入口

### T2: 提取共享类型定义
- [ ] 定义各 Core 组件的统一 Props 接口（`StageIdeaCoreProps`、`StageBasicSetupCoreProps` 等）
- [ ] 类型文件放在 `shared/` 目录或内嵌于各 Core 组件

## 阶段 2：创建 Core 组件（按依赖顺序）

### T3: StageIdeaCore
- [ ] 分析两套 `StageIdea.tsx` 的逻辑差异
- [ ] 创建 `shared/StageIdeaCore.tsx`，提取共享渲染逻辑（标题、描述、Textarea、灵感面板）
- [ ] 通过 Props 区分全屏 vs 紧凑布局

### T4: StageBasicSetupCore
- [ ] 分析两套 `StageBasicSetup.tsx` 的逻辑差异
- [ ] 创建 `shared/StageBasicSetupCore.tsx`，提取共享表单渲染字段（读者频道、叙事视角、节奏、情绪、章节数、BookFramingSection）
- [ ] 通过 `layout` prop 区分全屏 vs 紧凑布局

### T5: StageWorldStyleCore
- [ ] 分析两套 `StageWorldStyle.tsx` 的逻辑差异
- [ ] 创建 `shared/StageWorldStyleCore.tsx`
- [ ] 提取世界选择 + 风格配置共享逻辑

### T6: StageModelRunCore
- [ ] 分析两套 `StageModelRun.tsx` 的逻辑差异
- [ ] 创建 `shared/StageModelRunCore.tsx`
- [ ] 提取模型选择 + 运行方式 + 执行计划配置共享逻辑

### T7: StageCandidatesCore
- [ ] 分析两套 `StageCandidates.tsx` 的逻辑差异
- [ ] 创建 `shared/StageCandidatesCore.tsx`
- [ ] 提取方案列表渲染共享逻辑

## 阶段 3：适配包装组件

### T8: 重构子组件级包装（autoDirectorCreate/）
- [ ] 重构 `StageIdea.tsx` → 引用 `StageIdeaCore`，传入紧凑布局 Props
- [ ] 重构 `StageBasicSetup.tsx` → 引用 `StageBasicSetupCore`
- [ ] 重构 `StageWorldStyle.tsx` → 引用 `StageWorldStyleCore`
- [ ] 重构 `StageModelRun.tsx` → 引用 `StageModelRunCore`
- [ ] 重构 `StageCandidates.tsx` → 引用 `StageCandidatesCore`
- [ ] 确认外部 import 路径不变（`NovelAutoDirectorDialog.tsx` 等消费者无需改动）

### T9: 重构页面级包装（autoDirector/）
- [ ] 重构 `StageIdea.tsx` → 引用 `StageIdeaCore`，传入全屏布局 Props
- [ ] 重构 `StageBasicSetup.tsx` → 引用 `StageBasicSetupCore`
- [ ] 重构 `StageWorldStyle.tsx` → 引用 `StageWorldStyleCore`
- [ ] 重构 `StageModelRun.tsx` → 引用 `StageModelRunCore`
- [ ] 重构 `StageCandidates.tsx` → 引用 `StageCandidatesCore`
- [ ] 确认外部 import 路径不变（`AutoDirectorCreatePage.tsx` 等消费者无需改动）

## 阶段 4：验证

### T10: 类型与编译
- [ ] `pnpm typecheck` 零错误
- [ ] 确认无未使用的 import
- [ ] 确认无循环依赖

### T11: 测试与行为验证
- [ ] `pnpm test:client` 全部通过
- [ ] 手动验证页面级创建流程（AutoDirectorCreatePage）功能正常
- [ ] 手动验证子组件级创建流程（NovelAutoDirectorDialog）功能正常
- [ ] 对比重构前后代码行数，确认减少 30% 以上

## 阶段 5：收尾

### T12: 文档与提交
- [ ] 更新 `run_result.json` 状态为 `done`
- [ ] 更新 `tasks.md` 所有任务勾选
- [ ] 更新 `README.md` 状态
- [ ] 提交变更
