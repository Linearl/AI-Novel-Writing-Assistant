/**
 * chapterLayeredContextHelpers.ts
 *
 * Unified context-building module — merged from:
 *   - chapterLayeredContextHelpers.ts  (context builders, normalization)
 *   - chapterLayeredContextCharacters.ts (character dynamics & participant selection)
 *   - chapterLayeredContextShared.ts     (shared text utilities, summaries)
 *
 * Types and constants live in chapterLayeredContextTypes.ts.
 */

import type {
  BookContractContext,
  ChapterRepairContext,
  ChapterReviewContext,
  ChapterWriteContext,
  GenerationContextPackage,
  MacroConstraintContext,
  VolumeWindowContext,
} from "@ai-novel/shared";
import {
  parseChapterScenePlan,
  resolveLengthBudgetContract,
} from "@ai-novel/shared";
import { sanitizeCreativeMustAdvanceItems } from "@ai-novel/shared";
import type { ReviewIssue } from "@ai-novel/shared";
import type { StoryMacroPlan } from "@ai-novel/shared";
import type { PromptContextBlock } from "../../core/promptTypes";
import { buildPlannerStyleContractSummaryText } from "../../../services/styleEngine/styleContractText";

import {
  WRITER_FORBIDDEN_GROUPS,
  EMPTY_OBLIGATION_CONTRACT,
  type ChapterWriterBlockOptions,
  type RuntimeVolumeSeed,
  type CharacterDynamicsOverview,
} from "./chapterLayeredContextTypes";

// ---------------------------------------------------------------------------
// Re-exports from types
// ---------------------------------------------------------------------------

export {
  WRITER_FORBIDDEN_GROUPS,
  EMPTY_OBLIGATION_CONTRACT,
  type ChapterWriterBlockMode,
  type ChapterWriterBlockOptions,
  type RuntimeVolumeSeed,
  type CharacterDynamicsOverview,
} from "./chapterLayeredContextTypes";

// =========================================================================
// SHARED TEXT UTILITIES (from chapterLayeredContextShared.ts)
// =========================================================================

export function compactText(value: string | null | undefined, fallback = ""): string {
  return value?.replace(/\s+/g, " ").trim() || fallback;
}

export function takeUnique(items: Array<string | null | undefined>, limit = items.length): string[] {
  const seen = new Set<string>();
  const results: string[] = [];
  for (const item of items) {
    const normalized = compactText(item);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    results.push(normalized);
    if (results.length >= limit) {
      break;
    }
  }
  return results;
}

export function splitLines(value: string | null | undefined, limit = 4): string[] {
  return takeUnique(
    (value ?? "")
      .split(/\r?\n+/g)
      .map((line) => line.replace(/^[-*\d.\s]+/, "").trim()),
    limit,
  );
}

export function toListBlock(title: string, values: string[], emptyLabel = "无"): string {
  if (values.length === 0) {
    return `${title}: ${emptyLabel}`;
  }
  return [title, ...values.map((value) => `- ${value}`)].join("\n");
}

export function resolveTargetWordRange(targetWordCount: number | null | undefined): {
  targetWordCount: number | null;
  minWordCount: number | null;
  maxWordCount: number | null;
} {
  const budget = resolveLengthBudgetContract(targetWordCount);
  if (!budget) {
    return {
      targetWordCount: null,
      minWordCount: null,
      maxWordCount: null,
    };
  }
  return {
    targetWordCount: budget.targetWordCount,
    minWordCount: budget.softMinWordCount,
    maxWordCount: budget.softMaxWordCount,
  };
}

function formatLedgerWindow(start?: number | null, end?: number | null): string {
  if (typeof start === "number" && typeof end === "number") {
    return `目标窗口=${start}-${end}`;
  }
  if (typeof end === "number") {
    return `目标窗口截止第${end}章`;
  }
  if (typeof start === "number") {
    return `目标窗口起于第${start}章`;
  }
  return "";
}

