import type {
  CharacterCastApplyResult,
  CharacterCastOption,
  CharacterCastOptionClearResult,
  CharacterCastOptionDeleteResult,
  CharacterWorldFocusHints,
  CharacterRelation,
  SupplementalCharacterApplyResult,
  SupplementalCharacterCandidate,
  SupplementalCharacterGenerateInput,
  SupplementalCharacterGenerationResult,
} from "@ai-novel/shared/types/novel";
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import { prisma } from "../../../db/prisma";
import { runStructuredPrompt } from "../../../prompting/core/promptRunner";
import { buildCharacterCastContextBlocks } from "../../../prompting/prompts/novel/characterPreparation.contextBlocks";
import {
  characterCastOptionNormalizePrompt,
  characterCastOptionPrompt,
  characterCastOptionRepairPrompt,
} from "../../../prompting/prompts/novel/characterPreparation.prompts";
import type { CharacterCastOptionResponseParsed } from "../../../prompting/prompts/novel/characterPreparation.promptSchemas";
import { buildStoryModePromptBlock, normalizeStoryModeOutput } from "../../storyMode/storyModeProfile";
import { NovelContextService } from "../NovelContextService";
import { CharacterDynamicsService } from "../dynamics/CharacterDynamicsService";
import { CharacterPreparationSupplementalService } from "./characterPreparationSupplemental";
import {
  assessCharacterCastBatch,
  buildCharacterCastRepairReasons,
} from "./characterCastQuality";
import { WorldContextGateway } from "../worldContext/WorldContextGateway";
import { serializeCharacterProhibitions } from "../characters/characterHardFacts";
import {
  toOptionalText,
  serializeCharacterCastOptionWithQuality,
  type CharacterPrepOptions,
} from "./characterPrepHelpers";
import {
  CharacterCastApplyHandler,
  type CharacterCastApplyOptions,
} from "./characterCastApply";

export type { CharacterCastApplyOptions } from "./characterCastApply";

export class CharacterPreparationService {
  private readonly novelContextService = new NovelContextService();
  private readonly characterDynamicsService = new CharacterDynamicsService();
  private readonly worldContextGateway = new WorldContextGateway();
  private readonly supplementalService = new CharacterPreparationSupplementalService(
    this.novelContextService,
    this.characterDynamicsService,
    this.worldContextGateway,
  );
  private readonly castApplyHandler = new CharacterCastApplyHandler();

