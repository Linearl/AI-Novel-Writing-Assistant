---
description: "T15 server/src directory restructure assessment — identify flat directories exceeding 12-file threshold and recommend sub-directory organization"
---

# T15: server/src Directory Restructure Assessment

> Assessment only — no restructuring performed.

## Methodology

- Counted `.ts` files in each top-level `server/src/` subdirectory (flat, depth=1, excluding `index.ts`)
- Project constraint: directories with >12 files in a flat layout must split into sub-modules
- Threshold reference from `CLAUDE.md`: "目录 `.ts` 文件 >12 个时必须建下级模块目录"

## Summary Table

| Directory | Flat .ts Files | Severity | Priority |
|-----------|---------------|----------|----------|
| `services/novel/` | 48 | CRITICAL | 1 |
| `services/world/` | 32 | HIGH | 2 |
| `llm/` | 26 | HIGH | 3 |
| `routes/` | 26 | HIGH | 4 |
| `services/styleEngine/` | 25 | HIGH | 5 |
| `services/bookAnalysis/` | 19 | MEDIUM | 6 |
| `services/planner/` | 15 | MEDIUM | 7 |
| `services/drama/` | 14 | MEDIUM | 8 |
| `services/rag/` | 13 | MEDIUM | 9 |
| `services/settings/` | 12 | LOW (at threshold) | 10 |
| `creativeHub/` | 9 | OK | — |

Directories already well-structured (have sub-modules): `modules/novel/`, `modules/setup/`, `agents/`, `prompting/`.

---

## Top 3 Recommendations

### 1. `server/src/services/novel/` — 48 files (CRITICAL)

This is the single largest flat directory in the codebase. Files already show natural clustering by concern:

**Proposed sub-directories:**

- `novel/core/` — CRUD and base service (`novelCoreCrudService.ts`, `NovelService.ts`, `NovelCoreService.ts`, `novelCoreShared.ts`, `novelCoreSchemas.ts`)
- `novel/pipeline/` — Production pipeline execution (`novelCorePipelineService.ts`, `novelCorePipelineExecutor.ts`, `novelCorePipelineHelpers.ts`, `NovelPipelineService.ts`, `NovelPipelineRuntimeService.ts`, `novelProductionHelpers.ts`, `pipelineJobDedup.ts`, `pipelineJobState.ts`)
- `novel/chapter/` — Chapter generation, lifecycle, writing graph (`ChapterService.ts`, `chapterLifecycleState.ts`, `chapterWritingGraph.ts`, `chapterPatchRepairService.ts`, `chapterSummarySchemas.ts`, `NovelChapterSummaryService.ts`, `novelChapterArtifacts.ts`, `NovelGenerationService.ts`, `novelCoreGenerationService.ts`, `novelCoreReviewService.ts`)
- `novel/framing/` — Book framing and context (`bookFraming.ts`, `NovelFramingSuggestionService.ts`, `NovelContextService.ts`, `NovelContinuationService.ts`, `NovelCreateResourceRecommendationService.ts`, `novelP0Utils.ts`)
- `novel/artifacts/` — Artifact and bible management (`NovelArtifactService.ts`, `novelBiblePersistence.ts`, `novelChapterArtifacts.ts`)
- `novel/production/` — High-level production status (`NovelProductionService.ts`, `NovelProductionStatusService.ts`, `NovelSetupStatusService.ts`, `novelCoreSnapshotService.ts`, `novelCoreStorylineService.ts`)
- `novel/export/` — Export and reference (`NovelExportService.ts`, `NovelReferenceService.ts`, `NovelDecisionService.ts`, `NovelDraftOptimizeService.ts`)
- `novel/diagnostics/` — Prompt trace and token usage (`novelPromptTraceReport.ts`, `novelTokenUsageSummary.ts`, `highMemoryReservation.ts`)

A facade `index.ts` at `services/novel/` would preserve backward-compatible imports.

### 2. `server/src/services/world/` — 32 files (HIGH)

Files cluster clearly around structure, visualization, generation, and persistence.

**Proposed sub-directories:**

- `world/structure/` — World structure normalization, workspace, and source (`worldStructure.ts`, `worldStructureConstants.ts`, `worldStructureHelpers.ts`, `worldStructureLegacy.ts`, `worldStructureLegacySeed.ts`, `worldStructureLegacyTextBuilders.ts`, `worldStructureNormalization.ts`, `worldStructureSource.ts`, `worldStructureWorkspace.ts`)
- `world/visualization/` — World map and force graph (`worldVisualization.ts`, `worldVisualizationNormalize.ts`, `worldVisualizationSchema.ts`, `worldVisualizationTypes.ts`)
- `world/generation/` — Generation blueprints, layer generation, skeletons (`worldDraftGeneration.ts`, `worldGenerationBlueprint.ts`, `worldLayerGeneration.ts`, `worldSkeletonGeneration.ts`, `worldTemplates.ts`)
- `world/core/` — Service, persistence, consistency, schemas (`WorldService.ts`, `worldServiceHelpers.ts`, `worldServiceShared.ts`, `worldPersistence.ts`, `worldConsistency.ts`, `worldSchemas.ts`, `worldEdgeTableSync.ts`)
- `world/inspiration/` — Reference and inspiration (`worldInspirationService.ts`, `worldReferenceInspiration.ts`, `worldReferenceSchema.ts`, `worldPropertyOptions.ts`)
- `world/transfer/` — Import/export/transfer (`worldTransfer.ts`, `worldImprovementService.ts`, `worldSnapshotService.ts`)

### 3. `server/src/llm/` — 26 files (HIGH)

This is infrastructure code rather than domain services, so the split pattern differs — split by subsystem:

**Proposed sub-directories:**

- `llm/providers/` — Provider-specific clients (`anthropicClient.ts`, `factory.ts`, `providers.ts`, `providerSchema.ts`, `modelCatalog.ts`)
- `llm/invoke/` — Structured invocation pipeline (`structuredInvoke.ts`, `structuredInvokeParser.ts`, `structuredInvokeRepair.ts`, `structuredOutput.ts`, `structuredFallbackSettings.ts`)
- `llm/streaming/` — Streaming support (`streaming.ts`, `streamingRepetitionDetector.ts`)
- `llm/guard/` — Request guards, limits, connectivity (`requestGuard.ts`, `requestLimiter.ts`, `connectivity.ts`, `invokeTimeout.ts`)
- `llm/observability/` — Logging and tracking (`debugLogging.ts`, `llmOperationTracker.ts`, `repairLogging.ts`, `usageTracking.ts`, `sessionLogFile.ts`)
- `llm/core/` — Router, capabilities, reasoning (`modelRouter.ts`, `capabilities.ts`, `reasoning.ts`, `schemaHelpers.ts`, `generatedContentSchema.ts`)

### Notable: `server/src/routes/` — 26 files (HIGH)

The `routes/` directory currently holds legacy Express route files that are gradually migrating to `modules/` sub-directories. Recommended action: continue the migration rather than split within `routes/`. This is already in progress (many routes have moved to `modules/novel/*/http/`).

---

## Key Considerations

1. **Facade pattern required**: After splitting, each restructured directory must expose an `index.ts` barrel to avoid breaking downstream imports across 100+ consumer files.
2. **Incremental migration**: Split one directory at a time, verify with `pnpm typecheck` + `pnpm test` between each.
3. **routes/ migration优先**: The `routes/` directory is already mid-migration to `modules/`. Continuing that migration is higher ROI than splitting `routes/` internally.
4. **Naming convention**: Follow existing pattern — lowercase camelCase for files, PascalCase for primary service classes, kebab-case for helper modules.
