import type { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared";
import { z } from "zod";
import { llmProviderSchema } from "../../../../llm/providerSchema";
import { validate } from "../../../../middleware/validate";
import { StoryMacroPlanService } from "../../../../services/novel/storyMacro/StoryMacroPlanService";
import { BookContractService } from "../../../../services/novel/BookContractService";
import { runStructuredPrompt } from "../../../../prompting/core/promptRunner";
import {
  buildDirectorBookContractContextBlocks,
  directorBookContractPrompt,
} from "../../../../prompting/prompts/novel/directorPlanning.prompts";
import { normalizeBookContract } from "../../../../services/novel/director/runtime/novelDirectorHelpers";
import { prisma } from "../../../../db/prisma";
import { logger } from "../../../../services/logging/LoggerService";

const llmGenerateSchema = z.object({
  provider: llmProviderSchema.optional(),
  model: z.string().trim().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

const storyMacroFieldSchema = z.enum([
  "expanded_premise",
  "protagonist_core",
  "conflict_engine",
  "conflict_layers",
  "mystery_box",
  "emotional_line",
  "setpiece_seeds",
  "tone_reference",
  "selling_point",
  "core_conflict",
  "main_hook",
  "progression_loop",
  "growth_path",
  "major_payoffs",
  "ending_flavor",
  "constraints",
]);

const storyMacroFieldParamsSchema = z.object({
  id: z.string().trim().min(1),
  field: storyMacroFieldSchema,
});

const storyMacroDecomposeSchema = llmGenerateSchema.extend({
  storyInput: z.string().trim().min(1),
});

const storyMacroBuildSchema = llmGenerateSchema;

const storyMacroUpdateSchema = z.object({
  storyInput: z.string().trim().nullable().optional(),
  expansion: z.object({
    expanded_premise: z.string().trim().optional(),
    protagonist_core: z.string().trim().optional(),
    conflict_engine: z.string().trim().optional(),
    conflict_layers: z.object({
      external: z.string().trim().optional(),
      internal: z.string().trim().optional(),
      relational: z.string().trim().optional(),
    }).optional(),
    mystery_box: z.string().trim().optional(),
    emotional_line: z.string().trim().optional(),
    setpiece_seeds: z.array(z.string().trim().min(1)).min(1).max(3).optional(),
    tone_reference: z.string().trim().optional(),
  }).optional(),
  decomposition: z.object({
    selling_point: z.string().trim().optional(),
    core_conflict: z.string().trim().optional(),
    main_hook: z.string().trim().optional(),
    progression_loop: z.string().trim().optional(),
    growth_path: z.string().trim().optional(),
    major_payoffs: z.array(z.string().trim().min(1)).min(1).max(5).optional(),
    ending_flavor: z.string().trim().optional(),
  }).optional(),
  constraints: z.array(z.string().trim().min(1)).min(1).max(8).optional(),
  lockedFields: z.object({
    expanded_premise: z.boolean().optional(),
    protagonist_core: z.boolean().optional(),
    conflict_engine: z.boolean().optional(),
    conflict_layers: z.boolean().optional(),
    mystery_box: z.boolean().optional(),
    emotional_line: z.boolean().optional(),
    setpiece_seeds: z.boolean().optional(),
    tone_reference: z.boolean().optional(),
    selling_point: z.boolean().optional(),
    core_conflict: z.boolean().optional(),
    main_hook: z.boolean().optional(),
    progression_loop: z.boolean().optional(),
    growth_path: z.boolean().optional(),
    major_payoffs: z.boolean().optional(),
    ending_flavor: z.boolean().optional(),
    constraints: z.boolean().optional(),
  }).optional(),
});

const storyMacroStateUpdateSchema = z.object({
  currentPhase: z.number().int().min(0).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  protagonistState: z.string().trim().optional(),
});

interface RegisterNovelStoryMacroRoutesInput {
  router: Router;
  idParamsSchema: z.ZodType<{ id: string }>;
}

export function registerNovelStoryMacroRoutes(input: RegisterNovelStoryMacroRoutesInput): void {
  const { router, idParamsSchema } = input;
  const storyMacroService = new StoryMacroPlanService();

  router.get("/:id/story-macro", validate({ params: idParamsSchema }), async (req, res, next) => {
    try {
      const { id } = req.params as z.infer<typeof idParamsSchema>;
      const data = await storyMacroService.getPlan(id);
      res.status(200).json({
        success: true,
        data,
        message: "Story macro plan loaded.",
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  });

  router.post(
    "/:id/story-macro/decompose",
    validate({ params: idParamsSchema, body: storyMacroDecomposeSchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const body = req.body as z.infer<typeof storyMacroDecomposeSchema>;
        const data = await storyMacroService.decompose(id, body.storyInput, body);

        // Auto-generate book contract if missing
        const contractService = new BookContractService();
        const existingContract = await contractService.getByNovelId(id);
        if (!existingContract) {
          await generateBookContractFromDecompose(id, data, body).catch((err) => {
            logger.warn("[StoryMacroRoutes] decompose 后自动生成 Book Contract 失败（非阻断）", { novelId: id, error: err });
          });
        }

        res.status(200).json({
          success: true,
          data,
          message: "故事引擎原型已生成。",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/story-macro/constraint/build",
    validate({ params: idParamsSchema, body: storyMacroBuildSchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const data = await storyMacroService.buildConstraintEngine(id);
        res.status(200).json({
          success: true,
          data,
          message: "约束引擎已构建。",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    "/:id/story-macro",
    validate({ params: idParamsSchema, body: storyMacroUpdateSchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const data = await storyMacroService.updatePlan(id, req.body as z.infer<typeof storyMacroUpdateSchema>);
        res.status(200).json({
          success: true,
          data,
          message: "故事宏观规划已保存。",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/story-macro/fields/:field/regenerate",
    validate({ params: storyMacroFieldParamsSchema, body: llmGenerateSchema }),
    async (req, res, next) => {
      try {
        const { id, field } = req.params as z.infer<typeof storyMacroFieldParamsSchema>;
        const data = await storyMacroService.regenerateField(id, field, req.body as z.infer<typeof llmGenerateSchema>);
        res.status(200).json({
          success: true,
          data,
          message: "字段已重生成。",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get("/:id/story-macro/state", validate({ params: idParamsSchema }), async (req, res, next) => {
    try {
      const { id } = req.params as z.infer<typeof idParamsSchema>;
      const data = await storyMacroService.getState(id);
      res.status(200).json({
        success: true,
        data,
        message: "故事宏观规划状态已加载。",
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  });

  router.patch(
    "/:id/story-macro/state",
    validate({ params: idParamsSchema, body: storyMacroStateUpdateSchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const data = await storyMacroService.updateState(id, req.body as z.infer<typeof storyMacroStateUpdateSchema>);
        res.status(200).json({
          success: true,
          data,
          message: "故事宏观规划状态已更新。",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );
}

async function generateBookContractFromDecompose(
  novelId: string,
  storyMacroPlan: Awaited<ReturnType<StoryMacroPlanService["decompose"]>>,
  llmOptions: { provider?: string; model?: string; temperature?: number },
): Promise<void> {
  const novel = await prisma.novel.findUnique({
    where: { id: novelId },
    select: { title: true, description: true, estimatedChapterCount: true },
  });
  if (!novel) return;

  const storyInput = storyMacroPlan.storyInput ?? "";
  const targetChapterCount = novel.estimatedChapterCount ?? 30;

  // Construct minimal DirectorCandidate from story macro plan decomposition
  const decomposition = storyMacroPlan.decomposition;
  const candidate = {
    id: "manual-decompose",
    workingTitle: novel.title ?? "",
    logline: storyInput,
    positioning: decomposition?.selling_point ?? storyInput,
    sellingPoint: decomposition?.selling_point ?? storyInput,
    coreConflict: decomposition?.core_conflict ?? storyInput,
    protagonistPath: decomposition?.growth_path ?? "",
    endingDirection: decomposition?.ending_flavor ?? "",
    hookStrategy: decomposition?.main_hook ?? "",
    progressionLoop: decomposition?.progression_loop ?? "",
    whyItFits: "",
    toneKeywords: [] as string[],
    targetChapterCount,
  };

  const context = {
    title: novel.title ?? undefined,
    description: novel.description ?? undefined,
    estimatedChapterCount: novel.estimatedChapterCount ?? undefined,
  };

  const requestedTemperature = llmOptions.temperature ?? 0.4;
  const temperature = Math.min(requestedTemperature, 0.4);

  const parsed = await runStructuredPrompt({
    asset: directorBookContractPrompt,
    promptInput: {
      idea: storyInput,
      context,
      candidate,
      storyMacroPlan,
      targetChapterCount,
    },
    contextBlocks: buildDirectorBookContractContextBlocks({
      idea: storyInput,
      context,
      candidate,
      storyMacroPlan,
      targetChapterCount,
    }),
    options: {
      provider: llmOptions.provider as any,
      model: llmOptions.model,
      temperature,
    },
  });

  const draft = normalizeBookContract(parsed.output);
  const contractService = new BookContractService();
  await contractService.upsert(novelId, draft);
}
