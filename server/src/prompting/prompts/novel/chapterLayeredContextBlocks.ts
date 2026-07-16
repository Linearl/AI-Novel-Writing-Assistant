/**
 * chapterLayeredContextBlocks.ts
 *
 * Block-building functions for chapter writer context assembly.
 * Imports utilities and types from chapterLayeredContextHelpers / chapterLayeredContextTypes.
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
  resolveTargetWordRange,
} from "./chapterLayeredContextHelpers";
import {
  normalizeChapterWriteContext,
  selectCharacterHardFactsForWriter,
} from "./chapterLayeredContextHelpers";
import { timelinePromptAdapter } from "../../../modules/timeline/timeline-prompt-adapter";
import type { ChapterWriterBlockMode, ChapterWriterBlockOptions } from "./chapterLayeredContextTypes";

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

// Re-export from helpers (single definition source)
export { selectCharacterHardFactsForWriter } from "./chapterLayeredContextHelpers";

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
        `资源账本汇总: ${context.summary}`,
    toListBlock("可用资源", context.availableItems.slice(0, 6).map(buildResourceItemLine)),
    toListBlock("使用前需初始化", context.setupNeededItems.slice(0, 5).map(buildResourceItemLine)),
    toListBlock("不可用或风险复用", context.blockedItems.slice(0, 5).map(buildResourceItemLine)),
    toListBlock("待确认", context.pendingReviewItems.slice(0, 4).map(buildResourceItemLine)),
    toListBlock("资源风险信号", context.riskSignals.slice(0, 5).map((item) => `${item.severity}: ${item.summary}`)),
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
      ? `上一轮摘要: ${incrementalContext.previousRoundSummary.trim()}`
      : "",
    incrementalContext.currentSceneProgress?.trim()
      ? `当前场景进度: ${incrementalContext.currentSceneProgress.trim()}`
      : "",
    incrementalContext.roundInstruction?.trim()
      ? `当前轮次指令: ${incrementalContext.roundInstruction.trim()}`
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
  const includePayoffDirectives = writeContext.payoffDirectives.length > 0 || mode === "review";
  const includeTimelineContext = Boolean(writeContext.timelineContext) || mode === "review";
  const hasObligationContract = Object.values(writeContext.obligationContract).some((items) => items.length > 0);
  const includeCharacterResources = !isIncremental && hasCharacterResourcePressure(writeContext);
  const includeCharacterDynamics = mode === "review" || shouldIncludeCharacterDynamics(writeContext, mode);
  const includeOpenConflicts = !isIncremental && writeContext.openConflictSummaries.length > 0;
  const includeRecentChapters = (mode === "full" || mode === "review") && writeContext.recentChapterSummaries.length > 0;
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
        `章节任务: ${writeContext.chapterMission.title}`,
        `任务目标: ${writeContext.chapterMission.objective}`,
        `期望产出: ${writeContext.chapterMission.expectation}`,
        `状态驱动的下一步: ${writeContext.nextAction}`,
        writeContext.chapterMission.planRole ? `计划角色: ${writeContext.chapterMission.planRole}` : "",
        wordRange.targetWordCount != null
          ? `目标字数: 约 ${wordRange.targetWordCount} 字（可接受范围 ${wordRange.minWordCount}-${wordRange.maxWordCount} 字；不得明显低于下限）`
          : "",
        writeContext.completedMilestones.length > 0
          ? toListBlock("已完成——不得重复追求或触发", writeContext.completedMilestones)
          : "",
        toListBlock("必须推进", writeContext.chapterMission.mustAdvance),
        toListBlock("必须保留", writeContext.chapterMission.mustPreserve),
        toListBlock("风险备注", writeContext.chapterMission.riskNotes),
        writeContext.chapterMission.taskSheet
          ? `原始任务单:\n${writeContext.chapterMission.taskSheet}`
          : "",
        writeContext.chapterMission.hookTarget ? `结尾钩子: ${writeContext.chapterMission.hookTarget}` : "",
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
          "章节执行义务:",
          toListBlock("必须立即兑现", writeContext.obligationContract.mustHitNow),
          toListBlock("必须保留", writeContext.obligationContract.mustPreserve),
          toListBlock("伏笔兑现要求", writeContext.obligationContract.requiredPayoffTouches),
          toListBlock("要求角色出场", writeContext.obligationContract.requiredCharacterAppearances),
          toListBlock("要求目标变化", writeContext.obligationContract.requiredGoalChanges),
          toListBlock("可延后", writeContext.obligationContract.canDefer),
          toListBlock("禁止越界", writeContext.obligationContract.forbiddenCrossings),
        ].filter(Boolean).join("\n"),
      })
      : null,
    includeTimelineContext
      ? writeContext.timelineContext
        ? createContextBlock({
          id: "timeline_context",
          group: "timeline_context",
          priority: 100,
          required: true,
          allowSummary: false,
          content: timelinePromptAdapter.toPromptBlock(writeContext.timelineContext),
        })
        : createContextBlock({
          id: "timeline_context",
          group: "timeline_context",
          priority: 100,
          required: true,
          allowSummary: false,
          content: "【时间线约束】\n当前没有已登记的时间线资产；不得提前发生后续章节事件，必须严格服从本章任务和上一章实际状态。",
        })
      : null,
    includeTimelineContext
      ? writeContext.timelineContext
        ? createContextBlock({
          id: "previous_chapter_hook",
          group: "previous_chapter_hook",
          priority: 100,
          required: true,
          allowSummary: false,
          content: timelinePromptAdapter.toPreviousHookBlock(writeContext.timelineContext),
        })
        : createContextBlock({
          id: "previous_chapter_hook",
          group: "previous_chapter_hook",
          priority: 100,
          required: true,
          allowSummary: false,
          content: "【上一章必须承接的钩子】\n- 无已登记钩子；如章节任务或最近状态包含上一章悬念，必须优先承接。",
        })
      : null,
    includePayoffDirectives
      ? writeContext.payoffDirectives.length > 0
        ? createContextBlock({
          id: "payoff_directives",
          group: "payoff_directives",
          priority: 98,
          required: true,
          allowSummary: false,
          content: [
            "伏笔兑现指令:",
            ...writeContext.payoffDirectives.map((item) => [
              `- ${item.title} [${item.operation}]`,
              item.ledgerKey ? `ledger=${item.ledgerKey}` : "",
              item.reason ? `reason=${item.reason}` : "",
              item.forbiddenReveal ? `forbiddenReveal=${item.forbiddenReveal}` : "",
            ].filter(Boolean).join(" | ")),
          ].join("\n"),
        })
        : createContextBlock({
          id: "payoff_directives",
          group: "payoff_directives",
          priority: 98,
          required: true,
          allowSummary: false,
          content: "【伏笔兑现指令】\n当前没有已登记的伏笔兑现指令；审校时请检查是否有未兑现的伏笔需要关注。",
        })
      : null,
    createContextBlock({
      id: "state_goal",
      group: "state_goal",
      priority: 97,
      required: Boolean(writeContext.chapterStateGoal),
      content: writeContext.chapterStateGoal
        ? [
             `状态目标: ${writeContext.chapterStateGoal.summary}`,
             toListBlock("目标冲突", writeContext.chapterStateGoal.targetConflicts),
             toListBlock("目标关系", writeContext.chapterStateGoal.targetRelationships),
             toListBlock("受保护秘密", writeContext.protectedSecrets),
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
              `当前卷: ${writeContext.volumeWindow.title}`,
              `卷任务: ${writeContext.volumeWindow.missionSummary}`,
              toListBlock("当前卷待兑现伏笔", writeContext.volumeWindow.pendingPayoffs.slice(0, 3)),
              writeContext.volumeWindow.keyMilestoneGuards.length > 0
                ? toListBlock(
                  "卷关键里程碑守卫——节奏约束",
                  writeContext.volumeWindow.keyMilestoneGuards
                    .filter((guard) => guard.status !== "done")
                    .map((guard) => `[${guard.targetChapterRange}] ${guard.event}: ${guard.note}`),
                )
                : "",
            ].filter(Boolean).join("\n")
          : "当前卷: 无",
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
            ? `伏笔账本汇总: 待兑现=${writeContext.ledgerSummary.pendingCount}, 紧急=${writeContext.ledgerSummary.urgentCount}, 超期=${writeContext.ledgerSummary.overdueCount}`
            : "伏笔账本汇总: 无",
          toListBlock("紧急伏笔", writeContext.ledgerUrgentItems.map((item) => buildLedgerItemLine(item, "urgent"))),
          toListBlock("超期伏笔", writeContext.ledgerOverdueItems.map((item) => buildLedgerItemLine(item, "overdue"))),
          toListBlock(
            "活跃待兑现伏笔",
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
      ? (() => {
        const dynamicsContent = [
          buildCharacterGuidanceText(writeContext),
          buildRelationStageText(writeContext),
          buildPendingCandidateGuardText(writeContext),
        ].filter(Boolean).join("\n\n");
        return createContextBlock({
          id: "character_dynamics",
          group: "character_dynamics",
          priority: 91,
          content: dynamicsContent.length > 0
            ? dynamicsContent
            : "【角色动态】\n当前没有已登记的角色行为指南或关系阶段变化；审校时请关注角色行为是否与此前设定一致。",
        });
      })()
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
      content: `写作前本地状态:\n${writeContext.localStateSummary}`,
    }),
    includeOpenConflicts
      ? createContextBlock({
        id: "open_conflicts",
        group: "open_conflicts",
        priority: 88,
        content: toListBlock("开放冲突", writeContext.openConflictSummaries.slice(0, 6)),
      })
      : null,
    includeRecentChapters
      ? createContextBlock({
        id: "recent_chapters",
        group: "recent_chapters",
        priority: 86,
        content: toListBlock("最近章节摘要", writeContext.recentChapterSummaries),
      })
      : null,
    mode === "full"
      ? createContextBlock({
        id: "opening_constraints",
        group: "opening_constraints",
        priority: 80,
        content: [
          `开头反重复提示:\n${writeContext.openingAntiRepeatHint}`,
          writeContext.recentScenePatterns.length > 0
            ? toListBlock(
              "场景模式黑名单——不得重复以下时间+地点+动作组合",
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
        content: toListBlock("续写约束", writeContext.continuationConstraints),
      })
      : null,
  ];
  return blocks.filter((block): block is PromptContextBlock => block !== null && block.content.trim().length > 0);
}
