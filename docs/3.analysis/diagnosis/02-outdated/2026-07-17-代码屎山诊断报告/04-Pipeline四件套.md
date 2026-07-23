---
description: "子报告4：Pipeline四件套诊断——NovelPipelineService废弃facade与core逻辑的纠缠"
date: 2026-07-17
parent: "2026-07-17-代码屎山诊断报告"
severity: P1
---

# 子报告4：Pipeline 四件套

> 严重度：P1（功能重叠）
> 位置：`server/src/services/novel/`
> 涉及文件：4 个 | 合计行数：~1351 行

---

## 一、四件套清单

| 文件 | 行数 | 状态 | 职责 |
|------|------|------|------|
| `NovelPipelineService.ts` | 65 | **@deprecated** | Facade 封装，委托给 core |
| `novelCorePipelineService.ts` | 568 | 活跃 | Pipeline 核心逻辑 |
| `novelCorePipelineExecutor.ts` | 610 | 活跃 | Pipeline 执行器 |
| `NovelPipelineRuntimeService.ts` | 108 | 活跃 | Pipeline 运行时适配 |

---

## 二、各文件详细分析

### 2.1 NovelPipelineService（65行）— Deprecated Facade

```typescript
/**
 * @deprecated Use `createNovelApplicationServices()` and inject only the
 * pipeline capability required by the caller.
 */
export class NovelPipelineService {
  protected readonly core = new NovelCoreService();
  protected readonly chapterRuntimeCoordinator = new ChapterRuntimeCoordinator();

  constructor() {
    registerChapterExecutionStageRunner({
      getCore: () => this.core,
      getCoordinator: () => this.chapterRuntimeCoordinator,
    });
  }
  // ... 委托方法
}
```

**问题**：
- 已标记 @deprecated 但未删除
- 仍被其他代码引用（作为向后兼容层）
- 65 行的纯委托代码，增加了理解和维护成本

### 2.2 novelCorePipelineService（568行）— 核心逻辑

职责：
- Pipeline 执行策略定义
- 章节生成流程编排
- 阶段（stages）注册和管理
- 执行控制策略

**问题**：568 行接近 700 行红线，内部包含多个职责域（策略、编排、状态管理）。

### 2.3 novelCorePipelineExecutor（610行）— 执行器

职责：
- 实际执行 pipeline 的各个阶段
- 阶段间的数据传递
- 错误处理和重试
- 执行结果收集

**问题**：
- 610 行超过 600 行目标
- 与 `novelCorePipelineService` 职责边界模糊——service 定义"做什么"，executor 定义"怎么做"，但两者都在处理执行逻辑

### 2.4 NovelPipelineRuntimeService（108行）— 运行时适配

职责：
- 将 pipeline 执行桥接到 runtime 层
- 处理运行时上下文
- 适配不同的执行环境

---

## 三、依赖关系图

```
调用方（modules/http, agents/tools, services）
         │
         ▼
NovelPipelineService (deprecated facade)
         │
         ▼
NovelCoreService ──→ novelCorePipelineService (568行)
                              │
                              ▼
                   novelCorePipelineExecutor (610行)
                              │
                              ▼
                   NovelPipelineRuntimeService (108行)
                              │
                              ▼
                   ChapterRuntimeCoordinator (services/novel/runtime/)
```

### 3.1 调用链分析

1. 外部调用方 → `NovelPipelineService`（deprecated）或直接 → `NovelCoreService`
2. `NovelCoreService` → `novelCorePipelineService`
3. `novelCorePipelineService` → `novelCorePipelineExecutor`
4. `novelCorePipelineExecutor` → `NovelPipelineRuntimeService` → runtime 层

**问题**：4 层委托链，中间两层（service + executor）职责重叠。

---

## 四、与 Director Pipeline 的关系

Director Pipeline（101 文件）是更上层的编排系统，它调用 Novel Pipeline 作为底层执行引擎。

```
Director Pipeline (services/novel/director/)
         │
         ▼
Novel Pipeline (services/novel/novelCore*Pipeline*)
         │
         ▼
Chapter Runtime (services/novel/runtime/)
```

Novel Pipeline 是 Director 的"执行手臂"。两者职责分离是正确的，但 Novel Pipeline 内部的 4 文件冗余增加了整个链路的复杂度。

---

## 五、建议方案

### 阶段1：删除 deprecated facade（工时 1h）

- 删除 `NovelPipelineService.ts`
- 更新所有引用方改为直接使用 `NovelCoreService` 或 `createNovelApplicationServices()`
- 这是最低成本的清理

### 阶段2：合并 service + executor（工时 4-6h）

- 将 `novelCorePipelineService`（568行）和 `novelCorePipelineExecutor`（610行）合并为 `novelCorePipeline.ts`（~800行，可接受，因为 pipeline 执行本身是一个复杂流程）
- 或者拆分为：`novelPipelineStrategy.ts`（策略定义）+ `novelPipelineExecutor.ts`（执行逻辑）
- `NovelPipelineRuntimeService`（108行）保留为适配层

### 预期收益

- Pipeline 文件从 4 个减至 2-3 个
- 调用链从 4 层减至 2-3 层
- deprecated 代码归零
