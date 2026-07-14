# Schema, Shared Types & Infrastructure Changes: v0.32 vs Latest

> Generated: 2026-07-14
> Old: AI-Novel-Writing-Assistant-main-v0.32/
> New: AI-Novel-Writing-Assistant-main/

---

## 1. Prisma Schema Changes

### 1.1 New Enums (1)

| Enum | Values | Purpose |
|------|--------|---------|
| KnowledgeDocumentKind | user_upload, analysis_published | Distinguishes user-uploaded knowledge docs from those auto-published by book analysis |

### 1.2 New Models (13)

All new models fall into four feature areas:

**A. Book Analysis Characters (7 models)**

| Model | Purpose | Key Relations |
|-------|---------|---------------|
| BookAnalysisCharacter | AI-extracted character profiles from book analysis | FK to BookAnalysis, has status, generationDepth, profileJson, selectedDimensionsJson, depthMetadataJson, profileSectionsJson |
| BookAnalysisCharacterArc | Character arc stages (chapter-indexed) | FK to BookAnalysisCharacter, has stageLabel, stateSnapshotJson, evidenceJson |
| BookAnalysisCharacterScene | Character scene appearances/performances | FK to BookAnalysisCharacter, has sceneLabel, sceneType, performanceJson |
| BookAnalysisCharacterAppearance | Consolidated appearance tracking per character | FK to BookAnalysisCharacter, has coveragePercent, consolidatedAppearanceJson, variantPolicyJson |
| BookAnalysisCharacterAppearanceSnapshot | Per-chapter appearance snapshots | FK to BookAnalysisCharacter + Appearance, has chapterIndex, appearanceJson, evidenceJson, manuallyEdited |
| BookAnalysisCharacterAppearanceImage | Images generated for character appearances | FK to AppearanceSnapshot, ImageGenerationTask, ImageAsset; has imagePromptJson, referenceAssetIdsJson |
| BookAnalysisCharacterAppearanceTerm | Extracted appearance terms with status tracking | FK to BookAnalysisCharacter + Snapshot, has text, category, confidence, stability, status |
**B. Knowledge and RAG (3 models)**

| Model | Purpose |
|-------|---------|
| DocumentChapter | Chapter-level segmentation of knowledge documents (start/end offsets, char counts, summaries, splitter type) |
| RagRetrievalTrace | Audit trail for RAG retrieval calls: query digest, candidate counts, hits, timings, fallback/reranker flags |
| PromptTemplateOverride + PromptTemplateVersion | Per-novel prompt template customization with versioned snapshots and compiled hashes |

**C. Comic/Visual Feature (2 models)**

| Model | Purpose |
|-------|---------|
| ComicCharacterAsset | Character assets for comic generation (not present in v0.32) |
| ComicScene | Comic scene definitions (not present in v0.32) |

### 1.3 Modified Existing Models

**BookAnalysis -- 8 new fields:**

| Field | Type | Purpose |
|-------|------|---------|
| budgetTokens | Int? | Token budget for analysis |
| usedTokens | Int? @default(0) | Actual tokens consumed |
| userFocusInstruction | String? | User-specified focus instruction |
| sourceStartChapterIndex | Int? | Source range start chapter |
| sourceEndChapterIndex | Int? | Source range end chapter |
| sourceStartOffset | Int? | Source range start char offset |
| sourceEndOffset | Int? | Source range end char offset |
| sourceScopeLabel | String? | Human-readable source scope label |

Also adds relation characters BookAnalysisCharacter[].

**BookAnalysisSourceCache -- 1 new field + index change:**

| Change | Detail |
|--------|--------|
| New field sourceScopeKey | String @default(full) |
| Index rebuild | Unique index changes to include sourceScopeKey |

**BookAnalysisSection -- 2 new fields:** normalizationWarningsJson String?, focusInstruction String?

**BaseCharacter -- 2 new fields:** sourceType String @default(manual), sourceRefId String?

**ImageGenerationTask -- 2 new fields:** bookAnalysisCharacterId String?, referenceImageAssetIdsJson String?

**ImageAsset -- 1 new field:** bookAnalysisCharacterId String?

**ImageSceneType enum -- 1 new value:** book_analysis_character

