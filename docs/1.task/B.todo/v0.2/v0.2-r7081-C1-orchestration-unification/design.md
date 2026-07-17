# 设计文档 — REQ-7081 统一编排层

## 1. 当前架构诊断

### 1.1 "执行AI任务"的四条路径

```
用户/系统触发 AI 任务
        │
        ├─→ agents/orchestrator.ts     ← 对话交互路径
        │       意图解析 → 工具选择 → LLM 调用
        │
        ├─→ runtime/ 适配器(DI)        ← 运行时驱动路径
        │       Agent 创建 → 任务分发 → 生命周期管理
        │
        ├─→ graphs/ + creativeHub/     ← 图编排路径
        │       Node 执行 → DAG 编排 → Checkpoint
        │
        └─→ director/commands          ← 流水线路径
                命令解析 → NodeRunner → 质量循环
```

### 1.2 选择逻辑散落点

| 位置 | 逻辑 |
|------|------|
| `server/src/app.ts` | 模块注册、路由挂载 |
| `server/src/modules/*/http/` | HTTP 入口 → 服务调用 |
| `server/src/agents/orchestrator.ts` | 意图解析 → 工具选择 |
| `server/src/services/novel/director/commands/` | 命令解析 → phase 分发 |

### 1.3 状态隔离现状

每个子系统的状态独立管理，无法跨系统读写：

```
Agent State         Runtime State       Graph State         Pipeline State
├─ conversation     ├─ DI container     ├─ checkpoint      ├─ snapshot
├─ tool history     ├─ task queue       ├─ node state      ├─ workspace
└─ context window   └─ agent pool       └─ graph exec      └─ volume state
     ❌ 不互通           ❌ 不互通           ❌ 不互通           ❌ 不互通
```

## 2. 目标架构

### 2.1 统一入口

```
                    orchestration/router.ts
                    (TaskType → 子系统分发)
                    ┌──────────┼──────────┐
                    │          │          │
              agent/      pipeline/    graph/      runtime/
              (对话)       (流水线)     (DAG)       (运行时)
                    │          │          │          │
                    └──────────┴──────────┴──────────┘
                               │
                    ExecutionContext (共享状态)
```

### 2.2 模块职责边界

| 模块 | 原路径 | 新路径 | 职责 |
|------|--------|--------|------|
| Agent | `agents/` | `orchestration/agent/` | 用户对话交互、意图解析、工具选择、LLM 调用 |
| Pipeline | `services/novel/director/` | `orchestration/pipeline/` | 章节级批量生成、质量循环、phase 管理 |
| Graph | `graphs/` + `creativeHub/` | `orchestration/graph/` | 前置准备任务（角色/大纲/世界观/公式）声明式 DAG |
| Runtime | `services/novel/runtime/` + `runtime/` | `orchestration/runtime/` | 章节运行时协调、DI、任务分发、缓存、增量同步 |

## 3. Router 设计

### 3.1 类型定义

```typescript
// orchestration/types.ts

export type OrchestrationDomain = 'agent' | 'pipeline' | 'graph' | 'runtime';

export interface ExecutionContext {
  novelId: string;
  taskId?: string;
  userId?: string;
  // 跨域共享状态
  state: Map<string, unknown>;
  getState<T>(key: string): T | undefined;
  setState<T>(key: string, value: T): void;
}

export interface RouteRequest {
  domain: OrchestrationDomain;
  action: string;        // 子系统内的具体操作
  payload: unknown;      // 操作参数
  context: ExecutionContext;
}

export interface RouteResult {
  success: boolean;
  data?: unknown;
  error?: string;
  context: ExecutionContext;  // 返回更新后的 context
}
```

### 3.2 路由表

```typescript
// orchestration/router.ts

const domainHandlers: Record<OrchestrationDomain, DomainHandler> = {
  agent:    async (req) => agentHandler.dispatch(req),
  pipeline: async (req) => pipelineHandler.dispatch(req),
  graph:    async (req) => graphHandler.dispatch(req),
  runtime:  async (req) => runtimeHandler.dispatch(req),
};

export async function route(req: RouteRequest): Promise<RouteResult> {
  const handler = domainHandlers[req.domain];
  if (!handler) {
    return { success: false, error: `Unknown domain: ${req.domain}`, context: req.context };
  }
  return handler(req);
}
```

