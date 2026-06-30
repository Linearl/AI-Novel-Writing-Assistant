/**
 * chapterLayeredContext.ts
 *
 * Public API facade — re-exports from extracted modules.
 * The actual implementations live in:
 *   - chapterLayeredContextHelpers.ts  (context builders, types, normalization)
 *   - chapterLayeredContextBlocks.ts   (prompt context block assembly)
 *   - chapterLayeredContextShared.ts   (shared text utilities)
 *   - chapterLayeredContextCharacters.ts (character guidance helpers)
 */

import type { ReviewIssue } from "@ai-novel/shared/types/novel";
import type {
  GenerationContextPackage,
  ChapterRepairContext,
} from "@ai-novel/shared/types/chapterRuntime";
import type { PromptContextBlock } from "../../core/promptTypes";
import { RUNTIME_PROMPT_BUDGET_PROFILES } from "./promptBudgetProfiles";
import {
  createContextBlock,
} from "../../core/contextBudget";

// ---------------------------------------------------------------------------
// Re-export from helpers
// ---------------------------------------------------------------------------
export {
  WRITER_FORBIDDEN_GROUPS,
  type ChapterWriterBlockMode,
  type ChapterWriterBlockOptions,
  type RuntimeVolumeSeed,
  resolveTargetWordRange,
  buildBookContractContext,
  buildMacroConstraintContext,
  buildVolumeWindowContext,
  buildChapterMissionContext,
  buildNarrativeProgressHint,
  buildChapterWriteContext,
  buildChapterReviewContext,
  buildChapterRepairContext,
  buildChapterExecutionObligationContract,
  normalizeChapterWriteContext,
  sanitizeWriterContextBlocks,
} from "./chapterLayeredContextHelpers";

// ---------------------------------------------------------------------------
// Re-export from blocks
// ---------------------------------------------------------------------------
export {
  buildChapterWriterContextBlocks,
  selectCharacterHardFactsForWriter,
} from "./chapterLayeredContextBlocks";

// ---------------------------------------------------------------------------
// Composed helpers that depend on multiple extracted modules
// ---------------------------------------------------------------------------

export function buildChapterReviewContextBlocks(
  reviewContext: import("@ai-novel/shared/types/chapterRuntime").ChapterReviewContext,
): PromptContextBlock[] {
  return [
    ...buildChapterWriterContextBlocksForReexport(reviewContext, { mode: "review" }),
    createContextBlock({
      id: "structure_obligations",
      group: "structure_obligations",
      priority: 94,
      required: true,
      content: toListBlockForReexport("Structure obligations", reviewContext.structureObligations),
    }),
    createContextBlock({
      id: "world_rules",
      group: "world_rules",
      priority: 84,
      content: toListBlockForReexport("Relevant world rules", reviewContext.worldRules),
    }),
    createContextBlock({
      id: "historical_issues",
      group: "historical_issues",
      priority: 82,
      content: toListBlockForReexport("Historical unresolved issues", reviewContext.historicalIssues),
    }),
  ].filter((block) => block.content.trim().length > 0);
}

export function buildChapterRepairContextBlocks(repairContext: ChapterRepairContext): PromptContextBlock[] {
  return [
    ...buildChapterWriterContextBlocksForReexport(repairContext.writeContext, { mode: "repair" }),
    createContextBlock({
      id: "repair_issues",
      group: "repair_issues",
      priority: 100,
      required: true,
      content: repairContext.issues.length > 0
        ? [
            "Repair issues:",
            ...repairContext.issues.map((issue) => (
              `- ${issue.severity}/${issue.category}: ${issue.evidence} | fix: ${issue.fixSuggestion}`
            )),
          ].join("\n")
        : "Repair issues: none",
    }),
    createContextBlock({
      id: "structure_obligations",
      group: "structure_obligations",
      priority: 95,
      required: true,
      content: toListBlockForReexport("Structure obligations", repairContext.structureObligations),
    }),
    createContextBlock({
      id: "repair_boundaries",
      group: "repair_boundaries",
      priority: 96,
      required: true,
      content: toListBlockForReexport("Allowed edit boundaries", repairContext.allowedEditBoundaries),
    }),
    createContextBlock({
      id: "world_rules",
      group: "world_rules",
      priority: 84,
      content: toListBlockForReexport("Relevant world rules", repairContext.worldRules),
    }),
    createContextBlock({
      id: "historical_issues",
      group: "historical_issues",
      priority: 82,
      content: toListBlockForReexport("Historical unresolved issues", repairContext.historicalIssues),
    }),
  ].filter((block) => block.content.trim().length > 0);
}

