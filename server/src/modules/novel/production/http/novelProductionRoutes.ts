import type { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import { z } from "zod";
import { streamToSSE } from "../../../../llm/streaming";
import { validate } from "../../../../middleware/validate";
import type { NovelDraftOptimizeService } from "../../../../services/novel/NovelDraftOptimizeService";
import type { NovelApplicationServices } from "../../../../services/novel/application/NovelApplicationContracts";
import { timelineContextService, timelineRepository } from "../../../../modules/timeline";
import { prisma } from "../../../../db/prisma";

interface RegisterNovelProductionRoutesInput {
  router: Router;
  novelService: Pick<NovelApplicationServices,
    | "createOutlineStream"
    | "createStructuredOutlineStream"
    | "generateTitles"
    | "createBeatStream"
    | "generateChapterHook"
    | "startPipelineJob"
    | "getPipelineJob"
  >;
  novelDraftOptimizeService: NovelDraftOptimizeService;
  idParamsSchema: z.ZodType<{ id: string }>;
  pipelineJobParamsSchema: z.ZodType<{ id: string; jobId: string }>;
  titleGenerateSchema: z.ZodTypeAny;
  beatGenerateSchema: z.ZodTypeAny;
  pipelineRunSchema: z.ZodTypeAny;
  hookGenerateSchema: z.ZodTypeAny;
  outlineGenerateSchema: z.ZodTypeAny;
  structuredOutlineSchema: z.ZodTypeAny;
  draftOptimizeSchema: z.ZodTypeAny;
  forwardBusinessError: (error: unknown, next: (err?: unknown) => void) => boolean;
}

// Sub-function: Register pipeline routes
function registerPipelineRoutes(params: {
  router: any;
  novelService: any;
  idParamsSchema: any;
  pipelineJobParamsSchema: any;
  pipelineRunSchema: any;
  forwardBusinessError: any;
}) {
  const { router, novelService, idParamsSchema, pipelineJobParamsSchema, pipelineRunSchema, forwardBusinessError } = params;

  router.post(
    "/:id/pipeline/run",
    validate({ params: idParamsSchema, body: pipelineRunSchema }),
    async (req: any, res: any, next: any) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const data = await novelService.startPipelineJob(id, req.body);
        res.status(202).json({ success: true, data, message: "Pipeline job created." } satisfies ApiResponse<typeof data>);
      } catch (error) {
        if (forwardBusinessError(error, next)) return;
        next(error);
      }
    },
  );

  router.get(
    "/:id/pipeline/jobs/:jobId",
    validate({ params: pipelineJobParamsSchema }),
    async (req: any, res: any, next: any) => {
      try {
        const { id, jobId } = req.params as z.infer<typeof pipelineJobParamsSchema>;
        const data = await novelService.getPipelineJob(id, jobId);
        if (!data) {
          res.status(404).json({ success: false, error: "Pipeline job not found." } satisfies ApiResponse<null>);
          return;
        }
        res.status(200).json({ success: true, data, message: "Pipeline job loaded." } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );
}

// Sub-function: Register outline routes
function registerOutlineRoutes(params: {
  router: any;
  novelService: any;
  novelDraftOptimizeService: any;
  idParamsSchema: any;
  outlineGenerateSchema: any;
  structuredOutlineSchema: any;
  draftOptimizeSchema: any;
  forwardBusinessError: any;
}) {
  const { router, novelService, novelDraftOptimizeService, idParamsSchema, outlineGenerateSchema, structuredOutlineSchema, draftOptimizeSchema, forwardBusinessError } = params;

  router.post(
    "/:id/outline/generate",
    validate({ params: idParamsSchema, body: outlineGenerateSchema }),
    async (req: any, res: any, next: any) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const { stream, onDone } = await novelService.createOutlineStream(id, req.body);
        await streamToSSE(res, stream, onDone);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/outline/optimize-preview",
    validate({ params: idParamsSchema, body: draftOptimizeSchema }),
    async (req: any, res: any, next: any) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const data = await novelDraftOptimizeService.optimizePreview(id, { ...req.body, target: "outline" });
        res.status(200).json({ success: true, data, message: "Outline optimization preview generated." } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/structured-outline/generate",
    validate({ params: idParamsSchema, body: structuredOutlineSchema }),
    async (req: any, res: any, next: any) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const { stream, onDone } = await novelService.createStructuredOutlineStream(id, req.body);
        await streamToSSE(res, stream, onDone);
      } catch (error) {
        if (forwardBusinessError(error, next)) return;
        next(error);
      }
    },
  );

  router.post(
    "/:id/structured-outline/optimize-preview",
    validate({ params: idParamsSchema, body: draftOptimizeSchema }),
    async (req: any, res: any, next: any) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const data = await novelDraftOptimizeService.optimizePreview(id, { ...req.body, target: "structured_outline" });
        res.status(200).json({ success: true, data, message: "Structured outline optimization preview generated." } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );
}

export function registerNovelProductionRoutes(input: RegisterNovelProductionRoutesInput): void {
  const {
    router,
    novelService,
    novelDraftOptimizeService,
    idParamsSchema,
    pipelineJobParamsSchema,
    titleGenerateSchema,
    beatGenerateSchema,
    pipelineRunSchema,
    hookGenerateSchema,
    outlineGenerateSchema,
    structuredOutlineSchema,
    draftOptimizeSchema,
    forwardBusinessError,
  } = input;
  const chapterTimelineParamsSchema = z.object({
    id: z.string(),
    chapterId: z.string(),
  });

  router.get(
    "/:id/chapters/:chapterId/timeline",
    validate({ params: chapterTimelineParamsSchema }),
    async (req, res, next) => {
      try {
        const { id, chapterId } = req.params as z.infer<typeof chapterTimelineParamsSchema>;
        const chapter = await prisma.chapter.findFirst({
          where: { id: chapterId, novelId: id },
          select: { order: true },
        });
        if (!chapter) {
          res.status(404).json({ success: false, error: "Chapter not found." } satisfies ApiResponse<null>);
          return;
        }
        const [context, latestReport] = await Promise.all([
          timelineContextService.buildForChapter({ novelId: id, chapterId, chapterIndex: chapter.order }),
          timelineRepository.getLatestCheckReport({ novelId: id, chapterId }),
        ]);
        const data = { context, latestReport };
        res.status(200).json({ success: true, data, message: "Chapter timeline loaded." } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/beats/generate",
    validate({ params: idParamsSchema, body: beatGenerateSchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const { stream, onDone } = await novelService.createBeatStream(id, req.body);
        await streamToSSE(res, stream, onDone);
      } catch (error) {
        if (forwardBusinessError(error, next)) return;
        next(error);
      }
    },
  );

  router.post(
    "/:id/hooks/generate",
    validate({ params: idParamsSchema, body: hookGenerateSchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const data = await novelService.generateChapterHook(id, req.body);
        res.status(200).json({ success: true, data, message: "Chapter hook generated." } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/title/generate",
    validate({ params: idParamsSchema, body: titleGenerateSchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const data = await novelService.generateTitles(id, req.body);
        res.status(200).json({ success: true, data, message: "Titles generated." } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  // Register grouped routes
  registerPipelineRoutes({ router, novelService, idParamsSchema, pipelineJobParamsSchema, pipelineRunSchema, forwardBusinessError });
  registerOutlineRoutes({ router, novelService, novelDraftOptimizeService, idParamsSchema, outlineGenerateSchema, structuredOutlineSchema, draftOptimizeSchema, forwardBusinessError });
}
