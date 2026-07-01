import type { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import type { CharacterArcData } from "@ai-novel/shared/types/characterArc";
import { z } from "zod";
import { validate } from "../../../../middleware/validate";
import { prisma } from "../../../../db/prisma";

const characterArcParamsSchema = z.object({
  id: z.string().trim().min(1),
  characterId: z.string().trim().min(1),
});

const characterArcQuerySchema = z.object({
  fromChapter: z.coerce.number().int().min(1).optional(),
  toChapter: z.coerce.number().int().min(1).optional(),
});

const characterRelationParamsSchema = z.object({
  id: z.string().trim().min(1),
  characterId: z.string().trim().min(1),
});

interface RegisterNovelCharacterArcRoutesInput {
  router: Router;
}

export function registerNovelCharacterArcRoutes(
  input: RegisterNovelCharacterArcRoutesInput,
): void {
  const { router } = input;

  /**
   * GET /novels/:novelId/characters/:characterId/arc
   * Returns a character's arc data including timeline events.
   */
  router.get(
    "/:id/characters/:characterId/arc",
    validate({ params: characterArcParamsSchema, query: characterArcQuerySchema }),
    async (req, res, next) => {
      try {
        const { id: novelId, characterId } = req.params as z.infer<typeof characterArcParamsSchema>;
        const query = characterArcQuerySchema.parse(req.query);

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
          res.status(404).json({
            success: false,
            data: null,
            message: "Character not found in this novel.",
          } satisfies ApiResponse<null>);
          return;
        }

        const chapterWhere: Record<string, unknown> = {
          characterId,
          novelId,
        };
        if (typeof query.fromChapter === "number" || typeof query.toChapter === "number") {
          chapterWhere.chapterOrder = {
            ...(typeof query.fromChapter === "number" ? { gte: query.fromChapter } : {}),
            ...(typeof query.toChapter === "number" ? { lte: query.toChapter } : {}),
          };
        }

        const timelineRows = await prisma.characterTimeline.findMany({
          where: chapterWhere,
          orderBy: [{ chapterOrder: "asc" }, { createdAt: "asc" }],
          select: {
            chapterOrder: true,
            title: true,
            content: true,
          },
        });

        const data: CharacterArcData = {
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

        res.status(200).json({
          success: true,
          data,
          message: `Character arc loaded (${timelineRows.length} timeline events).`,
        } satisfies ApiResponse<CharacterArcData>);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * GET /novels/:novelId/characters/:characterId/relations
   * Returns relation evolution stages involving this character.
   */
  router.get(
    "/:id/characters/:characterId/relations",
    validate({ params: characterRelationParamsSchema }),
    async (req, res, next) => {
      try {
        const { id: novelId, characterId } = req.params as z.infer<typeof characterRelationParamsSchema>;

        const character = await prisma.character.findUnique({
          where: { id: characterId },
          select: { id: true, novelId: true },
        });
        if (!character || character.novelId !== novelId) {
          res.status(404).json({
            success: false,
            data: null,
            message: "Character not found in this novel.",
          } satisfies ApiResponse<null>);
          return;
        }

        const stageRows = await prisma.characterRelationStage.findMany({
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

        const data = {
          characterId,
          relationCount: relations.length,
          totalStageCount: stages.length,
          relations,
        };

        res.status(200).json({
          success: true,
          data,
          message: `Loaded ${relations.length} relation(s), ${stages.length} total stages.`,
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );
}