  private async loadCastGenerationContext(novelId: string, options: CharacterPrepOptions) {
    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
      include: {
        genre: { select: { name: true } },
        bible: {
          select: {
            coreSetting: true,
            mainPromise: true,
            characterArcs: true,
          },
        },
        storyMacroPlan: {
          select: {
            storyInput: true,
            decompositionJson: true,
            constraintEngineJson: true,
          },
        },
        bookContract: {
          select: {
            readingPromise: true,
            protagonistFantasy: true,
            coreSellingPoint: true,
            chapter3Payoff: true,
            chapter10Payoff: true,
            chapter30Payoff: true,
            escalationLadder: true,
            relationshipMainline: true,
          },
        },
        primaryStoryMode: {
          select: {
            id: true,
            name: true,
            description: true,
            template: true,
            parentId: true,
            profileJson: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        secondaryStoryMode: {
          select: {
            id: true,
            name: true,
            description: true,
            template: true,
            parentId: true,
            profileJson: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        characters: {
          select: {
            name: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!novel) {
      throw new Error("Novel not found.");
    }

    const storyInput = options.storyInput?.trim()
      || novel.storyMacroPlan?.storyInput?.trim()
      || novel.description?.trim()
      || "";
    const worldContext = options.useWorldContext === false
      ? null
      : await this.worldContextGateway.getWorldContextBlock(novelId, {
        purpose: "character",
        strength: "normal",
        storyInput,
        provider: options.provider,
        model: options.model,
        temperature: options.temperature,
      });
    const storyModeBlock = buildStoryModePromptBlock({
      primary: novel.primaryStoryMode ? normalizeStoryModeOutput(novel.primaryStoryMode) : null,
      secondary: novel.secondaryStoryMode ? normalizeStoryModeOutput(novel.secondaryStoryMode) : null,
    });
    const contextBlocks = buildCharacterCastContextBlocks({
      projectTitle: novel.title,
      storyInput: storyInput || "暂无直接故事输入，请结合书级约束补齐真实可入戏角色。",
      genreName: novel.genre?.name ?? null,
      storyModeBlock,
      styleTone: novel.styleTone ?? null,
      narrativePov: novel.narrativePov ?? null,
      pacePreference: novel.pacePreference ?? null,
      emotionIntensity: novel.emotionIntensity ?? null,
      corePromise: novel.bible?.mainPromise ?? null,
      coreSetting: novel.bible?.coreSetting ?? null,
      characterArcs: novel.bible?.characterArcs ?? null,
      worldRules: worldContext?.worldRulesText ?? null,
      worldStage: worldContext?.worldStageText ?? null,
      worldFocusHints: options.useWorldContext === false ? null : options.worldFocusHints,
      storyDecomposition: novel.storyMacroPlan?.decompositionJson ?? null,
      constraintEngine: novel.storyMacroPlan?.constraintEngineJson ?? null,
      bookContract: novel.bookContract,
      existingCharacterNames: novel.characters.map((character) => character.name),
    });

    return {
      novel,
      storyInput,
      contextBlocks,
    };
  }

  private async normalizeCharacterCastOptions(
    parsed: CharacterCastOptionResponseParsed,
    options: CharacterPrepOptions,
  ): Promise<CharacterCastOptionResponseParsed> {
    const result = await runStructuredPrompt({
      asset: characterCastOptionNormalizePrompt,
      promptInput: {
        payloadJson: JSON.stringify(parsed, null, 2),
      },
      options: {
        provider: options.provider,
        model: options.model,
        temperature: 0.2,
      },
    });
    return result.output;
  }

  private async repairCharacterCastOptions(input: {
    parsed: CharacterCastOptionResponseParsed;
    assessment: import("./characterCastQuality").CharacterCastBatchAssessment;
    contextBlocks: ReturnType<typeof buildCharacterCastContextBlocks>;
    options: CharacterPrepOptions;
  }): Promise<CharacterCastOptionResponseParsed> {
    const result = await runStructuredPrompt({
      asset: characterCastOptionRepairPrompt,
      promptInput: {
        payloadJson: JSON.stringify(input.parsed, null, 2),
        failureReasons: buildCharacterCastRepairReasons(input.assessment),
      },
      contextBlocks: input.contextBlocks,
      options: {
        provider: input.options.provider,
        model: input.options.model,
        temperature: Math.max(0.2, Math.min(input.options.temperature ?? 0.55, 0.6)),
      },
    });
    return result.output;
  }

  private async persistCharacterCastOptions(
    novelId: string,
    storyInput: string,
    parsed: CharacterCastOptionResponseParsed,
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.characterCastOption.deleteMany({ where: { novelId } });
      for (const option of parsed.options) {
        await tx.characterCastOption.create({
          data: {
            novelId,
            title: option.title,
            summary: option.summary,
            whyItWorks: toOptionalText(option.whyItWorks),
            recommendedReason: toOptionalText(option.recommendedReason),
            sourceStoryInput: toOptionalText(storyInput),
            members: {
              create: option.members.map((member, index) => ({
                sortOrder: index,
                name: member.name,
                role: member.role,
                gender: member.gender,
                castRole: member.castRole,
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
              })),
            },
            relations: {
              create: option.relations.map((relation, index) => ({
                sortOrder: index,
                sourceName: relation.sourceName,
                targetName: relation.targetName,
                surfaceRelation: relation.surfaceRelation,
                hiddenTension: toOptionalText(relation.hiddenTension),
                conflictSource: toOptionalText(relation.conflictSource),
                secretAsymmetry: toOptionalText(relation.secretAsymmetry),
                dynamicLabel: toOptionalText(relation.dynamicLabel),
                nextTurnPoint: toOptionalText(relation.nextTurnPoint),
              })),
            },
          },
        });
      }
    });
  }

  assessCharacterCastOptions(
    castOptions: CharacterCastOption[],
    storyInput: string,
  ): import("./characterCastQuality").CharacterCastBatchAssessment {
    return assessCharacterCastBatch(castOptions, storyInput);
  }

  listCharacterCastOptions(novelId: string): Promise<CharacterCastOption[]> {
    return prisma.characterCastOption.findMany({
      where: { novelId },
      include: {
        members: { orderBy: { sortOrder: "asc" } },
        relations: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: [
        { updatedAt: "desc" },
        { createdAt: "desc" },
      ],
    }).then((rows) => rows.map((row) => serializeCharacterCastOptionWithQuality(row)));
  }

  async listCharacterRelations(novelId: string): Promise<CharacterRelation[]> {
    const rows = await prisma.characterRelation.findMany({
      where: { novelId },
      include: {
        sourceCharacter: { select: { name: true } },
        targetCharacter: { select: { name: true } },
      },
      orderBy: [
        { updatedAt: "desc" },
        { createdAt: "desc" },
      ],
    });

    return rows.map((row) => ({
      id: row.id,
      novelId: row.novelId,
      sourceCharacterId: row.sourceCharacterId,
      targetCharacterId: row.targetCharacterId,
      sourceCharacterName: row.sourceCharacter.name,
      targetCharacterName: row.targetCharacter.name,
      surfaceRelation: row.surfaceRelation,
      hiddenTension: row.hiddenTension,
      conflictSource: row.conflictSource,
      secretAsymmetry: row.secretAsymmetry,
      dynamicLabel: row.dynamicLabel,
      nextTurnPoint: row.nextTurnPoint,
      trustScore: row.trustScore,
      conflictScore: row.conflictScore,
      intimacyScore: row.intimacyScore,
      dependencyScore: row.dependencyScore,
      evidence: row.evidence,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async generateSupplementalCharacters(
    novelId: string,
    options: SupplementalCharacterGenerateInput = {},
  ): Promise<SupplementalCharacterGenerationResult> {
    return this.supplementalService.generateSupplementalCharacters(novelId, options);
  }

  async generateCharacterCastOptions(
    novelId: string,
    options: CharacterPrepOptions = {},
  ): Promise<CharacterCastOption[]> {
    const context = await this.loadCastGenerationContext(novelId, options);
    const generation = await runStructuredPrompt({
      asset: characterCastOptionPrompt,
      promptInput: {
        optionCount: 3,
      },
      contextBlocks: context.contextBlocks,
      options: {
        provider: options.provider,
        model: options.model,
        temperature: options.temperature ?? 0.5,
      },
    });

    let parsed = generation.output;

    let assessment = assessCharacterCastBatch(parsed.options, context.storyInput);
    if (assessment.autoApplicableOptionIndex === null) {
      parsed = await this.repairCharacterCastOptions({
        parsed,
        assessment,
        contextBlocks: context.contextBlocks,
        options,
      }).catch(() => parsed);
      assessment = assessCharacterCastBatch(parsed.options, context.storyInput);
    }

    await this.persistCharacterCastOptions(novelId, context.storyInput, parsed);
    return this.listCharacterCastOptions(novelId);
  }

  async applyCharacterCastOption(
    novelId: string,
    optionId: string,
    options: CharacterCastApplyOptions = {},
  ): Promise<CharacterCastApplyResult> {
    return this.castApplyHandler.applyCharacterCastOption(novelId, optionId, options);
  }

  async deleteCharacterCastOption(
    novelId: string,
    optionId: string,
  ): Promise<CharacterCastOptionDeleteResult> {
    const option = await prisma.characterCastOption.findFirst({
      where: { id: optionId, novelId },
      select: { id: true, status: true },
    });

    if (!option) {
      throw new Error("Character cast option not found.");
    }

    await prisma.characterCastOption.delete({
      where: { id: option.id },
    });

    const remainingOptionCount = await prisma.characterCastOption.count({
      where: { novelId },
    });

    return {
      deletedOptionId: option.id,
      deletedAppliedOption: option.status === "applied",
      remainingOptionCount,
    };
  }

  async clearCharacterCastOptions(novelId: string): Promise<CharacterCastOptionClearResult> {
    const options = await prisma.characterCastOption.findMany({
      where: { novelId },
      select: { status: true },
    });

    if (options.length === 0) {
      return {
        deletedCount: 0,
        deletedAppliedCount: 0,
        remainingOptionCount: 0,
      };
    }

    const deletedAppliedCount = options.filter((option) => option.status === "applied").length;
    await prisma.characterCastOption.deleteMany({ where: { novelId } });

    return {
      deletedCount: options.length,
      deletedAppliedCount,
      remainingOptionCount: 0,
    };
  }

  async applySupplementalCharacter(
    novelId: string,
    candidate: SupplementalCharacterCandidate,
  ): Promise<SupplementalCharacterApplyResult> {
    return this.supplementalService.applySupplementalCharacter(novelId, candidate);
  }
}
