---
description: "REQ-2059 方案设计"
update_time: 2026-07-18
---
# REQ-2059 方案设计

## 1. 估算函数统一（P1 + P2）

### 1.1 核心变更

```typescript
// contextBudget.ts — 修改前
export function estimateTextTokens(text: string): number {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return 0;
  return Math.max(1, Math.ceil(normalized.length / 4));
}

// contextBudget.ts — 修改后
export function estimateTextTokens(text: string): number {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return 0;
  return Math.max(1, normalized.length);
}
```

### 1.2 删除重复函数

`ContextBroker.ts` 中的 `estimateContextTokens`（`/3`）删除，改用 `estimateTextTokens`：

```typescript
// ContextBroker.ts — 修改前
import { estimateContextTokens } from "../core/contextBudget"; // 实际是本地定义的 /3 函数

// ContextBroker.ts — 修改后
import { estimateTextTokens } from "../core/contextBudget";
// normalizeBlock 中的 estimateContextTokens(content) → estimateTextTokens(content)
```

### 1.3 预算值放大

所有预算值 ×4，保持实际容量不变：

| 原值 | 新值 | 实际容量（中文字符数） |
| --- | --- | --- |
| 1,200 | 4,800 | ~4,800 字符（不变） |
| 2,600 | 10,400 | ~10,400 字符（不变） |
| 30,000 | 120,000 | ~120,000 字符（不变） |

## 2. YAML 配置文件（P4）

### 2.1 文件结构

```yaml
# server/configs/token-budgets.yaml
version: "1.0"
updated: "2026-07-18"

# INPUT 上下文预算（原 NOVEL_PROMPT_BUDGETS，已 ×4）
context_budgets:
  directorCandidates: 4800
  directorCandidatePatch: 4800
  directorBookContract: 5600
  directorBlueprint: 9600
  storyMacroDecomposition: 7200
  storyMacroFieldRegeneration: 6400
  volumeStrategy: 7200
  volumeStrategyCritique: 7200
  volumeSkeleton: 8000
  volumeBeatSheet: 25600       # 原 1600×4, 再 ×2 放大（接入 outline+material）
  volumeChapterList: 25600     # 原 1600×4, 再 ×2 放大（利用率 94%）
  volumeChapterDetail: 25600   # 原 1600×4, 再 ×2 放大（利用率 106%）
  volumeRebalance: 6400
  chapterWriter: 10400
  chapterAcceptance: 19200     # 原 1200×4, 再 ×2 放大（利用率 92%）
  chapterArtifactDelta: 5600
  chapterEditorWorkspaceDiagnosis: 5600
  chapterEditorUserIntent: 3600
  chapterEditorRewrite: 20000
  chapterLightAudit: 14400     # 原 900×4, 再 ×2 放大（利用率 161%）
  chapterReview: 10400
  chapterRepair: 8800
  chapterSummary: 4000
  chapterCompress: 10400
  chapterExpand: 10400
  waterContentDetection: 10400
  globalReview: 120000
  # 新增收拢的硬编码预算
  themeAnalysis: 8000
  characterConsistency: 32000
  feedbackIssueGeneration: 32000

# 运行时上下文选择策略（原 RUNTIME_PROMPT_BUDGET_PROFILES）
runtime_profiles:
  novel.chapter.writer:
    maxTokensBudget: 10400
    preferredGroups:
      - chapter_boundary
      - chapter_mission
      - previous_chapter_tail
      - timeline_context
      - previous_chapter_hook
      - character_hard_facts
      - payoff_directives
      - style_contract
      - volume_window
      - participant_subset
      - local_state
      - open_conflicts
      - recent_chapters
    dropOrder:
      - rag_facts
      - world_rules
      - continuation_constraints
      - opening_constraints
  novel.chapter.acceptance_assessment:
    maxTokensBudget: 19200
    preferredGroups:
      - chapter_mission
      - structure_obligations
      - character_hard_facts
      - local_state
      - style_contract
      - open_conflicts
    dropOrder:
      - recent_chapters
      - participant_subset
      - world_rules
      - historical_issues
  novel.chapter.artifact_delta.extract:
    maxTokensBudget: 5600
    preferredGroups:
      - chapter_mission
      - local_state
      - character_hard_facts
      - payoff_directives
      - open_conflicts
    dropOrder:
      - recent_chapters
      - world_rules
      - historical_issues
      - participant_subset
  audit.chapter.light:
    maxTokensBudget: 14400
    preferredGroups:
      - chapter_mission
      - structure_obligations
      - character_hard_facts
      - local_state
    dropOrder:
      - recent_chapters
      - participant_subset
      - historical_issues
      - world_rules
  audit.chapter.full:
    maxTokensBudget: 10400
    preferredGroups:
      - chapter_mission
      - structure_obligations
      - character_hard_facts
      - world_rules
      - historical_issues
    dropOrder:
      - rag_facts
      - recent_chapters
      - participant_subset
  novel.review.repair:
    maxTokensBudget: 8800
    preferredGroups:
      - style_contract
      - repair_issues
      - chapter_mission
      - previous_chapter_tail
      - repair_boundaries
      - character_hard_facts
      - world_rules
    dropOrder:
      - recent_chapters
      - participant_subset
      - continuation_constraints
```

### 2.2 加载机制

`promptBudgetProfiles.ts` 改为从 YAML 加载：

```typescript
import { readFileSync } from "node:fs";
import { parse } from "yaml"; // 或用 js-yaml
import { resolve } from "node:path";

const yamlPath = resolve(__dirname, "../../../configs/token-budgets.yaml");
const config = parse(readFileSync(yamlPath, "utf-8"));

export const NOVEL_PROMPT_BUDGETS = config.context_budgets;
export const RUNTIME_PROMPT_BUDGET_PROFILES = Object.entries(config.runtime_profiles)
  .map(([promptId, profile]) => ({ promptId, ...profile }));
```

**Fallback**：保留 TypeScript 默认值，YAML 加载失败时降级使用。

## 3. 修复清单

### 3.1 孤儿键修复（P3）

| 文件 | 行 | 修改 |
| --- | --- | --- |
| `compressChapter.prompts.ts` | ~30 | `NOVEL_PROMPT_BUDGETS.chapterWriter` → `NOVEL_PROMPT_BUDGETS.chapterCompress` |
| `expandChapter.prompts.ts` | ~30 | `NOVEL_PROMPT_BUDGETS.chapterWriter` → `NOVEL_PROMPT_BUDGETS.chapterExpand` |
| `waterContentDetection.prompts.ts` | ~34 | `NOVEL_PROMPT_BUDGETS.chapterReview` → `NOVEL_PROMPT_BUDGETS.waterContentDetection` |
| `audit.global.prompts.ts` | ~99 | 硬编码 `30000` → `NOVEL_PROMPT_BUDGETS.globalReview` |

### 3.2 硬编码修复（P6-P8）

| 文件 | 行 | 修改 |
| --- | --- | --- |
| `GenerationContextAssembler.ts` | ~542 | 硬编码 `2600` → `NOVEL_PROMPT_BUDGETS.chapterWriter` |
| `themeAnalysis.prompt.ts` | ~59 | 硬编码 `2000` → `NOVEL_PROMPT_BUDGETS.themeAnalysis` |
| `characterConsistency.prompts.ts` | ~39,91 | 硬编码 `8000` → `NOVEL_PROMPT_BUDGETS.characterConsistency` |
| `issueGeneration.prompts.ts` | ~77 | 硬编码 `8000` → `NOVEL_PROMPT_BUDGETS.feedbackIssueGeneration` |
