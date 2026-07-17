# 设计文档 — REQ-7080 Director 子系统模块化拆分

## 1. 总体策略

### 1.1 拆分原则

1. **最小改动**：每次只移动/拆分文件，不修改业务逻辑
2. **渐进验证**：每个阶段完成后立即 typecheck + test
3. **Facade 模式**：每个子模块通过 `index.ts` 统一导出，内部重组对外部透明
4. **不可变历史**：使用 `git mv` 移动文件以保留 blame 历史

### 1.2 三阶段总览

```
阶段1: runtime/ 内部分目录
  └─ 46 个文件 → 6 个子目录 + index.ts facade
  └─ 拆分 2 个超大文件 (Store 727行, Inventory 673行)

阶段2: 抽取独立子模块
  └─ automation/ → 独立模块 + facade
  └─ projections/ → 独立模块 + facade
  └─ 拆分 3 个超大文件 (AutoExecution 700行, Projection 672行, Pipeline 656行)
  └─ director/顶层 facade

阶段3: 解耦外部依赖
  └─ directorRuntimeTools → 接口依赖
  └─ directorWorker → 事件驱动
  └─ 减少 direct import
```

---

## 2. 阶段1：runtime/ 内部分目录

### 2.1 目标结构

```
runtime/
├── index.ts                          # facade，re-export 所有公共接口
├── core/                             # 核心编排（~5 文件）
│   ├── DirectorRuntimeOrchestrator.ts   # novelDirectorRuntimeOrchestrator.ts → 重命名
│   ├── DirectorRuntimeService.ts        # DirectorRuntimeService.ts
│   ├── DirectorNodeRunner.ts            # DirectorNodeRunner.ts
│   ├── DirectorPolicyEngine.ts          # DirectorPolicyEngine.ts
│   └── DirectorCircuitBreakerService.ts # DirectorCircuitBreakerService.ts
├── takeover/                         # 接管系统（11 文件）
│   ├── index.ts                         # takeover 子 facade
│   ├── novelDirectorTakeover.ts
│   ├── novelDirectorTakeoverContinue.ts
│   ├── novelDirectorTakeoverExecution.ts
│   ├── novelDirectorTakeoverHelpers.ts
│   ├── novelDirectorTakeoverNodeAdapters.ts
│   ├── novelDirectorTakeoverReadiness.ts
│   ├── novelDirectorTakeoverReset.ts
│   ├── novelDirectorTakeoverRuntime.ts
│   ├── takeover-index.ts
│   ├── novelDirectorConfirmRuntime.ts   # 确认流程（与 takeover 紧密相关）
│   └── novelDirectorContinueRuntime.ts  # 继续流程
├── workspace/                        # 工作台分析（~6 文件）
│   ├── DirectorWorkspaceAnalyzer.ts
│   ├── DirectorWorkspaceInterpretation.ts
│   ├── DirectorWorkspaceInventoryLoader.ts
│   ├── DirectorWorkspaceQualityArtifactInventory.ts
│   ├── directorWorkspaceHelpers.ts
│   └── artifact-quality.ts              # 新文件，从 Inventory 提取
├── projection/                       # 事件投影（~5 文件）
│   ├── DirectorEventProjectionService.ts
│   ├── DirectorEventProjectionHelpers.ts
│   ├── directorProjectionUtils.ts
│   ├── DirectorAutomationLedgerEventService.ts
│   └── DirectorStateProposalResolutionService.ts
├── persistence/                      # 持久化（~3 文件）
│   ├── DirectorRuntimePersistence.ts
│   ├── DirectorRuntimeSnapshotMerge.ts   # 原 novelDirectorPersistence.ts（runtime 用）
│   └── autoDirectorMemorySafety.ts       # 内存安全清理，与持久化紧密相关
└── utils/                            # 辅助工具（~10 文件）
    ├── directorRuntimeDefaults.ts
    ├── directorSubsystem.ts
    ├── DirectorArtifactGateway.ts
    ├── DirectorArtifactLedger.ts
    ├── DirectorArtifactLedgerQueryService.ts
    ├── DirectorQualityLoopBudgetLedgerService.ts
    ├── DirectorUsageTelemetryQueryService.ts
    ├── ChapterExecutionProgressInspector.ts
    ├── autoDirectorValidationService.ts
    ├── novelDirectorErrors.ts
    ├── novelDirectorFraming.ts
    ├── novelDirectorHelpers.ts
    └── novelDirectorSchemas.ts
```

