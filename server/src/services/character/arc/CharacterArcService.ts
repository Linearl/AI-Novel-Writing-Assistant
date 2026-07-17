import type { CharacterArcData } from "@ai-novel/shared";
import { prisma } from "../../../db/prisma";

export class CharacterArcService {
  async getCharacterForArc(novelId: string, characterId: string) {
    const character = await prisma.character.findUnique({
      where: { id: characterId },
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
    if (!character || character.novelId !== novelId) {
      return null;
    }
    return character;
  }

  async getTimeline(novelId: string, characterId: string, fromChapter?: number, toChapter?: number) {
    const chapterWhere: Record<string, unknown> = {
      characterId,
      novelId,
    };
    if (typeof fromChapter === "number" || typeof toChapter === "number") {
      chapterWhere.chapterOrder = {
        ...(typeof fromChapter === "number" ? { gte: fromChapter } : {}),
        ...(typeof toChapter === "number" ? { lte: toChapter } : {}),
      };
    }

    return prisma.characterTimeline.findMany({
      where: chapterWhere,
      orderBy: [{ chapterOrder: "asc" }, { createdAt: "asc" }],
      select: {
        chapterOrder: true,
        title: true,
        content: true,
      },
    });
  }

  async getCharacterForRelations(novelId: string, characterId: string) {
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { id: true, novelId: true },
    });
    if (!character || character.novelId !== novelId) {
      return null;
    }
    return character;
  }

  async getRelationStages(novelId: string, characterId: string) {
    return prisma.characterRelationStage.findMany({
      where: {
        novelId,
        OR: [
          { sourceCharacterId: characterId },
          { targetCharacterId: characterId },
        ],
      },
      orderBy: [{ chapterOrder: "asc" }, { createdAt: "asc" }],
      include: {
        sourceCharacter: { select: { name: true } },
        targetCharacter: { select: { name: true } },
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
  }

  buildArcData(
    character: NonNullable<Awaited<ReturnType<typeof this.getCharacterForArc>>>,
    timelineRows: Awaited<ReturnType<typeof this.getTimeline>>,
  ): CharacterArcData {
    return {
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
    };
  }

  buildRelationData(
    characterId: string,
    stageRows: Awaited<ReturnType<typeof this.getRelationStages>>,
  ) {
    const stages = stageRows.map((row) => ({
      stageLabel: row.stageLabel,
      stageSummary: row.stageSummary,
      chapterOrder: row.chapterOrder ?? null,
      trustScore: row.relation?.trustScore ?? null,
      conflictScore: row.relation?.conflictScore ?? null,
      intimacyScore: row.relation?.intimacyScore ?? null,
      dependencyScore: row.relation?.dependencyScore ?? null,
      sourceType: row.sourceType,
      isCurrent: row.isCurrent,
      nextTurnPoint: row.nextTurnPoint ?? null,
      partnerName:
        row.sourceCharacterId === characterId
          ? row.targetCharacter?.name ?? "未知"
          : row.sourceCharacter?.name ?? "未知",
    }));

    const partnerMap = new Map<string, typeof stages>();
    for (const stage of stages) {
      const existing = partnerMap.get(stage.partnerName) ?? [];
      existing.push(stage);
      partnerMap.set(stage.partnerName, existing);
    }

    const relations = Array.from(partnerMap.entries()).map(([partnerName, partnerStages]) => ({
      partnerName,
      stages: partnerStages,
    }));

    return {
      characterId,
      relationCount: relations.length,
      totalStageCount: stages.length,
      relations,
    };
  }
}

export const characterArcService = new CharacterArcService();
