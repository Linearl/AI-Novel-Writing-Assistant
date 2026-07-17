# 设计文档 — REQ-3022 AutoDirector 共享 Stage 组件提取

## 1. 目录结构

重构后的文件布局：

```
pages/novels/
├── autoDirector/                          ← 页面级（全屏布局）— 不变
│   ├── StageIdea.tsx                      ← 改为包装组件
│   ├── StageBasicSetup.tsx                ← 改为包装组件
│   ├── StageWorldStyle.tsx                ← 改为包装组件
│   ├── StageModelRun.tsx                  ← 改为包装组件
│   ├── StageCandidates.tsx                ← 改为包装组件
│   └── StageSummaryCard.tsx               ← 不受影响
├── components/
│   └── autoDirectorCreate/               ← 子组件级（紧凑布局）
│       ├── shared/                        ← 新增：共享层
│       │   ├── stageConstants.ts          ← 新增：共享常量
│       │   ├── StageIdeaCore.tsx          ← 新增：共享核心
│       │   ├── StageBasicSetupCore.tsx    ← 新增：共享核心
│       │   ├── StageWorldStyleCore.tsx    ← 新增：共享核心
│       │   ├── StageModelRunCore.tsx      ← 新增：共享核心
│       │   ├── StageCandidatesCore.tsx    ← 新增：共享核心
│       │   └── types.ts                   ← 新增：共享类型
│       ├── StageIdea.tsx                  ← 改为包装组件
│       ├── StageBasicSetup.tsx            ← 改为包装组件
│       ├── StageWorldStyle.tsx            ← 改为包装组件
│       ├── StageModelRun.tsx              ← 改为包装组件
│       └── StageCandidates.tsx            ← 改为包装组件
```

## 2. Core 组件 Props 接口设计

### 2.1 布局区分

所有 Core 组件统一通过 `layout` prop 区分两种场景：

```typescript
type StageLayout = "fullscreen" | "compact";
```

- `fullscreen`：页面级独立布局，更多空白间距、更大的标题字号
- `compact`：对话框内紧凑布局，减小 padding、紧凑间距

### 2.2 各 Stage 的 Core Props

#### StageIdeaCoreProps

```typescript
interface StageIdeaCoreProps {
  layout: StageLayout;
  idea: string;
  onIdeaChange: (value: string) => void;
  ideaInspirations: string[];
  isGeneratingInspirations: boolean;
  onGenerateInspirations: () => void;
  onContinue: () => void;
  onQuickGenerate: () => void;
  canProceed: boolean;
}
```

#### StageBasicSetupCoreProps

```typescript
interface StageBasicSetupCoreProps {
  layout: StageLayout;
  basicForm: NovelBasicFormState;
  onBasicFormChange: (patch: Partial<NovelBasicFormState>) => void;
  genreOptions: Array<{ id: string; path: string; label: string }>;
  worldOptions: Array<{ id: string; name: string }>;
  idea: string;
  editable: boolean;
  onBack: () => void;
  onContinue: () => void;
  onQuickGenerate: () => void;
}
```

#### StageWorldStyleCoreProps

```typescript
interface StageWorldStyleCoreProps {
  layout: StageLayout;
  // 世界选择
  selectedWorldId: string;
  worldOptions: Array<{ id: string; name: string }>;
  onWorldChange: (worldId: string) => void;
  // 风格配置
  styleConfig: WorldStyleConfig;
  onStyleChange: (patch: Partial<WorldStyleConfig>) => void;
  // 导航
  onBack: () => void;
  onContinue: () => void;
}
```

#### StageModelRunCoreProps

```typescript
interface StageModelRunCoreProps {
  layout: StageLayout;
  runMode: RunMode;
  onRunModeChange: (mode: RunMode) => void;
  autoExecutionDraft: DirectorAutoExecutionDraftState;
  onAutoExecutionDraftChange: (patch: Partial<DirectorAutoExecutionDraftState>) => void;
  autoApprovalDraft: AutoApprovalDraft;
  basicForm: NovelBasicFormState;
  onBasicFormChange?: (patch: Partial<NovelBasicFormState>) => void;
  batches: Batch[];
  editable: boolean;
  onBack: () => void;
  onContinue: () => void;
  canGenerate: boolean;
}
```