### 2.2 文件迁移命令模板

使用 `git mv` 保留 blame 历史：

```bash
# 创建子目录
mkdir -p runtime/{core,takeover,workspace,projection,persistence,utils}

# 核心文件
git mv runtime/novelDirectorRuntimeOrchestrator.ts runtime/core/DirectorRuntimeOrchestrator.ts
git mv runtime/DirectorRuntimeService.ts runtime/core/DirectorRuntimeService.ts
git mv runtime/DirectorNodeRunner.ts runtime/core/DirectorNodeRunner.ts
git mv runtime/DirectorPolicyEngine.ts runtime/core/DirectorPolicyEngine.ts
git mv runtime/DirectorCircuitBreakerService.ts runtime/core/DirectorCircuitBreakerService.ts

# takeover 文件（11个）
git mv runtime/novelDirectorTakeover.ts runtime/takeover/novelDirectorTakeover.ts
# ... 其余 takeover 文件类似

# workspace 文件（6个）
git mv runtime/DirectorWorkspaceAnalyzer.ts runtime/workspace/DirectorWorkspaceAnalyzer.ts
# ...

# projection 文件（5个）
git mv runtime/DirectorEventProjectionService.ts runtime/projection/DirectorEventProjectionService.ts
# ...

# persistence 文件（3个）
git mv runtime/DirectorRuntimePersistence.ts runtime/persistence/DirectorRuntimePersistence.ts
# ...

# utils 文件（其余 ~10个）
git mv runtime/directorRuntimeDefaults.ts runtime/utils/directorRuntimeDefaults.ts
# ...
```

### 2.3 导入路径更新策略

移动后需要更新两类路径：
1. **runtime 内部文件之间的相互引用**：如 `./novelDirectorTakeover.ts` → `../takeover/novelDirectorTakeover.ts`
2. **外部文件对 runtime/ 的引用**：
   - 策略 A：导向子目录直接导入（如 `runtime/takeover/novelDirectorTakeover.ts`）
   - 策略 B：通过 `runtime/index.ts` facade 间接导入
   - **选择策略 B**，对外部而言 facade 是唯一入口

### 2.4 DirectorRuntimeStore.ts 拆分方案（727 行 → 3 文件）

```
DirectorRuntimeStore.ts (原 727行)
├── runtime/core/store-types.ts        # StoreState, StoreSnapshot 等类型定义 (~100行)
├── runtime/core/store-init.ts         # createInitialStore, hydrateStore 等初始化 (~150行)
├── runtime/core/store-queries.ts      # getXxx, findXxx 等查询方法 (~200行)
└── DirectorRuntimeStore.ts (精简版)   # 核心 store 类，组合以上模块 (~300行)
```

拆分原则：
- 类型定义放 `store-types.ts`
- 纯函数（初始化、查询）独立
- Store 类本身保持为薄包装，委托给独立函数

### 2.5 DirectorWorkspaceArtifactInventory.ts 拆分方案（673 行 → 2 文件）

```
DirectorWorkspaceArtifactInventory.ts (原 673行)
├── runtime/workspace/artifact-quality.ts   # 质量检查逻辑 (~200行)
└── DirectorWorkspaceArtifactInventory.ts   # 主文件，委托质量检查 (~470行)
```

### 2.6 runtime/index.ts facade 设计

```typescript
// runtime/index.ts
// Re-export core
export { DirectorRuntimeOrchestrator } from './core/DirectorRuntimeOrchestrator';
export { DirectorRuntimeService } from './core/DirectorRuntimeService';
export { DirectorNodeRunner } from './core/DirectorNodeRunner';
export { DirectorPolicyEngine } from './core/DirectorPolicyEngine';

// Re-export takeover (via takeover/index.ts)
export * from './takeover';

// Re-export workspace
export { DirectorWorkspaceAnalyzer } from './workspace/DirectorWorkspaceAnalyzer';
// ...

// Re-export persistence
export { DirectorRuntimePersistence } from './persistence/DirectorRuntimePersistence';
// ...

// Re-export essential utils
export * from './utils/novelDirectorSchemas';
export * from './utils/novelDirectorErrors';
// ...
```

