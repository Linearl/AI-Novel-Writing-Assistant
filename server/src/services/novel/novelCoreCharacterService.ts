import { prisma } from "../../db/prisma";
import { runStructuredPrompt } from "../../prompting/core/promptRunner";
import { invokeStructuredLlm } from "../../llm/structuredInvoke";
import { z } from "zod";
import {
  characterEvolutionPrompt,
  characterWorldCheckPrompt,
} from "../../prompting/prompts/novel/coreCharacter.prompts";
import { ragServices } from "../rag";
import { queueRagDelete, queueRagUpsert } from "./novelCoreSupport";
import { WorldContextGateway } from "./worldContext/WorldContextGateway";
import {
  CharacterInput,
  CharacterTimelineSyncOptions,
  extractCharacterEventLines,
  LLMGenerateOptions,
} from "./novelCoreShared";
import { zodCharacterImportResult } from "./novelCoreCharacterShared";
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import { serializeCharacterProhibitions } from "./characters/characterHardFacts";

const characterImportSchema = z.object({
  characters: z.array(zodCharacterImportResult),
});

export class NovelCoreCharacterService {
  private readonly worldContextGateway = new WorldContextGateway();

  async listCharacters(novelId: string) {
    return prisma.character.findMany({ where: { novelId }, orderBy: { createdAt: "asc" } });
  }

  async createCharacter(novelId: string, input: CharacterInput) {
    let payload: CharacterInput = { ...input };
    if (input.baseCharacterId) {
      const baseCharacter = await prisma.baseCharacter.findUnique({
        where: { id: input.baseCharacterId },
      });
      if (!baseCharacter) {
        throw new Error("基础角色不存在");
      }
      payload = {
        ...payload,
        personality: input.personality ?? baseCharacter.personality,
        background: input.background ?? baseCharacter.background,
        development: input.development ?? baseCharacter.development,
        appearance: input.appearance ?? baseCharacter.appearance ?? undefined,
      };
    }

    const { prohibitions, ...data } = payload;
    const created = await prisma.character.create({
      data: {
        novelId,
        ...data,
        ...(prohibitions ? { prohibitionsJson: serializeCharacterProhibitions(prohibitions) } : {}),
      },
    });
    queueRagUpsert("character", created.id);
    return created;
  }

  async updateCharacter(novelId: string, characterId: string, input: Partial<CharacterInput>) {
    const exists = await prisma.character.findFirst({
      where: { id: characterId, novelId },
      select: { id: true, currentState: true, currentGoal: true },
    });
    if (!exists) {
      throw new Error("角色不存在");
    }

    const hasStateChanged = typeof input.currentState === "string" && input.currentState !== exists.currentState;
    const hasGoalChanged = typeof input.currentGoal === "string" && input.currentGoal !== exists.currentGoal;
    const { prohibitions, ...data } = input;
    const updated = await prisma.character.update({
      where: { id: characterId },
      data: {
        ...data,
        ...(prohibitions ? { prohibitionsJson: serializeCharacterProhibitions(prohibitions) } : {}),
        ...(hasStateChanged || hasGoalChanged ? { lastEvolvedAt: new Date() } : {}),
      },
    });

    queueRagUpsert("character", updated.id);
    return updated;
  }

  async deleteCharacter(novelId: string, characterId: string) {
    queueRagDelete("character", characterId);
    const deleted = await prisma.character.deleteMany({ where: { id: characterId, novelId } });
    if (deleted.count === 0) {
      throw new Error("角色不存在");
    }
  }

  async listCharacterTimeline(novelId: string, characterId: string) {
    return prisma.characterTimeline.findMany({
      where: { novelId, characterId },
      orderBy: [{ chapterOrder: "asc" }, { createdAt: "asc" }],
    });
  }

