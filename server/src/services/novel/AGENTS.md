<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-08-08 -->

# server/src/services/novel

## Purpose
整本小说生产的核心业务服务。章节运行时、生产编排、规划、状态、质量评估、世界上下文等全部业务逻辑的归属地,是产品主链路的领域层。

## Key Files
| File | Description |
|------|-------------|
| `NovelCoreService.ts` | 核心 facade |
| `NovelProductionService.ts` | 生产层 facade |
| `NovelPipelineService.ts` | 流水线 facade |
| `novelCorePipeline.ts` | 核心流水线编排(Job 生命周期 + 章节遍历循环) |
| `NovelPipelineRuntimeService.ts` | 运行时恢复/看门狗 |
| `novelCorePipelineHelpers.ts` | 流水线辅助函数 |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `adaptiveWordCount/` | 自适应字数控制 |
| `application/` | 应用层服务 |
| `chapterEditor/` | 章节编辑器支持 |
| `dynamics/` | 动力学(情节张力等) |
| `fact/` | 事实抽取与台账 |
| `novelCoreShared/` | 核心共享模块 |
| `pace/` | 节奏控制 |
| `planning/` | JIT 章节规划(`ChapterPlanJITService`) |
| `production/` | 生产阶段编排 — Orchestrator / Stage runners / ContextAssembly / DecisionEngine / QualityRepair |
| `quality/` | 质量评估(checkers/smell 子目录) |
| `review/` | 全局评审反馈 |
| `risk/` | 风险管理 |
| `runtime/` | 章节运行时 — ChapterRuntimeCoordinator / StreamOrchestrator / Finalization / repair |
| `state/` | Canonical state / Fact extractor / Commit / Version log |
| `storyMacro/` | 故事宏观规划 |
| `storyWorldSlice/` | 故事世界切片 |
| `volume/` | 卷级服务 |
| `workflow/` | 工作流服务 |
| `worldContext/` | 世界上下文网关 |

## For AI Agents

### Working In This Directory
- **Auto-Director 质量门规则**(根 AGENTS.md,最高优先级):章节审核/验收结果不得自动阻断全局链;只有 `stop_for_replan` / 不可恢复失败才停止
- 大型服务根只保留 facade 与稳定共享入口;具体实现收敛到子模块
- 章节运行时改动需看 `docs/4.misc/wiki/workflows/auto-director-runtime.md` 与 `chapter-production-chain.md`
- 文件 >700 行 → 强制拆分后再继续特性开发
- 目录 `.ts` >12 个 → 先建下级模块目录

### Testing Requirements
- 相关测试:`pnpm --filter @ai-novel/server test:runtime` / `test:planner` / `test:tools`
- 覆盖章节生产链:`server/tests/novel/`(chapter/quality/world/styleEngine 等)

## Dependencies

### Internal
- `server/src/prompting/` — 产品级 prompt(章节/评审 prompt)
- `server/src/orchestration/` — 编排执行层(pipeline/runtime)
- `server/src/llm/` — LLM 调用

### External
- LangChain 1.x、LangGraph 1.x
