import type {
  CharacterCastOption,
  CharacterCastQualityAssessment,
  CharacterCastQualityIssue,
  CharacterCastRole,
  CharacterWorldFocusHints,
} from "@ai-novel/shared";
import type { LLMProvider } from "@ai-novel/shared";
import { parseCharacterProhibitionsJson, serializeCharacterProhibitions } from "../characters/characterHardFacts";
import { assessCharacterCastBatch } from "./characterCastQuality";
import type { CharacterCastOptionResponseParsed } from "../../../prompting/prompts/novel/characterPreparation.promptSchemas";

export interface CharacterPrepOptions {
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
  storyInput?: string;
  useWorldContext?: boolean;
  worldFocusHints?: CharacterWorldFocusHints;
}

export interface CharacterCastApplyOptions {
  overrideQualityGate?: boolean;
  visibleProfileGeneration?: import("../characterProfile/CharacterVisibleProfileService").CharacterVisibleProfileGenerateOptions;
  postApplyMode?: "sync" | "background";
}

export function toOptionalText(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return normalized || null;
}

type ParsedMember = CharacterCastOptionResponseParsed["options"][number]["members"][number];
type ParsedRelation = CharacterCastOptionResponseParsed["options"][number]["relations"][number];

export function buildMemberCreateData(member: ParsedMember, index: number) {
  return {
    sortOrder: index,
    name: member.name,
    role: member.role,
    gender: member.gender,
    castRole: member.castRole,
    tier: member.tier ?? "named",
    relationToProtagonist: toOptionalText(member.relationToProtagonist),
    storyFunction: member.storyFunction,
    shortDescription: toOptionalText(member.shortDescription),
    personality: toOptionalText(member.personality),
    background: toOptionalText(member.background),
    development: toOptionalText(member.development),
    identityLabel: toOptionalText(member.identityLabel),
    factionLabel: toOptionalText(member.factionLabel),
    stanceLabel: toOptionalText(member.stanceLabel),
    powerLevel: toOptionalText(member.powerLevel),
    realm: toOptionalText(member.realm),
    currentLocation: toOptionalText(member.currentLocation),
    availability: toOptionalText(member.availability),
    prohibitionsJson: serializeCharacterProhibitions(member.prohibitions),
    outerGoal: toOptionalText(member.outerGoal),
    innerNeed: toOptionalText(member.innerNeed),
    fear: toOptionalText(member.fear),
    wound: toOptionalText(member.wound),
    misbelief: toOptionalText(member.misbelief),
    secret: toOptionalText(member.secret),
    moralLine: toOptionalText(member.moralLine),
    firstImpression: toOptionalText(member.firstImpression),
  };
}

export function buildRelationCreateData(relation: ParsedRelation, index: number) {
  return {
    sortOrder: index,
    sourceName: relation.sourceName,
    targetName: relation.targetName,
    surfaceRelation: relation.surfaceRelation,
    hiddenTension: toOptionalText(relation.hiddenTension),
    conflictSource: toOptionalText(relation.conflictSource),
    secretAsymmetry: toOptionalText(relation.secretAsymmetry),
    dynamicLabel: toOptionalText(relation.dynamicLabel),
    nextTurnPoint: toOptionalText(relation.nextTurnPoint),
  };
}

export function fillIfMissing(existing: string | null | undefined, incoming: string | null | undefined): string | undefined {
  if (existing?.trim()) {
    return undefined;
  }
  return toOptionalText(incoming) ?? undefined;
}

