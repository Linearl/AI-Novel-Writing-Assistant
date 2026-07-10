/**
 * chapterLayeredContextHelpers.ts
 *
 * Context-building functions and types extracted from chapterLayeredContext.ts.
 * Pure extraction — no functional changes.
 */

import type {
  BookContractContext,
  ChapterExecutionObligationContract,
  ChapterMissionContext,
  ChapterRepairContext,
  ChapterReviewContext,
  ChapterWriteContext,
  GenerationContextPackage,
  MacroConstraintContext,
  VolumeWindowContext,
} from "@ai-novel/shared/types/chapterRuntime";
import {
  parseChapterScenePlan,
  resolveLengthBudgetContract,
} from "@ai-novel/shared/types/chapterLengthControl";
import { sanitizeCreativeMustAdvanceItems } from "@ai-novel/shared/types/chapterCreativeContract";
import type { ReviewIssue } from "@ai-novel/shared/types/novel";
import type { StoryMacroPlan } from "@ai-novel/shared/types/storyMacro";
import type { PromptContextBlock } from "../../core/promptTypes";
import {
  buildDynamicCharacterGuidance,
  buildParticipants,
} from "./chapterLayeredContextCharacters";
import {
  buildLedgerItemLine,
  buildParticipantText,
  compactText,
  resolveTargetWordRange,
  summarizeContinuationConstraints,
  summarizeHistoricalIssues,
  summarizeOpenConflicts,
  summarizeStateSnapshot,
  summarizeStyleConstraints,
  summarizeWorldRules,
  takeUnique,
  toListBlock,
import { compactText } from "@ai-novel/shared";
} from "./chapterLayeredContextShared";

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

export const WRITER_FORBIDDEN_GROUPS = [
  "full_outline",
  "full_bible",
  "all_characters",
  "all_audit_issues",
  "anti_copy_corpus",
  "raw_rag_dump",
] as const;

export { resolveTargetWordRange } from "./chapterLayeredContextShared";

export type ChapterWriterBlockMode = "full" | "incremental" | "review" | "repair";

const EMPTY_OBLIGATION_CONTRACT: ChapterExecutionObligationContract = {
  mustHitNow: [],
  mustPreserve: [],
  requiredPayoffTouches: [],
  requiredCharacterAppearances: [],
  requiredGoalChanges: [],
  canDefer: [],
  forbiddenCrossings: [],
};

export interface ChapterWriterBlockOptions {
  mode?: ChapterWriterBlockMode;
  incrementalContext?: {
    previousRoundSummary?: string | null;
    roundInstruction?: string | null;
    currentSceneProgress?: string | null;
  } | null;
}

export type RuntimeVolumeSeed = {
  currentVolume?: {
    id?: string | null;
    sortOrder?: number | null;
    title?: string | null;
    summary?: string | null;
    mainPromise?: string | null;
    openPayoffs?: string[];
  } | null;
  previousVolume?: {
    title?: string | null;
    summary?: string | null;
  } | null;
  nextVolume?: {
    title?: string | null;
    summary?: string | null;
  } | null;
  softFutureSummary?: string;
};

// ---------------------------------------------------------------------------
// Context-building functions
// ---------------------------------------------------------------------------

export function buildBookContractContext(input: {
  title: string;
  genre?: string | null;
  targetAudience?: string | null;
  sellingPoint?: string | null;
  first30ChapterPromise?: string | null;
  narrativePov?: string | null;
  pacePreference?: string | null;
  emotionIntensity?: string | null;
  toneGuardrails?: string[];
  hardConstraints?: string[];
}): BookContractContext {
  return {
    title: compactText(input.title),
    genre: compactText(input.genre, "unknown"),
    targetAudience: compactText(input.targetAudience, "unknown"),
    sellingPoint: compactText(input.sellingPoint, "not specified"),
    first30ChapterPromise: compactText(input.first30ChapterPromise, "not specified"),
    narrativePov: compactText(input.narrativePov, "not specified"),
    pacePreference: compactText(input.pacePreference, "not specified"),
    emotionIntensity: compactText(input.emotionIntensity, "not specified"),
    toneGuardrails: takeUnique(input.toneGuardrails ?? [], 4),
    hardConstraints: takeUnique(input.hardConstraints ?? [], 6),
  };
}

