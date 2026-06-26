<!-- Parent: ../../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# server/src/services/novel/director

## Purpose
Auto-director 核心 — 负责整本长篇小说的链式编排、阶段调度、状态提交、checkpoint 恢复、task 投影与人接管。**本项目最复杂、最关键的子系统**(9 个子模块)。

## Key Files
| File | Description |
|------|-------------|
| `NovelDirectorService.ts` | Director facade |
| `DirectorStateStore.ts` | Director 状态读写 |
| `novelDirectorPipelineRuntime.ts` | Pipeline runtime 主入口 |
| `README.md` | Director 模块自带说明(优先读) |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `commands/` | Director 命令解释与执行(DirectorCommandService/Executor/Interpreter/Helpers) |
| `runtime/` | Director runtime 子系统 — 包含 36+ 文件,最大的子目录(see `runtime/AGENTS.md`) |
| `state/` | Director 状态 commit/read/store 原语 |
| `automation/` | 自动执行 runtime、checkpoint、断路器 — **安全关键** |
| `projections/` | 仪表盘 / 显示状态 / 任务快照 / 进度 / 通知(展示层) |
| `phases/` | 阶段适配器 — candidate / execution / structured outline / story macro |
| `recovery/` | Director 恢复、下游重置、结构化大纲恢复、样本审计、draft 基线回填 |
| `workflowStepRuntime/` | Workflow step module 注册与运行器(可扩展 step 框架) |
| `http/` | Director HTTP 入口 |
| `langgraphPilot/` | LangGraph pilot 适配 |

## For AI Agents

### Working In This Directory
- 改 Director 行为前**必读**:`docs/wiki/workflows/auto-director-runtime.md` 与 `docs/wiki/architecture/` 中的相关条目
- 改动会跨阶段影响时,按根 AGENTS.md "Development Branch Workflow" 开 feature 分支
- 改动完成后必须更新对应 wiki(根 AGENTS.md "Wiki Update Trigger")

### Quality Gate Boundaries
- 局部质量债 → 继续推进 + 记录,不阻塞全局链
- 全局 `replan_required` / `stop_for_replan` / 不可恢复失败 → 才停全局链
- Director 状态投影(`failed` / `blocked` / `waiting_recovery` + latest task)在 UI 上必须可见

### Branch Hygiene
- 完成一个 phase 后强制 commit(根 AGENTS.md "Development Branch Workflow")
- 改动跨工作流、Prompt 契约、Runtime 契约、数据迁移、桌面打包 → 走 `feature → beta → main`

## Dependencies

### Internal
- 根 `AGENTS.md` 是最高优先级
- `docs/wiki/workflows/auto-director-runtime.md`
- `docs/wiki/architecture/event-side-effect-boundaries.md`
- `server/src/prompting/` — Director 用的 prompt 必须从 registry 取
- `server/src/runtime/` — runtime orchestrator