export function buildLedgerItemLine(
  item: GenerationContextPackage["ledgerPendingItems"][number],
  label: string,
): string {
  return takeUnique([
    `${label}: ${item.title}`,
    item.summary,
    formatLedgerWindow(item.targetStartChapterOrder, item.targetEndChapterOrder),
    item.statusReason ?? "",
  ], 4).join(" | ");
}

type ParticipantCharacter = ChapterWriteContext["participants"][number];

function getCharacterTier(character: ParticipantCharacter): string {
  return (character as { tier?: string | null }).tier ?? "named";
}

export function buildParticipantText(writeContext: ChapterWriteContext): string {
  if (writeContext.participants.length === 0) {
    return "参与角色：无";
  }
  const guideByCharacterId = new Map(
    writeContext.characterBehaviorGuides.map((guide) => [guide.characterId, guide]),
  );
  return [
    "参与角色：",
    ...writeContext.participants.map((character) => {
      const guide = guideByCharacterId.get(character.id);
      const tier = getCharacterTier(character);

      if (tier === "extra") {
        const parts = takeUnique([
          character.role,
          guide?.volumeRoleLabel ? `volume role=${guide.volumeRoleLabel}` : "",
        ].filter(Boolean), 2);
        return `- ${character.name}: ${parts.join(" | ")}`;
      }

      if (tier === "named") {
        const visibleProfile = takeUnique([
          character.appearance || character.physique
            ? `look=${compactText([character.appearance, character.physique].filter(Boolean).join("；"))}`
            : "",
          character.signatureDetail ? `signature=${compactText(character.signatureDetail)}` : "",
          character.voiceTexture ? `voice=${compactText(character.voiceTexture)}` : "",
        ], 3).join(" | ");
        const parts = takeUnique([
          character.role,
          visibleProfile,
          guide?.volumeRoleLabel ? `volume role=${guide.volumeRoleLabel}` : "",
          character.personality,
          character.currentState ? `state=${character.currentState}` : "",
          character.currentGoal ? `goal=${character.currentGoal}` : "",
        ], 4);
        return `- ${character.name}: ${parts.join(" | ")}`;
      }

      // lead / major: full profile
      const visibleProfile = takeUnique([
        character.appearance || character.physique
          ? `look=${compactText([character.appearance, character.physique].filter(Boolean).join("；"))}`
          : "",
        character.signatureDetail ? `signature=${compactText(character.signatureDetail)}` : "",
        character.voiceTexture ? `voice=${compactText(character.voiceTexture)}` : "",
      ], 3).join(" | ");
      const parts = takeUnique([
        character.role,
        visibleProfile,
        guide?.volumeRoleLabel ? `volume role=${guide.volumeRoleLabel}` : "",
        guide?.volumeResponsibility ? `volume duty=${guide.volumeResponsibility}` : "",
        character.personality,
        character.currentState ? `state=${character.currentState}` : "",
        character.currentGoal ? `goal=${character.currentGoal}` : "",
        guide?.relationStageLabels.length ? `relation=${guide.relationStageLabels.join(" / ")}` : "",
        guide?.absenceRisk && guide.absenceRisk !== "none"
          ? `absence risk=${guide.absenceRisk}(span=${guide.absenceSpan})`
          : "",
      ], 4);
      return `- ${character.name}: ${parts.join(" | ")}`;
    }),
  ].join("\n");
}

export function buildCharacterGuidanceText(writeContext: ChapterWriteContext): string {
  if (writeContext.characterBehaviorGuides.length === 0) {
    return "角色行为引导：无";
  }
  return [
    "角色行为引导：",
    ...writeContext.characterBehaviorGuides.map((guide) => {
      const parts = takeUnique([
        guide.isCoreInVolume ? "core in current volume" : "supporting in current volume",
        guide.visibleProfileSummary ? `visible=${guide.visibleProfileSummary}` : "",
        guide.volumeRoleLabel ? `volume role=${guide.volumeRoleLabel}` : "",
        guide.volumeResponsibility ? `duty=${guide.volumeResponsibility}` : "",
        guide.currentGoal ? `goal=${guide.currentGoal}` : "",
        guide.currentState ? `state=${guide.currentState}` : "",
        guide.relationStageLabels.length ? `relation=${guide.relationStageLabels.join(" / ")}` : "",
        guide.absenceRisk !== "none" ? `absence=${guide.absenceRisk}(span=${guide.absenceSpan})` : "",
        guide.factionLabel ? `faction=${guide.factionLabel}` : "",
        guide.stanceLabel ? `stance=${guide.stanceLabel}` : "",
        guide.shouldPreferAppearance ? "prefer appearance in this chapter" : "",
      ], 6);
      return `- ${guide.name}: ${parts.join(" | ")}`;
    }),
  ].join("\n");
}