export function buildMacroConstraintContext(storyMacroPlan: StoryMacroPlan | null): MacroConstraintContext | null {
  if (!storyMacroPlan) {
    return null;
  }
  return {
    sellingPoint: compactText(storyMacroPlan.decomposition?.selling_point, "not specified"),
    coreConflict: compactText(storyMacroPlan.decomposition?.core_conflict, "not specified"),
    mainHook: compactText(storyMacroPlan.decomposition?.main_hook, "not specified"),
    progressionLoop: compactText(storyMacroPlan.decomposition?.progression_loop, "not specified"),
    growthPath: compactText(storyMacroPlan.decomposition?.growth_path, "not specified"),
    endingFlavor: compactText(storyMacroPlan.decomposition?.ending_flavor, "not specified"),
    hardConstraints: takeUnique([
      ...(storyMacroPlan.constraints ?? []),
      ...(storyMacroPlan.constraintEngine?.hard_constraints ?? []),
    ], 8),
  };
}

export function buildVolumeWindowContext(seed: RuntimeVolumeSeed): VolumeWindowContext | null {
  const current = seed.currentVolume;
  if (!current?.title?.trim()) {
    return null;
  }
  const adjacentSummary = [
    seed.previousVolume?.title ? `previous: ${compactText(seed.previousVolume.title)} / ${compactText(seed.previousVolume.summary, "no summary")}` : "",
    seed.nextVolume?.title ? `next: ${compactText(seed.nextVolume.title)} / ${compactText(seed.nextVolume.summary, "no summary")}` : "",
  ].filter(Boolean).join("\n");
  return {
    volumeId: current.id ?? null,
    sortOrder: current.sortOrder ?? null,
    title: compactText(current.title),
    missionSummary: compactText(current.mainPromise || current.summary, "no volume mission"),
    adjacentSummary: adjacentSummary || "No adjacent volume summary.",
    pendingPayoffs: takeUnique(current.openPayoffs ?? [], 5),
    softFutureSummary: compactText(seed.softFutureSummary, "No future volume summary."),
    keyMilestoneGuards: [],
  };
}

export function buildChapterMissionContext(contextPackage: GenerationContextPackage): ChapterMissionContext {
  const stateGoal = contextPackage.chapterStateGoal;
  return {
    chapterId: contextPackage.chapter.id,
    chapterOrder: contextPackage.chapter.order,
    title: compactText(contextPackage.chapter.title),
    objective:
      compactText(stateGoal?.summary)
      || compactText(contextPackage.plan?.objective)
      || compactText(contextPackage.chapter.expectation, "Push the current chapter mission forward."),
    expectation:
      compactText(contextPackage.chapter.expectation)
      || compactText(stateGoal?.summary)
      || compactText(contextPackage.plan?.title, "Deliver the current chapter mission."),
    taskSheet: compactText(contextPackage.chapter.taskSheet) || null,
    targetWordCount: contextPackage.chapter.targetWordCount ?? null,
    planRole: contextPackage.plan?.planRole ?? null,
    hookTarget: compactText(contextPackage.plan?.hookTarget, "Leave a fresh tension point at the ending."),
    mustAdvance: sanitizeCreativeMustAdvanceItems(takeUnique([
      ...(stateGoal?.targetConflicts ?? []),
      ...(contextPackage.plan?.mustAdvance ?? []),
    ], 5)),
    mustPreserve: takeUnique([
      ...(stateGoal?.targetRelationships ?? []),
      ...(contextPackage.plan?.mustPreserve ?? []),
    ], 5),
    riskNotes: takeUnique([
      ...(contextPackage.protectedSecrets ?? []),
      ...(contextPackage.plan?.riskNotes ?? []),
    ], 5),
  };
}