**KnowledgeBinding -- 1 new field:** sourceAnalysisId String?

**KnowledgeDocument -- 2 new fields:** kind KnowledgeDocumentKind @default(user_upload), sourceAnalysisId String? @unique

**KnowledgeChunk -- 2 new fields:** facetKeys String?, chapterAnchor String?

**VolumeChapterPlan -- 1 new field:** conflictLevelSource String?

**Novel model** -- No new fields. Field ordering unchanged.

### 1.4 Schema Type Differences Summary

- schema.prisma (PostgreSQL): ~3000 lines added, ~2700 removed (mostly reordering + new models)
- schema.sqlite.prisma: Mirror of PostgreSQL changes, ~2900 added, ~2600 removed
- No models or enums were removed between versions
---

## 2. New Migrations

### 2.1 PostgreSQL Migrations (17 new, in chronological order)

| Migration | Summary |
|-----------|---------|
| 20260624120000_book_analysis_binding_source | Adds sourceAnalysisId to KnowledgeBinding with index |
| 20260624123000_book_analysis_normalization_warnings | Adds normalizationWarningsJson to BookAnalysisSection |
| 20260624130000_book_analysis_focus_instructions | Adds userFocusInstruction to BookAnalysis and focusInstruction to BookAnalysisSection |
| 20260624142000_document_chapters | Creates DocumentChapter table for chapter-level document segmentation |
| 20260624153000_book_analysis_characters | Creates BookAnalysisCharacter, BookAnalysisCharacterArc, BookAnalysisCharacterScene tables |
| 20260624165000_book_analysis_character_images | Extends ImageGenerationTask/ImageAsset with bookAnalysisCharacterId FKs; adds book_analysis_character to ImageSceneType; adds sourceType/sourceRefId to BaseCharacter |
| 20260625102000_book_analysis_source_range | Adds source range fields to BookAnalysis; adds sourceScopeKey to BookAnalysisSourceCache |
| 20260626110000_book_analysis_budget | Adds budgetTokens and usedTokens to BookAnalysis |
| 20260626123000_knowledge_document_publish_kind | Creates KnowledgeDocumentKind enum; adds kind/sourceAnalysisId to KnowledgeDocument; backfills kind |
| 20260626133000_knowledge_chunk_facets | Adds facetKeys and chapterAnchor to KnowledgeChunk with indexes |
| 20260626143000_rag_retrieval_trace | Creates RagRetrievalTrace table for RAG audit trail |
| 20260626170000_book_analysis_character_two_stage | Adds status, briefDescription, importance, occurringChaptersJson, lastGenerationError to BookAnalysisCharacter; makes profileJson nullable |
| 20260627103000_book_analysis_character_depth_appearance | Adds depthMetadataJson/profileSectionsJson to BookAnalysisCharacter; creates Appearance, AppearanceSnapshot, AppearanceImage tables |
| 20260628093000_book_analysis_appearance_terms | Creates BookAnalysisCharacterAppearanceTerm table |
| 20260628101500_image_task_reference_assets | Adds referenceImageAssetIdsJson to ImageGenerationTask |
| 20260703173000_volume_chapter_conflict_level_source | Adds conflictLevelSource to VolumeChapterPlan |
| 20260707103000_prompt_template_overrides | Creates PromptTemplateOverride and PromptTemplateVersion tables |

### 2.2 SQLite Migrations (17 new, same names)

Identical set of 17 migrations, mirrored for SQLite.
---

## 3. New Shared Types

### 3.1 shared/types/bookAnalysisCharacter.ts (231 lines, NEW)

Defines the complete type system for book-analysis-derived characters:

