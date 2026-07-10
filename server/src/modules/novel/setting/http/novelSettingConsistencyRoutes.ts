/**
 * REQ-2038: Setting consistency check — API routes.
 *
 * Endpoints (relative to /api/novels):
 *   POST /:novelId/settings/consistency-check   — trigger async check (returns 202)
 *   GET  /:novelId/settings/consistency-report   — return latest report
 *   POST /:novelId/settings/consistency-report/ignore — ignore a contradiction
 */
import { Router } from "express";
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import type { ApiResponse } from "@ai-novel/shared";
import { validate } from "../../../../middleware/validate";
import { settingConsistencyService } from "../../../../services/setting/settingConsistencyService";

/* ── Zod schemas ───────────────────────────────────────────────────── */

const novelIdParamsSchema = z.object({ novelId: z.string().min(1) });

const checkConsistencyBodySchema = z.object({
  settings: z.record(z.string(), z.unknown()),
  provider: z.string().optional(),
  model: z.string().optional(),
});

const ignoreBodySchema = z.object({
  contradictionId: z.string().min(1),
  reason: z.string().max(500).optional(),
});

/* ── Router factory ────────────────────────────────────────────────── */

export function createNovelSettingConsistencyRoutes(): Router {
  const router = Router();

  type P = Record<string, string>;

  /**
   * POST /:novelId/settings/consistency-check
   * Trigger an async consistency check. Returns 202 Accepted immediately.
   * The client should poll GET .../consistency-report for results.
   *
   * In practice this awaits the LLM call and returns the report directly
   * for Phase 1 simplicity; a future iteration can make it truly async.
   */
  router.post(
    "/:novelId/settings/consistency-check",
    validate({ params: novelIdParamsSchema, body: checkConsistencyBodySchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { novelId } = req.params as P;
        const { settings, provider, model } = req.body as z.infer<typeof checkConsistencyBodySchema>;

        const report = await settingConsistencyService.checkConsistency(
          novelId,
          settings,
          { provider, model },
        );

        res.status(200).json({
          success: true,
          data: report,
          message: "设定一致性校验完成。",
        } satisfies ApiResponse<typeof report>);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * GET /:novelId/settings/consistency-report
   * Return the latest consistency report for a novel.
   */
  router.get(
    "/:novelId/settings/consistency-report",
    validate({ params: novelIdParamsSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { novelId } = req.params as P;
        const report = await settingConsistencyService.getReport(novelId);

        if (!report) {
          res.status(404).json({
            success: false,
            error: "暂无校验报告，请先执行一致性校验。",
          } satisfies ApiResponse<never>);
          return;
        }

        res.status(200).json({
          success: true,
          data: report,
          message: "校验报告加载成功。",
        } satisfies ApiResponse<typeof report>);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * POST /:novelId/settings/consistency-report/ignore
   * Mark a contradiction as ignored.
   */
  router.post(
    "/:novelId/settings/consistency-report/ignore",
    validate({ params: novelIdParamsSchema, body: ignoreBodySchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { novelId } = req.params as P;
        const { contradictionId, reason } = req.body as z.infer<typeof ignoreBodySchema>;

        await settingConsistencyService.ignoreContradiction(
          novelId,
          contradictionId,
          reason,
        );

        res.status(200).json({
          success: true,
          message: "已忽略该矛盾项。",
        } satisfies ApiResponse<void>);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
