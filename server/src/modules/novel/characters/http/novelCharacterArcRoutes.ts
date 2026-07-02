import type { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import { z } from "zod";
import { validate } from "../../../../middleware/validate";
import { characterArcService } from "../../../../services/novel/characters/CharacterArcService";

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

        const character = await characterArcService.getCharacterForArc(novelId, characterId);
        if (!character) {
          res.status(404).json({
            success: false,
            data: null,
            message: "Character not found in this novel.",
          } satisfies ApiResponse<null>);
          return;
        }

        const timelineRows = await characterArcService.getTimeline(
          novelId,
          characterId,
          query.fromChapter,
          query.toChapter,
        );

        const data = characterArcService.buildArcData(character, timelineRows);

        res.status(200).json({
          success: true,
          data,
          message: `Character arc loaded (${timelineRows.length} timeline events).`,
        } satisfies ApiResponse<typeof data>);
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

        const character = await characterArcService.getCharacterForRelations(novelId, characterId);
        if (!character) {
          res.status(404).json({
            success: false,
            data: null,
            message: "Character not found in this novel.",
          } satisfies ApiResponse<null>);
          return;
        }

        const stageRows = await characterArcService.getRelationStages(novelId, characterId);
        const data = characterArcService.buildRelationData(characterId, stageRows);

        res.status(200).json({
          success: true,
          data,
          message: `Loaded ${data.relationCount} relation(s), ${data.totalStageCount} total stages.`,
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );
}
