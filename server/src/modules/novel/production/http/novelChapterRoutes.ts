import type { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import { z } from "zod";
import { agentRuntime } from "../../../../agents";
import { validate } from "../../../../middleware/validate";
import type { NovelApplicationServices } from "../../../../services/novel/application/NovelApplicationContracts";

interface RegisterNovelChapterRoutesInput {
  router: Router;
  novelService: Pick<NovelApplicationServices,
    | "listChapters"
    | "createChapter"
    | "updateChapter"
    | "deleteChapter"
    | "softDeleteChapter"
    | "restoreChapter"
    | "toggleChapterLock"
    | "ensureChapterExecutionContract"
  >;
  idParamsSchema: z.ZodType<{ id: string }>;
  chapterParamsSchema: z.ZodType<{ id: string; chapterId: string }>;
  chapterSchema: z.ZodTypeAny;
  updateChapterSchema: z.ZodTypeAny;
  chapterExecutionContractSchema: z.ZodTypeAny;
  chapterLockToggleSchema: z.ZodTypeAny;
}

export function registerNovelChapterRoutes(input: RegisterNovelChapterRoutesInput): void {
  const {
    router,
    novelService,
    idParamsSchema,
    chapterParamsSchema,
    chapterSchema,
    updateChapterSchema,
    chapterExecutionContractSchema,
    chapterLockToggleSchema,
  } = input;

  router.get("/:id/chapters", validate({ params: idParamsSchema }), async (req, res, next) => {
    try {
      const { id } = req.params as z.infer<typeof idParamsSchema>;
      const data = await novelService.listChapters(id);
      res.status(200).json({
        success: true,
        data,
        message: "Chapters loaded.",
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  });

  router.post(
    "/:id/chapters",
    validate({ params: idParamsSchema, body: chapterSchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const data = await novelService.createChapter(id, req.body as z.infer<typeof chapterSchema>);
        res.status(201).json({
          success: true,
          data,
          message: "Chapter created.",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.put(
    "/:id/chapters/:chapterId",
    validate({ params: chapterParamsSchema, body: updateChapterSchema }),
    async (req, res, next) => {
      try {
        const { id, chapterId } = req.params as z.infer<typeof chapterParamsSchema>;
        const data = await novelService.updateChapter(
          id,
          chapterId,
          req.body as z.infer<typeof updateChapterSchema>,
        );
        res.status(200).json({
          success: true,
          data,
          message: "Chapter updated.",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete("/:id/chapters/:chapterId", validate({ params: chapterParamsSchema }), async (req, res, next) => {
    try {
      const { id, chapterId } = req.params as z.infer<typeof chapterParamsSchema>;
      const data = await novelService.softDeleteChapter(id, chapterId);
      res.status(200).json({
        success: true,
        data,
        message: "Chapter soft-deleted.",
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/chapters/:chapterId/restore", validate({ params: chapterParamsSchema }), async (req, res, next) => {
    try {
      const { id, chapterId } = req.params as z.infer<typeof chapterParamsSchema>;
      const data = await novelService.restoreChapter(id, chapterId);
      res.status(200).json({
        success: true,
        data,
        message: "Chapter restored.",
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  });

  router.get(
    "/:id/chapters/:chapterId/traces",
    validate({ params: chapterParamsSchema }),
    async (req, res, next) => {
      try {
        const { id, chapterId } = req.params as z.infer<typeof chapterParamsSchema>;
        const data = await agentRuntime.listRuns({ novelId: id, chapterId, limit: 20 });
        res.status(200).json({
          success: true,
          data,
          message: "Chapter traces loaded.",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/chapters/:chapterId/execution-contract",
    validate({ params: chapterParamsSchema, body: chapterExecutionContractSchema }),
    async (req, res, next) => {
      try {
        const { id, chapterId } = req.params as z.infer<typeof chapterParamsSchema>;
        const data = await novelService.ensureChapterExecutionContract(id, chapterId, req.body as z.infer<typeof chapterExecutionContractSchema>);
        res.status(200).json({
          success: true,
          data,
          message: "Chapter execution contract generated.",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    "/:id/chapters/:chapterId/lock",
    validate({ params: chapterParamsSchema, body: chapterLockToggleSchema }),
    async (req, res, next) => {
      try {
        const { id, chapterId } = req.params as z.infer<typeof chapterParamsSchema>;
        const { locked } = req.body as { locked: boolean };
        const data = await novelService.toggleChapterLock(id, chapterId, locked);
        res.status(200).json({
          success: true,
          data,
          message: locked ? "章节已锁定。" : "章节已解锁。",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );
}
