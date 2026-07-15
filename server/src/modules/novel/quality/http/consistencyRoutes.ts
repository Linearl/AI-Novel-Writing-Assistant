/**
 * REQ-7051: Consistency monitor — HTTP API routes.
 *
 * Endpoints (relative to /api/novels):
 *   POST   /:novelId/chapters/:chapterId/consistency/check       — run check for a chapter
 *   POST   /:novelId/chapters/:chapterId/consistency/incremental — incremental re-check
 *   GET    /:novelId/chapters/:chapterId/consistency/violations   — list chapter violations
 *   GET    /:novelId/consistency/report                           — novel-level report
 *   PUT    /:novelId/consistency/violations/:violationId/resolve  — resolve a violation
 *   PUT    /:novelId/consistency/violations/:violationId/ignore   — ignore a violation
 */
import { Router } from "express";
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import type { ApiResponse } from "@ai-novel/shared";
import { validate } from "../../../../middleware/validate";
import { consistencyMonitor } from "../../../../services/novel/quality/ConsistencyMonitor";

/* ── Zod schemas ──────────────────────────────────────────────────────── */

const novelChapterParamsSchema = z.object({
  novelId: z.string().min(1),
  chapterId: z.string().min(1),
});

const novelViolationParamsSchema = z.object({
  novelId: z.string().min(1),
  violationId: z.string().min(1),
});

const checkBodySchema = z.object({
  lookbackChapters: z.number().int().min(1).max(20).optional(),
  enabled: z.boolean().optional(),
}).optional();

const resolveBodySchema = z.object({
  resolution: z.string().max(2000).optional(),
});

const ignoreBodySchema = z.object({
  reason: z.string().max(2000).optional(),
});

/* ── Router factory ──────────────────────────────────────────────────── */

export function createNovelConsistencyRoutes(): Router {
  const router = Router();

  type P = Record<string, string>;

  // ── Run consistency check for a chapter ──────────────────────────────

  router.post(
    "/:novelId/chapters/:chapterId/consistency/check",
    validate({ params: novelChapterParamsSchema, body: checkBodySchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { chapterId } = req.params as P;
        const config = req.body as z.infer<typeof checkBodySchema>;
        const report = await consistencyMonitor.check(chapterId, config ?? undefined);
        const response: ApiResponse<typeof report> = { success: true, data: report };
        res.json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  // ── Incremental re-check (delete + re-run) ──────────────────────────

  router.post(
    "/:novelId/chapters/:chapterId/consistency/incremental",
    validate({ params: novelChapterParamsSchema, body: checkBodySchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { chapterId } = req.params as P;
        const config = req.body as z.infer<typeof checkBodySchema>;
        const report = await consistencyMonitor.incrementalCheck(chapterId, config ?? undefined);
        const response: ApiResponse<typeof report> = { success: true, data: report };
        res.json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  // ── List chapter violations ──────────────────────────────────────────

  router.get(
    "/:novelId/chapters/:chapterId/consistency/violations",
    validate({ params: novelChapterParamsSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { chapterId } = req.params as P;
        const violations = await consistencyMonitor.getChapterViolations(chapterId);
        const response: ApiResponse<typeof violations> = { success: true, data: violations };
        res.json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  // ── Novel-level report ──────────────────────────────────────────────

  router.get(
    "/:novelId/consistency/report",
    validate({ params: z.object({ novelId: z.string().min(1) }) }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { novelId } = req.params as P;
        const report = await consistencyMonitor.getNovelReport(novelId);
        const response: ApiResponse<typeof report> = { success: true, data: report };
        res.json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  // ── Resolve violation ───────────────────────────────────────────────

  router.put(
    "/:novelId/consistency/violations/:violationId/resolve",
    validate({ params: novelViolationParamsSchema, body: resolveBodySchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { violationId } = req.params as P;
        const { resolution } = req.body as z.infer<typeof resolveBodySchema>;
        const violation = await consistencyMonitor.resolveViolation(violationId, resolution);
        if (!violation) {
          res.status(404).json({ success: false, error: "一致性问题不存在" });
          return;
        }
        const response: ApiResponse<typeof violation> = { success: true, data: violation };
        res.json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  // ── Ignore violation ────────────────────────────────────────────────

  router.put(
    "/:novelId/consistency/violations/:violationId/ignore",
    validate({ params: novelViolationParamsSchema, body: ignoreBodySchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { violationId } = req.params as P;
        const { reason } = req.body as z.infer<typeof ignoreBodySchema>;
        const violation = await consistencyMonitor.ignoreViolation(violationId, reason);
        if (!violation) {
          res.status(404).json({ success: false, error: "一致性问题不存在" });
          return;
        }
        const response: ApiResponse<typeof violation> = { success: true, data: violation };
        res.json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
