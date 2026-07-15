import { Router } from "express";
import { z } from "zod";
import type { ApiResponse } from "@ai-novel/shared";
import { authMiddleware } from "../../../middleware/auth";
import { validate } from "../../../middleware/validate";
import { backgroundTaskManager } from "../../../services/backgroundTask/manager.js";
import type {
  TaskRecord,
  TaskType,
  TaskStatus,
  TaskListResponse,
} from "../../../services/backgroundTask/types.js";
import { taskSSEManager, createSSEClient } from "../../../services/backgroundTask/sseManager.js";

const router = Router();

const taskTypeSchema = z.enum(["chapter_generation", "character_setup", "world_building", "full_execution"]);
const taskStatusSchema = z.enum(["pending", "running", "completed", "failed", "paused", "cancelled"]);

const submitBodySchema = z.object({
  type: taskTypeSchema,
  params: z.record(z.string(), z.unknown()).default({}),
});

const taskParamsSchema = z.object({
  novelId: z.string().trim().min(1),
});

const singleTaskParamsSchema = z.object({
  taskId: z.string().trim().min(1),
});

const listQuerySchema = z.object({
  status: taskStatusSchema.optional(),
  type: taskTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

router.use(authMiddleware);

// POST /api/novels/:novelId/tasks - Submit a background task
router.post(
  "/novels/:novelId/tasks",
  validate({ params: taskParamsSchema, body: submitBodySchema }),
  async (req, res, next) => {
    try {
      const { novelId } = req.params as z.infer<typeof taskParamsSchema>;
      const { type, params } = req.body as z.infer<typeof submitBodySchema>;

      const task = await backgroundTaskManager.submit(novelId, type as TaskType, params);

      res.status(201).json({
        success: true,
        data: task,
        message: "任务已提交",
      } satisfies ApiResponse<TaskRecord>);
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/novels/:novelId/tasks - List tasks for a novel
router.get(
  "/novels/:novelId/tasks",
  validate({ params: taskParamsSchema, query: listQuerySchema }),
  async (req, res, next) => {
    try {
      const { novelId } = req.params as z.infer<typeof taskParamsSchema>;
      const query = req.query as z.infer<typeof listQuerySchema>;

      const data = await backgroundTaskManager.listByNovel(novelId, {
        status: query.status as TaskStatus | undefined,
        type: query.type as TaskType | undefined,
        limit: query.limit,
        offset: query.offset,
      });

      res.status(200).json({
        success: true,
        data,
        message: "任务列表已加载",
      } satisfies ApiResponse<TaskListResponse>);
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/tasks/:taskId - Get single task status
router.get(
  "/tasks/:taskId",
  validate({ params: singleTaskParamsSchema }),
  async (req, res, next) => {
    try {
      const { taskId } = req.params as z.infer<typeof singleTaskParamsSchema>;
      const task = await backgroundTaskManager.getStatus(taskId);

      if (!task) {
        res.status(404).json({
          success: false,
          error: "任务不存在",
        } satisfies ApiResponse<null>);
        return;
      }

      res.status(200).json({
        success: true,
        data: task,
        message: "任务状态已加载",
      } satisfies ApiResponse<TaskRecord>);
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/tasks/:taskId/pause - Pause a task
router.post(
  "/tasks/:taskId/pause",
  validate({ params: singleTaskParamsSchema }),
  async (req, res, next) => {
    try {
      const { taskId } = req.params as z.infer<typeof singleTaskParamsSchema>;
      const task = await backgroundTaskManager.pause(taskId);

      res.status(200).json({
        success: true,
        data: task,
        message: "任务已暂停",
      } satisfies ApiResponse<TaskRecord>);
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/tasks/:taskId/resume - Resume a paused task
router.post(
  "/tasks/:taskId/resume",
  validate({ params: singleTaskParamsSchema }),
  async (req, res, next) => {
    try {
      const { taskId } = req.params as z.infer<typeof singleTaskParamsSchema>;
      const task = await backgroundTaskManager.resume(taskId);

      res.status(200).json({
        success: true,
        data: task,
        message: "任务已恢复",
      } satisfies ApiResponse<TaskRecord>);
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/tasks/:taskId/cancel - Cancel a task
router.post(
  "/tasks/:taskId/cancel",
  validate({ params: singleTaskParamsSchema }),
  async (req, res, next) => {
    try {
      const { taskId } = req.params as z.infer<typeof singleTaskParamsSchema>;
      const task = await backgroundTaskManager.cancel(taskId);

      res.status(200).json({
        success: true,
        data: task,
        message: "任务已取消",
      } satisfies ApiResponse<TaskRecord>);
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/tasks/:taskId/stream - SSE stream for task status
router.get(
  "/tasks/:taskId/stream",
  validate({ params: singleTaskParamsSchema }),
  async (req, res, next) => {
    try {
      const { taskId } = req.params as z.infer<typeof singleTaskParamsSchema>;

      // Verify task exists
      const task = await backgroundTaskManager.getStatus(taskId);
      if (!task) {
        res.status(404).json({
          success: false,
          error: "任务不存在",
        } satisfies ApiResponse<null>);
        return;
      }

      const clientId = `${taskId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const client = createSSEClient(clientId, req, res);

      taskSSEManager.subscribeToTask(taskId, client);

      // Send current status immediately
      client.write("task_update", JSON.stringify({
        taskId,
        eventType: "status_change",
        data: task,
        timestamp: new Date().toISOString(),
      }));

      // Set a keepalive interval (every 30 seconds)
      const keepAlive = setInterval(() => {
        client.write("keepalive", JSON.stringify({
          timestamp: new Date().toISOString(),
        }));
      }, 30000);

      client.onClose(() => {
        clearInterval(keepAlive);
      });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/novels/:novelId/tasks/stream - SSE stream for all novel tasks
router.get(
  "/novels/:novelId/tasks/stream",
  validate({ params: taskParamsSchema }),
  (req, res, next) => {
    try {
      const { novelId } = req.params as z.infer<typeof taskParamsSchema>;

      const clientId = `novel-${novelId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const client = createSSEClient(clientId, req, res);

      taskSSEManager.subscribeToNovel(novelId, client);

      const keepAlive = setInterval(() => {
        client.write("keepalive", JSON.stringify({
          timestamp: new Date().toISOString(),
        }));
      }, 30000);

      client.onClose(() => {
        clearInterval(keepAlive);
      });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/tasks/:taskId/checkpoints - Get checkpoints for a task
router.get(
  "/tasks/:taskId/checkpoints",
  validate({ params: singleTaskParamsSchema }),
  async (req, res, next) => {
    try {
      const { taskId } = req.params as z.infer<typeof singleTaskParamsSchema>;
      const checkpoints = await backgroundTaskManager.listCheckpoints(taskId);

      res.status(200).json({
        success: true,
        data: checkpoints,
        message: "检查点列表已加载",
      } satisfies ApiResponse<typeof checkpoints>);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
