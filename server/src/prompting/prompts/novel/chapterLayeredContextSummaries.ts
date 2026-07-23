/**
 * chapterLayeredContextSummaries.ts
 *
 * Summary/formatting functions extracted from chapterLayeredContextHelpers.ts.
 * Produces human-readable text blocks from GenerationContextPackage data.
 */

import type { GenerationContextPackage } from "@ai-novel/shared";
import { compactText, takeUnique, splitLines } from "./chapterLayeredContextUtils";
import { buildPlannerStyleContractSummaryText } from "../../../services/styleEngine/styleContractText";

// ---------------------------------------------------------------------------
// State snapshot
// ---------------------------------------------------------------------------

export function summarizeStateSnapshot(contextPackage: GenerationContextPackage): string {
  if (contextPackage.canonicalState) {
    const snapshot = contextPackage.canonicalState;
    const fragments = takeUnique([
      snapshot.narrative.currentChapterGoal,
      ...snapshot.characters
        .slice(0, 3)
        .map((state) => {
          const parts = takeUnique([
            state.currentGoal ? `goal=${state.currentGoal}` : "",
            state.currentState ? `state=${state.currentState}` : "",
            state.emotion ? `emotion=${state.emotion}` : "",
            state.summary,
          ]);
          if (parts.length === 0) {
            return "";
          }
          return `${state.name}: ${parts.join(" | ")}`;
        }),
      ...snapshot.narrative.publicKnowledge
        .slice(0, 2)
        .map((fact) => `${fact} (reader)`),
    ], 6);
    return fragments.join("\n") || "无先前规范状态快照。";
  }

  const fragments = takeUnique([
    contextPackage.stateSnapshot?.summary,
    ...contextPackage.stateSnapshot?.characterStates
      .slice(0, 3)
      .map((state) => {
        const parts = takeUnique([
          state.currentGoal ? `goal=${state.currentGoal}` : "",
          state.emotion ? `emotion=${state.emotion}` : "",
          state.summary,
        ]);
        if (parts.length === 0) {
          return "";
        }
        return `${state.characterId}: ${parts.join(" | ")}`;
      }) ?? [],
    ...contextPackage.stateSnapshot?.informationStates
      .slice(0, 2)
      .map((info) => `${info.fact} (${info.status})`) ?? [],
  ], 6);
  return fragments.join("\n") || "无先前状态快照。";
}

// ---------------------------------------------------------------------------
// Conflicts / world / issues / style / continuation
// ---------------------------------------------------------------------------

export function summarizeOpenConflicts(contextPackage: GenerationContextPackage): string[] {
  if (contextPackage.canonicalState) {
    return contextPackage.canonicalState.narrative.openConflicts
      .slice(0, 4)
      .map((conflict) => {
        const parts = takeUnique([
          conflict.title,
          conflict.summary,
          conflict.resolutionHint ? `resolution hint: ${conflict.resolutionHint}` : "",
        ], 3);
        return parts.join(" | ");
      })
      .filter(Boolean);
  }

  return contextPackage.openConflicts
    .slice(0, 4)
    .map((conflict) => {
      const parts = takeUnique([
        conflict.title,
        conflict.summary,
        conflict.resolutionHint ? `resolution hint: ${conflict.resolutionHint}` : "",
      ], 3);
      return parts.join(" | ");
    })
    .filter(Boolean);
}

export function summarizeWorldRules(contextPackage: GenerationContextPackage): string[] {
  const worldSlice = contextPackage.storyWorldSlice;
  if (worldSlice) {
    return takeUnique([
      worldSlice.coreWorldFrame,
      ...worldSlice.appliedRules.slice(0, 3).map((rule) => `${rule.name}: ${rule.summary}`),
      ...worldSlice.forbiddenCombinations.slice(0, 2),
      worldSlice.storyScopeBoundary,
    ], 6);
  }

  if (!contextPackage.canonicalState?.worldState) {
    return [];
  }
  const world = contextPackage.canonicalState.worldState;
  return takeUnique([
    world.summary ? `连续性记录：${world.summary}` : "",
    ...world.rules.slice(0, 3).map((rule) => `连续性规则记录：${rule}`),
    ...world.tabooRules.slice(0, 2).map((rule) => `连续性禁忌记录：${rule}`),
    world.currentSituation ? `当前世界状态记录：${world.currentSituation}` : "",
  ], 6);
}

export function summarizeHistoricalIssues(contextPackage: GenerationContextPackage): string[] {
  return contextPackage.openAuditIssues
    .slice(0, 4)
    .map((issue) => `${issue.severity}/${issue.auditType}: ${issue.description}`)
    .filter(Boolean);
}

export function summarizeStyleConstraints(contextPackage: GenerationContextPackage): string[] {
  const contract = contextPackage.styleContext?.compiledBlocks?.contract;
  if (!contract) {
    return [];
  }
  return takeUnique(
    buildPlannerStyleContractSummaryText(contract)
      .split(/\r?\n/g)
      .map((line) => line.trim())
      .filter(Boolean),
    8,
  );
}

export function summarizeContinuationConstraints(contextPackage: GenerationContextPackage): string[] {
  if (!contextPackage.continuation.enabled) {
    return [];
  }
  return takeUnique([
    compactText(contextPackage.continuation.systemRule),
    ...splitLines(contextPackage.continuation.humanBlock, 3),
  ], 4);
}
