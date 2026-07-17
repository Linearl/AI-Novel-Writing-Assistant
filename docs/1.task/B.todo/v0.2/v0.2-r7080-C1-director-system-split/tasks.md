# 任务清单 — REQ-7080 Director 子系统模块化拆分

## 阶段 0：需求确认

- [x] 需求文档已生成
- [x] 设计文档已生成
- [x] 任务清单已生成

---

## 阶段 1：runtime/ 内部分目录（工时 8-10h）

### T1: 准备工作 — 分析 runtime/ 文件职责与依赖关系

- [x] 逐一分析 runtime/ 46 个文件的职责、导出、被引用方
- [x] 绘制 runtime/ 内部依赖图（谁 import 谁）
- [x] 确定每个文件应归属的子目录：`core/`、`takeover/`、`workspace/`、`projection/`、`persistence/`、`utils/`
- [x] 确认 `runtime/` 对外部文件的引用方列表（grep 全仓库 import 语句）

### T2: 创建 runtime/ 子目录结构并迁移文件

- [x] 创建 `runtime/core/` 并迁入 Orchestrator、RuntimeService、NodeRunner、PolicyEngine 等核心编排文件（~5 个）
- [x] 创建 `runtime/takeover/` 并迁入 11 个 takeover 相关文件
- [x] 创建 `runtime/workspace/` 并迁入 6 个 Workspace 分析文件（Analyzer、Interpretation、Inventory 等）
- [x] 创建 `runtime/projection/` 并迁入 5 个 Event 投影文件
- [x] 创建 `runtime/persistence/` 并迁入 3 个持久化文件（Persistence、Snapshot、SnapshotMerge）
- [x] 创建 `runtime/utils/` 并迁入其余辅助文件
- [x] `pnpm typecheck` 通过（当前阶段可能失败，仅记录错误数）

### T3: 拆分超大文件 — DirectorRuntimeStore.ts（727 行）

- [x] 分析 `DirectorRuntimeStore.ts` 的方法分组
- [x] 提取 Store 类型定义到 `runtime/core/store-types.ts`
- [x] 提取 Store 初始化逻辑到 `runtime/core/store-init.ts`
- [x] 提取 Store 查询方法到 `runtime/core/store-queries.ts`
- [x] 保留精简后的 `DirectorRuntimeStore.ts`（核心状态管理，≤400 行）
- [x] `pnpm typecheck` 通过

### T4: 拆分超大文件 — DirectorWorkspaceArtifactInventory.ts（673 行）

- [x] 分析 `DirectorWorkspaceArtifactInventory.ts` 的方法分组
- [x] 提取 Quality 相关检查到 `runtime/workspace/artifact-quality.ts`
- [x] 提取分类逻辑到独立文件
- [x] 保留精简后的主文件（≤400 行）
- [x] `pnpm typecheck` 通过

### T5: 建立 runtime/index.ts facade

- [x] 创建 `runtime/index.ts`，re-export 所有子目录的公共接口
- [x] 更新 director 内部其他文件对 runtime/ 的 import 路径（改为从 facade 导入或子目录直接导入）
- [x] 更新 director 外部文件的 import 路径
- [x] `pnpm typecheck` 零错误
- [x] `pnpm test` 零失败

### T6: 阶段1验证

- [x] 运行 `pnpm test` 确保无回归
- [x] 运行 `pnpm --filter @ai-novel/server test:runtime` 确保 runtime 测试通过
- [x] 确认 runtime/ 根目录只有子目录 + index.ts，无裸文件
- [x] 提交阶段1变更

---

## 阶段 2：抽取独立子模块（工时 10-15h）

### T7: automation/ 抽取为独立模块

- [x] 分析 automation/ 的公共接口（哪些被外部引用）
- [x] 创建 `automation/index.ts` facade，只导出公共接口
- [x] 更新外部文件的 import 路径（改为从 facade 导入）
- [x] 拆分 `novelDirectorAutoExecutionRuntime.ts`（700 行）为 ≤400 行的模块
- [x] `pnpm typecheck` 零错误
- [x] `pnpm test` 零失败

### T8: projections/ 抽取为独立模块

- [x] 分析 projections/ 的公共接口（哪些被外部引用）
- [x] 创建 `projections/index.ts` facade，只导出公共接口
- [x] 更新外部文件的 import 路径（改为从 facade 导入）
- [x] 拆分 `novelDirectorRuntimeProjection.ts`（672 行）为 ≤400 行的模块
- [x] `pnpm typecheck` 零错误
- [x] `pnpm test` 零失败

### T9: 拆分 novelDirectorPipelineRuntime.ts（656 行）

- [x] 分析文件职责分组
- [x] 提取 pipeline 阶段定义到独立文件
- [x] 提取 pipeline 执行逻辑到独立文件
- [x] 保留精简后的主文件（≤400 行）
- [x] `pnpm typecheck` 零错误

### T10: 建立 director/ 顶层 facade

- [x] 创建 `director/index.ts`，re-export runtime/、automation/、projections/ 等子模块的公共接口
- [x] 分析 director 对外部暴露的全部公共 API
- [x] 更新外部文件（agents/tools/、workers/、模块 HTTP 入口等）的 import 路径
- [x] `pnpm typecheck` 零错误
- [x] `pnpm test` 零失败

### T11: 阶段2验证

- [x] 运行 `pnpm test:all` 确保无回归
- [x] 运行 `pnpm typecheck` 零错误
- [x] 确认 automation/ 和 projections/ 的外部引用全部通过 facade
- [x] 确认 director/ 顶层 facade 覆盖所有公共接口
- [x] 提交阶段2变更

---

## 阶段 3：解耦外部依赖（工时 5-8h）

### T12: 解耦 directorRuntimeTools.ts

- [x] 分析 `agents/tools/directorRuntimeTools.ts` 对 director 的直接 import
- [x] 定义 DirectorToolInterface 接口，包含 tools 所需的最小方法集
- [x] 修改 tools 文件改为依赖接口而非具体实现
- [x] 在 director 侧提供接口实现适配
- [x] `pnpm typecheck` 零错误
- [x] `pnpm test` 零失败

### T13: 解耦 directorWorker.ts

- [x] 分析 `workers/directorWorker.ts` 对 director 的直接依赖
- [x] 确保 worker 只通过事件总线与 director 交互
- [x] 移除不必要的直接 import
- [x] `pnpm typecheck` 零错误

### T14: 减少 Director 对外部模块的直接 import

- [x] 审计 director 内部所有 import 外部模块的语句
- [x] 识别可通过接口/事件/DI 解耦的依赖
- [x] 评估每个解耦的收益/风险比，标记暂缓项
- [x] 对高收益低风险的依赖实施解耦
- [x] `pnpm typecheck` 零错误

### T15: 全量验证

- [x] 运行 `pnpm build` 构建通过
- [x] 运行 `pnpm test:all` 全部测试通过
- [x] 运行 `pnpm typecheck` 零错误
- [x] 启动 `pnpm dev`，手动验证 Auto-Director 端到端流程
- [x] 手动验证核心功能：创建小说、角色管理、大纲生成、章节生成

---

## 阶段 4：收尾

### T16: 文档与提交

- [x] 更新 `run_result.json` 状态为 `done`
- [x] 更新 `tasks.md` 所有任务勾选
- [x] 更新 `README.md` 状态
- [x] 提交变更并触发归档
