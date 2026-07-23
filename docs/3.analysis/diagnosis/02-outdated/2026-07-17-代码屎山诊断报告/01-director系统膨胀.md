---
description: "子报告1：Director系统膨胀深度诊断——101文件13子目录的形成路径与拆分方案"
date: 2026-07-17
parent: "2026-07-17-代码屎山诊断报告"
severity: P0
---

# 子报告1：Director 系统膨胀

> 严重度：P0（架构阻塞）
> 位置：`server/src/services/novel/director/`
> 文件数：101 | 子目录数：13

---

## 一、现状数据

### 1.1 目录结构与文件分布

```
director/                          101 files total
├── runtime/                        46 files  ← 最大子目录
│   ├── NovelDirectorService.ts     (570行)  入口服务
│   ├── novelDirectorRuntimeOrchestrator.ts (622行) 核心编排
│   ├── DirectorRuntimeStore.ts     (727行)  状态存储
│   ├── DirectorRuntimeService.ts   (264行)  运行时服务
│   ├── DirectorNodeRunner.ts       节点执行器
│   ├── DirectorPolicyEngine.ts     策略引擎
│   ├── DirectorCircuitBreakerService.ts 断路器
│   ├── DirectorWorkspaceAnalyzer.ts 工作台分析
│   ├── novelDirectorTakeover*.ts   (11个)  接管相关
│   └── ... (34 more)
├── workflowStepRuntime/            16 files  工作步骤模块系统
├── phases/                         12 files  流水线阶段
├── projections/                    10 files  投影/仪表盘
├── automation/                     9 files   自动执行
├── recovery/                       5 files   恢复/回填
├── commands/                       5 files   命令系统
├── state/                          4 files   状态管理
├── debug/                          3 files   调试工具
├── http/                           2 files   路由（不走modules体系）
├── operations/                     1 file    操作定义
└── langgraphPilot/                 1 file    LangGraph试点
```

### 1.2 超大文件分布

| 文件 | 行数 | 所在子目录 |
|------|------|-----------|
| DirectorRuntimeStore.ts | 727 | runtime/ |
| novelDirectorAutoExecutionRuntime.ts | 700 | automation/ |
| DirectorWorkspaceArtifactInventory.ts | 673 | runtime/ |
| novelDirectorRuntimeProjection.ts | 672 | projections/ |
| novelDirectorPipelineRuntime.ts | 656 | runtime/ |

Director 子系统自身有 5 个超 650 行文件，占全项目超大文件的约 12%。

---

## 二、膨胀路径分析

### 2.1 版本迭代叠加

Director 系统经历了至少 5 次重大功能叠加：

| 阶段 | 新增内容 | 文件增量 |
|------|----------|----------|
| 基础流水线 | NovelDirectorService + pipeline phases | ~20 |
| 自动执行 | automation/ 全部（断路器、检查点） | +9 |
| 接管系统 | runtime/novelDirectorTakeover*.ts (11个) | +11 |
| 投影/仪表盘 | projections/ 全部 | +10 |
| 工作步骤模块化 | workflowStepRuntime/ 全部 | +16 |

每次功能叠加都在 `director/` 下新建子目录，但从未回头整理已有结构。

### 2.2 runtime/ 子目录的失控

`runtime/` 目录 46 个文件是 CLAUDE.md ">12 文件必须建下级目录" 约束的 4 倍。内部可进一步分为：

- **核心编排**（~5 文件）：Orchestrator、Store、Service、NodeRunner
- **接管系统**（~11 文件）：Takeover 相关
- **工作台分析**（~6 文件）：Workspace 分析、解释、清单
- **事件投影**（~5 文件）：Event Projection 相关
- **持久化**（~3 文件）：Persistence、Snapshot
- **其他**（~16 文件）：各种辅助工具

这 6 个逻辑分组没有物理目录边界。

### 2.3 与外部系统的耦合

Director 并非孤立系统，它与以下模块紧密耦合：

```
agents/tools/directorRuntimeTools.ts  ← Agent层桥接到Director
agents/tools/directorRuntimeToolSchemas.ts ← Agent工具Schema
workers/directorWorker.ts             ← Worker层执行Director任务
services/novel/novelCoreAutoDirectorTasks.ts ← Core层的自动导演任务
services/novel/novelCorePipelineExecutor.ts ← Pipeline层
prompting/workflows/directorWorkflowDefinitions.ts ← Prompt层的导演工作流定义
```

Director 的逻辑渗透到了 agents、workers、services、prompting 四个顶层目录。

---

## 三、具体问题

### 3.1 单一职责违反

`NovelDirectorService.ts`（570 行）是入口类，但同时负责：
- 流水线启动
- 状态查询
- 手动编辑影响评估
- 工作流步骤注册
- 投影构建

### 3.2 命名混乱

- `DirectorRuntimeService` vs `NovelDirectorService` vs `novelDirectorRuntimeOrchestrator` — 三个"运行时"概念的类
- `DirectorRuntimeStore` (727行) — 既是 Store 又是 Service，承担状态管理和业务逻辑
- `DirectorEventProjectionService` vs `DirectorEventProjectionHelpers` vs `directorProjectionUtils` — 三个投影相关文件职责重叠

### 3.3 测试盲区

101 个文件中，仅发现少量测试覆盖。核心编排（Orchestrator 622行）、状态存储（Store 727行）缺乏测试。

---

## 四、建议拆分方案

### 阶段1：runtime/ 内部分目录（工时 8-10h）

```
director/runtime/
├── core/              (Orchestrator, Service, NodeRunner, PolicyEngine)
├── takeover/          (11个Takeover文件)
├── workspace/         (6个Workspace分析文件)
├── projection/        (5个Event投影文件)
├── persistence/       (3个持久化文件)
└── utils/             (其余辅助)
```

### 阶段2：抽取独立子模块（工时 10-15h）

- 将 `automation/` 抽取为独立模块 `director-automation/`
- 将 `projections/` 抽取为独立模块 `director-projections/`
- 建立 `director/` 顶层 facade，只导出公共接口

### 阶段3：解耦外部依赖（工时 5-8h）

- `agents/tools/directorRuntimeTools.ts` 通过接口依赖 director，而非直接 import
- `workers/directorWorker.ts` 通过消息队列/事件驱动与 director 交互

---

## 五、预期收益

- runtime/ 从 46 文件降至每个子目录 <12 文件
- Director 子系统内部复杂度降低 40%（通过目录边界约束）
- 新人理解 Director 系统的时间从 2-3 天降至 0.5-1 天