- **Enums**: BookAnalysisCharacterGenerationDepth (brief/standard/deep/exhaustive), BookAnalysisCharacterStatus (candidate/generating/generated/failed), BookAnalysisCharacterDimension (12 dimensions: basic, appearance, personality, capability, motivation, arc, relations, scenes, languageStyle, thinkingPattern, values, secrets)
- **Core interfaces**: BookAnalysisCharacter, BookAnalysisCharacterProfileSection, BookAnalysisCharacterArc, BookAnalysisCharacterScene
- **Appearance system**: BookAnalysisCharacterAppearance, BookAnalysisCharacterAppearanceSnapshot, BookAnalysisCharacterAppearanceImage, BookAnalysisCharacterAppearanceTerm
- **Evidence**: BookAnalysisCharacterEvidenceItem (extends BookAnalysisEvidenceItem with sourceType, chunkId, dimension)
- **Depth metadata**: BookAnalysisCharacterDepthMetadata -- per-dimension token usage and retrieval trace IDs
- **Input types**: GenerateInput, IdentifyInput, ProfileGenerateInput, AppearanceScanInput, BatchGenerateInput, AppearanceImageGenerateInput
- **Constants**: BOOK_ANALYSIS_CHARACTER_DIMENSION_LABELS -- Chinese labels for 12 dimensions

### 3.2 shared/types/characterProfile.ts (70 lines, NEW)

Structured character profile schema:

- CharacterProfile interface with 21 fields: name, aliases, age, gender, role, appearance, physique, attireStyle, signatureDetail, personality, values, speakingStyle, outerGoal, innerNeed, fear, wound, misbelief, arcStages, growthTrajectory, keyRelations, highlightScenes
- Supporting types: CharacterProfileKeyRelation, CharacterProfileHighlightScene
- CHARACTER_PROFILE_FIELD_LABELS -- Chinese labels for all fields
- CHARACTER_PROFILE_TEXT_LIMITS -- Character count limits for key text fields

### 3.3 shared/utils/bookAnalysisTimeline.ts (71 lines, NEW)

Utility functions for book analysis timeline normalization:

- normalizeBookAnalysisTimelineNode() -- Normalizes raw input (string or object) to BookAnalysisTimelineNode
- normalizeBookAnalysisTimelineNodes() -- Batch normalization with limit
- groupBookAnalysisTimelineNodesByPhase() -- Groups timeline nodes by phase label

This is the first file in shared/utils/, a new directory.
---

## 4. Changed Shared Types

### 4.1 shared/types/novel.ts

- **New field in VolumeChapterPlan**: conflictLevelSource?: "ai" | "user" | null -- tracks whether conflict level was AI-generated or user-set
- Rest of diff is field reordering only (no semantic changes)

### 4.2 shared/types/novelCharacter.ts

- **New fields in Character interface**: sourceType?: string | null and sourceRefId?: string | null -- links characters back to their generation source
- Rest of diff is field reordering only

### 4.3 shared/types/characterResource.ts

- **Structural change in characterResourceContextSchema**: Removed summary field; added highRiskCommittedItems (array of ledger items) and pendingProposalItems (array of proposal summaries)
- **Ordering swap**: characterResourceProposalSummarySchema moved before characterResourceContextSchema

### 4.4 shared/types/image.ts

- **ImageSceneType**: Added "book_analysis_character" union member
- **BaseImageGenerationTask**: Added bookAnalysisCharacterId?: null field
- **CharacterImageGenerationTask**: Added bookAnalysisCharacterId?: null
- **NovelCoverImageGenerationTask**: Added bookAnalysisCharacterId?: null
- **ChapterIllustrationImageGenerationTask**: Added bookAnalysisCharacterId?: string | null
- **New type**: BookAnalysisCharacterImageGenerationTask -- sceneType: "book_analysis_character", required bookAnalysisCharacterId
- **ImageGenerationTask** union: Added BookAnalysisCharacterImageGenerationTask
- **Asset types**: Added bookAnalysisCharacterId to all existing asset types; added BookAnalysisCharacterImageAsset type; ImageAsset union extended

### 4.5 shared/types/knowledge.ts

- **New type**: KnowledgeDocumentKind = "user_upload" | "analysis_published"
- **KnowledgeDocument**: Added kind: KnowledgeDocumentKind and sourceAnalysisId?: string | null
- **KnowledgeBinding**: Added sourceAnalysisId?: string | null
- **New interface**: DocumentChapter -- chapter-level document segments with startOffset, endOffset, charCount, summary, splitter (rule/llm/single)
- **New interface**: DocumentChapterSplitResult -- contains documentVersionId, splitter, and chapters[]
- **KnowledgeRecallTestHit**: source type expanded from "vector" | "keyword" to "vector" | "keyword" | "reranked"; added contextPrefix?: string
---