#### StageCandidatesCoreProps

```typescript
interface StageCandidatesCoreProps {
  layout: StageLayout;
  candidates: Candidate[];
  onSelect: (candidate: Candidate) => void;
  onRegenerate: () => void;
  onBack: () => void;
}
```

### 2.3 设计原则

1. **Props 扁平化**：Core 组件不接收 controller 对象，而是接收摊平的原子 Props，由包装组件负责从 controller 解构
2. **布局单点控制**：只通过 `layout` 枚举区分，不做两个独立的 `renderFullscreen`/`renderCompact` 分支
3. **style 优先于 className**：对于布局差异，优先使用条件 `className` 或内联 `style`，避免引入额外样式方案
4. **保持 slot 能力**：对于差异较大的区域（如导航按钮），通过 `renderNavigation?: () => ReactNode` 等 render prop 扩展

## 3. 常量提取方案

### 3.1 来源决策

| 常量 | 当前状态 | 处理方式 |
|------|---------|----------|
| `BASIC_INFO_FIELD_HINTS` | 已在 `novelBasicInfo.shared` 中定义 | 保持现有引用，不在 `stageConstants.ts` 重复 |
| `EMOTION_OPTIONS` | 已在 `novelBasicInfo.shared` 中定义 | 保持现有引用 |
| `PACE_OPTIONS` | 已在 `novelBasicInfo.shared` 中定义 | 保持现有引用 |
| `POV_OPTIONS` | 已在 `novelBasicInfo.shared` 中定义 | 保持现有引用 |
| `READER_CHANNEL_OPTIONS` | 已在 `novelBasicInfo.shared` 中定义 | 保持现有引用 |
| `RUN_MODE_OPTIONS` | 仅在 `StageModelRun.tsx` 内部定义 | 提取到 `stageConstants.ts` |
| `DEFAULT_ESTIMATED_CHAPTER_COUNT` | 已在 `novelBasicInfo.shared` 中定义 | 保持现有引用 |

### 3.2 stageConstants.ts 内容

```typescript
// 仅收集当前仅在 Stage 组件内部定义、且多份重复的常量

export const RUN_MODE_OPTIONS = [
  { value: "full_book_autopilot" as const, ... },
  { value: "auto_to_ready" as const, ... },
  { value: "auto_to_execution" as const, ... },
];
```

## 4. 包装组件模式

每个包装组件职责：
1. 从 `controller` 解构出 Core 需要的 props
2. 传入 `layout` 和所有摊平的 props
3. 可选：传入 `renderNavigation` 等 render prop 处理差异

示例（子组件级 `StageIdea.tsx` 重构后）：

```typescript
import { StageIdeaCore } from "./shared/StageIdeaCore";

export default function StageIdea({ controller }: StageIdeaProps) {
  const { idea, setIdea, ...rest } = controller;
  return (
    <StageIdeaCore
      layout="compact"
      idea={idea}
      onIdeaChange={setIdea}
      onContinue={...}
      ...
    />
  );
}
```

## 5. 影响范围

| 变更类型 | 影响 |
|----------|------|
| 新增文件 | 7 个（5 Core + 1 types + 1 constants） |
| 重写文件 | 10 个（5 页面级 + 5 子组件级包装） |
| 外部接口变化 | 无 |
| 消费者改动 | 无 |

## 6. 测试策略

- `pnpm typecheck` 验证类型完整性
- `pnpm test:client` 验证功能无回归
- 手动验证页面级创建流程：打开 AutoDirectorCreatePage，走完整创建流程
- 手动验证对话框创建流程：打开 NovelAutoDirectorDialog，走完整创建流程
- 对比重构前后代码行数，确认减少 30% 以上