  async syncCharacterTimeline(
    novelId: string,
    characterId: string,
    options: CharacterTimelineSyncOptions = {},
  ) {
    const character = await prisma.character.findFirst({
      where: { id: characterId, novelId },
    });
    if (!character) {
      throw new Error("角色不存在");
    }

    const chapters = await prisma.chapter.findMany({
      where: {
        novelId,
        ...(typeof options.startOrder === "number" || typeof options.endOrder === "number"
          ? {
            order: {
              gte: options.startOrder ?? undefined,
              lte: options.endOrder ?? undefined,
            },
          }
          : {}),
      },
      orderBy: { order: "asc" },
      select: {
        id: true,
        order: true,
        title: true,
        content: true,
      },
    });

    const events: Array<{
      novelId: string;
      characterId: string;
      chapterId: string;
      chapterOrder: number;
      title: string;
      content: string;
      source: string;
    }> = [];

    for (const chapter of chapters) {
      const content = chapter.content ?? "";
      if (!content) {
        continue;
      }
      const lines = extractCharacterEventLines(content, character.name, 3);
      for (const line of lines) {
        events.push({
          novelId,
          characterId,
          chapterId: chapter.id,
          chapterOrder: chapter.order,
          title: `${chapter.order} · ${chapter.title}`,
          content: line,
          source: "chapter_extract",
        });
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.characterTimeline.deleteMany({
        where: {
          novelId,
          characterId,
          source: "chapter_extract",
          ...(typeof options.startOrder === "number" || typeof options.endOrder === "number"
            ? {
              chapterOrder: {
                gte: options.startOrder ?? undefined,
                lte: options.endOrder ?? undefined,
              },
            }
            : {}),
        },
      });
      if (events.length > 0) {
        await tx.characterTimeline.createMany({
          data: events,
        });
      }
    });

    const total = await prisma.characterTimeline.count({
      where: { novelId, characterId },
    });

    return {
      characterId,
      syncedCount: events.length,
      totalTimelineCount: total,
    };
  }

