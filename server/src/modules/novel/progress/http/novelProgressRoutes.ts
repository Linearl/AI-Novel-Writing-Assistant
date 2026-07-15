import type { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared";
import { z } from "zod";
import { validate } from "@/middleware/validate";
import { progressService, type ProgressInfo } from "../ProgressService";

const novelIdParamsSchema = z.object({ id: z.string() });
const jobParamsSchema = z.object({ id: z.string(), jobId: z.string() });
const taskParamsSchema = z.object({ id: z.string(), taskId: z.string() });

interface RegisterNovelProgressRoutesInput {
  router: Router;
}

/**
 * 注册进度可视化路由。
 * 挂在 /api/novels 下以复用 :id 参数惯例。
 */
export function registerNovelProgressRoutes(input: RegisterNovelProgressRoutesInput): void {
  const { router } = input;

  // ─── GET /:id/progress —— 小说级综合进度 ───
  router.get(
    "/:id/progress",
    validate({ params: novelIdParamsSchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof novelIdParamsSchema>;
        const data = await progressService.getNovelProgress(id, {
          targetChapterCount: req.query.targetChapterCount
            ? Number(req.query.targetChapterCount)
            : undefined,
        });
        res.status(200).json({
          success: true,
          data,
          message: "进度信息已获取。",
        } satisfies ApiResponse<ProgressInfo>);
      } catch (error) {
        next(error);
      }
    },
  );

  // ─── GET /:id/jobs/:jobId/progress —— GenerationJob 进度 ───
  router.get(
    "/:id/jobs/:jobId/progress",
    validate({ params: jobParamsSchema }),
    async (req, res, next) => {
      try {
        const { jobId } = req.params as z.infer<typeof jobParamsSchema>;
        const data = await progressService.getJobProgress(jobId);
        res.status(200).json({
          success: true,
          data,
          message: "任务进度已获取。",
        } satisfies ApiResponse<ProgressInfo>);
      } catch (error) {
        next(error);
      }
    },
  );

  // ─── GET /:id/tasks/:taskId/progress —— WorkflowTask 进度 ───
  router.get(
    "/:id/tasks/:taskId/progress",
    validate({ params: taskParamsSchema }),
    async (req, res, next) => {
      try {
        const { taskId } = req.params as z.infer<typeof taskParamsSchema>;
        const data = await progressService.getWorkflowProgress(taskId);
        res.status(200).json({
          success: true,
          data,
          message: "工作流任务进度已获取。",
        } satisfies ApiResponse<ProgressInfo>);
      } catch (error) {
        next(error);
      }
    },
  );
}
