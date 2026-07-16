/**
 * chapterLayeredContext.ts
 *
 * Public API facade — re-exports from merged modules.
 * The actual implementations live in:
 *   - chapterLayeredContextHelpers.ts  (context builders, shared utilities, character dynamics)
 *   - chapterLayeredContextBlocks.ts   (prompt context block assembly)
 *   - chapterLayeredContextTypes.ts    (pure type definitions)
 *
 * Refactored from REQ-7074: 5 files converged to 3.
 */

import type { ReviewIssue } from "@ai-novel/shared";
import type {
  GenerationContextPackage,
  ChapterRepairContext,
} from "@ai-novel/shared";
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
      content: toListBlockForReexport("结构义务", reviewContext.structureObligations),
    }),
    createContextBlock({
      id: "world_rules",
      group: "world_rules",
      priority: 84,
      content: toListBlockForReexport("相关世界规则", reviewContext.worldRules),
    }),
    createContextBlock({
      id: "historical_issues",
      group: "historical_issues",
      priority: 82,
      content: toListBlockForReexport("历史遗留问题", reviewContext.historicalIssues),
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
            "修复问题：",
            ...repairContext.issues.map((issue) => (
              `- ${issue.severity}/${issue.category}: ${issue.evidence} | fix: ${issue.fixSuggestion}`
            )),
          ].join("\n")
        : "修复问题：无",
    }),
    createContextBlock({
      id: "structure_obligations",
      group: "structure_obligations",
      priority: 95,
      required: true,
      content: toListBlockForReexport("结构义务", repairContext.structureObligations),
    }),
    createContextBlock({
      id: "repair_boundaries",
      group: "repair_boundaries",
      priority: 96,
      required: true,
      content: toListBlockForReexport("允许的编辑边界", repairContext.allowedEditBoundaries),
    }),
    createContextBlock({
      id: "world_rules",
      group: "world_rules",
      priority: 84,
      content: toListBlockForReexport("相关世界规则", repairContext.worldRules),
    }),
    createContextBlock({
      id: "historical_issues",
      group: "historical_issues",
      priority: 82,
      content: toListBlockForReexport("历史遗留问题", repairContext.historicalIssues),
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
        `书名: ${writeContext.bookContract.title}`,
        `类型: ${writeContext.bookContract.genre}`,
        `目标读者: ${writeContext.bookContract.targetAudience}`,
        `核心卖点: ${writeContext.bookContract.sellingPoint}`,
        `前30章承诺: ${writeContext.bookContract.first30ChapterPromise}`,
        `叙事视角: ${writeContext.bookContract.narrativePov}`,
        `节奏偏好: ${writeContext.bookContract.pacePreference}`,
        `情绪强度: ${writeContext.bookContract.emotionIntensity}`,
        writeContext.bookContract.toneGuardrails.length > 0 ? `基调约束: ${writeContext.bookContract.toneGuardrails.join(" | ")}` : "",
        writeContext.bookContract.hardConstraints.length > 0 ? `硬约束: ${writeContext.bookContract.hardConstraints.join(" | ")}` : "",
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
        `核心卖点: ${writeContext.macroConstraints.sellingPoint}`,
        `核心冲突: ${writeContext.macroConstraints.coreConflict}`,
        `主线钩子: ${writeContext.macroConstraints.mainHook}`,
        `推进循环: ${writeContext.macroConstraints.progressionLoop}`,
        `成长路径: ${writeContext.macroConstraints.growthPath}`,
        `结局风味: ${writeContext.macroConstraints.endingFlavor}`,
        writeContext.macroConstraints.hardConstraints.length > 0 ? `硬约束: ${writeContext.macroConstraints.hardConstraints.join(" | ")}` : "",
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
  toListBlock as _toListBlock,
} from "./chapterLayeredContextHelpers";

const buildChapterWriterContextBlocksForReexport = _buildChapterWriterContextBlocks;
const buildChapterRepairContextForReexport = _buildChapterRepairContext;
const toListBlockForReexport = _toListBlock;
