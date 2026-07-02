function normalizeText(value: string | null | undefined): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeKeySegment(value: string | null | undefined): string {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) {
    return "item";
  }
  return normalized
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48) || "item";
}

function valuesDiffer(left: string | null | undefined, right: string | null | undefined): boolean {
  const normalizedLeft = normalizeText(left).toLowerCase();
  const normalizedRight = normalizeText(right).toLowerCase();
  if (!normalizedLeft || !normalizedRight) {
    return false;
  }
  return normalizedLeft !== normalizedRight;
}

function rankForeshadowStatus(status: string | null | undefined): number {
  const normalized = normalizeText(status).toLowerCase();
  if (
    normalized.includes("resolved")
    || normalized.includes("complete")
    || normalized.includes("兑现")
    || normalized.includes("回收")
  ) {
    return 4;
  }
  if (normalized.includes("payoff") || normalized.includes("paid") || normalized.includes("reveal")) {
    return 3;
  }
  if (
    normalized.includes("active")
    || normalized.includes("progress")
    || normalized.includes("develop")
    || normalized.includes("推进")
  ) {
    return 2;
  }
  return 1;
}

function rankInformationStatus(status: string | null | undefined): number {
  const normalized = normalizeText(status).toLowerCase();
  if (
    normalized.includes("confirmed")
    || normalized.includes("known")
    || normalized.includes("revealed")
    || normalized.includes("open")
    || normalized.includes("公开")
    || normalized.includes("已知")
  ) {
    return 3;
  }
  if (
    normalized.includes("hint")
    || normalized.includes("suspect")
    || normalized.includes("partial")
    || normalized.includes("线索")
    || normalized.includes("怀疑")
  ) {
    return 2;
  }
  return 1;
}

interface SnapshotCharacterState {
  characterId: string;
  currentGoal?: string | null;
  summary?: string | null;
}

interface SnapshotRelationState {
  sourceCharacterId: string;
  targetCharacterId: string;
  trustScore?: number | null;
  intimacyScore?: number | null;
  conflictScore?: number | null;
  dependencyScore?: number | null;
  summary?: string | null;
}

interface SnapshotInformationState {
  holderType: string;
  holderRefId?: string | null;
  fact: string;
  status: string;
  summary?: string | null;
}

interface SnapshotForeshadowState {
  title: string;
  summary?: string | null;
  status: string;
  setupChapterId?: string | null;
}

export interface SnapshotConflictComparable {
  characterStates: SnapshotCharacterState[];
  relationStates: SnapshotRelationState[];
  informationStates: SnapshotInformationState[];
  foreshadowStates: SnapshotForeshadowState[];
}

export interface StateDiffConflictCandidate {
  conflictKey: string;
  conflictType: string;
  title: string;
  summary: string;
  severity: string;
  evidence: string[];
  affectedCharacterIds: string[];
  resolutionHint: string | null;
}

export interface StateDiffConflictResult {
  trackedConflictKeys: string[];
  conflicts: StateDiffConflictCandidate[];
}

interface DetectStateDiffConflictsInput {
  characters: Array<{ id: string; name: string }>;
  previousSnapshot: SnapshotConflictComparable | null;
  currentSnapshot: SnapshotConflictComparable;
}

export function detectStateDiffConflicts(input: DetectStateDiffConflictsInput): StateDiffConflictResult {
  const trackedConflictKeys = new Set<string>();
  const conflicts = new Map<string, StateDiffConflictCandidate>();
  const characterNameById = new Map(input.characters.map((item) => [item.id, item.name]));

  detectCharacterGoalShifts(input, characterNameById, trackedConflictKeys, conflicts);
  detectRelationJumps(input, characterNameById, trackedConflictKeys, conflicts);
  detectInformationRegressions(input, trackedConflictKeys, conflicts);
  detectForeshadowRegressions(input, trackedConflictKeys, conflicts);

  return {
    trackedConflictKeys: Array.from(trackedConflictKeys),
    conflicts: Array.from(conflicts.values()),
  };
}

