import type {
  Character,
  CharacterGender,
  CharacterCastRole,
  SupplementalCharacterApplyResult,
  SupplementalCharacterCandidate,
  SupplementalCharacterGenerateInput,
  SupplementalCharacterGenerationResult,
} from "@ai-novel/shared";
import { prisma } from "../../../db/prisma";
import { runStructuredPrompt } from "../../../prompting/core/promptRunner";
import { buildSupplementalCharacterContextBlocks } from "../../../prompting/prompts/novel/characterPreparation.contextBlocks";
import {
  supplementalCharacterPrompt,
} from "../../../prompting/prompts/novel/characterPreparation.prompts";
import { NovelContextService } from "../NovelContextService";
import { CharacterDynamicsService } from "../dynamics/CharacterDynamicsService";
import { loadPrompt } from "../../../data/prompts";
import {
  supplementalCharacterCandidateSchema,
  supplementalCharacterGenerationResponseSchema,
  type SupplementalCharacterGenerationResponseParsed,
} from "../../../prompting/prompts/novel/characterPreparation.promptSchemas";
import { buildStoryModePromptBlock, normalizeStoryModeOutput } from "../../storyMode/storyModeProfile";
import { parseCharacterProhibitionsJson } from "../characters/characterHardFacts";
import { WorldContextGateway } from "../worldContext/WorldContextGateway";
import { invokeStructuredLlm } from "../../../llm/structuredInvoke";
import type { LLMProvider } from "@ai-novel/shared";
import { z } from "zod";

const nameExtractionSchema = z.object({
  names: z.array(z.string()),
});

/**
 * 从候选角色文本中提取所有人名，校验是否都在合法名称集合内。
 * 返回不合法的人名列表。
 */
function extractInvalidNames(
  candidates: z.infer<typeof supplementalCharacterCandidateSchema>[],
  validNames: Set<string>,
): string[] {
  const invalidNames: string[] = [];
  for (const candidate of candidates) {
    // 从 relations 的 sourceName/targetName 检查
    for (const rel of candidate.relations) {
      if (rel.sourceName && !validNames.has(rel.sourceName) && rel.sourceName !== candidate.name) {
        invalidNames.push(rel.sourceName);
      }
      if (rel.targetName && !validNames.has(rel.targetName) && rel.targetName !== candidate.name) {
        invalidNames.push(rel.targetName);
      }
    }
  }
  return [...new Set(invalidNames)];
}

type CharacterRowForOutput = Awaited<ReturnType<typeof prisma.character.create>>;

const SUPPLEMENTAL_MODE_PROMPT_LABELS: Record<NonNullable<SupplementalCharacterGenerateInput["mode"]>, string> = {
  auto: "由 AI 自行判断最合适的补位方式",
  linked: "围绕现有角色衍生关系角色",
  independent: "生成相对独立但仍有明确故事作用的角色",
};

const CAST_ROLE_PROMPT_LABELS: Record<CharacterCastRole | "auto", string> = {
  auto: "由 AI 自行判断",
  protagonist: "主角",
  antagonist: "主对手",
  ally: "同盟",
  foil: "镜像角色",
  mentor: "导师",
  love_interest: "情感牵引",
  pressure_source: "压力源",
  catalyst: "催化者",
};

function getCastRolePromptLabel(castRole: string | null | undefined): string {
  if (!castRole) {
    return "未指定";
  }
  if (castRole in CAST_ROLE_PROMPT_LABELS) {
    return CAST_ROLE_PROMPT_LABELS[castRole as CharacterCastRole | "auto"];
  }
  return castRole;
}

function toOptionalText(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return normalized || null;
}

/**
 * 用编辑距离做模糊匹配，修正 LLM 生成的幻觉人名。
 * 如 "沈念" → 匹配到 "沈玫"（编辑距离 1），"江也" → 匹配到 "江夜"（编辑距离 1）。
 * 阈值：名称长度 <=2 时距离必须为 1，>2 时距离 <=1 且前缀相同。
 */
