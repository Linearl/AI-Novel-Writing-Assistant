/**
 * REQ-3010: Material parse — API routes.
 *
 * Endpoint (relative to /api/novels):
 *   POST /parse-material   — parse raw material text into structured novel fields
 */
import { Router } from "express";
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import type { ApiResponse } from "@ai-novel/shared";
import { validate } from "../../../middleware/validate";
import { invokeStructuredLlm } from "../../../llm/structuredInvoke";
import { getRegisteredPromptAsset } from "../../../prompting/registry";
import { materialParseOutputSchema, type MaterialParseOutput } from "../../../prompting/prompts/novel/materialParse.promptSchemas";
import type { LLMProvider } from "@ai-novel/shared";

/* ── Zod schemas ───────────────────────────────────────────────────── */

const parseMaterialBodySchema = z.object({
  material: z.string().min(10, "素材内容至少 10 个字符").max(50000, "素材内容最多 50000 个字符"),
  provider: z.string().optional(),
  model: z.string().optional(),
});

/* ── Service ────────────────────────────────────────────────────────── */

export async function parseMaterial(
  material: string,
  options?: { provider?: LLMProvider; model?: string },
): Promise<MaterialParseOutput> {
  const promptId = "novel.material.parse";
  const promptVersion = "v1";
  const asset = getRegisteredPromptAsset(promptId, promptVersion);
  if (!asset) {
    throw new Error(`Prompt asset not found: ${promptId}@${promptVersion}`);
  }

  const messages = asset.render(
    { material, forceJson: false, retryReason: null },
    { blocks: [], selectedBlockIds: [], droppedBlockIds: [], summarizedBlockIds: [], estimatedInputTokens: 0 },
  );

  const result = await invokeStructuredLlm<MaterialParseOutput>({
    messages,
    schema: materialParseOutputSchema,
    label: "novel.material.parse",
    taskType: "planner",
    temperature: 0.3,
    provider: options?.provider as LLMProvider | undefined,
    model: options?.model,
  });

  return result;
}

/* ── Router factory ────────────────────────────────────────────────── */

export function createNovelMaterialParseRoutes(): Router {
  const router = Router();

  /**
   * POST /parse-material
   * Parse raw material text into structured novel fields.
   */
  router.post(
    "/parse-material",
    validate({ body: parseMaterialBodySchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { material, provider, model } = req.body as z.infer<typeof parseMaterialBodySchema>;

        const parsed = await parseMaterial(material, { provider, model });

        res.status(200).json({
          success: true,
          data: parsed,
          message: "素材解析完成。",
        } satisfies ApiResponse<MaterialParseOutput>);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