export function buildNarrativeProgressHint(
  currentOrder: number,
  estimatedTotal: number | null | undefined,
): string | null {
  if (!estimatedTotal || estimatedTotal <= 0) return null;
  const progress = currentOrder / estimatedTotal;
  const remaining = estimatedTotal - currentOrder;
  if (progress < 0.25) {
    return `【叙事进度】第 ${currentOrder} 章 / 预计共 ${estimatedTotal} 章（${Math.round(progress * 100)}%）\n开局阶段：可自由展开世界与人物，建立读者期待。`;
  }
  if (progress < 0.75) {
    return `【叙事进度】第 ${currentOrder} 章 / 预计共 ${estimatedTotal} 章（${Math.round(progress * 100)}%）\n发展阶段：推进既有线索，谨慎开新支线，保持伏笔密度。`;
  }
  if (progress < 0.90) {
    return `【叙事进度】第 ${currentOrder} 章 / 预计共 ${estimatedTotal} 章（${Math.round(progress * 100)}%）\n收敛阶段：优先兑现已埋伏笔，避免新开主线，距结束还有约 ${remaining} 章。`;
  }
  return `【叙事进度】第 ${currentOrder} 章 / 预计共 ${estimatedTotal} 章（${Math.round(progress * 100)}%）\n尾声阶段：收束所有主线，为全书收尾，禁止开新支线。`;
}

export function buildChapterBoundaryContract(
  contextPackage: GenerationContextPackage,
  scenePlan: ReturnType<typeof parseChapterScenePlan>,
): ChapterWriteContext["chapterBoundary"] {
  const scenes = scenePlan?.scenes ?? [];
  const firstScene = scenes[0] ?? null;
  const lastScene = scenes[scenes.length - 1] ?? null;
  const protectedReveals = takeUnique([
    ...(contextPackage.protectedSecrets ?? []),
    ...(contextPackage.chapterStateGoal?.protectedSecrets ?? []),
  ], 8);
  const doNotCross = takeUnique([
    compactText(contextPackage.chapter.mustAvoid),
    ...protectedReveals.map((item) => `不得提前揭露：${item}`),
    ...scenes.flatMap((scene) => scene.forbiddenExpansion ?? []),
    lastScene?.exitState ? `不得越过本章结束态：${lastScene.exitState}` : "",
    contextPackage.chapter.hook ? `不得直接展开钩子之后的后续事件：${contextPackage.chapter.hook}` : "",
  ], 12).filter(Boolean);

  return {
    exclusiveEvent: compactText(contextPackage.plan?.objective)
      || compactText(contextPackage.chapter.expectation)
      || compactText(contextPackage.plan?.title)
      || null,
    entryState: compactText(firstScene?.entryState) || null,
    endingState: compactText(lastScene?.exitState)
      || compactText(contextPackage.plan?.hookTarget)
      || compactText(contextPackage.chapter.hook)
      || null,
    nextChapterEntryState: compactText(contextPackage.chapter.hook)
      || compactText(contextPackage.plan?.hookTarget)
      || null,
    doNotCross,
    protectedReveals,
    allowedRevealLevel: contextPackage.chapter.revealLevel ?? null,
  };
}