export function buildRelationStageText(writeContext: ChapterWriteContext): string {
  if (writeContext.activeRelationStages.length === 0) {
    return "活跃关系阶段：无";
  }
  return [
    "活跃关系阶段：",
    ...writeContext.activeRelationStages.map((relation) => (
      `- ${relation.sourceCharacterName} -> ${relation.targetCharacterName}: ${relation.stageLabel} | ${relation.stageSummary}${relation.nextTurnPoint ? ` | next=${relation.nextTurnPoint}` : ""}`
    )),
  ].join("\n");
}

export function buildPendingCandidateGuardText(writeContext: ChapterWriteContext): string {
  if (writeContext.pendingCandidateGuards.length === 0) {
    return "待确认候选角色守卫：无";
  }
  return [
    "待确认候选角色守卫（只读，不得注入到正文生成中）：",
    ...writeContext.pendingCandidateGuards.map((candidate) => {
      const parts = takeUnique([
        candidate.proposedRole ? `role=${candidate.proposedRole}` : "",
        candidate.summary ?? "",
        candidate.sourceChapterOrder != null ? `source chapter=${candidate.sourceChapterOrder}` : "",
        ...candidate.evidence.slice(0, 2),
      ], 4);
      return `- ${candidate.proposedName}: ${parts.join(" | ")}`;
    }),
  ].join("\n");
}

// =========================================================================
// SHARED SUMMARIES (from chapterLayeredContextShared.ts)
// =========================================================================

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

// =========================================================================
// CHARACTER DYNAMICS & PARTICIPANTS (from chapterLayeredContextCharacters.ts)
// =========================================================================

import type {
  DynamicCharacterOverviewItem,
  CharacterRelationStage,
  RuntimeCharacterCandidate,
} from "@ai-novel/shared";

function buildVisibleProfileSummary(
  character: GenerationContextPackage["characterRoster"][number] | undefined,
): string | null {
  if (!character) {
    return null;
  }
  const parts = takeUnique([
    character.appearance || character.physique
      ? `样貌/体态=${compactText([character.appearance, character.physique].filter(Boolean).join("；"))}`
      : "",
    character.signatureDetail ? `标志=${compactText(character.signatureDetail)}` : "",
    character.voiceTexture ? `声音=${compactText(character.voiceTexture)}` : "",
  ], 3);
  return parts.length > 0 ? parts.join(" | ") : null;
}

function absenceRiskRank(risk: "none" | "info" | "warn" | "high"): number {
  return ["none", "info", "warn", "high"].indexOf(risk);
}

