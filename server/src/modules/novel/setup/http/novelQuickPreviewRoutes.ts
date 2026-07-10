import type { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared";
import { z } from "zod";
import { llmProviderSchema } from "../../../../llm/providerSchema";
import { validate } from "../../../../middleware/validate";
import { novelQuickPreviewService } from "../../../../services/novel/NovelQuickPreviewService";

const quickPreviewSchema = z.object({
  inspiration: z.string().trim().min(1, "请输入灵感内容。").max(500, "灵感内容不能超过 500 字。"),
  provider: llmProviderSchema.optional(),
  model: z.string().trim().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

const candidateSchema = z.object({
  title: z.string().trim().min(1),
  synopsis: z.string().trim().min(1),
  previewText: z.string().trim().min(1),
});

const generateChaptersSchema = z.object({
  inspiration: z.string().trim().min(1, "请输入灵感内容。").max(500, "灵感内容不能超过 500 字。"),
  candidate: candidateSchema,
  provider: llmProviderSchema.optional(),
  model: z.string().trim().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

interface RegisterNovelQuickPreviewRoutesInput {
  router: Router;
}

export function registerNovelQuickPreviewRoutes(input: RegisterNovelQuickPreviewRoutesInput): void {
  const { router } = input;

  router.post(
    "/quick-preview",
    validate({ body: quickPreviewSchema }),
    async (req, res, next) => {
      try {
        const body = req.body as z.infer<typeof quickPreviewSchema>;
        const data = await novelQuickPreviewService.generate(body);
        res.status(200).json({
          success: true,
          data,
          message: "快速预览已生成。",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/quick-preview/generate-chapters",
    validate({ body: generateChaptersSchema }),
    async (req, res, next) => {
      try {
        const body = req.body as z.infer<typeof generateChaptersSchema>;
        const data = await novelQuickPreviewService.generateChapters(body);
        res.status(200).json({
          success: true,
          data,
          message: "前 3 章快速预览已生成。",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );
}
