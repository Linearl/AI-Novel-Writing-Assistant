/**
 * REQ-7048: Quality checker HTTP API routes.
 *
 * Endpoints (relative to /api/novels):
 *   POST /:novelId/chapters/:chapterId/quality/check — trigger quality check
 *   GET  /:novelId/chapters/:chapterId/quality/report — get latest report
 *   GET  /:novelId/quality/stats                    — get novel-wide quality stats
 */
import { Router } from "express";
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import type { ApiResponse } from "@ai-novel/shared";
import { validate } from "../../../../middleware/validate";
import { chapterQualityChecker } from "../../../../services/novel/quality";

/* ── Zod schemas ───────────────────────────────────────────────────── */

const novelIdParamsSchema = z.object({ novelId: z.string().min(1) });
const chapterParamsSchema = z.object({
  novelId: z.string().min(1),
  chapterId: z.string().min(1),
});

const checkBodySchema = z.object({
  config: z
    .object({
      wordCount: z
        .object({
          enabled: z.boolean().optional(),
          min: z.number().int().min(500).optional(),
          max: z.number().int().max(50000).optional(),
        })
        .optional(),
      structure: z
        .object({
          enabled: z.boolean().optional(),
          minParagraphs: z.number().int().min(1).optional(),
          maxDialogueRatio: z.number().min(0).max(1).optional(),
        })
        .optional(),
      character: z
        .object({
          enabled: z.boolean().optional(),
        })
        .optional(),
      plotCoherence: z
        .object({
          enabled: z.boolean().optional(),
          timeJumpThreshold: z.number().int().min(1).optional(),
        })
        .optional(),
    })
    .optional(),
});

/* ── Router factory ────────────────────────────────────────────────── */

export function createQualityCheckRoutes(): Router {
  const router = Router();

  type P = Record<string, string>;

  /**
   * POST /:novelId/chapters/:chapterId/quality/check
   * Trigger a quality check for a specific chapter.
   */
  router.post(
    "/novels/:novelId/chapters/:chapterId/quality/check",
    validate({ params: chapterParamsSchema, body: checkBodySchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { novelId, chapterId } = req.params as P;
        const body = req.body as z.infer<typeof checkBodySchema>;

        const report = await chapterQualityChecker.run(chapterId, novelId, body.config as Partial<import("../../../../services/novel/quality").QualityCheckConfig>);
        const response: ApiResponse<typeof report> = { success: true, data: report };
        res.status(200).json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * GET /:novelId/chapters/:chapterId/quality/report
   * Get the latest quality report for a chapter.
   */
  router.get(
    "/novels/:novelId/chapters/:chapterId/quality/report",
    validate({ params: chapterParamsSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { chapterId } = req.params as P;
        const report = await chapterQualityChecker.getReport(chapterId);

        if (!report) {
          res.status(404).json({
            success: false,
            error: "暂无质量报告，请先执行质量检查。",
          } satisfies ApiResponse<never>);
          return;
        }

        const response: ApiResponse<typeof report> = { success: true, data: report };
        res.status(200).json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * GET /:novelId/quality/stats
   * Get quality statistics for the entire novel.
   */
  router.get(
    "/novels/:novelId/quality/stats",
    validate({ params: novelIdParamsSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { novelId } = req.params as P;
        const stats = await chapterQualityChecker.getStats(novelId);
        const response: ApiResponse<typeof stats> = { success: true, data: stats };
        res.status(200).json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