---

## 3. 阶段2：抽取独立子模块

### 3.1 automation/ 模块化

**目标结构**：

```
automation/
├── index.ts                                    # facade
├── novelDirectorAutoExecutionRuntime.ts        # 拆分后 ≤400 行
├── autoExecutionPipeline.ts                    # 新提取：pipeline 编排逻辑
├── autoExecutionStepRunner.ts                  # 新提取：步骤执行器
├── novelDirectorCandidateRuntime.ts            # 保留
├── ...（其余文件保留）
```

**facade 设计**：

```typescript
// automation/index.ts
export { NovelDirectorAutoExecutionRuntime } from './novelDirectorAutoExecutionRuntime';
export { NovelDirectorCandidateRuntime } from './novelDirectorCandidateRuntime';
// 仅导出公共接口，内部辅助文件不导出
```

### 3.2 projections/ 模块化

**目标结构**：

```
projections/
├── index.ts                                    # facade
├── novelDirectorRuntimeProjection.ts           # 拆分后 ≤400 行
├── projectionCore.ts                           # 新提取：投影核心逻辑
├── ...（其余文件保留）
```

### 3.3 novelDirectorPipelineRuntime.ts 拆分方案（656 行 → 3 文件）

```
novelDirectorPipelineRuntime.ts (原 656行)
├── pipeline-phases.ts           # pipeline 阶段定义和顺序 (~150行)
├── pipeline-executor.ts         # pipeline 执行引擎 (~200行)
└── novelDirectorPipelineRuntime.ts   # 精简主文件，组合以上 (~300行)
```

### 3.4 director/ 顶层 facade 设计

```typescript
// director/index.ts
// Runtime（核心模块）
export * from './runtime';

// 子模块 facade
export * from './automation';
export * from './projections';

// 其他稳定模块（不需要 facade 时直接 re-export 关键文件）
export { NovelDirectorService } from './NovelDirectorService';
export { NovelDirectorIdeaInspirationService } from './NovelDirectorIdeaInspirationService';
export { DirectorEventBridge } from './DirectorEventBridge';

// 注意：不导出内部实现细节
```

---

## 4. 阶段3：解耦外部依赖

### 4.1 directorRuntimeTools.ts 接口解耦

**当前问题**：`agents/tools/directorRuntimeTools.ts`（536 行）直接 import director 内部文件。

**方案**：定义 `DirectorToolInterface` 接口：

```typescript
// director/index.ts 中导出
export interface DirectorToolInterface {
  getRuntimeState(novelId: string): Promise<DirectorRuntimeState>;
  executePhase(phase: DirectorPhase, context: DirectorContext): Promise<PhaseResult>;
  getWorkspace(novelId: string, taskId: string): Promise<WorkspaceDocument>;
  // ... 仅包含 tools 实际使用的方法
}
```

```typescript
// agents/tools/directorRuntimeTools.ts 改为
import type { DirectorToolInterface } from '../../services/novel/director';

export function createDirectorRuntimeTools(director: DirectorToolInterface): Tool[] {
  // ... 使用 director 接口而非直接 import
}
```

### 4.2 directorWorker.ts 事件驱动解耦

**当前问题**：worker 可能直接 import director 内部模块。

**方案**：
- Worker 只通过 EventBridge 发送/接收事件
- 不在 worker 中直接 import director service
- Director 侧订阅 worker 事件并自行处理

---

## 5. 影响分析

| 阶段 | 影响范围 | 风险等级 | 回滚难度 |
|------|----------|----------|----------|
| 阶段1 | runtime/ 内部 + 所有引用 runtime/ 的文件 | 中 | 低（git revert 单次 commit） |
| 阶段2 | automation/、projections/、director/ 顶层 + 外部引用 | 中 | 低（每个子模块独立 commit） |
| 阶段3 | agents/tools/、workers/ | 低 | 中（接口变更需同步修改实现） |

## 6. 测试策略

- **阶段1每步**：`pnpm typecheck` → `pnpm test` → 修复 → 重跑
- **阶段2每步**：同上 + `pnpm test:all`
- **阶段3每步**：同上 + `pnpm build`
- **最终验证**：`pnpm build` + `pnpm test:all` + E2E 手动验证
