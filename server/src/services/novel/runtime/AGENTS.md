<!-- Parent: ../../../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# server/src/services/novel/runtime

## Purpose
章节运行时核心 — ChapterRuntimeCoordinator / PipelineAdapter / StreamOrchestrator / Finalization / QualityGate,以及 repair 子模块。这是"章节从 draft 到 save"的整条流水线实现。

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `repair/` | 章节修复运行时 — chapterAuditContext / chapterRepairRuntime / ChapterRepairStreamRuntime |

## Key Files
| File | Description |
|------|-------------|
| `ChapterRuntimeCoordinator.ts` | 章节运行时协调器 |
| `ChapterPipelineRuntimeAdapter.ts` | Pipeline 适配器 |
| `ChapterStreamGenerationOrchestrator.ts` | 流式生成编排 |
| `ChapterContentFinalizationService.ts` | 内容 finalize |
| `ChapterQualityGateService.ts` | 质量门 |
| `chapterRuntimePipeline.ts` | 章节 pipeline 主入口 |
| `runtimeContextBlocks.ts` | 运行时上下文块 |

## For AI Agents

### Working In This Directory
- 改这里直接关系到"章节能否写出来" — 必须先读 `docs/wiki/workflows/chapter-production-chain.md`
- 涉及质量债归因的改动要遵循根 AGENTS.md "Auto-Director Quality Gate Rules":
  - 局部债 → 继续 + 记录
  - 全局债 → 停链 + 提示 replan

### Context Assembly
- `runtimeContextBlocks.ts` 是给 LLM 喂上下文的关键 — 改动会直接影响生成质量
- 与 `docs/wiki/rag/knowledge-and-context-assembly.md` 互为镜像

## Dependencies

### Internal
- `docs/wiki/workflows/chapter-production-chain.md`
- `docs/wiki/rag/knowledge-and-context-assembly.md`
- `server/src/services/novel/AGENTS.md`