export function buildDynamicCharacterGuidance(
  contextPackage: GenerationContextPackage,
): Pick<ChapterWriteContext, "characterBehaviorGuides" | "activeRelationStages" | "pendingCandidateGuards"> {
  const overview = contextPackage.characterDynamics as CharacterDynamicsOverview | null | undefined;
  if (!overview) {
    return {
      characterBehaviorGuides: [],
      activeRelationStages: [],
      pendingCandidateGuards: [],
    };
  }

  const currentChapterOrder = contextPackage.chapter.order;
  const rosterById = new Map(contextPackage.characterRoster.map((character) => [character.id, character]));
  const planParticipantNames = new Set((contextPackage.plan?.participants ?? []).map((item) => compactText(item)));
  const conflictCharacterIds = new Set(
    contextPackage.openConflicts.flatMap((conflict) => conflict.affectedCharacterIds ?? []),
  );

  const activeRelationStages = overview.relations
    .slice(0, 8)
    .map((relation) => ({
      relationId: relation.relationId ?? null,
      sourceCharacterId: relation.sourceCharacterId,
      sourceCharacterName: compactText(relation.sourceCharacterName, relation.sourceCharacterId),
      targetCharacterId: relation.targetCharacterId,
      targetCharacterName: compactText(relation.targetCharacterName, relation.targetCharacterId),
      stageLabel: compactText(relation.stageLabel),
      stageSummary: compactText(relation.stageSummary),
      nextTurnPoint: compactText(relation.nextTurnPoint, "") || null,
      isCurrent: relation.isCurrent,
    }));
  const relationStageByCharacterId = new Map<string, typeof activeRelationStages>();
  for (const relation of activeRelationStages) {
    const sourceStages = relationStageByCharacterId.get(relation.sourceCharacterId) ?? [];
    sourceStages.push(relation);
    relationStageByCharacterId.set(relation.sourceCharacterId, sourceStages);

    const targetStages = relationStageByCharacterId.get(relation.targetCharacterId) ?? [];
    targetStages.push(relation);
    relationStageByCharacterId.set(relation.targetCharacterId, targetStages);
  }

  const characterBehaviorGuides = overview.characters
    .filter((item) => rosterById.has(item.characterId))
    .map((item) => {
      const roster = rosterById.get(item.characterId);
      const relationStages = relationStageByCharacterId.get(item.characterId) ?? [];
      const shouldPreferAppearance = item.isCoreInVolume && (
        item.plannedChapterOrders.includes(currentChapterOrder)
        || item.absenceRisk === "high"
        || item.absenceRisk === "warn"
      );
      let score = 0;
      if (item.isCoreInVolume) {
        score += 40;
      }
      if (item.volumeResponsibility) {
        score += 20;
      }
      if (item.plannedChapterOrders.includes(currentChapterOrder)) {
        score += 25;
      }
      if (relationStages.length > 0) {
        score += 24;
      }
      if (item.absenceRisk === "high") {
        score += 30;
      } else if (item.absenceRisk === "warn") {
        score += 20;
      } else if (item.absenceRisk === "info") {
        score += 8;
      }
      if (planParticipantNames.has(item.name)) {
        score += 16;
      }
      if (conflictCharacterIds.has(item.characterId)) {
        score += 12;
      }
      if (item.currentGoal) {
        score += 4;
      }
      return {
        score,
        guide: {
          characterId: item.characterId,
          name: item.name,
          role: roster?.role ?? item.role,
          castRole: item.castRole ?? null,
          volumeRoleLabel: item.volumeRoleLabel ?? null,
          volumeResponsibility: item.volumeResponsibility ?? null,
          currentGoal: roster?.currentGoal ?? item.currentGoal ?? null,
          currentState: roster?.currentState ?? item.currentState ?? null,
          visibleProfileSummary: buildVisibleProfileSummary(roster),
          factionLabel: item.factionLabel ?? null,
          stanceLabel: item.stanceLabel ?? null,
          relationStageLabels: takeUnique(
            relationStages.map((relation) => (
              relation.nextTurnPoint
                ? `${relation.stageLabel} -> ${relation.nextTurnPoint}`
                : relation.stageLabel
            )),
            3,
          ),
          relationRiskNotes: takeUnique(
            relationStages.map((relation) => (
              `${relation.sourceCharacterName} / ${relation.targetCharacterName}: ${relation.stageSummary}${relation.nextTurnPoint ? ` | next=${relation.nextTurnPoint}` : ""}`
            )),
            3,
          ),
          plannedChapterOrders: item.plannedChapterOrders,
          absenceRisk: item.absenceRisk,
          absenceSpan: item.absenceSpan,
          isCoreInVolume: item.isCoreInVolume,
          shouldPreferAppearance,
        },
      };
    })
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }
      if (left.guide.shouldPreferAppearance !== right.guide.shouldPreferAppearance) {
        return left.guide.shouldPreferAppearance ? -1 : 1;
      }
      if (left.guide.isCoreInVolume !== right.guide.isCoreInVolume) {
        return left.guide.isCoreInVolume ? -1 : 1;
      }
      if (left.guide.absenceRisk !== right.guide.absenceRisk) {
        return absenceRiskRank(right.guide.absenceRisk) - absenceRiskRank(left.guide.absenceRisk);
      }
      return left.guide.name.localeCompare(right.guide.name, "zh-Hans-CN");
    })
    .slice(0, 8)
    .map((item) => item.guide);

  return {
    characterBehaviorGuides,
    activeRelationStages,
    pendingCandidateGuards: overview.candidates
      .slice(0, 4)
      .map((candidate) => ({
        id: candidate.id,
        proposedName: compactText(candidate.proposedName),
        proposedRole: compactText(candidate.proposedRole, "") || null,
        summary: compactText(candidate.summary, "") || null,
        evidence: takeUnique(candidate.evidence, 3),
        sourceChapterOrder: candidate.sourceChapterOrder ?? null,
      })),
  };
}

