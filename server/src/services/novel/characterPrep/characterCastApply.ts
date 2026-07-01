import type {
  CharacterCastApplyResult,
  CharacterCastOption,
  SupplementalCharacterApplyResult,
  SupplementalCharacterCandidate,
} from "@ai-novel/shared/types/novel";
import { prisma } from "../../../db/prisma";
import { NovelContextService } from "../NovelContextService";
import {
  CharacterVisibleProfileService,
  type CharacterVisibleProfileGenerateOptions,
} from "../characterProfile/CharacterVisibleProfileService";
import { CharacterDynamicsService } from "../dynamics/CharacterDynamicsService";
import {
  parseCharacterProhibitionsJson,
} from "../characters/characterHardFacts";
import {
  assessCharacterCastBatch,
  buildCharacterCastBlockedMessage,
} from "./characterCastQuality";
import { WorldContextGateway } from "../worldContext/WorldContextGateway";
import { logger } from "../../logging/LoggerService";
import {
  fillIfMissing,
  serializeCharacterCastOption,
} from "./characterPrepHelpers";

export interface CharacterCastApplyOptions {
  overrideQualityGate?: boolean;
  visibleProfileGeneration?: CharacterVisibleProfileGenerateOptions;
  postApplyMode?: "sync" | "background";
}

export class CharacterCastApplyHandler {
  private readonly novelContextService = new NovelContextService();
  private readonly characterDynamicsService = new CharacterDynamicsService();
  private readonly characterVisibleProfileService = new CharacterVisibleProfileService();

  private async runPostApplyEnhancements(input: {
    novelId: string;
    optionId: string;
    characterIds: string[];
    visibleProfileGeneration?: CharacterVisibleProfileGenerateOptions;
  }): Promise<void> {
    const logContext = {
      novelId: input.novelId,
      optionId: input.optionId,
      characterIds: input.characterIds,
    };

    try {
      await this.characterDynamicsService.rebuildDynamics(input.novelId, {
        sourceType: "cast_option_projection",
      });
    } catch (error) {
      logger.warn("[character-cast-apply] 角色动态投影后台补齐失败", {
        ...logContext,
        stage: "character_dynamics",
        error,
      });
    }

    try {
      await this.characterVisibleProfileService.autoCompleteVisibleProfilesForCharacters(
        input.novelId,
        input.characterIds,
        input.visibleProfileGeneration,
      );
    } catch (error) {
      logger.warn("[character-cast-apply] 外显资料后台补齐失败", {
        ...logContext,
        stage: "visible_profile",
        error,
      });
    }
  }

