/**
 * REQ-7056: Character consistency — HTTP API routes.
 *
 * Endpoints (relative to /api/novels):
 *   POST   /:novelId/chapters/:chapterNumber/character-consistency/check   — run check
 *   GET    /:novelId/characters/:characterId/character-consistency/states  — state history
 *   GET    /:novelId/character-consistency/contradictions                  — list contradictions
 *   GET    /:novelId/chapters/:chapterNumber/character-consistency/score   — chapter score
 *   GET    /:novelId/character-consistency/report                          — novel-level report
 *   PUT    /:novelId/character-consistency/contradictions/:id/resolve      — resolve contradiction
 */
import { Router } from "express";
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import type { ApiResponse } from "@ai-novel/shared";
import { validate } from "../../../../middleware/validate";
import { characterConsistencyModule } from "../CharacterConsistencyModule";

// ── Zod schemas ────────────────────────────────────────────────────────

const novelParamsSchema = z.object({ novelId: z.string().min(1) });

const chapterCheckParamsSchema = z.object({
  novelId: z.string().min(1),
  chapterNumber: z.coerce.number().int().positive(),
});

const characterStateParamsSchema = z.object({
  novelId: z.string().min(1),
  characterId: z.string().min(1),
});

const contradictionIdParamsSchema = z.object({
  novelId: z.string().min(1),
  id: z.string().min(1),
});

const contradictionQuerySchema = z.object({
  characterId: z.string().optional(),
  type: z.enum(["appearance", "personality", "ability", "relationship", "location"]).optional(),
  severity: z.enum(["hard", "soft"]).optional(),
  resolved: z.enum(["true", "false"]).optional(),
});

const checkBodySchema = z.object({
  chapterContent: z.string().min(1),
});

const resolveBodySchema = z.object({
  note: z.string().max(2000).optional(),
});

// ── Router factory ─────────────────────────────────────────────────────

export function createCharacterConsistencyRoutes(): Router {
  const router = Router();

  type P = Record<string, string>;

  // ── POST /:novelId/chapters/:chapterNumber/character-consistency/check ──

  router.post(
    "/:novelId/chapters/:chapterNumber/character-consistency/check",
    validate({ params: chapterCheckParamsSchema, body: checkBodySchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { novelId, chapterNumber } = req.params as unknown as z.infer<typeof chapterCheckParamsSchema>;
        const { chapterContent } = req.body as z.infer<typeof checkBodySchema>;
        const result = await characterConsistencyModule.runCheck(novelId, chapterNumber, chapterContent);
        const response: ApiResponse<typeof result> = { success: true, data: result };
        res.json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  // ── GET /:novelId/characters/:characterId/character-consistency/states ──

  router.get(
    "/:novelId/characters/:characterId/character-consistency/states",
    validate({ params: characterStateParamsSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { novelId, characterId } = req.params as unknown as z.infer<typeof characterStateParamsSchema>;
        const data = await characterConsistencyModule.getStateHistory(novelId, characterId);
        const response: ApiResponse<typeof data> = { success: true, data };
        res.json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  // ── GET /:novelId/character-consistency/contradictions ──

  router.get(
    "/:novelId/character-consistency/contradictions",
    validate({ params: novelParamsSchema, query: contradictionQuerySchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { novelId } = req.params as P;
        const query = req.query as z.infer<typeof contradictionQuerySchema>;
        const filter = {
          ...(query.characterId && { characterId: query.characterId }),
          ...(query.type && { type: query.type }),
          ...(query.severity && { severity: query.severity }),
          ...(query.resolved && { resolved: query.resolved === "true" }),
        };
        const data = await characterConsistencyModule.getNovelContradictions(novelId, filter);
        const response: ApiResponse<typeof data> = { success: true, data };
        res.json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  // ── GET /:novelId/chapters/:chapterNumber/character-consistency/score ──

  router.get(
    "/:novelId/chapters/:chapterNumber/character-consistency/score",
    validate({ params: chapterCheckParamsSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { novelId, chapterNumber } = req.params as unknown as z.infer<typeof chapterCheckParamsSchema>;
        const data = await characterConsistencyModule.getChapterScore(novelId, chapterNumber);
        if (!data) {
          res.status(404).json({ success: false, error: "该章节暂无一致性评分" });
          return;
        }
        const response: ApiResponse<typeof data> = { success: true, data };
        res.json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  // ── GET /:novelId/character-consistency/report ──

  router.get(
    "/:novelId/character-consistency/report",
    validate({ params: novelParamsSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { novelId } = req.params as P;
        const data = await characterConsistencyModule.getNovelReport(novelId);
        const response: ApiResponse<typeof data> = { success: true, data };
        res.json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  // ── PUT /:novelId/character-consistency/contradictions/:id/resolve ──

  router.put(
    "/:novelId/character-consistency/contradictions/:id/resolve",
    validate({ params: contradictionIdParamsSchema, body: resolveBodySchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params as P;
        const { note } = req.body as z.infer<typeof resolveBodySchema>;
        const data = await characterConsistencyModule.resolveContradiction(id, note);
        if (!data) {
          res.status(404).json({ success: false, error: "矛盾记录不存在" });
          return;
        }
        const response: ApiResponse<typeof data> = { success: true, data };
        res.json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
