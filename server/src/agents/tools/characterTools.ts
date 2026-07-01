import { prisma } from "../../db/prisma";
import { characterDynamicsService } from "../../services/novel/dynamics/CharacterDynamicsService";
import { AgentToolError, type AgentToolName } from "../types";
import type { AgentToolDefinition } from "./toolTypes";
import {
  baseCharacterIdInputSchema,
  getBaseCharacterDetailOutputSchema,
  getCharacterArcInputSchema,
  getCharacterArcOutputSchema,
  getCharacterDynamicsOverviewInputSchema,
  getCharacterDynamicsOverviewOutputSchema,
  getCharacterRelationEvolutionInputSchema,
  getCharacterRelationEvolutionOutputSchema,
  getCharacterStatesByChapterInputSchema,
  getCharacterStatesByChapterOutputSchema,
  listBaseCharactersInputSchema,
  listBaseCharactersOutputSchema,
} from "./characterToolSchemas";

export const characterToolDefinitions: Partial<
  Record<AgentToolName, AgentToolDefinition<Record<string, unknown>, Record<string, unknown>>>
> = {
  list_base_characters: {
    name: "list_base_characters",
    title: "列出基础角色模板",
    description: "读取基础角色库的模板列表、分类和最近更新时间。",
    category: "read",
    riskLevel: "low",
    domainAgent: "CharacterAgent",
    resourceScopes: ["base_character"],
    parserHints: {
      intent: "list_base_characters",
      aliases: ["基础角色库", "角色模板库", "base characters"],
      phrases: ["列出基础角色库中的角色", "查看基础角色库", "角色库里有什么角色"],
      requiresNovelContext: false,
      whenToUse: "用户想查看全局基础角色模板库。",
      whenNotToUse: "用户问的是当前小说里已经规划的角色状态。",
    },
    inputSchema: listBaseCharactersInputSchema,
    outputSchema: listBaseCharactersOutputSchema,
    execute: async (_context, rawInput) => {
      const input = listBaseCharactersInputSchema.parse(rawInput);
      const rows = await prisma.baseCharacter.findMany({
        where: {
          ...(input.category ? { category: input.category } : {}),
          ...(input.search
            ? {
              OR: [
                { name: { contains: input.search } },
                { role: { contains: input.search } },
                { personality: { contains: input.search } },
                { background: { contains: input.search } },
                { tags: { contains: input.search } },
              ],
            }
            : {}),
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: input.limit ?? 20,
      });
      return listBaseCharactersOutputSchema.parse({
        items: rows.map((row) => ({
          id: row.id,
          name: row.name,
          role: row.role,
          category: row.category,
          tags: row.tags ?? "",
          updatedAt: row.updatedAt.toISOString(),
        })),
        summary: `已读取 ${rows.length} 个基础角色模板。`,
      });
    },
  },
  get_base_character_detail: {
    name: "get_base_character_detail",
    title: "读取基础角色详情",
    description: "读取基础角色模板的完整设定和成长信息。",
    category: "read",
    riskLevel: "low",
    domainAgent: "CharacterAgent",
    resourceScopes: ["base_character"],
    inputSchema: baseCharacterIdInputSchema,
    outputSchema: getBaseCharacterDetailOutputSchema,
    execute: async (_context, rawInput) => {
      const input = baseCharacterIdInputSchema.parse(rawInput);
      const row = await prisma.baseCharacter.findUnique({
        where: { id: input.characterId },
      });
      if (!row) {
        throw new AgentToolError("NOT_FOUND", "Base character not found.");
      }
      return getBaseCharacterDetailOutputSchema.parse({
        id: row.id,
        name: row.name,
        role: row.role,
        category: row.category,
        personality: row.personality,
        background: row.background,
        development: row.development,
        appearance: row.appearance ?? null,
        weaknesses: row.weaknesses ?? null,
        interests: row.interests ?? null,
        keyEvents: row.keyEvents ?? null,
        tags: row.tags ?? "",
        updatedAt: row.updatedAt.toISOString(),
        summary: `已读取角色模板《${row.name}》。`,
      });
    },
  },
  get_character_arc: {
    name: "get_character_arc",
    title: "读取角色弧光",
    description: "读取小说角色的弧光规划（起始/中点/高潮/终局）与按章节有序的事件时间线。",
    category: "read",
    riskLevel: "low",
    domainAgent: "CharacterAgent",
    resourceScopes: ["novel"],
    parserHints: {
      intent: "inspect_characters",
      aliases: ["角色弧光", "角色成长线", "character arc"],
      phrases: ["查看角色弧光", "角色成长轨迹", "这个角色的发展历程"],
      requiresNovelContext: true,
      whenToUse: "用户想查看某角色的弧光规划或事件时间线。",
      whenNotToUse: "用户问的是基础角色模板库。",
    },
    inputSchema: getCharacterArcInputSchema,
    outputSchema: getCharacterArcOutputSchema,
    execute: async (_context, rawInput) => {
      const input = getCharacterArcInputSchema.parse(rawInput);
      const character = await prisma.character.findUnique({
        where: { id: input.characterId },
        select: {
          id: true,
          name: true,
          role: true,
          arcStart: true,
          arcMidpoint: true,
          arcClimax: true,
          arcEnd: true,
          currentState: true,
          currentGoal: true,
          novelId: true,
        },
      });
      if (!character) {
        throw new AgentToolError("NOT_FOUND", "Character not found.");
      }
      if (character.novelId !== input.novelId) {
        throw new AgentToolError("NOT_FOUND", "Character does not belong to this novel.");
      }
      const timelineRows = await prisma.characterTimeline.findMany({
        where: { characterId: input.characterId, novelId: input.novelId },
        orderBy: [{ chapterOrder: "asc" }, { createdAt: "asc" }],
        select: {
          chapterOrder: true,
          title: true,
          content: true,
        },
      });
      return getCharacterArcOutputSchema.parse({
        characterId: character.id,
        name: character.name,
        role: character.role,
        arc: {
          arcStart: character.arcStart ?? null,
          arcMidpoint: character.arcMidpoint ?? null,
          arcClimax: character.arcClimax ?? null,
          arcEnd: character.arcEnd ?? null,
        },
        currentState: character.currentState ?? null,
        currentGoal: character.currentGoal ?? null,
        timeline: timelineRows.map((row) => ({
          chapterOrder: row.chapterOrder ?? null,
          title: row.title,
          event: row.content,
        })),
        summary: `已读取角色《${character.name}》弧光，共 ${timelineRows.length} 条时间线事件。`,
      });
    },
  },
  get_character_dynamics_overview: {
    name: "get_character_dynamics_overview",
    title: "读取角色动态概览",
    description: "读取小说全角色动态概览，包含各角色缺席风险、阵营分布和关系摘要。",
    category: "read",
    riskLevel: "low",
    domainAgent: "CharacterAgent",
    resourceScopes: ["novel"],
    parserHints: {
      intent: "inspect_characters",
      aliases: ["角色动态", "角色概览", "角色全局", "dynamics overview"],
      phrases: ["查看角色全局动态", "所有角色当前状态概览", "角色阵营和关系概览"],
      requiresNovelContext: true,
      whenToUse: "用户想查看全小说角色的动态概览。",
      whenNotToUse: "用户问的是单个角色的详情。",
    },
    inputSchema: getCharacterDynamicsOverviewInputSchema,
    outputSchema: getCharacterDynamicsOverviewOutputSchema,
    execute: async (_context, rawInput) => {
      const input = getCharacterDynamicsOverviewInputSchema.parse(rawInput);
      const overview = await characterDynamicsService.getOverview(input.novelId, {
        chapterOrder: input.chapterOrder,
      });
      return getCharacterDynamicsOverviewOutputSchema.parse({
        novelId: overview.novelId,
        summary: overview.summary,
        currentVolume: overview.currentVolume ?? null,
        characterCount: overview.characters.length,
        coreCharacterCount: overview.characters.filter((c) => c.isCoreInVolume).length,
        pendingCandidateCount: overview.pendingCandidateCount,
        relationStageCount: overview.relations.length,
        characters: overview.characters.map((c) => ({
          id: c.characterId,
          name: c.name,
          role: c.role,
          isCoreInVolume: c.isCoreInVolume,
          absenceRisk: c.absenceRisk,
          absenceSpan: c.absenceSpan,
          currentGoal: c.currentGoal ?? null,
          currentState: c.currentState ?? null,
          factionLabel: c.factionLabel ?? null,
          stanceLabel: c.stanceLabel ?? null,
        })),
        relations: overview.relations.map((r) => ({
          sourceCharacterName: r.sourceCharacterName,
          targetCharacterName: r.targetCharacterName,
          stageLabel: r.stageLabel,
          stageSummary: r.stageSummary,
          nextTurnPoint: r.nextTurnPoint ?? null,
        })),
      });
    },
  },
  get_character_relation_evolution: {
    name: "get_character_relation_evolution",
    title: "读取角色关系演化",
    description: "读取两个角色之间的关系演化时间线，包含各阶段信任/冲突/亲密度分数变化。",
    category: "read",
    riskLevel: "low",
    domainAgent: "CharacterAgent",
    resourceScopes: ["novel"],
    parserHints: {
      intent: "inspect_characters",
      aliases: ["关系演化", "角色关系变化", "relation evolution"],
      phrases: ["查看两个角色的关系变化", "A 和 B 的关系历程", "角色关系演化时间线"],
      requiresNovelContext: true,
      whenToUse: "用户想查看两个角色之间的关系演化历程。",
      whenNotToUse: "用户问的是单个角色的状态。",
    },
    inputSchema: getCharacterRelationEvolutionInputSchema,
    outputSchema: getCharacterRelationEvolutionOutputSchema,
    execute: async (_context, rawInput) => {
      const input = getCharacterRelationEvolutionInputSchema.parse(rawInput);
      const [charA, charB] = await Promise.all([
        prisma.character.findUnique({
          where: { id: input.characterIdA },
          select: { id: true, name: true },
        }),
        prisma.character.findUnique({
          where: { id: input.characterIdB },
          select: { id: true, name: true },
        }),
      ]);
      if (!charA) {
        throw new AgentToolError("NOT_FOUND", "Character A not found.");
      }
      if (!charB) {
        throw new AgentToolError("NOT_FOUND", "Character B not found.");
      }
      const stages = await prisma.characterRelationStage.findMany({
        where: {
          novelId: input.novelId,
          OR: [
            {
              sourceCharacterId: input.characterIdA,
              targetCharacterId: input.characterIdB,
            },
            {
              sourceCharacterId: input.characterIdB,
              targetCharacterId: input.characterIdA,
            },
          ],
        },
        orderBy: [
          { chapterOrder: "asc" },
          { createdAt: "asc" },
        ],
        select: {
          stageLabel: true,
          stageSummary: true,
          chapterOrder: true,
          sourceType: true,
          isCurrent: true,
          nextTurnPoint: true,
          relation: {
            select: {
              trustScore: true,
              conflictScore: true,
              intimacyScore: true,
              dependencyScore: true,
            },
          },
        },
      });
      return getCharacterRelationEvolutionOutputSchema.parse({
        characterA: charA.name,
        characterB: charB.name,
        stageCount: stages.length,
        stages: stages.map((s) => ({
          stageLabel: s.stageLabel,
          stageSummary: s.stageSummary,
          chapterOrder: s.chapterOrder ?? null,
          trustScore: s.relation?.trustScore ?? null,
          conflictScore: s.relation?.conflictScore ?? null,
          intimacyScore: s.relation?.intimacyScore ?? null,
          dependencyScore: s.relation?.dependencyScore ?? null,
          sourceType: s.sourceType,
          isCurrent: s.isCurrent,
          nextTurnPoint: s.nextTurnPoint ?? null,
        })),
        summary: `已读取 ${charA.name} 与 ${charB.name} 的关系演化，共 ${stages.length} 个阶段。`,
      });
    },
  },
  get_character_states_by_chapter: {
    name: "get_character_states_by_chapter",
    title: "读取角色章节状态",
    description: "读取角色按章节的情绪、压力和目标变化序列。",
    category: "read",
    riskLevel: "low",
    domainAgent: "CharacterAgent",
    resourceScopes: ["novel"],
    parserHints: {
      intent: "inspect_characters",
      aliases: ["角色章节状态", "情绪变化", "章节状态", "states by chapter"],
      phrases: ["查看角色每章状态变化", "角色情绪和目标变化", "角色各章节状态"],
      requiresNovelContext: true,
      whenToUse: "用户想查看某角色按章节的情绪/目标变化序列。",
      whenNotToUse: "用户问的是基础角色模板。",
    },
    inputSchema: getCharacterStatesByChapterInputSchema,
    outputSchema: getCharacterStatesByChapterOutputSchema,
    execute: async (_context, rawInput) => {
      const input = getCharacterStatesByChapterInputSchema.parse(rawInput);
      const character = await prisma.character.findUnique({
        where: { id: input.characterId },
        select: { id: true, name: true },
      });
      if (!character) {
        throw new AgentToolError("NOT_FOUND", "Character not found.");
      }
      const stateRows = await prisma.characterState.findMany({
        where: { characterId: input.characterId },
        include: {
          snapshot: {
            select: {
              sourceChapter: {
                select: { order: true, title: true },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });
      const states = stateRows.map((row) => ({
        chapterOrder: row.snapshot.sourceChapter?.order ?? null,
        chapterTitle: row.snapshot.sourceChapter?.title ?? null,
        emotion: row.emotion ?? null,
        stressLevel: row.stressLevel ?? null,
        currentGoal: row.currentGoal ?? null,
        summary: row.summary ?? null,
      }));
      return getCharacterStatesByChapterOutputSchema.parse({
        characterId: character.id,
        name: character.name,
        stateCount: states.length,
        states,
        summary: `已读取角色《${character.name}》${states.length} 个章节状态快照。`,
      });
    },
  },
};