export function buildParticipants(
  contextPackage: GenerationContextPackage,
  characterBehaviorGuides: ChapterWriteContext["characterBehaviorGuides"] = [],
): GenerationContextPackage["characterRoster"] {
  const rosterById = new Map(contextPackage.characterRoster.map((character) => [character.id, character]));
  const participantNames = new Set(contextPackage.plan?.participants ?? []);
  const conflictCharacterIds = new Set(
    contextPackage.openConflicts.flatMap((conflict) => conflict.affectedCharacterIds ?? []),
  );
  if (characterBehaviorGuides.length > 0) {
    const selected = characterBehaviorGuides
      .filter((guide) => (
        guide.shouldPreferAppearance
        || guide.isCoreInVolume
        || guide.relationStageLabels.length > 0
        || participantNames.has(guide.name)
        || conflictCharacterIds.has(guide.characterId)
      ))
      .map((guide) => rosterById.get(guide.characterId))
      .filter((character): character is NonNullable<typeof character> => Boolean(character));
    if (selected.length > 0) {
      return selected.slice(0, 6);
    }
  }

  const selected = contextPackage.characterRoster.filter((character) => (
    participantNames.has(character.name) || conflictCharacterIds.has(character.id)
  ));
  if (selected.length > 0) {
    return selected.slice(0, 6);
  }
  return contextPackage.characterRoster.slice(0, 4);
}

// =========================================================================
// CONTEXT BUILDERS (original chapterLayeredContextHelpers.ts)
// =========================================================================

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
    genre: compactText(input.genre, "未知"),
    targetAudience: compactText(input.targetAudience, "未知"),
    sellingPoint: compactText(input.sellingPoint, "未指定"),
    first30ChapterPromise: compactText(input.first30ChapterPromise, "未指定"),
    narrativePov: compactText(input.narrativePov, "未指定"),
    pacePreference: compactText(input.pacePreference, "未指定"),
    emotionIntensity: compactText(input.emotionIntensity, "未指定"),
    toneGuardrails: takeUnique(input.toneGuardrails ?? [], 4),
    hardConstraints: takeUnique(input.hardConstraints ?? [], 6),
  };
}

export function buildMacroConstraintContext(storyMacroPlan: StoryMacroPlan | null): MacroConstraintContext | null {
  if (!storyMacroPlan) {
    return null;
  }
  return {
    sellingPoint: compactText(storyMacroPlan.decomposition?.selling_point, "未指定"),
    coreConflict: compactText(storyMacroPlan.decomposition?.core_conflict, "未指定"),
    mainHook: compactText(storyMacroPlan.decomposition?.main_hook, "未指定"),
    progressionLoop: compactText(storyMacroPlan.decomposition?.progression_loop, "未指定"),
    growthPath: compactText(storyMacroPlan.decomposition?.growth_path, "未指定"),
    endingFlavor: compactText(storyMacroPlan.decomposition?.ending_flavor, "未指定"),
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
    seed.previousVolume?.title ? `上一卷: ${compactText(seed.previousVolume.title)} / ${compactText(seed.previousVolume.summary, "无摘要")}` : "",
    seed.nextVolume?.title ? `下一卷: ${compactText(seed.nextVolume.title)} / ${compactText(seed.nextVolume.summary, "无摘要")}` : "",
  ].filter(Boolean).join("\n");
  return {
    volumeId: current.id ?? null,
    sortOrder: current.sortOrder ?? null,
    title: compactText(current.title),
    missionSummary: compactText(current.mainPromise || current.summary, "无卷任务"),
    adjacentSummary: adjacentSummary || "无相邻卷摘要。",
    pendingPayoffs: takeUnique(current.openPayoffs ?? [], 5),
    softFutureSummary: compactText(seed.softFutureSummary, "无未来卷摘要。"),
    keyMilestoneGuards: [],
  };
}

