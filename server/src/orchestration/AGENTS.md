<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-08-08 | Updated: 2026-08-08 -->

# server/src/orchestration

## Purpose
**编排层核心** — agent runtime、LangGraph 图、auto-director pipeline、章节运行时。这是 Creative Hub 与整本小说生产链的执行引擎,集中承载 LangChain/LangGraph 编排逻辑(历史上分散在 `agents/`、`graphs/`、`creativeHub/`、`runtime/` 的代码已收敛至此)。

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `agent/` | Agent runtime:orchestrator、catalog、toolRegistry、traceStore、approvalPolicy |
| `graph/` | LangGraph 图定义:CreativeHubLangGraph、novelOutlineGraph、worldBuildingGraph、writingFormulaGraph、characterDesignGraph 等 |
| `pipeline/` | auto-director 生产流水线:NovelDirectorService、DirectorEventBridge、novelDirectorPipelineRuntime、takeoverHandler 等 |
| `runtime/` | 章节/任务运行时:ChapterRuntimeCoordinator、BatchContextCache、StreamOrchestrator、quality gate、repair 等 |

## For AI Agents

### Working In This Directory
- 这是 auto-director 与 Creative Hub 的执行核心,改动前先读 `docs/4.misc/wiki/workflows/auto-director-runtime.md` 与 `creative-hub-boundary.md`
- **Auto-Director 质量门规则**(根 AGENTS.md):章节级质量问题不得阻断全局链,只有 `stop_for_replan` / 不可恢复失败才停止
- 工具注册变更先在 `docs/4.misc/wiki/architecture/` 留 entry
- 新增图/流水线遵循现有结构,不做绕过 orchestration 的散落编排

### Testing Requirements
- 相关测试:`pnpm --filter @ai-novel/server test:runtime` / `test:tools` / `test:planner`
- 涉及 pipeline 的改动建议跑 `server/tests/director/` 与 `server/tests/novel/` 相关用例

## Dependencies

### Internal
- `server/src/services/` — 领域业务逻辑
- `server/src/prompting/` — 产品级 prompt
- `server/src/llm/` — LLM 调用

### External
- LangGraph 1.x、LangChain 1.x
