# Client-Side Changes Report: v0.32 vs Latest

> Report generated 2026-07-14. Compares AI-Novel-Writing-Assistant-main-v0.32/ (old) with AI-Novel-Writing-Assistant-main/ (latest).

---

## Table of Contents

1. [Book Analysis Page](#1-book-analysis-page)
2. [Prompt Workbench Page](#2-prompt-workbench-page)
3. [Tension Curve Component](#3-tension-curve-component)
4. [Comic & Image Components](#4-comic--image-components)
5. [Home Page](#5-home-page)
6. [Auto-Director Create Page](#6-auto-director-create-page)
7. [Novels Components Changes](#7-novels-components-changes)
8. [Auto-Director Notification System](#8-auto-director-notification-system)
9. [New Settings Cards](#9-new-settings-cards)
10. [Existing File Changes](#10-existing-file-changes)

---

## 1. Book Analysis Page

**Path:** `client/src/pages/bookAnalysis/`
**Files:** ~28 files across page, components, hooks
**Status:** Entirely new in latest; does not exist in v0.32

### What Is It

A full-featured **book analysis workbench** (Chinese: "拆书") that lets users import documents, run AI-powered section-by-section analysis (structure, characters, themes, style, pacing), and publish results as novel knowledge assets or style profiles.

Two modes:
- **Reference Mode** -- Analyzing external books as craft reference
- **Diagnosis Mode** -- Self-diagnosing the user's own manuscript

### UX Layout

```
+----------------------------------------------------------+
|  "Open in Creative Hub" button                           |
+----------------------------------------------------------+
| Sidebar (240px)  |  Main Content Area                    |
|                   |  [Budget Dialog]                      |
|  - Search/Filter  |  [Diagnosis Tip Banner] (if diag)    |
|  - Analysis List  |  [Workspace Toolbar]                 |
|  - Create Button  |  [View Tabs: sections | characters]  |
|                   |                                       |
|                   |  [Detail Panel / Character Panel]     |
|                   |  (dual-pane: Chapter Reader + Sections|
+----------------------------------------------------------+
```

### Key Components

| Component | Purpose |
|-----------|---------|
| BookAnalysisSidebar | Left sidebar listing all analyses with keyword search and status filter |
| BookAnalysisWorkspaceToolbar | Top toolbar: archive, rebuild, copy, publish, style profile, download, budget, dual-pane toggle |
| BookAnalysisWorkbenchViewTabs | Tab switcher: "sections" vs "characters" |
| BookAnalysisDetailPanel | Main content: structured sections with regenerate/optimize/save/publish per section |
| BookAnalysisDualPaneLayout | Split view: chapter reader (left) + analysis sections (right) in 5:6 ratio |
| BookAnalysisChapterReader | Scrollable chapter reader with scroll-spy active chapter tracking |
| BookAnalysisChapterNavigator | Chapter list sidebar within the dual-pane reader |
| BookAnalysisCharacterPanel | Character management: identify, generate profiles, batch operations |
| BookAnalysisCharacterCandidateCard | Single character candidate card |
| BookAnalysisCharacterImagePanel | Character portrait image generation/management |
| BookAnalysisCharacterAppearancePanel | Appearance evolution across chapters: scan, consolidate, generate per-chapter images |
| BookAnalysisCreateDialog | Create new analysis: source document, mode, preset, LLM config |
| BookAnalysisBudgetAdjustDialog | Token budget adjust or resume |
| BookAnalysisDiagnosisTipBanner | Banner for diagnosis mode |
| BookAnalysisSourceRangePicker | Source range: full text / by chapter / by char count with presets |
| BookAnalysisStructuredSummary | Structured analysis with evidence citations |
| BookAnalysisSectionCard | Section card with edit/regenerate/optimize |

### Key Hooks

| Hook | Purpose |
|------|---------|
| useBookAnalysisWorkspace (617 lines) | Central orchestrator: list/CRUD, characters, drafts, publishing, budget. Composes 4 sub-hooks. 50+ properties. |
| useBookAnalysisActiveView | Active view tab, persisted in URL |
| useBookAnalysisChapterReader | Chapter reader state: index, highlight ranges, scroll methods |
| useBookAnalysisDualPanePreference | Dual-pane preference in localStorage, viewport check |
| useAnalysisBudget | Budget update/resume mutations |
| useAnalysisPublishing | Publish to novel, create style profile |
| useAnalysisCharacters (325 lines) | Character CRUD, batch generation, appearance, portraits, promote |
| useSectionDrafts | Per-section draft editing and optimize preview |

### Character Lifecycle

1. Identify candidates from text
2. Generate profiles (brief/standard/deep/exhaustive)
3. Manage appearance evolution across chapters
4. Generate portrait images
5. Promote to global character library

---

## 2. Prompt Workbench Page

**Path:** `client/src/pages/promptWorkbench/`
**Files:** ~15 files
**Status:** Entirely new in latest

### What Is It

A **prompt inspection and customization workbench** for the novel production system. Users can browse, preview, and customize prompts driving AI agents.

### UX Layout

```
+----------------------------------------------------------+
| Prompt Catalog Sidebar (360px) |  Prompt Editor Shell     |
|  [Search]                      |  Header: prompt metadata |
|  - prompt list items           |  [Entrypoint] [Scope]    |
|                                |  Two-panel body:         |
|                                |  [Body Panel] [Context]  |
|                                |  [Run Bar: preview/save] |
+----------------------------------------------------------+
```

### Two Editing Modes

1. **Safe Slots Mode** -- Edit named parameters (tone, constraints, toggles). All prompts.
2. **Advanced Template Mode** -- Directly edit templates with inline tokens. Only `novel.chapter.writer`.

### Key Components

| Component | Lines | Purpose |
|-----------|-------|---------|
| PromptEditorShell | 266 | Layout: metadata badges, resizable panels |
| PromptCatalogSidebar | 163 | Searchable prompt list |
| PromptBodyEditor | 696 | Slot editor: control/body/append, reconciliation |
| PromptPreviewPanel | 98 | Message preview with diagnostics |
| PromptRunBar | 122 | Action bar: tokens, save/preview/reset |
| AdvancedPromptTemplateEditor | 276 | Raw template editor, version history |
| ContextInjectionPanel | 278 | Context blocks with status, search, preview |
| VisualTemplateEditor | 484 | Plate.js editor with inline token rendering |

### Key Hooks

| Hook | Lines | Purpose |
|------|-------|---------|
| usePromptDraftSlots | 410 | Slot editing state, reconciliation |
| usePromptPreview | 356 | Preview generation |
| usePromptTemplateEditor | 209 | Advanced template state |
| usePromptSlotPersistence | 142 | CRUD for slot overrides |

---

## 3. Tension Curve Component

**Path:** `client/src/components/tensionCurve/`
**Files:** ~10 files
**Status:** Entirely new

### What Is It

An **interactive tension/conflict curve visualization** for novel volumes. Plot conflict intensity (0-100) across chapters as a smooth SVG curve.

### Key Parts

| File | Purpose |
|------|---------|
| TensionCurvePanel | Read-only card view |
| TensionCurveEditDialog | Drag points, beat context, chapter details |
| TensionCurveFlowCanvas | React Flow canvas with draggable nodes |
| curveCoordinates.ts | Math: y-scale, d3 curve path |
| tensionCurveAnalysis.ts | Detects flat plateau / late peak missing |

Dependencies: React Flow, d3-shape, d3-scale

---

## 4. Comic & Image Components

### components/comic/GeneratedImageCard.tsx

Reusable card for AI-generated images: idle/generating/done/error states.

### components/image/ImageGenerationConfirmDialog.tsx

Pre-generation confirmation: prompt, references, model, size. AI assist actions.

### components/image/useImageGenerationFlow.ts

Hook: prepare -> confirm dialog -> generate. Standardized for all image generation.

---

## 5. Home Page

**Path:** `client/src/pages/home/`
**Files:** 7 files
**Status:** Extracted from monolithic Home.tsx (23.3KB -> 7.9KB)

### What Is It

A **personalized dashboard** using workflow state intelligence to guide users to the most important next action.

| File | Purpose |
|------|---------|
| homeViewModel.ts | Priority scoring, metric builders, next-action selection |
| HomeNextActionPanel.tsx | Hero card: most important action |
| HomeRecentNovels.tsx | Recent novels grid (up to 6) |
| HomeStatusStrip.tsx | Four metric cards |
| HomeAttentionQueue.tsx | Actionable items |
| HomeAssetHealth.tsx | Asset counts, starter actions |
| homeTone.ts | Color utilities |

Routing: Director create link changed to `/novels/auto-director`

---

## 6. Auto-Director Create Page

**Path:** `client/src/pages/novels/autoDirector/`
**Files:** 9 files
**Status:** Entirely new

### What Is It

A **5-step wizard** for creating a novel via AI auto-director.

| Stage | Label | Purpose |
|-------|-------|---------|
| 1 | "起始想法" | Initial idea + AI inspiration |
| 2 | "导演起始设置" | Reader channel, POV, pace, emotion, genre |
| 3 | "世界与写法" | World selection, style profile |
| 4 | "模型与运行方式" | LLM model, run mode, auto-approval |
| 5 | "方向候选" | AI direction candidates, select/regenerate |

Key: `useAutoDirectorCreateController.ts` (21.8KB). Framer Motion transitions. URL task ID persistence.

---

## 7. Novels Components Changes

### New Files

| File | Purpose |
|------|---------|
| workspaceShell.tsx | Design primitives: StepHero, StepActionBar, SectionBlock, DetailDisclosure, StatusRail |
| NovelAutoDirector.types.ts | DirectorExecutionViewMode type |
| list/ (8 files) | Novel list: project cards, filter bar, header, pagination, empty state, skeleton, view model, tone |
| novelWorld/NovelWorldHandbookDialog.tsx | World handbook: overview/rules/guidance/usage/sync tabs |

### Removed (consolidated into autoDirector/)

- NovelAutoDirectorCandidateDialog.tsx
- NovelAutoDirectorCandidateSelectionContent.tsx
- NovelAutoDirectorDialog.tsx
- NovelAutoDirectorDialogHeader.tsx
- NovelAutoDirectorSetupPanel.tsx

---

## 8. Auto-Director Notification System

### components/autoDirector/ (6 new files)

| File | Purpose |
|------|---------|
| AICockpit.tsx | Real-time status display with action buttons |
| AutoDirectorApprovalPointMultiSelect.tsx | Multi-select for approval points |
| AutoDirectorApprovalStrategyPanel.tsx | Auto-approval strategy config |
| AutoDirectorPauseNotificationWatcher.tsx | Headless: polls 15s, browser notifications |
| DirectorBookAutomationCard.tsx | Card wrapping AICockpit |
| DirectorRuntimeProjectionCard.tsx | Runtime projection card |

### lib/autoDirectorPauseNotifications.ts

localStorage toggle, Notification API wrappers, duplicate suppression, formatting.

### AppLayout Integration

`AutoDirectorPauseNotificationWatcher` at app root in all 3 layout branches.

---

## 9. New Settings Cards

### AutoDirectorBrowserNotificationSettingsCard.tsx

Enable/disable browser notifications. Toggle, permission state, cross-tab sync.

### AutoDirectorPendingReviewAutoPromotionCard.tsx

Auto-promote pending review items (>14 days, post baseline, no conflicts). Double confirmation (checkbox + typed text). Amber warnings.

---

## 10. Existing File Changes

### AppLayout.tsx
Added `AutoDirectorPauseNotificationWatcher` in all 3 layout branches.

### Home.tsx
Major refactor: 23.3KB -> 7.9KB (~66% reduction). Logic extracted to `home/`.

### Sidebar.tsx
Added "Beta" badge for `/comic` route.

### router/index.tsx
Added lazy-loaded route `novels/auto-director`.

---

## Summary

| Area | Status | Complexity | Files |
|------|--------|------------|-------|
| Book Analysis workbench | **New** | High | ~28 |
| Prompt Workbench | **New** | Very High | ~15 |
| Tension Curve | **New** | High | ~10 |
| Comic / Image | **New** | Medium | 3 |
| Home page | **Refactored** | High | 7 |
| Auto-Director wizard | **New** | Very High | 9 |
| Notification system | **New** | Medium | 8 |
| Novel list components | **New** | Medium | 8 |
| World handbook dialog | **New** | Medium | 1 |
| Workspace shell | **New** | Low | 1 |
| Settings cards | **New** | Low | 2 |
| AppLayout / Sidebar / Router | **Modified** | Low | 3 |
| **Total** | | | **~103** |