export function buildChapterWriteContext(input: {
  bookContract: BookContractContext;
  macroConstraints: MacroConstraintContext | null;
  volumeWindow: VolumeWindowContext | null;
  contextPackage: GenerationContextPackage;
}): ChapterWriteContext {
  const dynamicCharacterGuidance = buildDynamicCharacterGuidance(input.contextPackage);
  const participants = buildParticipants(input.contextPackage, dynamicCharacterGuidance.characterBehaviorGuides);
  const characterHardFacts = selectCharacterHardFactsForWriter({
    hardFacts: input.contextPackage.characterHardFacts ?? [],
    participants,
    characterBehaviorGuides: dynamicCharacterGuidance.characterBehaviorGuides,
    currentChapterOrder: input.contextPackage.chapter.order,
  });
  const scenePlan = parseChapterScenePlan(input.contextPackage.chapter.sceneCards, {
    targetWordCount: input.contextPackage.chapter.targetWordCount ?? undefined,
  });
  return {
    bookContract: input.bookContract,
    macroConstraints: input.macroConstraints,
    volumeWindow: input.volumeWindow,
    narrativeProgressHint: input.contextPackage.narrativeProgressHint ?? null,
    chapterMission: buildChapterMissionContext(input.contextPackage),
    nextAction: input.contextPackage.nextAction,
    chapterStateGoal: input.contextPackage.chapterStateGoal ?? null,
    protectedSecrets: input.contextPackage.protectedSecrets ?? [],
    payoffDirectives: input.contextPackage.chapterStateGoal?.targetPayoffDirectives ?? [],
    obligationContract: buildChapterExecutionObligationContract({
      chapterOrder: input.contextPackage.chapter.order,
      chapterMission: buildChapterMissionContext(input.contextPackage),
      chapterStateGoal: input.contextPackage.chapterStateGoal ?? null,
      protectedSecrets: input.contextPackage.protectedSecrets ?? [],
      payoffDirectives: input.contextPackage.chapterStateGoal?.targetPayoffDirectives ?? [],
      chapterBoundary: buildChapterBoundaryContract(input.contextPackage, scenePlan),
      characterBehaviorGuides: dynamicCharacterGuidance.characterBehaviorGuides,
      ledgerPendingItems: input.contextPackage.ledgerPendingItems,
    }),
    chapterBoundary: buildChapterBoundaryContract(input.contextPackage, scenePlan),
    lengthBudget: resolveLengthBudgetContract(input.contextPackage.chapter.targetWordCount),
    scenePlan,
    participants,
    characterHardFacts,
    characterBehaviorGuides: dynamicCharacterGuidance.characterBehaviorGuides,
    activeRelationStages: dynamicCharacterGuidance.activeRelationStages,
    pendingCandidateGuards: dynamicCharacterGuidance.pendingCandidateGuards,
    localStateSummary: summarizeStateSnapshot(input.contextPackage),
    openConflictSummaries: summarizeOpenConflicts(input.contextPackage),
    ledgerPendingItems: input.contextPackage.ledgerPendingItems,
    ledgerUrgentItems: input.contextPackage.ledgerUrgentItems,
    ledgerOverdueItems: input.contextPackage.ledgerOverdueItems,
    ledgerSummary: input.contextPackage.ledgerSummary ?? null,
    timelineContext: input.contextPackage.timelineContext ?? null,
    characterResourceContext: input.contextPackage.characterResourceContext ?? null,
    recentChapterSummaries: takeUnique(input.contextPackage.previousChaptersSummary.slice(0, 3), 3),
    previousChapterTail: compactText(input.contextPackage.previousChapterTail) || null,
    openingAntiRepeatHint: compactText(input.contextPackage.openingHint, "No recent opening guidance."),
    styleContract: input.contextPackage.styleContext?.compiledBlocks?.contract ?? null,
    styleConstraints: summarizeStyleConstraints(input.contextPackage),
    continuationConstraints: summarizeContinuationConstraints(input.contextPackage),
    ragFacts: [],
    completedMilestones: [],
    recentScenePatterns: [],
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function uniqueStrings(items: Array<string | null | undefined>): string[] {
  return Array.from(new Set(items.map((item) => item?.trim()).filter((item): item is string => Boolean(item))));
}

export function buildChapterExecutionObligationContract(input: {
  chapterOrder: number;
  chapterMission: ChapterWriteContext["chapterMission"];
  chapterStateGoal: ChapterWriteContext["chapterStateGoal"];
  protectedSecrets: string[];
  payoffDirectives: ChapterWriteContext["payoffDirectives"];
  chapterBoundary: ChapterWriteContext["chapterBoundary"];
  characterBehaviorGuides: ChapterWriteContext["characterBehaviorGuides"];
  ledgerPendingItems: ChapterWriteContext["ledgerPendingItems"];
}): ChapterWriteContext["obligationContract"] {
  return {
    mustHitNow: uniqueStrings(input.chapterMission.mustAdvance),
    mustPreserve: uniqueStrings(input.chapterMission.mustPreserve),
    requiredPayoffTouches: uniqueStrings(input.payoffDirectives.map((item) => (
      `${item.operation}: ${item.title}`
    ))),
    requiredCharacterAppearances: uniqueStrings(input.characterBehaviorGuides
      .filter((guide) => (
        guide.shouldPreferAppearance
        || guide.plannedChapterOrders.includes(input.chapterOrder)
      ))
      .map((guide) => {
        if (guide.absenceRisk === "high" && guide.absenceSpan > 0) {
          return `${guide.name}（已缺席 ${guide.absenceSpan} 章，宜自然带出）`;
        }
        return guide.name;
      })),
    requiredGoalChanges: uniqueStrings([
      ...(input.chapterStateGoal?.targetRelationships ?? []),
      ...(input.chapterStateGoal?.targetConflicts ?? []),
    ]),
    canDefer: uniqueStrings(input.ledgerPendingItems.map((item) => item.title)),
    forbiddenCrossings: uniqueStrings([
      ...input.protectedSecrets,
      ...(input.chapterBoundary?.doNotCross ?? []),
      ...(input.chapterBoundary?.protectedReveals ?? []),
    ]),
  };
}

export function normalizeChapterWriteContext(writeContext: ChapterWriteContext): ChapterWriteContext {
  const legacyContext = writeContext as ChapterWriteContext & {
    obligationContract?: Partial<ChapterExecutionObligationContract> | null;
  };
  const obligationContract = legacyContext.obligationContract ?? {};
  return {
    ...writeContext,
    volumeWindow: writeContext.volumeWindow
      ? {
        ...writeContext.volumeWindow,
        keyMilestoneGuards: writeContext.volumeWindow.keyMilestoneGuards ?? [],
      }
      : null,
    narrativeProgressHint: writeContext.narrativeProgressHint ?? null,
    obligationContract: {
      mustHitNow: obligationContract.mustHitNow ?? EMPTY_OBLIGATION_CONTRACT.mustHitNow,
      mustPreserve: obligationContract.mustPreserve ?? EMPTY_OBLIGATION_CONTRACT.mustPreserve,
      requiredPayoffTouches: obligationContract.requiredPayoffTouches ?? EMPTY_OBLIGATION_CONTRACT.requiredPayoffTouches,
      requiredCharacterAppearances: obligationContract.requiredCharacterAppearances ?? EMPTY_OBLIGATION_CONTRACT.requiredCharacterAppearances,
      requiredGoalChanges: obligationContract.requiredGoalChanges ?? EMPTY_OBLIGATION_CONTRACT.requiredGoalChanges,
      canDefer: obligationContract.canDefer ?? EMPTY_OBLIGATION_CONTRACT.canDefer,
      forbiddenCrossings: obligationContract.forbiddenCrossings ?? EMPTY_OBLIGATION_CONTRACT.forbiddenCrossings,
    },
    characterHardFacts: writeContext.characterHardFacts ?? [],
    previousChapterTail: writeContext.previousChapterTail ?? null,
    styleConstraints: writeContext.styleConstraints ?? [],
    continuationConstraints: writeContext.continuationConstraints ?? [],
    ragFacts: writeContext.ragFacts ?? [],
    completedMilestones: writeContext.completedMilestones ?? [],
    recentScenePatterns: writeContext.recentScenePatterns ?? [],
  };
}

export function buildChapterReviewContext(
  writeContext: ChapterWriteContext,
  contextPackage: GenerationContextPackage,
): ChapterReviewContext {
  writeContext = normalizeChapterWriteContext(writeContext);
  return {
    ...writeContext,
    structureObligations: takeUnique([
      ...writeContext.chapterMission.mustAdvance,
      ...writeContext.chapterMission.mustPreserve,
      ...writeContext.obligationContract.mustHitNow.map((item) => `must hit now: ${item}`),
      ...writeContext.obligationContract.requiredCharacterAppearances.map((item) => `required character appearance: ${item}`),
      ...writeContext.obligationContract.requiredGoalChanges.map((item) => `required goal change: ${item}`),
      ...writeContext.payoffDirectives.map((item) => `payoff directive: ${item.operation} ${item.title}${item.forbiddenReveal ? ` / protected: ${item.forbiddenReveal}` : ""}`),
      ...(writeContext.chapterStateGoal?.targetConflicts ?? []).map((item) => `state conflict: ${item}`),
      ...(writeContext.chapterBoundary?.doNotCross ?? []).map((item) => `boundary do-not-cross: ${item}`),
      writeContext.chapterMission.hookTarget ? `hook target: ${writeContext.chapterMission.hookTarget}` : "",
      writeContext.volumeWindow?.missionSummary ? `volume mission: ${writeContext.volumeWindow.missionSummary}` : "",
      ...(writeContext.characterResourceContext?.setupNeededItems ?? []).map((item) => `resource setup needed: ${item.name} / ${item.summary}`),
      ...(writeContext.characterResourceContext?.blockedItems ?? []).map((item) => `resource unavailable: ${item.name} is ${item.status}; do not use it without repair setup`),
      ...(writeContext.characterResourceContext?.pendingReviewItems ?? []).map((item) => `resource needs confirmation: ${item.name} / ${item.summary}`),
      ...writeContext.ledgerPendingItems.map((item) => buildLedgerItemLine(item, "pending payoff")),
      ...writeContext.ledgerUrgentItems.map((item) => buildLedgerItemLine(item, "urgent payoff")),
      ...writeContext.ledgerOverdueItems.map((item) => buildLedgerItemLine(item, "overdue payoff")),
    ], 32),
    worldRules: summarizeWorldRules(contextPackage),
    historicalIssues: summarizeHistoricalIssues(contextPackage),
  };
}

export function buildChapterRepairContext(input: {
  writeContext: ChapterWriteContext;
  contextPackage: GenerationContextPackage;
  issues: ReviewIssue[];
}): ChapterRepairContext {
  const writeContext = normalizeChapterWriteContext(input.writeContext);
  return {
    writeContext,
    issues: input.issues.slice(0, 8).map((issue) => ({
      severity: issue.severity,
      category: issue.category,
      evidence: compactText(issue.evidence),
      fixSuggestion: compactText(issue.fixSuggestion),
    })),
    structureObligations: takeUnique([
      ...writeContext.chapterMission.mustAdvance,
      ...writeContext.chapterMission.mustPreserve,
      ...writeContext.obligationContract.mustHitNow.map((item) => `must hit now: ${item}`),
      ...writeContext.obligationContract.requiredCharacterAppearances.map((item) => `required character appearance: ${item}`),
      ...writeContext.obligationContract.requiredGoalChanges.map((item) => `required goal change: ${item}`),
      ...writeContext.payoffDirectives.map((item) => `payoff directive: ${item.operation} ${item.title}${item.forbiddenReveal ? ` / protected: ${item.forbiddenReveal}` : ""}`),
      ...(writeContext.chapterStateGoal?.targetConflicts ?? []).map((item) => `state conflict: ${item}`),
      ...(writeContext.chapterBoundary?.doNotCross ?? []).map((item) => `boundary do-not-cross: ${item}`),
      writeContext.volumeWindow?.missionSummary
        ? `volume mission: ${writeContext.volumeWindow.missionSummary}`
        : "",
      ...(writeContext.characterResourceContext?.setupNeededItems ?? []).map((item) => `resource setup needed: ${item.name} / ${item.summary}`),
      ...(writeContext.characterResourceContext?.blockedItems ?? []).map((item) => `resource unavailable: ${item.name} is ${item.status}; patch locally before use`),
      ...writeContext.ledgerPendingItems.map((item) => buildLedgerItemLine(item, "pending payoff")),
      ...writeContext.ledgerUrgentItems.map((item) => buildLedgerItemLine(item, "urgent payoff")),
      ...writeContext.ledgerOverdueItems.map((item) => buildLedgerItemLine(item, "overdue payoff")),
    ], 32),
    worldRules: summarizeWorldRules(input.contextPackage),
    historicalIssues: summarizeHistoricalIssues(input.contextPackage),
    allowedEditBoundaries: takeUnique([
      "Keep the chapter's established objective, participants, and major outcome direction intact.",
      "Do not introduce new core characters, new world rules, or off-outline twists.",
      writeContext.volumeWindow?.missionSummary
        ? `Keep the repair aligned with the current volume mission: ${writeContext.volumeWindow.missionSummary}`
        : "",
      ...writeContext.ledgerPendingItems.map((item) => `Do not erase pending payoff setup: ${item.title}`),
      ...writeContext.ledgerUrgentItems.map((item) => `This chapter must visibly touch the urgent payoff thread: ${item.title}`),
      ...writeContext.ledgerOverdueItems.map((item) => `You must either兑现 or explicitly explain the overdue payoff pressure: ${item.title}`),
      ...(writeContext.characterResourceContext?.blockedItems ?? []).map((item) => `Patch resource continuity before using ${item.name}; current status is ${item.status}.`),
      ...(writeContext.characterResourceContext?.pendingReviewItems ?? []).map((item) => `Do not make an uncertain resource fact irreversible: ${item.name}.`),
      writeContext.chapterMission.hookTarget
        ? `Preserve or strengthen the ending tension: ${writeContext.chapterMission.hookTarget}`
        : "",
      ...writeContext.characterBehaviorGuides
        .filter((guide) => guide.shouldPreferAppearance || guide.isCoreInVolume)
        .slice(0, 4)
        .map((guide) => `Keep ${guide.name} aligned with current role duty: ${guide.volumeResponsibility ?? guide.volumeRoleLabel ?? guide.role}`),
      writeContext.pendingCandidateGuards.length > 0
        ? "Pending character candidates remain read-only unless they are confirmed outside the repair flow."
        : "",
      ...(writeContext.protectedSecrets ?? []).map((item) => `do not disclose: ${item}`),
      ...(writeContext.chapterBoundary?.doNotCross ?? []).map((item) => `do not cross boundary: ${item}`),
      ...writeContext.chapterMission.mustPreserve.map((item) => `must preserve: ${item}`),
    ], 12),
  };
}

export function sanitizeWriterContextBlocks(blocks: PromptContextBlock[]): {
  allowedBlocks: PromptContextBlock[];
  removedBlockIds: string[];
} {
  const forbidden = new Set<string>(WRITER_FORBIDDEN_GROUPS);
  const removedBlockIds = blocks
    .filter((block) => forbidden.has(block.group))
    .map((block) => block.id);
  return {
    allowedBlocks: blocks.filter((block) => !forbidden.has(block.group)),
    removedBlockIds,
  };
}

// ---------------------------------------------------------------------------
// Re-export: selectCharacterHardFactsForWriter (used by buildChapterWriteContext above)
// ---------------------------------------------------------------------------

import type { ChapterWriteContext as _CWC } from "@ai-novel/shared/types/chapterRuntime";

function selectCharacterHardFactsForWriter(input: {
  hardFacts: _CWC["characterHardFacts"];
  participants: _CWC["participants"];
  characterBehaviorGuides: _CWC["characterBehaviorGuides"];
  currentChapterOrder: number;
}): _CWC["characterHardFacts"] {
  const selectedIds = new Set(input.participants.map((character) => character.id));
  for (const guide of input.characterBehaviorGuides) {
    if (
      guide.shouldPreferAppearance
      || guide.plannedChapterOrders.includes(input.currentChapterOrder)
      || guide.absenceRisk === "high"
      || guide.absenceRisk === "warn"
      || guide.relationStageLabels.length > 0
    ) {
      selectedIds.add(guide.characterId);
    }
  }
  const selected = input.hardFacts.filter((fact) => selectedIds.has(fact.characterId));
  return selected.length > 0 ? selected.slice(0, 8) : input.hardFacts.slice(0, 4);
}
