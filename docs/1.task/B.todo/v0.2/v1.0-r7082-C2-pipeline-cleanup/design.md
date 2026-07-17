# 设计文档 — REQ-7082 Pipeline 清理与合并

## 1. 现状分析

### 1.1 文件清单

| 文件 | 路径 | 行数 | 状态 | 角色 |
|------|------|------|------|------|
| A | `services/novel/NovelPipelineService.ts` | 65 | @deprecated | Facade，转发到 NovelCoreService |
| B | `services/novel/novelCorePipelineService.ts` | 568 | 活跃 | Pipeline 核心逻辑 |
| C | `services/novel/novelCorePipelineExecutor.ts` | 610 | 活跃 | Pipeline 执行器 |
| D | `services/novel/NovelPipelineRuntimeService.ts` | 108 | 活跃 | Runtime 适配层 |

### 1.2 当前调用链

```
调用方
  → A: NovelPipelineService (deprecated facade, 65行)
    → NovelCoreService
      → B: novelCorePipelineService (核心逻辑, 568行)
        → C: novelCorePipelineExecutor (执行器, 610行)
          → D: NovelPipelineRuntimeService (运行时适配, 108行)
            → runtime层
```

4 层委托。B 和 C 合并后将减少到 3 层。

### 1.3 B 与 C 职责分析（待 T4 任务细化）

预期 B（service）主要包含：
- Pipeline 阶段选择和路由逻辑
- 策略判断（是否跳过某阶段、条件检查）
- 上下文构建

预期 C（executor）主要包含：
- 节点调度和状态管理
- 运行时调用
- 错误处理和重试

## 2. 目标架构

### 2.1 阶段1完成后

```
调用方
  → NovelCoreService
    → B: novelCorePipelineService (核心逻辑, 568行)
      → C: novelCorePipelineExecutor (执行器, 610行)
        → D: NovelPipelineRuntimeService (运行时适配, 108行)
          → runtime层
```

A 文件删除，调用方直达 NovelCoreService。

### 2.2 阶段2完成后（方案：双文件拆分）

```
调用方
  → NovelCoreService
    → novelPipelineStrategy.ts (策略定义：阶段选择、条件判断)
      → novelPipelineExecutor.ts (执行逻辑：节点调度、运行时调用)
        → D: NovelPipelineRuntimeService (运行时适配, 108行)
          → runtime层
```

- `novelPipelineStrategy.ts`：策略定义，预估 350-450 行
- `novelPipelineExecutor.ts`：执行逻辑，预估 400-550 行
- `NovelPipelineRuntimeService.ts`：保持不变

### 2.3 备选方案（单文件合并）

如果 B + C 合并后总函数数少、耦合度高，可考虑合并为一个 `novelPipelineService.ts`（目标 <= 700 行）。但 568 + 610 = 1178 行，超过项目 700 行限制，故不推荐。

## 3. 接口变更清单

### 3.1 删除的 export

| 原文件 | 导出符号 | 迁移目标 |
|--------|----------|----------|
| `NovelPipelineService.ts` | 所有 export | 由 `NovelCoreService` 直接提供 |

### 3.2 变更的 import 路径

调用方原 import：
```typescript
import { NovelPipelineService } from '../services/novel/NovelPipelineService';
```

改为：
```typescript
// 通过 NovelCoreService 或 createNovelApplicationServices() 获取对应方法
```

## 4. 影响范围

| 阶段 | 影响文件 | 风险 |
|------|----------|------|
| 阶段1 | `NovelPipelineService.ts`（删除）、引用方（2-5 个文件） | 低 — 仅删除转发层 |
| 阶段2 | 4 个文件（删除 2、新增 2）、barrel export、引用方 | 中 — 涉及职责拆分 |

## 5. 测试策略

- **T1-T3**：typecheck 验证即可，deprecated facade 删除不应有行为变化
- **T4-T6**：运行全量 server 测试，验证 pipeline 流程无回归
- **T9**：手动验证 pipeline 端到端流程