  async applyCharacterCastOption(
    novelId: string,
    optionId: string,
    options: CharacterCastApplyOptions = {},
  ): Promise<CharacterCastApplyResult> {
    const option = await prisma.characterCastOption.findFirst({
      where: { id: optionId, novelId },
      include: {
        members: { orderBy: { sortOrder: "asc" } },
        relations: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!option) {
      throw new Error("Character cast option not found.");
    }

    const assessment = assessCharacterCastBatch([serializeCharacterCastOption(option)], option.sourceStoryInput ?? "");
    const hasQualityRisk = assessment.autoApplicableOptionIndex === null;
    if (hasQualityRisk && !options.overrideQualityGate) {
      throw new Error(buildCharacterCastBlockedMessage(assessment));
    }

    const existingCharacters = await prisma.character.findMany({
      where: { novelId },
      select: {
        id: true,
        name: true,
        personality: true,
        background: true,
        development: true,
        identityLabel: true,
        factionLabel: true,
        stanceLabel: true,
        powerLevel: true,
        realm: true,
        currentLocation: true,
        availability: true,
        prohibitionsJson: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const characterIdByName = new Map<string, string>();
    const involvedCharacterIds: string[] = [];
    let createdCount = 0;
    let updatedCount = 0;

    for (const member of option.members) {
      const matched = existingCharacters.find((item) => item.name === member.name);
      if (matched) {
        updatedCount += 1;
        const updated = await this.novelContextService.updateCharacter(novelId, matched.id, {
          name: member.name,
          role: member.role,
          gender: member.gender as "male" | "female" | "other" | "unknown",
          castRole: member.castRole,
          storyFunction: member.storyFunction,
          relationToProtagonist: member.relationToProtagonist ?? undefined,
          personality: fillIfMissing(matched.personality, member.personality),
          background: fillIfMissing(matched.background, member.background),
          development: fillIfMissing(matched.development, member.development),
          identityLabel: fillIfMissing(matched.identityLabel, member.identityLabel),
          factionLabel: fillIfMissing(matched.factionLabel, member.factionLabel),
          stanceLabel: fillIfMissing(matched.stanceLabel, member.stanceLabel),
          powerLevel: fillIfMissing(matched.powerLevel, member.powerLevel),
          realm: fillIfMissing(matched.realm, member.realm),
          currentLocation: fillIfMissing(matched.currentLocation, member.currentLocation),
          availability: fillIfMissing(matched.availability, member.availability),
          prohibitions: parseCharacterProhibitionsJson(matched.prohibitionsJson).length === 0
            ? parseCharacterProhibitionsJson(member.prohibitionsJson)
            : undefined,
          outerGoal: member.outerGoal ?? undefined,
          innerNeed: member.innerNeed ?? undefined,
          fear: member.fear ?? undefined,
          wound: member.wound ?? undefined,
          misbelief: member.misbelief ?? undefined,
          secret: member.secret ?? undefined,
          moralLine: member.moralLine ?? undefined,
          firstImpression: member.firstImpression ?? undefined,
        });
        involvedCharacterIds.push(updated.id);
        characterIdByName.set(updated.name, updated.id);
        continue;
      }

      createdCount += 1;
      const created = await this.novelContextService.createCharacter(novelId, {
        name: member.name,
        role: member.role,
        gender: member.gender as "male" | "female" | "other" | "unknown",
        castRole: member.castRole,
        storyFunction: member.storyFunction,
        relationToProtagonist: member.relationToProtagonist ?? undefined,
        personality: member.personality ?? undefined,
        background: member.background ?? undefined,
        development: member.development ?? undefined,
        identityLabel: member.identityLabel ?? undefined,
        factionLabel: member.factionLabel ?? undefined,
        stanceLabel: member.stanceLabel ?? undefined,
        powerLevel: member.powerLevel ?? undefined,
        realm: member.realm ?? undefined,
        currentLocation: member.currentLocation ?? undefined,
        availability: member.availability ?? undefined,
        prohibitions: parseCharacterProhibitionsJson(member.prohibitionsJson),
        outerGoal: member.outerGoal ?? undefined,
        innerNeed: member.innerNeed ?? undefined,
        fear: member.fear ?? undefined,
        wound: member.wound ?? undefined,
        misbelief: member.misbelief ?? undefined,
        secret: member.secret ?? undefined,
        moralLine: member.moralLine ?? undefined,
        firstImpression: member.firstImpression ?? undefined,
        currentGoal: member.outerGoal ?? undefined,
        currentState: "等待进入正文",
      });
      involvedCharacterIds.push(created.id);
      characterIdByName.set(created.name, created.id);
    }

    const uniqueCharacterIds = Array.from(new Set(involvedCharacterIds));
    await prisma.characterRelation.deleteMany({
      where: {
        novelId,
        OR: [
          { sourceCharacterId: { in: uniqueCharacterIds } },
          { targetCharacterId: { in: uniqueCharacterIds } },
        ],
      },
    });

    const seenRelationKeys = new Set<string>();
    const relationRows = option.relations
      .map((relation) => {
        const sourceCharacterId = characterIdByName.get(relation.sourceName);
        const targetCharacterId = characterIdByName.get(relation.targetName);
        if (!sourceCharacterId || !targetCharacterId || sourceCharacterId === targetCharacterId) {
          return null;
        }
        const relationKey = `${sourceCharacterId}:${targetCharacterId}`;
        if (seenRelationKeys.has(relationKey)) {
          return null;
        }
        seenRelationKeys.add(relationKey);
        return {
          novelId,
          sourceCharacterId,
          targetCharacterId,
          surfaceRelation: relation.surfaceRelation,
          hiddenTension: relation.hiddenTension || null,
          conflictSource: relation.conflictSource || null,
          secretAsymmetry: relation.secretAsymmetry || null,
          dynamicLabel: relation.dynamicLabel || null,
          nextTurnPoint: relation.nextTurnPoint || null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (relationRows.length > 0) {
      await prisma.characterRelation.createMany({ data: relationRows });
    }

    await prisma.characterCastOption.updateMany({
      where: { novelId },
      data: { status: "draft" },
    });
    await prisma.characterCastOption.update({
      where: { id: option.id },
      data: { status: "applied" },
    });

    const postApplyInput = {
      novelId,
      optionId: option.id,
      characterIds: uniqueCharacterIds,
      visibleProfileGeneration: options.visibleProfileGeneration,
    };
    if (options.postApplyMode === "background") {
      void this.runPostApplyEnhancements(postApplyInput).catch((error) => {
        logger.warn("[character-cast-apply] 阵容应用后台补齐任务失败", {
          novelId,
          optionId: option.id,
          characterIds: uniqueCharacterIds,
          stage: "post_apply_enhancements",
          error,
        });
      });
    } else {
      await this.runPostApplyEnhancements(postApplyInput);
    }

    return {
      optionId: option.id,
      createdCount,
      updatedCount,
      relationCount: relationRows.length,
      characterIds: uniqueCharacterIds,
      primaryCharacterId: characterIdByName.get(option.members[0]?.name ?? "") ?? null,
      qualityOverrideApplied: hasQualityRisk && Boolean(options.overrideQualityGate),
      qualityWarnings: assessment.blockingReasons,
    };
  }
}