## 5. Infrastructure Changes

### 5.1 Root package.json

**New scripts:**

| Script | Description |
|--------|-------------|
| check:deps | Runs scripts/check-deps.cjs -- dependency verification |
| dev:site | Launches the new site package |
| build:site | Builds the new site package |
| check:docs-manifest | Validates docsManifest.ts against actual public docs |

**Modified scripts:**
- dev, dev:log, dev:desktop now chain through scripts/check-deps.cjs before running

### 5.2 pnpm-workspace.yaml

Major changes:
- **New workspace member**: site (added before shared)
- **New config block**: injectWorkspacePackages: true
- **New allowBuilds section**: Explicit build permissions per package:
  - @prisma/engines: true
  - better-sqlite3: true
  - electron: false
  - electron-winstaller: false
  - esbuild: true
  - prisma: true

### 5.3 .env.example

No changes (files are identical).

### 5.4 .agents/ Directory (NEW in latest)

Not present in v0.32. Contains:

    .agents/
      skills/
        shadcn-ui/
          SKILL.md          -- shadcn/ui integration skill definition
          README.md
          examples/
            auth-layout.tsx
            data-table.tsx
            form-pattern.tsx
          resources/
            component-catalog.md
            customization-guide.md
            migration-guide.md
            setup-guide.md
          scripts/
            verify-setup.sh

This is a skill package for shadcn/ui component integration, sourced from google-labs-code/stitch-skills.

### 5.5 .claude/ Directory (NEW in latest)

Not present in v0.32. Contains the same shadcn-ui skill as .agents/:

    .claude/
      skills/
        shadcn-ui/         -- Mirror of .agents/skills/shadcn-ui/

### 5.6 site/ Directory (NEW in latest)

A complete React + Vite static site for GitHub Pages:

    site/
      package.json          -- @ai-novel/site, React 19, Vite 7, react-markdown
      vite.config.ts        -- base: /AI-Novel-Writing-Assistant/, port 4173
      tsconfig.json
      index.html
      DESIGN.md
      README.md
      src/
        App.tsx, main.tsx, routing.ts, styles.css
        DocsPage.tsx, docsContent.ts, docsManifest.ts, docsAssets.ts
        components/          -- Breadcrumb.tsx, DocsSearch.tsx, DocsToc.tsx
        hooks/               -- useGithubStars.ts, usePageMeta.ts
        assets/              -- app-icon.png, screenshots, social preview
        prerender-entry.tsx
      scripts/
        generate-sitemap.cjs
        prerender.cjs
      public/
        404.html, favicon.ico, robots.txt, sitemap.xml
        assets/              -- docs-intro-banner.png, project-social-preview.png

Marketing/docs site for the project, with pre-rendering support for SEO.

### 5.7 skills-lock.json (NEW in latest)

Locks the shadcn-ui skill to a specific commit hash (119a14a...) from the stitch-skills repo (google-labs-code/stitch-skills).
---

## 6. Summary of Feature Areas Affected

| Area | Changes |
|------|---------|
| Book Analysis Characters | 7 new DB models, new shared types (231 lines), 2-stage generation with 12-dimension profiling, appearance tracking with per-chapter snapshots, term extraction, image generation |
| Knowledge/RAG Enhancements | Document chapter segmentation (DocumentChapter), knowledge document kind classification, chunk facets/chapter anchors, RAG retrieval tracing |
| Image Pipeline | New book_analysis_character scene type, reference image asset support, book analysis character image generation |
| Prompt Customization | Per-novel prompt template overrides with versioning (PromptTemplateOverride, PromptTemplateVersion) |
| Character Provenance | BaseCharacter.sourceType/sourceRefId for tracking character origins |
| Volume Planning | conflictLevelSource attribution on chapter plans |
| Resource Context | Enhanced resource context schema with high-risk committed items and pending proposals |
| Site/Marketing | New site/ workspace package for GitHub Pages documentation site |
| Agent Skills | New .agents/ and .claude/ directories with shadcn-ui skill |
| Build Infrastructure | Dependency checking (check-deps.cjs), injectWorkspacePackages, explicit build permissions in pnpm-workspace.yaml |