function detectCharacterGoalShifts(
  input: DetectStateDiffConflictsInput,
  characterNameById: Map<string, string>,
  trackedKeys: Set<string>,
  conflicts: Map<string, StateDiffConflictCandidate>,
): void {
  const previousMap = new Map(
    (input.previousSnapshot?.characterStates ?? []).map((item) => [item.characterId, item]),
  );
  for (const current of input.currentSnapshot.characterStates) {
    const previous = previousMap.get(current.characterId);
    const previousGoal = normalizeText(previous?.currentGoal);
    const currentGoal = normalizeText(current.currentGoal);
    if (!previousGoal || !currentGoal) continue;
    const conflictKey = `character_goal_shift:${current.characterId}`;
    trackedKeys.add(conflictKey);
    if (!valuesDiffer(previousGoal, currentGoal)) continue;
    const name = characterNameById.get(current.characterId) ?? current.characterId;
    conflicts.set(conflictKey, {
      conflictKey,
      conflictType: "character_goal_shift",
      title: `${name} goal changed`,
      summary: `${name} current goal changed from "${previousGoal}" to "${currentGoal}". Confirm this chapter includes a clear transition trigger.`,
      severity: "medium",
      evidence: [
        `Previous goal: ${previousGoal}`,
        previous?.summary ? `Previous state: ${normalizeText(previous.summary)}` : "",
        `Current goal: ${currentGoal}`,
        current.summary ? `Current state: ${normalizeText(current.summary)}` : "",
      ].filter(Boolean),
      affectedCharacterIds: [current.characterId],
      resolutionHint: "If this is an intentional turn, make the trigger explicit in the chapter or plan. Otherwise restore the prior goal.",
    });
  }
}

function detectRelationJumps(
  input: DetectStateDiffConflictsInput,
  characterNameById: Map<string, string>,
  trackedKeys: Set<string>,
  conflicts: Map<string, StateDiffConflictCandidate>,
): void {
  const previousMap = new Map(
    (input.previousSnapshot?.relationStates ?? []).map((item) => [`${item.sourceCharacterId}:${item.targetCharacterId}`, item]),
  );
  for (const current of input.currentSnapshot.relationStates) {
    const relationKey = `${current.sourceCharacterId}:${current.targetCharacterId}`;
    const previous = previousMap.get(relationKey);
    if (!previous) continue;
    const comparableScores = [
      ["trust", previous.trustScore, current.trustScore],
      ["intimacy", previous.intimacyScore, current.intimacyScore],
      ["conflict", previous.conflictScore, current.conflictScore],
      ["dependency", previous.dependencyScore, current.dependencyScore],
    ].filter((item): item is [string, number, number] => typeof item[1] === "number" && typeof item[2] === "number");
    if (comparableScores.length === 0) continue;
    const conflictKey = `relation_jump:${relationKey}`;
    trackedKeys.add(conflictKey);
    const changedScores = comparableScores
      .map(([label, prev, curr]) => ({ label, previousValue: prev, currentValue: curr, delta: Math.abs(curr - prev) }))
      .filter((item) => item.delta >= 35);
    if (changedScores.length === 0) continue;
    const sourceName = characterNameById.get(current.sourceCharacterId) ?? current.sourceCharacterId;
    const targetName = characterNameById.get(current.targetCharacterId) ?? current.targetCharacterId;
    const maxDelta = Math.max(...changedScores.map((item) => item.delta));
    conflicts.set(conflictKey, {
      conflictKey,
      conflictType: "relation_jump",
      title: `${sourceName} / ${targetName} relation jumped`,
      summary: `${sourceName} and ${targetName} relation metrics changed sharply: ${changedScores.map((item) => `${item.label} ${item.previousValue}->${item.currentValue}`).join(", ")}.`,
      severity: maxDelta >= 60 ? "high" : "medium",
      evidence: [
        previous.summary ? `Previous relation: ${normalizeText(previous.summary)}` : "",
        current.summary ? `Current relation: ${normalizeText(current.summary)}` : "",
      ].filter(Boolean),
      affectedCharacterIds: [current.sourceCharacterId, current.targetCharacterId],
      resolutionHint: "Make the causal event explicit, or soften the state extraction by revising the chapter/summary if the change is not real.",
    });
  }
}

