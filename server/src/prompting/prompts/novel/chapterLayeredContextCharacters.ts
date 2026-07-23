/**
 * chapterLayeredContextCharacters.ts
 *
 * Character dynamics, participant selection, and character guidance builders.
 * Extracted from chapterLayeredContextHelpers.ts.
 */

import type {
  GenerationContextPackage,
  ChapterWriteContext,
} from "@ai-novel/shared";
import type {
  CharacterDynamicsOverview,
} from "./chapterLayeredContextTypes";
import { compactText, takeUnique } from "./chapterLayeredContextUtils";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Dynamic character guidance
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Participant selection
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Text rendering for character-related context blocks
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Character hard facts selection
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
