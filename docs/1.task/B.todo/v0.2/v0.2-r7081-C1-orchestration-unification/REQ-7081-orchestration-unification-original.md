---
id: REQ-7081
title: "统一编排层 — 四套AI编排系统收敛"
status: requirements_ready
priority: C1
version: "0.2"
created: "2026-07-17"
updated: "2026-07-17"
---

# REQ-7081 — 统一编排层

## 1. 目标

将项目中的四套 AI 编排系统（Agent Orchestrator、Runtime Layer、LangGraph Graphs、Director Pipeline）统一收敛到 `orchestration/` 顶层模块，建立统一路由入口和共享 Execution Context，消除选择逻辑散落、状态不互通的架构债务。

## 2. 范围

### 包含

- 创建 `orchestration/` 顶层目录及子模块结构（router、agent、pipeline、graph、runtime）
- 实现 `orchestration/router.ts` 统一路由层：根据任务类型分发到对应子系统
- 将 `agents/` 目录下约 50 个文件迁移到 `orchestration/agent/`，更新所有导入路径
- 将 `graphs/` + `creativeHub/` 下约 13 个文件迁移到 `orchestration/graph/`
- 将 `services/novel/runtime/` 下约 35 个文件迁移到 `orchestration/runtime/`
- 将 `services/novel/director/` 下约 101 个文件迁移到 `orchestration/pipeline/`（依赖 R7080 先完成拆分）
- 建立统一的 `Execution Context` 类型和读写接口
- facade 导出保持向后兼容（原有导入路径不立即失效）
- 更新所有受影响的导入路径（server、client、shared、desktop）
- 全量类型检查和测试通过

### 不包含

- 改写各子系统的内部逻辑（仅迁移位置和统一入口）
- 修改 LangGraph 图定义本身
- 新增功能特性

## 3. 非目标

- 不改变各子系统的核心算法和业务逻辑
- 不引入新的编排框架或第三方编排库
- 不合并或消除四套系统中的任何一个（仅统一入口和路径）

## 4. EARS 验收条目

| ID | 验收条件 |
|----|----------|
| AC-1 | `orchestration/router.ts` 存在且能根据 `taskType` 正确分发到 agent / pipeline / graph / runtime 子系统 |
| AC-2 | `orchestration/agent/` 包含原 `agents/` 的全部文件，所有导入路径已更新 |
| AC-3 | `orchestration/graph/` 包含原 `graphs/` + `creativeHub/` 的全部文件，所有导入路径已更新 |
| AC-4 | `orchestration/runtime/` 包含原 `services/novel/runtime/` 的全部文件（含 `runtime/`），所有导入路径已更新 |
| AC-5 | `orchestration/pipeline/` 包含原 `services/novel/director/` 的全部文件（R7080 拆分后），所有导入路径已更新 |
| AC-6 | 统一 Execution Context 类型定义存在，各子系统通过 Context 读写共享状态 |
| AC-7 | facade 层保证原有导入路径不立即失效（至少一个版本的兼容期） |
| AC-8 | `pnpm typecheck` 零错误 |
| AC-9 | `pnpm test:all` 全量测试通过 |
| AC-10 | `pnpm build` 构建成功 |

## 5. 核心问题

### 5.1 四轨并行架构债务

当前项目存在四套独立的"执行 AI 任务"路径：

| 路径 | 入口 | 分发机制 |
|------|------|----------|
| Agent 路径 | `agents/orchestrator.ts` | 意图解析 → 工具调用 |
| Runtime 路径 | `runtime/` 适配器 | DI 容器 → 任务分发 |
| Graph 路径 | `graphs/` 节点 | 声明式 DAG 执行 |
| Pipeline 路径 | `director/commands` | 命令模式 → 流水线 |

同一"执行 AI 任务"可能走四条不同路径，而选择逻辑散落在：
- `app.ts` 的模块注册
- `modules/` 的 HTTP 入口
- `agents/orchestrator.ts` 的意图路由
- `director/commands/` 的命令解析

### 5.2 状态不互通

四套系统各自维护独立状态：
- Agent: 对话会话 + 工具调用历史
- Runtime: DI 容器 + 任务队列
- Graph: LangGraph checkpoint
- Pipeline: Director snapshot + volume workspace

缺乏统一的执行上下文，导致跨系统协调困难。

## 6. 方案概要

### 6.1 统一路由

```typescript
// orchestration/router.ts
type TaskType = 'agent' | 'pipeline' | 'graph' | 'runtime';
type RouteRequest = { taskType: TaskType; payload: unknown; context: ExecutionContext };

function route(req: RouteRequest): Promise<RouteResult>;
```

### 6.2 共享 Execution Context

```typescript
interface ExecutionContext {
  novelId: string;
  taskId?: string;
  state: Map<string, unknown>;
  getState<T>(key: string): T | undefined;
  setState<T>(key: string, value: T): void;
}
```

### 6.3 迁移策略

分阶段迁移，每个阶段的 facade 保持兼容：

1. 建立 `orchestration/` 目录和 router 框架
2. 迁移最小依赖子系统（graph → runtime → agent）
3. 迁移最大子系统 pipeline（依赖 R7080 拆分完成）
4. 更新全量导入路径
5. 移除旧目录下的原始文件
6. 清理 facade 兼容层

## 7. 风险与未决项

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 导入路径更新遗漏 | 高 | 使用 grep/ast-grep 全局搜索，分批提交验证 |
| 迁移破坏运行时行为 | 高 | facade 兼容层保证一个版本的平滑过渡 |
| R7080 未完成阻塞 pipeline 迁移 | 中 | pipeline 迁移放在最后阶段，其余子系统可先迁移 |
| 循环依赖引入 | 中 | router 仅被上层调用，不反向依赖子系统 |
| TypeScript 路径别名需要同步更新 | 中 | 与 tsconfig paths 同步调整 |