function detectInformationRegressions(
  input: DetectStateDiffConflictsInput,
  trackedKeys: Set<string>,
  conflicts: Map<string, StateDiffConflictCandidate>,
): void {
  const previousMap = new Map(
    (input.previousSnapshot?.informationStates ?? []).map((item) => [
      `${item.holderType}:${item.holderRefId ?? "-"}:${normalizeKeySegment(item.fact)}`,
      item,
    ]),
  );
  for (const current of input.currentSnapshot.informationStates) {
    const infoKey = `${current.holderType}:${current.holderRefId ?? "-"}:${normalizeKeySegment(current.fact)}`;
    const previous = previousMap.get(infoKey);
    if (!previous) continue;
    const conflictKey = `information_regression:${infoKey}`;
    trackedKeys.add(conflictKey);
    const previousRank = rankInformationStatus(previous.status);
    const currentRank = rankInformationStatus(current.status);
    if (currentRank >= previousRank) continue;
    conflicts.set(conflictKey, {
      conflictKey,
      conflictType: "information_regression",
      title: "Knowledge state regressed",
      summary: `Fact "${normalizeText(current.fact)}" moved from "${normalizeText(previous.status) || "known"}" to "${normalizeText(current.status) || "unknown"}".`,
      severity: previousRank - currentRank >= 2 ? "high" : "medium",
      evidence: [
        previous.summary ? `Previous knowledge: ${normalizeText(previous.summary)}` : "",
        current.summary ? `Current knowledge: ${normalizeText(current.summary)}` : "",
      ].filter(Boolean),
      affectedCharacterIds: current.holderType === "character" && current.holderRefId ? [current.holderRefId] : [],
      resolutionHint: "Confirm whether the knowledge should truly be forgotten or hidden again. Otherwise keep the higher-confidence state.",
    });
  }
}

function detectForeshadowRegressions(
  input: DetectStateDiffConflictsInput,
  trackedKeys: Set<string>,
  conflicts: Map<string, StateDiffConflictCandidate>,
): void {
  const previousMap = new Map(
    (input.previousSnapshot?.foreshadowStates ?? []).map((item) => [normalizeKeySegment(item.title), item]),
  );
  for (const current of input.currentSnapshot.foreshadowStates) {
    const foreshadowKey = normalizeKeySegment(current.title);
    const previous = previousMap.get(foreshadowKey);

    // Regression check
    const regressionKey = `foreshadow_regression:${foreshadowKey}`;
    if (previous) {
      trackedKeys.add(regressionKey);
      if (rankForeshadowStatus(current.status) + 1 < rankForeshadowStatus(previous.status)) {
        conflicts.set(regressionKey, {
          conflictKey: regressionKey,
          conflictType: "foreshadow_regression",
          title: `${normalizeText(current.title)} regressed`,
          summary: `Foreshadow "${normalizeText(current.title)}" moved from "${normalizeText(previous.status) || "resolved"}" back to "${normalizeText(current.status) || "setup"}".`,
          severity: "high",
          evidence: [
            previous.summary ? `Previous foreshadow: ${normalizeText(previous.summary)}` : "",
            current.summary ? `Current foreshadow: ${normalizeText(current.summary)}` : "",
          ].filter(Boolean),
          affectedCharacterIds: [],
          resolutionHint: "Do not reopen resolved foreshadowing unless the chapter explicitly creates a new thread.",
        });
      }
    }

    // Missing setup check
    const setupMissingKey = `foreshadow_missing_setup:${foreshadowKey}`;
    if (rankForeshadowStatus(current.status) >= 3) {
      trackedKeys.add(setupMissingKey);
      if (!previous && !normalizeText(current.setupChapterId)) {
        conflicts.set(setupMissingKey, {
          conflictKey: setupMissingKey,
          conflictType: "foreshadow_missing_setup",
          title: `${normalizeText(current.title)} paid off without setup`,
          summary: `Foreshadow "${normalizeText(current.title)}" looks like a payoff/resolution, but no prior setup state was found.`,
          severity: "high",
          evidence: [current.summary ? `Current foreshadow: ${normalizeText(current.summary)}` : ""].filter(Boolean),
          affectedCharacterIds: [],
          resolutionHint: "Either add the missing setup earlier, or downgrade the current state to setup/active until the payoff chapter arrives.",
        });
      }
    }
  }
}