export function getRuntimePromptBudgetProfiles() {
  return RUNTIME_PROMPT_BUDGET_PROFILES;
}

export function getAllContextBlocks(contextPackage: GenerationContextPackage): PromptContextBlock[] {
  const writeContext = contextPackage.chapterWriteContext;
  if (!writeContext) {
    return [];
  }

  const blocks: PromptContextBlock[] = [
    createContextBlock({
      id: "book_contract",
      group: "book_contract",
      priority: 100,
      required: true,
      content: [
        `Title: ${writeContext.bookContract.title}`,
        `Genre: ${writeContext.bookContract.genre}`,
        `Target audience: ${writeContext.bookContract.targetAudience}`,
        `Selling point: ${writeContext.bookContract.sellingPoint}`,
        `First 30 chapter promise: ${writeContext.bookContract.first30ChapterPromise}`,
        `Narrative POV: ${writeContext.bookContract.narrativePov}`,
        `Pace preference: ${writeContext.bookContract.pacePreference}`,
        `Emotion intensity: ${writeContext.bookContract.emotionIntensity}`,
        writeContext.bookContract.toneGuardrails.length > 0 ? `Tone guardrails: ${writeContext.bookContract.toneGuardrails.join(" | ")}` : "",
        writeContext.bookContract.hardConstraints.length > 0 ? `Hard constraints: ${writeContext.bookContract.hardConstraints.join(" | ")}` : "",
      ].filter(Boolean).join("\n"),
    }),
    ...buildChapterWriterContextBlocksForReexport(writeContext),
  ];
  if (writeContext.macroConstraints) {
    blocks.push(createContextBlock({
      id: "story_macro",
      group: "story_macro",
      priority: 98,
      content: [
        `Selling point: ${writeContext.macroConstraints.sellingPoint}`,
        `Core conflict: ${writeContext.macroConstraints.coreConflict}`,
        `Main hook: ${writeContext.macroConstraints.mainHook}`,
        `Progression loop: ${writeContext.macroConstraints.progressionLoop}`,
        `Growth path: ${writeContext.macroConstraints.growthPath}`,
        `Ending flavor: ${writeContext.macroConstraints.endingFlavor}`,
        writeContext.macroConstraints.hardConstraints.length > 0 ? `Hard constraints: ${writeContext.macroConstraints.hardConstraints.join(" | ")}` : "",
      ].filter(Boolean).join("\n"),
    }));
  }
  if (contextPackage.ragContext.trim()) {
    blocks.push(createContextBlock({
      id: "rag_context",
      group: "rag_context",
      priority: 60,
      content: contextPackage.ragContext,
    }));
  }
  return blocks;
}

export function buildChapterRepairContextFromPackage(
  contextPackage: GenerationContextPackage,
  issues: ReviewIssue[],
): ChapterRepairContext | null {
  if (!contextPackage.chapterWriteContext) {
    return null;
  }
  return buildChapterRepairContextForReexport({
    writeContext: contextPackage.chapterWriteContext,
    contextPackage,
    issues,
  });
}

export function withChapterRepairContext(
  contextPackage: GenerationContextPackage,
  issues: ReviewIssue[],
): GenerationContextPackage {
  const chapterRepairContext = buildChapterRepairContextFromPackage(contextPackage, issues);
  if (!chapterRepairContext) {
    return contextPackage;
  }
  return {
    ...contextPackage,
    chapterRepairContext,
  };
}

// ---------------------------------------------------------------------------
// Internal bridges to avoid circular imports
// ---------------------------------------------------------------------------

import {
  buildChapterWriterContextBlocks as _buildChapterWriterContextBlocks,
} from "./chapterLayeredContextBlocks";
import {
  buildChapterRepairContext as _buildChapterRepairContext,
} from "./chapterLayeredContextHelpers";
import {
  toListBlock as _toListBlock,
} from "./chapterLayeredContextShared";

const buildChapterWriterContextBlocksForReexport = _buildChapterWriterContextBlocks;
const buildChapterRepairContextForReexport = _buildChapterRepairContext;
const toListBlockForReexport = _toListBlock;
