/**
 * chapterLayeredContextBlocks.ts
 *
 * Block-building functions and character helpers extracted from chapterLayeredContext.ts.
 * Pure extraction — no functional changes.
 */

import type {
  ChapterWriteContext,
} from "@ai-novel/shared";
import { createContextBlock } from "../../core/contextBudget";
import type { PromptContextBlock } from "../../core/promptTypes";
import { buildWriterStyleContractText } from "../../../services/styleEngine/styleContractText";
import {
  buildCharacterGuidanceText,
  buildParticipantText,
  buildLedgerItemLine,
  buildPendingCandidateGuardText,
  buildRelationStageText,
  toListBlock,
} from "./chapterLayeredContextShared";
import {
  normalizeChapterWriteContext,
  type ChapterWriterBlockMode,
  type ChapterWriterBlockOptions,
} from "./chapterLayeredContextHelpers";
import { resolveTargetWordRange } from "./chapterLayeredContextShared";
import { timelinePromptAdapter } from "../../../modules/timeline/timeline-prompt-adapter";

// ---------------------------------------------------------------------------
// Pressure helpers
// ---------------------------------------------------------------------------

function hasLedgerPressure(writeContext: ChapterWriteContext): boolean {
  return writeContext.ledgerUrgentItems.length > 0
    || writeContext.ledgerOverdueItems.length > 0
    || writeContext.ledgerPendingItems.length > 0;
}

function hasCharacterResourcePressure(writeContext: ChapterWriteContext): boolean {
  const context = writeContext.characterResourceContext;
  if (!context) {
    return false;
  }
  return context.availableItems.length > 0
    || context.setupNeededItems.length > 0
    || context.blockedItems.length > 0
    || context.pendingReviewItems.length > 0
    || context.riskSignals.length > 0;
}

// ---------------------------------------------------------------------------
// Character helpers
// ---------------------------------------------------------------------------