### 3.3 调用方使用方式

```typescript
// 示例：HTTP controller 中发起 AI 任务
import { route } from '@/orchestration/router';
import { createContext } from '@/orchestration/context';

async function handleChapterGenerate(req: Request, res: Response) {
  const ctx = createContext({ novelId: req.params.novelId });
  const result = await route({
    domain: 'pipeline',
    action: 'generateChapter',
    payload: { volumeId: req.body.volumeId },
    context: ctx,
  });
  // ...
}
```

## 4. Execution Context 设计

### 4.1 接口定义

```typescript
// orchestration/context.ts

import type { ExecutionContext } from './types';

interface ContextConfig {
  novelId: string;
  taskId?: string;
  userId?: string;
}

export function createContext(config: ContextConfig): ExecutionContext {
  return {
    novelId: config.novelId,
    taskId: config.taskId,
    userId: config.userId,
    state: new Map(),
    getState<T>(key: string): T | undefined {
      return this.state.get(key) as T | undefined;
    },
    setState<T>(key: string, value: T): void {
      this.state.set(key, value);
    },
  };
}
```

### 4.2 状态键命名约定

| 前缀 | 所属域 | 示例 |
|------|--------|------|
| `agent.` | 对话编排 | `agent.conversationId` |
| `pipeline.` | 流水线 | `pipeline.currentPhase` |
| `graph.` | 图编排 | `graph.checkpointId` |
| `runtime.` | 运行时 | `runtime.cacheVersion` |

### 4.3 使用示例

```typescript
// Agent 域写入状态
ctx.setState('agent.conversationId', conversationId);

// Pipeline 域读取 Agent 域的状态
const convId = ctx.getState<string>('agent.conversationId');
```

## 5. 迁移策略

### 5.1 迁移顺序

```
阶段0: R7080 Director拆分（前置）
  ↓
阶段1: 建立 orchestration/ 目录 + router
  ↓
阶段2: 迁移 graph/      (13文件，依赖最少)
  ↓
阶段3: 迁移 runtime/    (35文件)
  ↓
阶段4: 迁移 agent/      (50文件)
  ↓
阶段5: 迁移 pipeline/   (101文件，依赖 R7080)
  ↓
阶段6: 统一 ExecutionContext 落地
  ↓
阶段7: 全局验证
```

### 5.2 Facade 兼容策略

每个迁移阶段，在原目录创建 facade 文件，重新导出新路径模块：

```typescript
// agents/orchestrator.ts (facade)
/** @deprecated 请使用 orchestration/agent/orchestrator */
export { AgentOrchestrator } from '@/orchestration/agent/orchestrator';
```

### 5.3 导入路径更新策略

1. 每次迁移一个子系统后，立即用 grep 搜索旧路径的所有引用
2. 批量替换为新路径
3. 运行 `pnpm typecheck` 验证
4. 引入 facade 保证不立即破坏其他模块

## 6. 影响分析

| 变更 | 影响范围 | 风险等级 |
|------|----------|----------|
| `agents/` → `orchestration/agent/` | ~50 文件迁移 + N 处导入路径 | 中 |
| `graphs/` + `creativeHub/` → `orchestration/graph/` | ~13 文件迁移 + N 处导入路径 | 低 |
| `services/novel/runtime/` + `runtime/` → `orchestration/runtime/` | ~35 文件迁移 + N 处导入路径 | 中 |
| `services/novel/director/` → `orchestration/pipeline/` | ~101 文件迁移 + N 处导入路径 | 高 |
| 新增 router + context | 新文件，无破坏性 | 低 |

## 7. 循环依赖预防

- `orchestration/types.ts` 不导入任何项目模块（纯类型定义）
- `orchestration/context.ts` 仅导入 types
- `orchestration/router.ts` 导入各子系统的 handler，各子系统不导入 router
- 子系统之间不得直接互相导入，必须通过 router 或 context 通信