export function buildChapterMissionContext(contextPackage: GenerationContextPackage): ChapterWriteContext["chapterMission"] {
  const stateGoal = contextPackage.chapterStateGoal;
  return {
    chapterId: contextPackage.chapter.id,
    chapterOrder: contextPackage.chapter.order,
    title: compactText(contextPackage.chapter.title),
    objective:
      compactText(stateGoal?.summary)
      || compactText(contextPackage.plan?.objective)
      || compactText(contextPackage.chapter.expectation, "推进当前章节任务。"),
    expectation:
      compactText(contextPackage.chapter.expectation)
      || compactText(stateGoal?.summary)
      || compactText(contextPackage.plan?.title, "完成当前章节任务。"),
    taskSheet: compactText(contextPackage.chapter.taskSheet) || null,
    targetWordCount: contextPackage.chapter.targetWordCount ?? null,
    planRole: contextPackage.plan?.planRole ?? null,
    hookTarget: compactText(contextPackage.plan?.hookTarget, "在结尾留下一个新鲜的悬念。"),
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
    openingAntiRepeatHint: compactText(input.contextPackage.openingHint, "无最近开头引导。"),
    styleContract: input.contextPackage.styleContext?.compiledBlocks?.contract ?? null,
    styleConstraints: summarizeStyleConstraints(input.contextPackage),
    continuationConstraints: summarizeContinuationConstraints(input.contextPackage),
    ragFacts: [],
    completedMilestones: [],
    recentScenePatterns: [],
  };
}

