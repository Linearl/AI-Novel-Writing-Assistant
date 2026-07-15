import { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared";
import { z } from "zod";
import { authMiddleware } from "../../../middleware/auth";
import { validate } from "../../../middleware/validate";
import { batchQueueService } from "../BatchQueueService";
import { taskScheduler } from "./batchSchedulerInstance";

const router = Router();

// ---- Zod Schemas ----

const createQueueBodySchema = z.object({
  chapters: z.array(z.number().int().positive()).min(1).max(500),
  config: z
    .object({
      batchSize: z.number().int().min(1).max(50).optional(),
      maxRetries: z.number().int().min(0).max(10).optional(),
    })
    .optional(),
});

const queueIdParamsSchema = z.object({
  novelId: z.string().trim().min(1),
  queueId: z.string().trim().min(1),
});

const novelIdParamsSchema = z.object({
  novelId: z.string().trim().min(1),
});

// ---- Middleware ----

router.use(authMiddleware);

// ---- Routes ----

// POST /api/novels/:novelId/batch/queue
// Create a new batch queue
router.post(
  "/:novelId/batch/queue",
  validate({ params: novelIdParamsSchema, body: createQueueBodySchema }),
  async (req, res, next) => {
    try {
      const { novelId } = req.params as z.infer<typeof novelIdParamsSchema>;
      const body = req.body as z.infer<typeof createQueueBodySchema>;

      const queue = await batchQueueService.createQueue({
        novelId,
        chapters: body.chapters,
        config: body.config,
      });

      const status = await batchQueueService.getQueueStatus(queue.id);

      res.status(201).json({
        success: true,
        data: status,
        message: "Batch queue created.",
      } satisfies ApiResponse<typeof status>);
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/novels/:novelId/batch/queues
// List all queues for a novel
router.get(
  "/:novelId/batch/queues",
  validate({ params: novelIdParamsSchema }),
  async (req, res, next) => {
    try {
      const { novelId } = req.params as z.infer<typeof novelIdParamsSchema>;
      const queues = await batchQueueService.listQueues(novelId);

      res.status(200).json({
        success: true,
        data: queues,
        message: "Batch queues loaded.",
      } satisfies ApiResponse<typeof queues>);
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/novels/:novelId/batch/queue/:queueId/status
// Get queue status
router.get(
  "/:novelId/batch/queue/:queueId/status",
  validate({ params: queueIdParamsSchema }),
  async (req, res, next) => {
    try {
      const { queueId } = req.params as z.infer<typeof queueIdParamsSchema>;
      const status = await batchQueueService.getQueueStatus(queueId);

      if (!status) {
        res.status(404).json({
          success: false,
          error: "Batch queue not found.",
        } satisfies ApiResponse<null>);
        return;
      }

      res.status(200).json({
        success: true,
        data: status,
        message: "Queue status loaded.",
      } satisfies ApiResponse<typeof status>);
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/novels/:novelId/batch/queue/:queueId/start
// Start executing a queue
router.post(
  "/:novelId/batch/queue/:queueId/start",
  validate({ params: queueIdParamsSchema }),
  async (req, res, next) => {
    try {
      const { queueId } = req.params as z.infer<typeof queueIdParamsSchema>;

      const queue = await batchQueueService.getQueue(queueId);
      if (!queue) {
        res.status(404).json({
          success: false,
          error: "Batch queue not found.",
        } satisfies ApiResponse<null>);
        return;
      }

      await taskScheduler.startQueue(queueId);

      const status = await batchQueueService.getQueueStatus(queueId);

      res.status(200).json({
        success: true,
        data: status,
        message: "Queue execution started.",
      } satisfies ApiResponse<typeof status>);
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/novels/:novelId/batch/queue/:queueId/pause
// Pause a running queue
router.post(
  "/:novelId/batch/queue/:queueId/pause",
  validate({ params: queueIdParamsSchema }),
  async (req, res, next) => {
    try {
      const { queueId } = req.params as z.infer<typeof queueIdParamsSchema>;

      await taskScheduler.pauseQueue(queueId);

      const status = await batchQueueService.getQueueStatus(queueId);
      if (!status) {
        res.status(404).json({
          success: false,
          error: "Batch queue not found.",
        } satisfies ApiResponse<null>);
        return;
      }

      res.status(200).json({
        success: true,
        data: status,
        message: "Queue paused.",
      } satisfies ApiResponse<typeof status>);
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/novels/:novelId/batch/queue/:queueId/resume
// Resume a paused queue
router.post(
  "/:novelId/batch/queue/:queueId/resume",
  validate({ params: queueIdParamsSchema }),
  async (req, res, next) => {
    try {
      const { queueId } = req.params as z.infer<typeof queueIdParamsSchema>;

      const queue = await batchQueueService.resumeQueue(queueId);
      if (!queue) {
        res.status(404).json({
          success: false,
          error: "Batch queue not found.",
        } satisfies ApiResponse<null>);
        return;
      }

      await taskScheduler.startQueue(queueId);

      const status = await batchQueueService.getQueueStatus(queueId);

      res.status(200).json({
        success: true,
        data: status,
        message: "Queue resumed.",
      } satisfies ApiResponse<typeof status>);
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /api/novels/:novelId/batch/queue/:queueId
// Delete / clear a queue
router.delete(
  "/:novelId/batch/queue/:queueId",
  validate({ params: queueIdParamsSchema }),
  async (req, res, next) => {
    try {
      const { queueId } = req.params as z.infer<typeof queueIdParamsSchema>;

      const result = await batchQueueService.deleteQueue(queueId);

      if (!result.deleted) {
        res.status(400).json({
          success: false,
          error: result.reason ?? "Failed to delete queue.",
        } satisfies ApiResponse<null>);
        return;
      }

      res.status(200).json({
        success: true,
        data: null,
        message: "Queue deleted.",
      } satisfies ApiResponse<null>);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