  async syncAllCharacterTimeline(novelId: string, options: CharacterTimelineSyncOptions = {}) {
    const characters = await prisma.character.findMany({
      where: { novelId },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    if (characters.length === 0) {
      return {
        characterCount: 0,
        syncedCount: 0,
        details: [] as Array<{ characterId: string; syncedCount: number; totalTimelineCount: number }>,
      };
    }

    const details = await Promise.all(
      characters.map((character) => this.syncCharacterTimeline(novelId, character.id, options)),
    );
    const syncedCount = details.reduce((sum, item) => sum + item.syncedCount, 0);

    return {
      characterCount: characters.length,
      syncedCount,
      details,
    };
  }

  async evolveCharacter(
    novelId: string,
    characterId: string,
    options: LLMGenerateOptions = {},
  ) {
    const [novel, character, timelines] = await Promise.all([
      prisma.novel.findUnique({
        where: { id: novelId },
        include: { bible: true },
      }),
      prisma.character.findFirst({
        where: { id: characterId, novelId },
      }),
      prisma.characterTimeline.findMany({
        where: { novelId, characterId },
        orderBy: [{ chapterOrder: "desc" }, { createdAt: "desc" }],
        take: 20,
      }),
    ]);

    if (!novel || !character) {
      throw new Error("小说或角色不存在");
    }

    const timelineText = timelines.length > 0
      ? timelines
        .map((item) => `${item.title}: ${item.content}`)
        .join("\n")
      : "暂无时间线事件";

    let ragContext = "";
    try {
      ragContext = await ragServices.hybridRetrievalService.buildContextBlock(
        `角色演进 ${character.name}\n${timelineText}`,
        {
          novelId,
          ownerTypes: ["character", "character_timeline", "chapter_summary", "consistency_fact", "novel", "bible"],
          finalTopK: 6,
        },
      );
    } catch {
      ragContext = "";
    }

    const result = await runStructuredPrompt({
      asset: characterEvolutionPrompt,
      promptInput: {
        novelTitle: novel.title,
        bibleContent: novel.bible?.rawContent ?? "暂无",
        characterName: character.name,
        characterRole: character.role,
        personality: character.personality ?? "暂无",
        background: character.background ?? "暂无",
        development: character.development ?? "暂无",
        currentState: character.currentState ?? "暂无",
        currentGoal: character.currentGoal ?? "暂无",
        timelineText,
        ragContext: ragContext || "",
      },
      options: {
        provider: options.provider,
        model: options.model,
        temperature: options.temperature ?? 0.4,
      },
    });
    const parsed = result.output;

    const updated = await prisma.character.update({
      where: { id: characterId },
      data: {
        personality: parsed.personality ?? character.personality,
        background: parsed.background ?? character.background,
        development: parsed.development ?? character.development,
        currentState: parsed.currentState ?? character.currentState,
        currentGoal: parsed.currentGoal ?? character.currentGoal,
        lastEvolvedAt: new Date(),
      },
    });

    await prisma.characterTimeline.create({
      data: {
        novelId,
        characterId,
        title: `角色演进更新 · ${new Date().toLocaleString("zh-CN")}`,
        content: `状态：${updated.currentState ?? "暂无"}；目标：${updated.currentGoal ?? "暂无"}`,
        source: "ai_evolve",
      },
    });

    return updated;
  }

  async checkCharacterAgainstWorld(
    novelId: string,
    characterId: string,
    options: LLMGenerateOptions = {},
  ) {
    const [novel, character] = await Promise.all([
      prisma.novel.findUnique({
        where: { id: novelId },
        select: { id: true },
      }),
      prisma.character.findFirst({
        where: { id: characterId, novelId },
      }),
    ]);
    if (!novel || !character) {
      throw new Error("小说或角色不存在");
    }
    const worldContextBlock = await this.worldContextGateway.getWorldContextBlock(novelId, {
      purpose: "character",
      provider: options.provider,
      model: options.model,
      temperature: options.temperature,
    });
    if (!worldContextBlock) {
      return {
        status: "pass" as const,
        warnings: ["当前没有可用的本书世界上下文，无法执行严格世界规则检查。"],
        issues: [],
      };
    }

    const worldContext = worldContextBlock.promptBlock;
    try {
      const result = await runStructuredPrompt({
        asset: characterWorldCheckPrompt,
        promptInput: {
          worldContext,
          characterName: character.name,
          characterRole: character.role,
          personality: character.personality ?? "",
          background: character.background ?? "",
          development: character.development ?? "",
          currentState: character.currentState ?? "",
          currentGoal: character.currentGoal ?? "",
        },
        options: {
          provider: options.provider,
          model: options.model,
          temperature: options.temperature ?? 0.2,
        },
      });
      const parsed = result.output;

      return {
        status: parsed.status ?? "pass",
        warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      };
    } catch {
      return {
        status: "warn" as const,
        warnings: ["AI 检查失败，返回规则回退结果"],
        issues: [] as Array<{ severity: "warn" | "error"; message: string; suggestion?: string }>,
      };
    }
  }

  async importCharactersFromOutline(
    novelId: string,
    outlineText: string,
    options?: { provider?: LLMProvider; model?: string },
  ): Promise<z.infer<typeof zodCharacterImportResult>[]> {
    const systemPrompt = [
      "你是角色信息提取器。严格从素材文本中提取角色，禁止编造任何信息。",
      "",
      "【铁律】",
      "1. 只提取素材中明确出现的角色。角色名必须逐字抄录，不得改写、翻译或近似",
      "2. 如果素材没有提到某字段，该字段留空字符串，不得猜测",
      "3. 素材中没提到的角色一个都不要加",
      "",
      "【字段说明】",
      "name: 角色姓名，逐字从原文摘录",
      "role: 角色定位，原文明确说了的才填（如\"主角\"、\"反派\"、\"女主\"），不确定填\"未指定\"",
      "gender: male/female/other/unknown",
      "personality: 性格描述，原文明确提到的才填",
      "background: 背景/身世摘要，只填原文已有的",
      "relationToProtagonist: 与主角的关系，原文提了才填",
      "storyFunction: 故事中承担的功能/作用，原文提了才填",
      "",
      "输出纯 JSON：{\"characters\": [...]}",
    ].join("\n");

    const userPrompt = `请从以下素材中提取所有角色信息：\n\n---\n${outlineText.slice(0, 8000)}\n---`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userPrompt },
    ];

    const result = await invokeStructuredLlm<{ characters: z.infer<typeof zodCharacterImportResult>[] }>({
      systemPrompt,
      userPrompt,
      schema: characterImportSchema,
      label: "novel.character.import-from-outline",
      taskType: "planner",
      temperature: 0.2,
      provider: options?.provider as LLMProvider | undefined,
      model: options?.model,
    });

    const created: z.infer<typeof zodCharacterImportResult>[] = [];
    for (const char of result.characters) {
      await this.createCharacter(novelId, {
        name: char.name,
        role: char.role,
        gender: char.gender,
        personality: char.personality,
        background: char.background,
        relationToProtagonist: char.relationToProtagonist,
        storyFunction: char.storyFunction,
      });
      created.push(char);
    }
    return created;
  }
}
