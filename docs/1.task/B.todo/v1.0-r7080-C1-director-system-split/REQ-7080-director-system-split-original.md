---
id: REQ-7080
title: "Director 子系统模块化拆分"
status: requirements_ready
priority: C1
version: "1.0"
created: "2026-07-17"
updated: "2026-07-17"
---

# REQ-7080 — Director 子系统模块化拆分（冻结副本）

> 本文件为冻结副本，记录需求初始状态。工作副本见 `REQ-7080-director-system-split.md`。

## 1. 目标

将 `server/src/services/novel/director/`（101 文件、13 子目录）从"项目中的项目"收敛为可维护的模块化结构，通过三阶段拆分降低复杂度、理清模块边界、减少外部耦合。

## 2. 背景

### 2.1 现状

| 子目录 | 文件数 | 问题 |
|--------|--------|------|
| `runtime/` | 46 | 远超 CLAUDE.md 约束（>12 须建下级目录），职责混杂 |
| `workflowStepRuntime/` | 16 | 相对独立，无明显组织问题 |
| `phases/` | 12 | 职责清晰，暂不调整 |
| `projections/` | 10 | 与 runtime 耦合，需独立 |
| `automation/` | 9 | 独立性强，可抽取 |
| `recovery/` | 5 | 职责清晰 |
| `commands/` | 5 | 职责清晰 |
| 其余 | ~8 | 零散文件 |

### 2.2 超大文件

| 文件 | 行数 | 所在位置 |
|------|------|----------|
| `DirectorRuntimeStore.ts` | 727 | runtime/ |
| `novelDirectorAutoExecutionRuntime.ts` | 700 | automation/ |
| `DirectorWorkspaceArtifactInventory.ts` | 673 | runtime/ |
| `novelDirectorRuntimeProjection.ts` | 672 | projections/ |
| `novelDirectorPipelineRuntime.ts` | 656 | director/ 根 |

### 2.3 外部耦合

- `agents/tools/directorRuntimeTools.ts`（536 行）：直接 import director 内部文件
- `workers/directorWorker.ts`：通过事件驱动与 director 交互

## 3. 范围

### 包含

**阶段1：runtime/ 内部分目录（工时 8-10h）**
- 将 runtime/ 46 个文件按逻辑分为 6 个子目录：`core/`、`takeover/`、`workspace/`、`projection/`、`persistence/`、`utils/`
- 拆分 `DirectorRuntimeStore.ts`（727 行）为独立模块
- 拆分 `DirectorWorkspaceArtifactInventory.ts`（673 行）为独立模块
- 建立 `runtime/index.ts` facade

**阶段2：抽取独立子模块（工时 10-15h）**
- 将 `automation/` 抽取为独立模块（9 文件），建立 facade
- 将 `projections/` 抽取为独立模块（10 文件），建立 facade
- 建立 `director/` 顶层 `index.ts` facade，只导出公共接口
- 拆分 `novelDirectorAutoExecutionRuntime.ts`（700 行）
- 拆分 `novelDirectorRuntimeProjection.ts`（672 行）
- 拆分 `novelDirectorPipelineRuntime.ts`（656 行）

**阶段3：解耦外部依赖（工时 5-8h）**
- `agents/tools/directorRuntimeTools.ts` 通过接口依赖 director
- `workers/directorWorker.ts` 通过事件驱动与 director 交互
- 减少 Director 对外部模块的直接 import
- 全量验证：类型检查、单元测试、集成测试、E2E 手动验证

### 不包含

- 业务流程变更或功能修改
- 新增功能
- 其他子系统拆分
- 数据库 schema 变更
- 前端代码变更

## 4. 非目标

- 不改变任何业务逻辑行为
- 不修改 API 接口签名
- 不调整 phases/、workflowStepRuntime/、recovery/、commands/ 的内部结构（除导入路径更新外）
- 不做性能优化（除非拆分自然带来）

## 5. EARS 验收条目

| ID | 验收条件 |
|----|----------|
| AC-1 | runtime/ 目录下文件从 46 个减少到 ≤6 个子目录 + 1 个 facade，无文件直接暴露在 runtime/ 根 |
| AC-2 | `DirectorRuntimeStore.ts`（727 行）拆分为 ≤400 行的模块 |
| AC-3 | `DirectorWorkspaceArtifactInventory.ts`（673 行）拆分为 ≤400 行的模块 |
| AC-4 | `automation/` 目录通过 facade 导出，外部引用全部通过 facade |
| AC-5 | `projections/` 目录通过 facade 导出，外部引用全部通过 facade |
| AC-6 | `director/` 顶层 `index.ts` facade 导出所有公共接口，外部模块不深导入内部文件 |
| AC-7 | `directorRuntimeTools.ts` 通过接口而非具体实现依赖 director |
| AC-8 | 所有拆分后 `pnpm typecheck` 零错误 |
| AC-9 | 所有拆分后 `pnpm test` 零失败 |
| AC-10 | 所有拆分后 `pnpm build` 成功 |
| AC-11 | Auto-Director 端到端流程正常运行（手动验证） |
| AC-12 | 5 个超大文件（>650 行）全部拆分为 ≤400 行的模块 |

## 6. 风险与未决项

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 导入路径大面积变更可能引入遗漏 | 高 | 分阶段提交，每阶段完成后跑 typecheck + test |
| 超大文件拆分可能破坏业务逻辑 | 高 | 每个拆分独立 commit，不合并逻辑变更 |
| 接口抽象可能引入不必要的复杂度 | 中 | 严格遵循"最小接口"原则，仅暴露外部实际使用的部分 |
| 与并行开发的其他分支冲突 | 中 | 拆分期间减少其他 director 相关变更 |
| 自动化/投影模块独立后的循环依赖风险 | 中 | 阶段2设计时检查导入图，禁止循环依赖 |