function fuzzyResolveName(
  hallucinatedName: string,
  candidates: Map<string, string>,
): string | null {
  const exact = candidates.get(hallucinatedName);
  if (exact) return hallucinatedName;

  let bestName: string | null = null;
  let bestDist = Infinity;
  for (const [candidateName] of candidates) {
    const dist = editDistance(hallucinatedName, candidateName);
    if (dist < bestDist) {
      bestDist = dist;
      bestName = candidateName;
    }
  }

  if (bestDist === 0) return bestName;
  if (hallucinatedName.length <= 2 && bestDist <= 1) return bestName;
  if (hallucinatedName.length > 2 && bestDist <= 1 && bestName && bestName[0] === hallucinatedName[0]) return bestName;
  return null;
}

function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function serializeCharacter(row: CharacterRowForOutput): Character {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    gender: row.gender as CharacterGender | null,
    castRole: row.castRole as CharacterCastRole | null,
    tier: (row as { tier?: string | null }).tier as Character["tier"],
    storyFunction: row.storyFunction,
    relationToProtagonist: row.relationToProtagonist,
    personality: row.personality,
    background: row.background,
    development: row.development,
    identityLabel: row.identityLabel,
    factionLabel: row.factionLabel,
    stanceLabel: row.stanceLabel,
    powerLevel: row.powerLevel,
    realm: row.realm,
    currentLocation: row.currentLocation,
    availability: row.availability,
    prohibitions: parseCharacterProhibitionsJson(row.prohibitionsJson),
    prohibitionsJson: row.prohibitionsJson,
    outerGoal: row.outerGoal,
    innerNeed: row.innerNeed,
    fear: row.fear,
    wound: row.wound,
    misbelief: row.misbelief,
    secret: row.secret,
    moralLine: row.moralLine,
    firstImpression: row.firstImpression,
    arcStart: row.arcStart,
    arcMidpoint: row.arcMidpoint,
    arcClimax: row.arcClimax,
    arcEnd: row.arcEnd,
    currentState: row.currentState,
    currentGoal: row.currentGoal,
    lastEvolvedAt: row.lastEvolvedAt?.toISOString() ?? null,
    novelId: row.novelId,
    baseCharacterId: row.baseCharacterId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toPromptFallback(value: string | null | undefined, fallback: string): string {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : fallback;
}

export class CharacterPreparationSupplementalService {
  constructor(
    private readonly novelContextService: NovelContextService,
    private readonly characterDynamicsService: CharacterDynamicsService,
    private readonly worldContextGateway = new WorldContextGateway(),
  ) {}

  async generateSupplementalCharacters(
    novelId: string,
    options: SupplementalCharacterGenerateInput = {},
  ): Promise<SupplementalCharacterGenerationResult> {
    const mode = options.mode ?? "auto";
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
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            role: true,
            gender: true,
            castRole: true,
            storyFunction: true,
            relationToProtagonist: true,
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
            outerGoal: true,
            currentState: true,
            currentGoal: true,
          },
        },
        characterRelations: {
          orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
          include: {
            sourceCharacter: { select: { id: true, name: true } },
            targetCharacter: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!novel) {
      throw new Error("Novel not found.");
    }

    const anchorIds = Array.from(new Set((options.anchorCharacterIds ?? []).filter(Boolean)));
    const storyInput = novel.storyMacroPlan?.storyInput?.trim() || novel.description?.trim() || "";
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
    const anchorCharacters = novel.characters.filter((character) => anchorIds.includes(character.id));
    const relevantRelations = anchorCharacters.length > 0
      ? novel.characterRelations.filter(
        (relation) => anchorIds.includes(relation.sourceCharacterId) || anchorIds.includes(relation.targetCharacterId),
      )
      : novel.characterRelations.slice(0, 12);
    const targetCountText = typeof options.count === "number"
      ? `本次必须生成 ${options.count} 个候选角色。`
      : "如果用户没有指定数量，请根据当前角色网络的缺口，自行判断更适合生成 1 个、2 个还是 3 个候选，并把建议数量写入 recommendedCount。";
    const contextBlocks = buildSupplementalCharacterContextBlocks({
      projectTitle: novel.title,
      modeLabel: `${mode}（${SUPPLEMENTAL_MODE_PROMPT_LABELS[mode]}）`,
      targetRoleLabel: `${options.targetCastRole ?? "auto"}（${getCastRolePromptLabel(options.targetCastRole ?? "auto")}）`,
      requestedCountText: targetCountText,
      userPrompt: toPromptFallback(options.userPrompt, "无"),
      storyInput: toPromptFallback(
        novel.storyMacroPlan?.storyInput?.trim() || novel.description?.trim(),
        "暂无明确故事输入，请结合题材、本书世界和已有角色自行推断补位方向。",
      ),
      genreName: novel.genre?.name ?? "未指定",
      storyModeBlock,
      styleTone: novel.styleTone ?? "未指定",
      narrativePov: novel.narrativePov ?? "未指定",
      pacePreference: novel.pacePreference ?? "未指定",
      emotionIntensity: novel.emotionIntensity ?? "未指定",
      corePromise: novel.bible?.mainPromise ?? "暂无",
      coreSetting: novel.bible?.coreSetting ?? "暂无",
      characterArcs: novel.bible?.characterArcs ?? "暂无",
      worldRules: worldContext?.worldRulesText ?? "暂无",
      worldStage: worldContext?.worldStageText ?? "本书世界未整理，请优先根据故事输入和书级约束推断人物舞台。",
      worldFocusHints: options.useWorldContext === false ? null : options.worldFocusHints,
      storyDecomposition: novel.storyMacroPlan?.decompositionJson ?? "暂无",
      constraintEngine: novel.storyMacroPlan?.constraintEngineJson ?? "暂无",
      existingCharactersText: novel.characters.length > 0
        ? novel.characters
          .map((character) => [
            `${character.name} (${character.role})`,
            character.castRole ? `阵容位=${getCastRolePromptLabel(character.castRole)} (${character.castRole})` : "",
            (character as { tier?: string | null }).tier ? `重要度=${(character as { tier?: string | null }).tier}` : "",
            character.storyFunction ? `故事作用=${character.storyFunction}` : "",
            character.relationToProtagonist ? `与主角关系=${character.relationToProtagonist}` : "",
            character.personality ? `性格=${character.personality}` : "",
            character.background ? `背景=${character.background}` : "",
            character.development ? `成长=${character.development}` : "",
            character.identityLabel ? `身份=${character.identityLabel}` : "",
            character.factionLabel ? `阵营=${character.factionLabel}` : "",
            character.stanceLabel ? `立场=${character.stanceLabel}` : "",
            character.powerLevel ? `境界=${character.powerLevel}` : "",
            character.realm ? `境界层=${character.realm}` : "",
            character.currentLocation ? `地点=${character.currentLocation}` : "",
            character.availability ? `可出场=${character.availability}` : "",
            character.prohibitionsJson ? `禁止=${parseCharacterProhibitionsJson(character.prohibitionsJson).join(" / ")}` : "",
            character.outerGoal ? `外在目标=${character.outerGoal}` : "",
            character.currentState ? `当前状态=${character.currentState}` : "",
            character.currentGoal ? `当前目标=${character.currentGoal}` : "",
          ].filter(Boolean).join(" | "))
          .join("\n")
        : "当前还没有已创建角色。",
      anchorCharactersText: anchorCharacters.length > 0
        ? anchorCharacters
          .map((character) => [
            `${character.name} (${character.role})`,
            character.storyFunction ? `故事作用=${character.storyFunction}` : "",
            character.relationToProtagonist ? `与主角关系=${character.relationToProtagonist}` : "",
            character.identityLabel ? `身份=${character.identityLabel}` : "",
            character.factionLabel ? `阵营=${character.factionLabel}` : "",
            character.powerLevel ? `境界=${character.powerLevel}` : "",
            character.currentState ? `当前状态=${character.currentState}` : "",
            character.currentGoal ? `当前目标=${character.currentGoal}` : "",
          ].filter(Boolean).join(" | "))
          .join("\n")
        : "当前没有明确选中的锚点角色。",
      relationsText: relevantRelations.length > 0
        ? relevantRelations
          .map((relation) => [
            `${relation.sourceCharacter.name} -> ${relation.targetCharacter.name}`,
            `表层关系=${relation.surfaceRelation}`,
            relation.hiddenTension ? `隐藏张力=${relation.hiddenTension}` : "",
            relation.conflictSource ? `冲突来源=${relation.conflictSource}` : "",
            relation.dynamicLabel ? `动态标签=${relation.dynamicLabel}` : "",
            relation.nextTurnPoint ? `下一步转折=${relation.nextTurnPoint}` : "",
          ].filter(Boolean).join(" | "))
          .join("\n")
        : "暂无。",
      forbiddenNames: novel.characters.map((character) => character.name),
    });

    const result = await runStructuredPrompt({
      asset: supplementalCharacterPrompt,
      promptInput: {},
      contextBlocks,
      options: {
        provider: options.provider,
        model: options.model,
        temperature: options.temperature ?? 0.55,
      },
    });
    const parsed = result.output;

    const requestedCount = typeof options.count === "number" ? options.count : null;
    let normalizedCandidates = (requestedCount ? parsed.candidates.slice(0, requestedCount) : parsed.candidates)
      .map((candidate) => supplementalCharacterCandidateSchema.parse(candidate))
      .slice(0, 3);

    // 校验循环：检查候选角色中引用的人名是否都在合法集合内，不通过则反馈 LLM 修正
    const validNames = new Set(novel.characters.map((c) => c.name));
    normalizedCandidates.forEach((c) => validNames.add(c.name));

    for (let round = 0; round < 3; round++) {
      const invalidNames = extractInvalidNames(normalizedCandidates, validNames);
      if (invalidNames.length === 0) break;

      console.log(`[supplemental] 校验第 ${round + 1} 轮：发现非法人名 ${invalidNames.join("、")}，请求 LLM 修正`);

      // 用 LLM 从描述文本中提取人名并一起校验
      const textNamesResult = await invokeStructuredLlm<{ names: string[] }>({
        systemPrompt: "从以下角色候选文本中提取所有人名（不含候选角色自身的名字）。只输出 JSON：{\"names\": [\"人名1\", \"人名2\"]}",
        userPrompt: normalizedCandidates.map((c) => [
          `角色名：${c.name}`,
          `摘要：${c.summary}`,
          `背景：${c.background}`,
          `故事作用：${c.storyFunction}`,
          `与主角关系：${c.relationToProtagonist}`,
        ].join("\n")).join("\n---\n"),
        schema: nameExtractionSchema,
        label: "novel.character.supplemental.name-extract",
        taskType: "planner",
        temperature: 0,
        provider: options?.provider as LLMProvider | undefined,
        model: options?.model,
      }).catch(() => ({ names: [] }));

      const allInvalidFromText = textNamesResult.names.filter((n) => !validNames.has(n));
      const allInvalid = [...new Set([...invalidNames, ...allInvalidFromText])];

      if (allInvalid.length === 0) break;

      // 发送修正请求
      const repairResult = await invokeStructuredLlm<SupplementalCharacterGenerationResponseParsed>({
        systemPrompt: [
          "你是角色修正编辑。以下角色候选中引用了不存在的人名，需要修正。",
          "",
          `合法角色名列表：${[...validNames].join("、")}`,
          "",
          `非法人名（必须替换为合法角色名或删除对应描述）：${allInvalid.join("、")}`,
          "",
          "修正要求：",
          "1. 将非法人名替换为最合理的合法角色名",
          "2. 如果某个关系的 sourceName 或 targetName 是非法人名，替换为最匹配的合法角色名",
          "3. 如果候选角色的描述中提到了非法人名，替换为合法角色名",
          "4. 不得引入新的非法人名",
          "5. 输出严格 JSON，保持原有结构",
        ].join("\n"),
        userPrompt: JSON.stringify({ candidates: normalizedCandidates }, null, 2),
        schema: supplementalCharacterGenerationResponseSchema,
        label: "novel.character.supplemental.repair",
        taskType: "planner",
        temperature: 0.2,
        provider: options?.provider as LLMProvider | undefined,
        model: options?.model,
      }).catch(() => null);

      if (repairResult?.candidates) {
        normalizedCandidates = repairResult.candidates
          .map((c: SupplementalCharacterGenerationResponseParsed["candidates"][number]) => supplementalCharacterCandidateSchema.parse(c))
          .slice(0, 3);
        // 更新合法名称集合
        normalizedCandidates.forEach((c) => validNames.add(c.name));
      } else {
        console.warn(`[supplemental] 校验第 ${round + 1} 轮 LLM 修正失败，保留当前结果`);
        break;
      }
    }

    return {
      mode: parsed.mode,
      recommendedCount: requestedCount ?? Math.min(Math.max(parsed.recommendedCount, 1), normalizedCandidates.length || 1),
      planningSummary: toOptionalText(parsed.planningSummary),
      candidates: normalizedCandidates.map((candidate) => ({
        name: candidate.name,
        role: candidate.role,
        gender: candidate.gender,
        castRole: candidate.castRole,
        tier: candidate.tier ?? "named",
        summary: candidate.summary,
        storyFunction: candidate.storyFunction,
        relationToProtagonist: toOptionalText(candidate.relationToProtagonist),
        personality: toOptionalText(candidate.personality),
        background: toOptionalText(candidate.background),
        development: toOptionalText(candidate.development),
        identityLabel: toOptionalText(candidate.identityLabel),
        factionLabel: toOptionalText(candidate.factionLabel),
        stanceLabel: toOptionalText(candidate.stanceLabel),
        powerLevel: toOptionalText(candidate.powerLevel),
        realm: toOptionalText(candidate.realm),
        currentLocation: toOptionalText(candidate.currentLocation),
        availability: toOptionalText(candidate.availability),
        prohibitions: candidate.prohibitions,
        outerGoal: toOptionalText(candidate.outerGoal),
        innerNeed: toOptionalText(candidate.innerNeed),
        fear: toOptionalText(candidate.fear),
        wound: toOptionalText(candidate.wound),
        misbelief: toOptionalText(candidate.misbelief),
        secret: toOptionalText(candidate.secret),
        moralLine: toOptionalText(candidate.moralLine),
        firstImpression: toOptionalText(candidate.firstImpression),
        currentState: toOptionalText(candidate.currentState),
        currentGoal: toOptionalText(candidate.currentGoal),
        whyNow: toOptionalText(candidate.whyNow),
        relations: candidate.relations.map((relation) => ({
          sourceName: relation.sourceName,
          targetName: relation.targetName,
          surfaceRelation: relation.surfaceRelation,
          hiddenTension: toOptionalText(relation.hiddenTension),
          conflictSource: toOptionalText(relation.conflictSource),
          dynamicLabel: toOptionalText(relation.dynamicLabel),
          nextTurnPoint: toOptionalText(relation.nextTurnPoint),
        })),
      })),
    };
  }

  async applySupplementalCharacter(
    novelId: string,
    candidate: SupplementalCharacterCandidate,
  ): Promise<SupplementalCharacterApplyResult> {
    const parsedCandidate = supplementalCharacterCandidateSchema.parse(candidate);
    const existingCharacters = await prisma.character.findMany({
      where: { novelId },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    });

    if (existingCharacters.some((character) => character.name === parsedCandidate.name)) {
      throw new Error(`角色「${parsedCandidate.name}」已存在，请重新生成或修改名称后再创建。`);
    }

    const created = await this.novelContextService.createCharacter(novelId, {
      name: parsedCandidate.name,
      role: parsedCandidate.role,
      gender: parsedCandidate.gender,
      castRole: parsedCandidate.castRole,
      tier: parsedCandidate.tier ?? undefined,
      storyFunction: parsedCandidate.storyFunction,
      relationToProtagonist: toOptionalText(parsedCandidate.relationToProtagonist) ?? undefined,
      personality: toOptionalText(parsedCandidate.personality) ?? undefined,
      background: toOptionalText(parsedCandidate.background) ?? undefined,
      development: toOptionalText(parsedCandidate.development) ?? undefined,
      identityLabel: toOptionalText(parsedCandidate.identityLabel) ?? undefined,
      factionLabel: toOptionalText(parsedCandidate.factionLabel) ?? undefined,
      stanceLabel: toOptionalText(parsedCandidate.stanceLabel) ?? undefined,
      powerLevel: toOptionalText(parsedCandidate.powerLevel) ?? undefined,
      realm: toOptionalText(parsedCandidate.realm) ?? undefined,
      currentLocation: toOptionalText(parsedCandidate.currentLocation) ?? undefined,
      availability: toOptionalText(parsedCandidate.availability) ?? undefined,
      prohibitions: parsedCandidate.prohibitions,
      outerGoal: toOptionalText(parsedCandidate.outerGoal) ?? undefined,
      innerNeed: toOptionalText(parsedCandidate.innerNeed) ?? undefined,
      fear: toOptionalText(parsedCandidate.fear) ?? undefined,
      wound: toOptionalText(parsedCandidate.wound) ?? undefined,
      misbelief: toOptionalText(parsedCandidate.misbelief) ?? undefined,
      secret: toOptionalText(parsedCandidate.secret) ?? undefined,
      moralLine: toOptionalText(parsedCandidate.moralLine) ?? undefined,
      firstImpression: toOptionalText(parsedCandidate.firstImpression) ?? undefined,
      currentState: toOptionalText(parsedCandidate.currentState) ?? undefined,
      currentGoal: toOptionalText(parsedCandidate.currentGoal) ?? undefined,
    });

    const characterIdByName = new Map(existingCharacters.map((character) => [character.name, character.id]));
    characterIdByName.set(created.name, created.id);

    const seenRelationKeys = new Set<string>();
    let relationCount = 0;
    let droppedCount = 0;
    for (const relation of parsedCandidate.relations) {
      // 模糊匹配修正 LLM 幻觉人名
      const resolvedSource = fuzzyResolveName(relation.sourceName, characterIdByName);
      const resolvedTarget = fuzzyResolveName(relation.targetName, characterIdByName);
      if (resolvedSource && resolvedSource !== relation.sourceName) {
        console.log(`[supplemental] 关系人名修正: "${relation.sourceName}" → "${resolvedSource}"`);
      }
      if (resolvedTarget && resolvedTarget !== relation.targetName) {
        console.log(`[supplemental] 关系人名修正: "${relation.targetName}" → "${resolvedTarget}"`);
      }
      const sourceCharacterId = resolvedSource ? characterIdByName.get(resolvedSource) : undefined;
      const targetCharacterId = resolvedTarget ? characterIdByName.get(resolvedTarget) : undefined;
      if (!sourceCharacterId || !targetCharacterId || sourceCharacterId === targetCharacterId) {
        console.warn(`[supplemental] 关系被丢弃: "${relation.sourceName}" → "${relation.targetName}" (无法匹配到已有角色)`);
        droppedCount += 1;
        continue;
      }
      const relationKey = `${sourceCharacterId}:${targetCharacterId}`;
      if (seenRelationKeys.has(relationKey)) {
        continue;
      }
      seenRelationKeys.add(relationKey);
      await prisma.characterRelation.upsert({
        where: {
          novelId_sourceCharacterId_targetCharacterId: {
            novelId,
            sourceCharacterId,
            targetCharacterId,
          },
        },
        create: {
          novelId,
          sourceCharacterId,
          targetCharacterId,
          surfaceRelation: relation.surfaceRelation,
          hiddenTension: toOptionalText(relation.hiddenTension),
          conflictSource: toOptionalText(relation.conflictSource),
          dynamicLabel: toOptionalText(relation.dynamicLabel),
          nextTurnPoint: toOptionalText(relation.nextTurnPoint),
        },
        update: {
          surfaceRelation: relation.surfaceRelation,
          hiddenTension: toOptionalText(relation.hiddenTension),
          conflictSource: toOptionalText(relation.conflictSource),
          dynamicLabel: toOptionalText(relation.dynamicLabel),
          nextTurnPoint: toOptionalText(relation.nextTurnPoint),
        },
      });
      relationCount += 1;
    }

    await this.characterDynamicsService.rebuildDynamics(novelId, {
      sourceType: "supplemental_character_projection",
    }).catch(() => null);

    return {
      character: serializeCharacter(created),
      relationCount,
    };
  }

  async refineSupplementalCharacter(
    novelId: string,
    candidate: SupplementalCharacterCandidate,
    adjustment: string,
    options?: { provider?: LLMProvider; model?: string },
  ): Promise<SupplementalCharacterCandidate> {
    const systemPrompt = loadPrompt("character.refine").system;

    const userPrompt = [
      "当前角色候选：",
      JSON.stringify(candidate, null, 2),
      "",
      "用户调整要求：",
      adjustment,
      "",
      "请输出调整后的完整角色 JSON（保持与输入相同的结构）。",
    ].join("\n");

    const result = await invokeStructuredLlm<SupplementalCharacterCandidate>({
      systemPrompt,
      userPrompt,
      schema: supplementalCharacterCandidateSchema,
      label: "novel.character.supplemental.refine",
      taskType: "planner",
      temperature: 0.3,
      provider: options?.provider as LLMProvider | undefined,
      model: options?.model,
    });

    // 确保姓名不被修改
    return { ...result, name: candidate.name };
  }
}
