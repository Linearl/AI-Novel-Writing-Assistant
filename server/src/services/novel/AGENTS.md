<!-- Parent: ../../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# server/src/services/novel

## Purpose
整本小说生产的全部业务服务——本项目最核心、最庞大的业务域。包含 auto-director、章节运行时、生成编排、JIT 规划、状态/事实台账、角色、卷、世界上下文、质量、动力学、伏笔兑现等。

## Key Files
| File | Description |
|------|-------------|
| `NovelCoreService.ts` | 核心 facade |
| `NovelProductionService.ts` | 生产层 facade |
| `NovelPipelineService.ts` | 流水线 facade |
| `novelCorePipelineService.ts` | 核心流水线编排(~37KB) |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `director/` | **Auto-director 核心** — 9 个子模块,负责整本链式编排(see `director/AGENTS.md`) |
| `runtime/` | 章节运行时 — ChapterRuntimeCoordinator / PipelineAdapter / StreamOrchestrator / Finalization / QualityGate / repair(see `runtime/AGENTS.md`) |
| `production/` | 生产阶段编排 — Orchestrator / Stage runners / ContextAssembly / DecisionEngine / QualityRepair |
| `planning/` | JIT 章节规划(`ChapterPlanJITService`) |
| `state/` | Canonical state / Fact extractor / Commit / Version log |
| `characters/` | 角色硬事实(characterHardFacts 等) |
| `chapterEditor/` | 章节编辑器支持 |
| `characterPrep/` | 角色准备阶段 |
| `characterProfile/` | 角色画像 |
| `characterResource/` | 角色资源台账 |
| `application/` | 应用层服务 |
| `dynamics/` | 动力学(情节张力等) |
| `fact/` | 事实抽取与台账 |
| `quality/` | 质量评估 |
| `storyMacro/` | 故事宏观规划 |
| `storyWorldSlice/` | 世界切片 |
| `volume/` | 卷级编排 |
| `workflow/` | 工作流 |
| `worldContext/` | 本书世界上下文网关 |

## For AI Agents

### Working In This Directory
- 这是产品命脉,改动前先读 `docs/wiki/workflows/auto-director-runtime.md` 与 `chapter-production-chain.md`
- 根 `services/novel/` 只放 **facade 与稳定共享入口**,具体实现下沉到子模块
- Director 模块收敛方向:`commands` / `runtime` / `state` / `automation` / `projections` / `recovery` / `phases`
- 任何跨阶段工作流变更必须先看根 AGENTS.md 的 "Auto-Director Quality Gate Rules"

### Quality Gate Boundaries (来自根 AGENTS.md)
- 局部问题(`local_patch_plan` / `continue_with_warning` / `patchable_obligation_gap` / `draft_obligation_unmet` / 可恢复的修复失败 / `defer_and_continue` 质量债)→ 继续推进 + 记录质量债
- 全局阻塞(`stop_for_replan` / `replan_required` / `recommendedAction=replan` / 不可恢复的生成失败 / 数据完整性失败)→ 停全局链
- **不要**把局部问题路由到 `replanAlertDetails` / `PIPELINE_REPLAN_REQUIRED` / `replan_required` checkpoint
- 局部修复已尝试且仍有残留但有可用内容 → 倾向降级 finalize + 质量债,而不是失败整条链

### State Projection Rule
- 书本级 auto-director 投影(`failed` / `blocked` / `waiting_recovery` + latest task)即使 URL 不带 `directorTaskId` 也必须在 AI cockpit / task drawer / recovery 入口可见
- `workspaceTaskId` 是手动工作区 lane,**绝不能**用来替代 director task id

## Dependencies

### Internal
- `docs/wiki/workflows/auto-director-runtime.md` — director 核心契约
- `docs/wiki/workflows/chapter-production-chain.md` — 章节生产链
- `server/src/prompting/` — 所有产品级 prompt 入口
- `server/src/llm/` — LLM 客户端与 structured invoke
- `server/src/runtime/` — runtime orchestrator / planner / tool registry