export function serializeCharacterCastOption(row: {
  id: string;
  novelId: string;
  title: string;
  summary: string;
  whyItWorks: string | null;
  recommendedReason: string | null;
  status: string;
  sourceStoryInput: string | null;
  createdAt: Date;
  updatedAt: Date;
  members: Array<{
    id: string;
    optionId: string;
    sortOrder: number;
    name: string;
    role: string;
    gender: string;
    castRole: string;
    relationToProtagonist: string | null;
    storyFunction: string;
    shortDescription: string | null;
    personality: string | null;
    background: string | null;
    development: string | null;
    identityLabel: string | null;
    factionLabel: string | null;
    stanceLabel: string | null;
    powerLevel: string | null;
    realm: string | null;
    currentLocation: string | null;
    availability: string | null;
    prohibitionsJson: string;
    outerGoal: string | null;
    innerNeed: string | null;
    fear: string | null;
    wound: string | null;
    misbelief: string | null;
    secret: string | null;
    moralLine: string | null;
    firstImpression: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  relations: Array<{
    id: string;
    optionId: string;
    sortOrder: number;
    sourceName: string;
    targetName: string;
    surfaceRelation: string;
    hiddenTension: string | null;
    conflictSource: string | null;
    secretAsymmetry: string | null;
    dynamicLabel: string | null;
    nextTurnPoint: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
}): CharacterCastOption {
  return {
    id: row.id,
    novelId: row.novelId,
    title: row.title,
    summary: row.summary,
    whyItWorks: row.whyItWorks,
    recommendedReason: row.recommendedReason,
    status: row.status,
    sourceStoryInput: row.sourceStoryInput,
    members: row.members.map((member) => ({
      id: member.id,
      optionId: member.optionId,
      sortOrder: member.sortOrder,
      name: member.name,
      role: member.role,
      gender: member.gender as CharacterCastOption["members"][number]["gender"],
      castRole: member.castRole as CharacterCastRole,
      tier: (member as { tier?: string | null }).tier as CharacterCastOption["members"][number]["tier"],
      relationToProtagonist: member.relationToProtagonist,
      storyFunction: member.storyFunction,
      shortDescription: member.shortDescription,
      personality: member.personality,
      background: member.background,
      development: member.development,
      identityLabel: member.identityLabel,
      factionLabel: member.factionLabel,
      stanceLabel: member.stanceLabel,
      powerLevel: member.powerLevel,
      realm: member.realm,
      currentLocation: member.currentLocation,
      availability: member.availability,
      prohibitions: parseCharacterProhibitionsJson(member.prohibitionsJson),
      prohibitionsJson: member.prohibitionsJson,
      outerGoal: member.outerGoal,
      innerNeed: member.innerNeed,
      fear: member.fear,
      wound: member.wound,
      misbelief: member.misbelief,
      secret: member.secret,
      moralLine: member.moralLine,
      firstImpression: member.firstImpression,
      createdAt: member.createdAt.toISOString(),
      updatedAt: member.updatedAt.toISOString(),
    })),
    relations: row.relations.map((relation) => ({
      id: relation.id,
      optionId: relation.optionId,
      sortOrder: relation.sortOrder,
      sourceName: relation.sourceName,
      targetName: relation.targetName,
      surfaceRelation: relation.surfaceRelation,
      hiddenTension: relation.hiddenTension,
      conflictSource: relation.conflictSource,
      secretAsymmetry: relation.secretAsymmetry,
      dynamicLabel: relation.dynamicLabel,
      nextTurnPoint: relation.nextTurnPoint,
      createdAt: relation.createdAt.toISOString(),
      updatedAt: relation.updatedAt.toISOString(),
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function buildCastOptionQualityAssessment(option: CharacterCastOption): CharacterCastQualityAssessment {
  const assessment = assessCharacterCastBatch([option], option.sourceStoryInput ?? "");
  const optionAssessment = assessment.options[0];
  return {
    autoApplicable: optionAssessment?.autoApplicable ?? true,
    blockingReasons: assessment.blockingReasons,
    issues: (optionAssessment?.issues ?? []) as CharacterCastQualityIssue[],
  };
}

export function serializeCharacterCastOptionWithQuality(
  row: Parameters<typeof serializeCharacterCastOption>[0],
): CharacterCastOption {
  const option = serializeCharacterCastOption(row);
  return {
    ...option,
    qualityAssessment: buildCastOptionQualityAssessment(option),
  };
}