export function selectCharacterHardFactsForWriter(input: {
  hardFacts: ChapterWriteContext["characterHardFacts"];
  participants: ChapterWriteContext["participants"];
  characterBehaviorGuides: ChapterWriteContext["characterBehaviorGuides"];
  currentChapterOrder: number;
}): ChapterWriteContext["characterHardFacts"] {
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

function buildCharacterHardFactsText(writeContext: ChapterWriteContext): string {
  const hardFacts = writeContext.characterHardFacts ?? [];
  if (hardFacts.length === 0) {
    return [
      "【角色硬事实】",
      "当前没有已登记的角色硬事实；不得凭空改写角色阵营、身份、境界、所在地或行动可用性。",
      "如章节任务没有明确要求，不要新增不可逆角色状态。",
    ].join("\n");
  }

  return [
    "【角色硬事实】",
    "以下内容是正文生成前的不可违背写作约束，优先级高于软性人物简介。",
    ...hardFacts.slice(0, 8).map((fact) => {
      const parts = [
        fact.role ? `角色定位=${fact.role}` : "",
        fact.identityLabel ? `身份=${fact.identityLabel}` : "",
        fact.factionLabel ? `阵营=${fact.factionLabel}` : "",
        fact.stanceLabel ? `立场=${fact.stanceLabel}` : "",
        fact.powerLevel ? `战力=${fact.powerLevel}` : "",
        fact.realm ? `境界=${fact.realm}` : "",
        fact.currentLocation ? `当前位置=${fact.currentLocation}` : "",
        fact.availability ? `可出场状态=${fact.availability}` : "",
        fact.currentState ? `当前状态=${fact.currentState}` : "",
        fact.currentGoal ? `当前目标=${fact.currentGoal}` : "",
        fact.prohibitions.length > 0 ? `禁止误写=${fact.prohibitions.join(" / ")}` : "",
      ].filter(Boolean);
      const uniqueParts = Array.from(new Set(parts));
      return `- ${fact.name}: ${uniqueParts.slice(0, 12).join(" | ")}`;
    }),
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Resource helpers
// ---------------------------------------------------------------------------

function buildResourceItemLine(item: NonNullable<ChapterWriteContext["characterResourceContext"]>["availableItems"][number]): string {
  const holder = item.holderCharacterName ? `holder=${item.holderCharacterName}` : "holder=unknown";
  const window = item.expectedUseStartChapterOrder || item.expectedUseEndChapterOrder
    ? `window=${item.expectedUseStartChapterOrder ?? "?"}-${item.expectedUseEndChapterOrder ?? "?"}`
    : "";
  const constraints = item.constraints.length > 0 ? `constraints=${item.constraints.slice(0, 2).join(" / ")}` : "";
  return `${item.name} [${item.status}; ${holder}; ${item.narrativeFunction}] ${item.summary}${window ? ` | ${window}` : ""}${constraints ? ` | ${constraints}` : ""}`;
}

function buildCharacterResourceContextBlock(writeContext: ChapterWriteContext): string {
  const context = writeContext.characterResourceContext;
  if (!context) {
    return "";
  }
  return [
    `Resource ledger summary: ${context.summary}`,
    toListBlock("Available resources", context.availableItems.slice(0, 6).map(buildResourceItemLine)),
    toListBlock("Needs setup before use", context.setupNeededItems.slice(0, 5).map(buildResourceItemLine)),
    toListBlock("Unavailable or risky to reuse", context.blockedItems.slice(0, 5).map(buildResourceItemLine)),
    toListBlock("Pending confirmation", context.pendingReviewItems.slice(0, 4).map(buildResourceItemLine)),
    toListBlock("Resource risk signals", context.riskSignals.slice(0, 5).map((item) => `${item.severity}: ${item.summary}`)),
  ].filter(Boolean).join("\n");
}

// ---------------------------------------------------------------------------
// Dynamics & incremental
// ---------------------------------------------------------------------------

function shouldIncludeCharacterDynamics(
  writeContext: ChapterWriteContext,
  mode: ChapterWriterBlockMode,
): boolean {
  if (mode === "incremental") {
    return writeContext.activeRelationStages.length > 0
      || writeContext.pendingCandidateGuards.length > 0;
  }
  if (mode === "repair") {
    return writeContext.characterBehaviorGuides.length > 0 || writeContext.activeRelationStages.length > 0;
  }
  return writeContext.characterBehaviorGuides.length > 0
    || writeContext.activeRelationStages.length > 0
    || writeContext.pendingCandidateGuards.length > 0;
}

function buildIncrementalRoundContextBlock(
  incrementalContext: ChapterWriterBlockOptions["incrementalContext"],
): PromptContextBlock | null {
  if (!incrementalContext) {
    return null;
  }
  const content = [
    incrementalContext.previousRoundSummary?.trim()
      ? `Previous round summary: ${incrementalContext.previousRoundSummary.trim()}`
      : "",
    incrementalContext.currentSceneProgress?.trim()
      ? `Current scene progress: ${incrementalContext.currentSceneProgress.trim()}`
      : "",
    incrementalContext.roundInstruction?.trim()
      ? `Current round instruction: ${incrementalContext.roundInstruction.trim()}`
      : "",
  ].filter(Boolean).join("\n");
  if (!content) {
    return null;
  }
  return createContextBlock({
    id: "incremental_round_context",
    group: "incremental_round_context",
    priority: 99,
    required: true,
    content,
  });
}

// ---------------------------------------------------------------------------
// Main block builder
// ---------------------------------------------------------------------------

export function buildChapterWriterContextBlocks(
  writeContext: ChapterWriteContext,
  options: ChapterWriterBlockOptions = {},
): PromptContextBlock[] {
  writeContext = normalizeChapterWriteContext(writeContext);
  const mode = options.mode ?? "full";
  const isIncremental = mode === "incremental";
  const includeVolumeWindow = mode === "full" || mode === "review";
  const includePayoffLedger = mode === "full" && hasLedgerPressure(writeContext);
  const includePayoffDirectives = writeContext.payoffDirectives.length > 0;
  const includeTimelineContext = Boolean(writeContext.timelineContext);
  const hasObligationContract = Object.values(writeContext.obligationContract).some((items) => items.length > 0);
  const includeCharacterResources = !isIncremental && hasCharacterResourcePressure(writeContext);
  const includeCharacterDynamics = shouldIncludeCharacterDynamics(writeContext, mode);
  const includeOpenConflicts = !isIncremental && writeContext.openConflictSummaries.length > 0;
  const includeRecentChapters = mode === "full" && writeContext.recentChapterSummaries.length > 0;
  const includeStyleContract = mode !== "incremental" && Boolean(writeContext.styleContract);
  const includeContinuationConstraints = mode === "full" && writeContext.continuationConstraints.length > 0;
  const wordRange = resolveTargetWordRange(writeContext.chapterMission.targetWordCount);
  const blocks: Array<PromptContextBlock | null> = [
    createContextBlock({
      id: "chapter_mission",
      group: "chapter_mission",
      priority: 100,
      required: true,
      content: [
        `Chapter mission: ${writeContext.chapterMission.title}`,
        `Objective: ${writeContext.chapterMission.objective}`,
        `Expectation: ${writeContext.chapterMission.expectation}`,
        `State-driven next action: ${writeContext.nextAction}`,
        writeContext.chapterMission.planRole ? `Plan role: ${writeContext.chapterMission.planRole}` : "",
        wordRange.targetWordCount != null
          ? `Target length: around ${wordRange.targetWordCount} Chinese characters (acceptable range ${wordRange.minWordCount}-${wordRange.maxWordCount}; do not end clearly below the minimum).`
          : "",
        writeContext.completedMilestones.length > 0
          ? toListBlock("Already completed — do NOT re-pursue or re-trigger", writeContext.completedMilestones)
          : "",
        toListBlock("Must advance", writeContext.chapterMission.mustAdvance),
        toListBlock("Must preserve", writeContext.chapterMission.mustPreserve),
        toListBlock("Risk notes", writeContext.chapterMission.riskNotes),
        writeContext.chapterMission.taskSheet
          ? `Original task sheet:\n${writeContext.chapterMission.taskSheet}`
          : "",
        writeContext.chapterMission.hookTarget ? `Ending hook: ${writeContext.chapterMission.hookTarget}` : "",
      ].filter(Boolean).join("\n"),
    }),
    writeContext.previousChapterTail
      ? createContextBlock({
        id: "previous_chapter_tail",
        group: "previous_chapter_tail",
        priority: 100,
        required: true,
        allowSummary: false,
        content: [
          "上一章实际尾段（本章开头必须直接承接这里的时间、地点、人物状态和未兑现动作）：",
          writeContext.previousChapterTail,
        ].join("\n"),
      })
      : null,
    hasObligationContract
      ? createContextBlock({
        id: "obligation_contract",
        group: "obligation_contract",
        priority: 99,
        required: true,
        allowSummary: false,
        content: [
          "Chapter execution obligations:",
          toListBlock("Must hit now", writeContext.obligationContract.mustHitNow),
          toListBlock("Must preserve", writeContext.obligationContract.mustPreserve),
          toListBlock("Required payoff touches", writeContext.obligationContract.requiredPayoffTouches),
          toListBlock("Required character appearances", writeContext.obligationContract.requiredCharacterAppearances),
          toListBlock("Required goal changes", writeContext.obligationContract.requiredGoalChanges),
          toListBlock("Can defer", writeContext.obligationContract.canDefer),
          toListBlock("Forbidden crossings", writeContext.obligationContract.forbiddenCrossings),
        ].filter(Boolean).join("\n"),
      })
      : null,
    includeTimelineContext
      ? createContextBlock({
        id: "timeline_context",
        group: "timeline_context",
        priority: 100,
        required: true,
        allowSummary: false,
        content: timelinePromptAdapter.toPromptBlock(writeContext.timelineContext!),
      })
      : createContextBlock({
        id: "timeline_context",
        group: "timeline_context",
        priority: 100,
        required: true,
        allowSummary: false,
        content: "【时间线约束】\n当前没有已登记的时间线资产；不得提前发生后续章节事件，必须严格服从本章任务和上一章实际状态。",
      }),
    includeTimelineContext
      ? createContextBlock({
        id: "previous_chapter_hook",
        group: "previous_chapter_hook",
        priority: 100,
        required: true,
        allowSummary: false,
        content: timelinePromptAdapter.toPreviousHookBlock(writeContext.timelineContext!),
      })
      : createContextBlock({
        id: "previous_chapter_hook",
        group: "previous_chapter_hook",
        priority: 100,
        required: true,
        allowSummary: false,
        content: "【上一章必须承接的钩子】\n- 无已登记钩子；如章节任务或最近状态包含上一章悬念，必须优先承接。",
      }),
    includePayoffDirectives
      ? createContextBlock({
        id: "payoff_directives",
        group: "payoff_directives",
        priority: 98,
        required: true,
        allowSummary: false,
        content: [
          "Payoff directives:",
          ...writeContext.payoffDirectives.map((item) => [
            `- ${item.title} [${item.operation}]`,
            item.ledgerKey ? `ledger=${item.ledgerKey}` : "",
            item.reason ? `reason=${item.reason}` : "",
            item.forbiddenReveal ? `forbiddenReveal=${item.forbiddenReveal}` : "",
          ].filter(Boolean).join(" | ")),
        ].join("\n"),
      })
      : null,
    createContextBlock({
      id: "state_goal",
      group: "state_goal",
      priority: 97,
      required: Boolean(writeContext.chapterStateGoal),
      content: writeContext.chapterStateGoal
        ? [
             `State goal: ${writeContext.chapterStateGoal.summary}`,
             toListBlock("Target conflicts", writeContext.chapterStateGoal.targetConflicts),
             toListBlock("Target relationships", writeContext.chapterStateGoal.targetRelationships),
             toListBlock("Protected secrets", writeContext.protectedSecrets),
           ].filter(Boolean).join("\n")
        : "",
    }),
    buildIncrementalRoundContextBlock(options.incrementalContext),
    includeVolumeWindow
      ? createContextBlock({
        id: "volume_window",
        group: "volume_window",
        priority: 96,
        content: writeContext.volumeWindow
          ? [
              `Current volume: ${writeContext.volumeWindow.title}`,
              `Volume mission: ${writeContext.volumeWindow.missionSummary}`,
              toListBlock("Current volume pending payoffs", writeContext.volumeWindow.pendingPayoffs.slice(0, 3)),
              writeContext.volumeWindow.keyMilestoneGuards.length > 0
                ? toListBlock(
                  "Volume key milestone guards — pacing constraints",
                  writeContext.volumeWindow.keyMilestoneGuards
                    .filter((guard) => guard.status !== "done")
                    .map((guard) => `[${guard.targetChapterRange}] ${guard.event}: ${guard.note}`),
                )
                : "",
            ].filter(Boolean).join("\n")
          : "Current volume: none",
      })
      : null,
    writeContext.narrativeProgressHint
      ? createContextBlock({
        id: "narrative_progress_hint",
        group: "narrative_progress_hint",
        priority: 98,
        required: false,
        content: writeContext.narrativeProgressHint,
      })
      : null,
    includePayoffLedger
      ? createContextBlock({
        id: "payoff_ledger",
        group: "payoff_ledger",
        priority: 95,
        content: [
          writeContext.ledgerSummary
            ? `Payoff ledger summary: pending=${writeContext.ledgerSummary.pendingCount}, urgent=${writeContext.ledgerSummary.urgentCount}, overdue=${writeContext.ledgerSummary.overdueCount}`
            : "Payoff ledger summary: none",
          toListBlock("Urgent payoffs", writeContext.ledgerUrgentItems.map((item) => buildLedgerItemLine(item, "urgent"))),
          toListBlock("Overdue payoffs", writeContext.ledgerOverdueItems.map((item) => buildLedgerItemLine(item, "overdue"))),
          toListBlock(
            "Active pending payoffs",
            writeContext.ledgerPendingItems.slice(0, 3).map((item) => buildLedgerItemLine(item, "pending")),
          ),
        ].join("\n"),
      })
      : null,
    createContextBlock({
      id: "character_hard_facts",
      group: "character_hard_facts",
      priority: 99,
      required: true,
      allowSummary: false,
      content: buildCharacterHardFactsText(writeContext),
    }),
    createContextBlock({
      id: "participant_subset",
      group: "participant_subset",
      priority: 92,
      required: true,
      content: buildParticipantText(writeContext),
    }),
    includeCharacterDynamics
      ? createContextBlock({
        id: "character_dynamics",
        group: "character_dynamics",
        priority: 91,
        content: [
          buildCharacterGuidanceText(writeContext),
          buildRelationStageText(writeContext),
          buildPendingCandidateGuardText(writeContext),
        ].join("\n\n"),
      })
      : null,
    includeCharacterResources
      ? createContextBlock({
        id: "character_resource_context",
        group: "character_resource_context",
        priority: 90,
        required: mode === "review" || mode === "repair",
        content: buildCharacterResourceContextBlock(writeContext),
      })
      : null,
    createContextBlock({
      id: "local_state",
      group: "local_state",
      priority: 89,
      required: true,
      content: `Local state before writing:\n${writeContext.localStateSummary}`,
    }),
    includeOpenConflicts
      ? createContextBlock({
        id: "open_conflicts",
        group: "open_conflicts",
        priority: 88,
        content: toListBlock("Open conflicts", writeContext.openConflictSummaries.slice(0, 6)),
      })
      : null,
    includeRecentChapters
      ? createContextBlock({
        id: "recent_chapters",
        group: "recent_chapters",
        priority: 86,
        content: toListBlock("Recent chapter summaries", writeContext.recentChapterSummaries),
      })
      : null,
    mode === "full"
      ? createContextBlock({
        id: "opening_constraints",
        group: "opening_constraints",
        priority: 80,
        content: [
          `Opening anti-repeat hint:\n${writeContext.openingAntiRepeatHint}`,
          writeContext.recentScenePatterns.length > 0
            ? toListBlock(
              "Scene pattern blacklist — do NOT repeat these exact time+location+action combinations",
              writeContext.recentScenePatterns.slice(0, 6),
            )
            : "",
        ].filter(Boolean).join("\n\n"),
      })
      : null,
    includeStyleContract
      ? createContextBlock({
        id: "style_contract",
        group: "style_contract",
        priority: 74,
        required: mode === "full",
        content: buildWriterStyleContractText(writeContext.styleContract),
      })
      : null,
    includeContinuationConstraints
      ? createContextBlock({
        id: "continuation_constraints",
        group: "continuation_constraints",
        priority: 72,
        content: toListBlock("Continuation constraints", writeContext.continuationConstraints),
      })
      : null,
  ];
  return blocks.filter((block): block is PromptContextBlock => block !== null && block.content.trim().length > 0);
}
