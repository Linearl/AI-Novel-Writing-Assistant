/**
 * REQ-7044: Checkpoint Management — HTTP API routes.
 *
 * Endpoints (relative to /api/novels):
 *   GET    /:novelId/checkpoints              — list checkpoints
 *   DELETE /:novelId/checkpoints/:id           — delete single checkpoint
 *   DELETE /:novelId/checkpoints/batch         — batch delete checkpoints
 *   POST   /:novelId/checkpoints/:id/pin       — pin checkpoint
 *   POST   /:novelId/checkpoints/:id/unpin     — unpin checkpoint
 *   POST   /:novelId/checkpoints/cleanup       — manual cleanup
 */
import { Router } from "express";
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import type { ApiResponse } from "@ai-novel/shared";
import { validate } from "../../../../middleware/validate";
import { checkpointService } from "../CheckpointService";

/* ── Zod schemas ───────────────────────────────────────────────────── */

const novelIdParamsSchema = z.object({ novelId: z.string().min(1) });
const checkpointIdParamsSchema = z.object({
  novelId: z.string().min(1),
  id: z.string().min(1),
});

const listQuerySchema = z.object({
  page: z.string().optional().default("1"),
  pageSize: z.string().optional().default("20"),
  pinnedOnly: z.string().optional(),
});

const batchDeleteBodySchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  force: z.boolean().optional().default(false),
});

const cleanupBodySchema = z.object({
  keepCount: z.number().int().min(1).optional().default(20),
});

/* ── Router factory ────────────────────────────────────────────────── */

export function createNovelCheckpointRoutes(): Router {
  const router = Router();

  type P = Record<string, string>;

  /**
   * GET /novels/:novelId/checkpoints
   * 获取检查点列表。
   */
  router.get(
    "/novels/:novelId/checkpoints",
    validate({ params: novelIdParamsSchema, query: listQuerySchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { novelId } = req.params as P;
        const page = parseInt(String(req.query.page ?? "1"), 10);
        const pageSize = parseInt(String(req.query.pageSize ?? "20"), 10);
        const pinnedOnly = req.query.pinnedOnly === "true";

        const result = await checkpointService.listCheckpoints(novelId, {
          page,
          pageSize,
          pinnedOnly,
        });

        const response: ApiResponse<typeof result> = {
          success: true,
          data: result,
        };
        res.status(200).json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * DELETE /novels/:novelId/checkpoints/:id
   * 删除单个检查点。
   */
  router.delete(
    "/novels/:novelId/checkpoints/:id",
    validate({ params: checkpointIdParamsSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params as P;
        await checkpointService.deleteCheckpoint(id);

        const response: ApiResponse<null> = {
          success: true,
          data: null,
        };
        res.status(200).json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * DELETE /novels/:novelId/checkpoints/batch
   * 批量删除检查点。
   */
  router.delete(
    "/novels/:novelId/checkpoints/batch",
    validate({ params: novelIdParamsSchema, body: batchDeleteBodySchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { ids, force } = req.body as z.infer<
          typeof batchDeleteBodySchema
        >;

        let deletedCount: number;
        if (force) {
          deletedCount = await checkpointService.forceDeleteCheckpoints(ids);
        } else {
          deletedCount = await checkpointService.deleteCheckpoints(ids);
        }

        const response: ApiResponse<{ deletedCount: number }> = {
          success: true,
          data: { deletedCount },
        };
        res.status(200).json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * POST /novels/:novelId/checkpoints/:id/pin
   * 标记检查点为保留。
   */
  router.post(
    "/novels/:novelId/checkpoints/:id/pin",
    validate({ params: checkpointIdParamsSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params as P;
        await checkpointService.pinCheckpoint(id);

        const response: ApiResponse<null> = {
          success: true,
          data: null,
        };
        res.status(200).json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * POST /novels/:novelId/checkpoints/:id/unpin
   * 取消检查点的保留标记。
   */
  router.post(
    "/novels/:novelId/checkpoints/:id/unpin",
    validate({ params: checkpointIdParamsSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params as P;
        await checkpointService.unpinCheckpoint(id);

        const response: ApiResponse<null> = {
          success: true,
          data: null,
        };
        res.status(200).json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * POST /novels/:novelId/checkpoints/cleanup
   * 手动触发检查点清理。
   */
  router.post(
    "/novels/:novelId/checkpoints/cleanup",
    validate({ params: novelIdParamsSchema, body: cleanupBodySchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { novelId } = req.params as P;
        const { keepCount } = req.body as z.infer<typeof cleanupBodySchema>;

        const deletedCount = await checkpointService.cleanupOldCheckpoints(
          novelId,
          keepCount,
        );

        const response: ApiResponse<{ deletedCount: number }> = {
          success: true,
          data: { deletedCount },
        };
        res.status(200).json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