// ---------------------------------------------------------------------------
// Obligation contract builder
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
    obligationContract?: Partial<ChapterWriteContext["obligationContract"]> | null;
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
      ...writeContext.obligationContract.mustHitNow.map((item) => `必须立即兑现: ${item}`),
      ...writeContext.obligationContract.requiredCharacterAppearances.map((item) => `要求角色出场: ${item}`),
      ...writeContext.obligationContract.requiredGoalChanges.map((item) => `要求目标变化: ${item}`),
      ...writeContext.payoffDirectives.map((item) => `伏笔指令: ${item.operation} ${item.title}${item.forbiddenReveal ? ` / 受保护: ${item.forbiddenReveal}` : ""}`),
      ...(writeContext.chapterStateGoal?.targetConflicts ?? []).map((item) => `状态冲突: ${item}`),
      ...(writeContext.chapterBoundary?.doNotCross ?? []).map((item) => `边界不可越界: ${item}`),
      writeContext.chapterMission.hookTarget ? `钩子目标: ${writeContext.chapterMission.hookTarget}` : "",
      writeContext.volumeWindow?.missionSummary ? `卷任务: ${writeContext.volumeWindow.missionSummary}` : "",
      ...(writeContext.characterResourceContext?.setupNeededItems ?? []).map((item) => `资源需初始化: ${item.name} / ${item.summary}`),
      ...(writeContext.characterResourceContext?.blockedItems ?? []).map((item) => `资源不可用: ${item.name} 状态为 ${item.status}；未经修复初始化不得使用`),
      ...(writeContext.characterResourceContext?.pendingReviewItems ?? []).map((item) => `资源需确认: ${item.name} / ${item.summary}`),
      ...writeContext.ledgerPendingItems.map((item) => buildLedgerItemLine(item, "待兑现伏笔")),
      ...writeContext.ledgerUrgentItems.map((item) => buildLedgerItemLine(item, "紧急伏笔")),
      ...writeContext.ledgerOverdueItems.map((item) => buildLedgerItemLine(item, "超期伏笔")),
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
      ...writeContext.obligationContract.mustHitNow.map((item) => `必须立即兑现: ${item}`),
      ...writeContext.obligationContract.requiredCharacterAppearances.map((item) => `要求角色出场: ${item}`),
      ...writeContext.obligationContract.requiredGoalChanges.map((item) => `要求目标变化: ${item}`),
      ...writeContext.payoffDirectives.map((item) => `伏笔指令: ${item.operation} ${item.title}${item.forbiddenReveal ? ` / 受保护: ${item.forbiddenReveal}` : ""}`),
      ...(writeContext.chapterStateGoal?.targetConflicts ?? []).map((item) => `状态冲突: ${item}`),
      ...(writeContext.chapterBoundary?.doNotCross ?? []).map((item) => `边界不可越界: ${item}`),
      writeContext.volumeWindow?.missionSummary
        ? `卷任务: ${writeContext.volumeWindow.missionSummary}`
        : "",
      ...(writeContext.characterResourceContext?.setupNeededItems ?? []).map((item) => `资源需初始化: ${item.name} / ${item.summary}`),
      ...(writeContext.characterResourceContext?.blockedItems ?? []).map((item) => `资源不可用: ${item.name} 状态为 ${item.status}；使用前在本地补全`),
      ...writeContext.ledgerPendingItems.map((item) => buildLedgerItemLine(item, "待兑现伏笔")),
      ...writeContext.ledgerUrgentItems.map((item) => buildLedgerItemLine(item, "紧急伏笔")),
      ...writeContext.ledgerOverdueItems.map((item) => buildLedgerItemLine(item, "超期伏笔")),
    ], 32),
    worldRules: summarizeWorldRules(input.contextPackage),
    historicalIssues: summarizeHistoricalIssues(input.contextPackage),
    allowedEditBoundaries: takeUnique([
      "保持当前章节已确立的目标、参与角色和主要结果方向不变。",
      "不要引入新的核心角色、新的世界规则或偏离大纲的情节转折。",
      writeContext.volumeWindow?.missionSummary
        ? `确保修复与当前卷任务保持一致: ${writeContext.volumeWindow.missionSummary}`
        : "",
      ...writeContext.ledgerPendingItems.map((item) => `不要擦除待兑现伏笔的设置: ${item.title}`),
      ...writeContext.ledgerUrgentItems.map((item) => `本章必须明显触及紧急伏笔线索: ${item.title}`),
      ...writeContext.ledgerOverdueItems.map((item) => `必须兑现或明确解释超期伏笔压力: ${item.title}`),
      ...(writeContext.characterResourceContext?.blockedItems ?? []).map((item) => `使用 ${item.name} 前先补全资源连续性；当前状态为 ${item.status}。`),
      ...(writeContext.characterResourceContext?.pendingReviewItems ?? []).map((item) => `不要将未确认的资源事实变为不可逆: ${item.name}。`),
      writeContext.chapterMission.hookTarget
        ? `保留或加强结尾悬念: ${writeContext.chapterMission.hookTarget}`
        : "",
      ...writeContext.characterBehaviorGuides
        .filter((guide) => guide.shouldPreferAppearance || guide.isCoreInVolume)
        .slice(0, 4)
        .map((guide) => `保持 ${guide.name} 与当前角色职责一致: ${guide.volumeResponsibility ?? guide.volumeRoleLabel ?? guide.role}`),
      writeContext.pendingCandidateGuards.length > 0
        ? "待确认的候选角色保持只读状态，除非在修复流程之外确认。"
        : "",
      ...(writeContext.protectedSecrets ?? []).map((item) => `不得揭露: ${item}`),
      ...(writeContext.chapterBoundary?.doNotCross ?? []).map((item) => `不得越过边界: ${item}`),
      ...writeContext.chapterMission.mustPreserve.map((item) => `必须保留: ${item}`),
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
