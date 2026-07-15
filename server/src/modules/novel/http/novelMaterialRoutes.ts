import { Router } from "express";
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import type { ApiResponse } from "@ai-novel/shared";
import { prisma } from "../../../db/prisma";
import { validate } from "../../../middleware/validate";
import { invokeStructuredLlm } from "../../../llm/structuredInvoke";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const novelIdParamsSchema = z.object({
  novelId: z.string().trim().min(1),
});

const materialParamsSchema = z.object({
  novelId: z.string().trim().min(1),
  id: z.string().trim().min(1),
});

const importBodySchema = z.object({
  materials: z
    .array(
      z.object({
        title: z.string().trim().min(1),
        content: z.string().trim().min(1),
      }),
    )
    .min(1)
    .max(100),
});

const updateBodySchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().nullable().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

const toggleBodySchema = z.object({
  enabled: z.boolean(),
});

const descriptionOutputSchema = z.object({
  description: z.string(),
});

function charCount(text: string): number {
  return text.replace(/\s/g, "").length;
}

function buildDescSysPrompt(): string {
  return [
    "你是一个文档分析助手，根据给的材料生成一个简短描述。",
    "",
    "输出格式（每行一个字段）：",
    "[类型] {角色设定|章节大纲|世界观|风格参考|叙事规则|其他}",
    "[摘要] {2-3句内容概括}",
    "[字数] {约XX字}",
    "[适用范围] {全阶段|规划阶段|写作阶段|审校阶段}",
    "",
    "只输出这个格式的描述文本。",
  ].join("\n");
}

async function generateMaterialDescription(
  title: string,
  content: string,
): Promise<string> {
  const preview = content.slice(0, 3000);
  const wc = charCount(content);

  const userMsg =
    "文档标题：" +
    title +
    "\n\n文档内容（前3000字）：\n" +
    preview;

  try {
    const result = await invokeStructuredLlm<{ description: string }>({
      messages: [
        new SystemMessage(buildDescSysPrompt()),
        new HumanMessage(userMsg),
      ],
      schema: descriptionOutputSchema,
      label: "novel.material.describe",
      taskType: "planner",
      temperature: 0.1,
    });
    return result.description;
  } catch {
    const parts: string[] = [];
    parts.push("[类型] 其他");
    parts.push("[摘要] " + title);
    parts.push("[字数] 约" + wc + "字");
    parts.push("[适用范围] 全阶段");
    return parts.join("\n");
  }
}

export function createNovelMaterialRoutes(): Router {
  const router = Router();

  router.post(
    "/:novelId/materials/import",
    validate({ params: novelIdParamsSchema, body: importBodySchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { novelId } = req.params as unknown as z.infer<
          typeof novelIdParamsSchema
        >;
        const { materials } = req.body as z.infer<typeof importBodySchema>;

        const novel = await prisma.novel.findUnique({
          where: { id: novelId },
          select: { id: true },
        });
        if (!novel) {
          res.status(404).json({
            success: false,
            error: "novel not found",
          } satisfies ApiResponse<never>);
          return;
        }

        const maxSort = await prisma.novelMaterial.aggregate({
          where: { novelId },
          _max: { sortOrder: true },
        });
        let nextSort = (maxSort._max.sortOrder ?? -1) + 1;

        const descriptions = await Promise.all(
          materials.map((m) =>
            generateMaterialDescription(m.title, m.content),
          ),
        );

        const created = await Promise.all(
          materials.map((m, i) =>
            prisma.novelMaterial.create({
              data: {
                novelId,
                title: m.title,
                content: m.content,
                description: descriptions[i],
                wordCount: charCount(m.content),
                sortOrder: nextSort + i,
              },
              select: {
                id: true,
                title: true,
                description: true,
                wordCount: true,
              },
            }),
          ),
        );

        res.status(201).json({
          success: true,
          data: { items: created },
        } satisfies ApiResponse<{ items: typeof created }>);
      } catch (error) {
        console.error("[materials] import failed:", error);
        next(error);
      }
    },
  );

  router.get(
    "/:novelId/materials",
    validate({ params: novelIdParamsSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { novelId } = req.params as unknown as z.infer<
          typeof novelIdParamsSchema
        >;

        const novel = await prisma.novel.findUnique({
          where: { id: novelId },
          select: { id: true },
        });
        if (!novel) {
          res.status(404).json({
            success: false,
            error: "novel not found",
          } satisfies ApiResponse<never>);
          return;
        }

        const materials = await prisma.novelMaterial.findMany({
          where: { novelId },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            title: true,
            description: true,
            wordCount: true,
            enabled: true,
            sortOrder: true,
            createdAt: true,
          },
        });

        res.status(200).json({
          success: true,
          data: { items: materials },
        } satisfies ApiResponse<{ items: typeof materials }>);
      } catch (error) {
        console.error("[materials] list failed:", error);
        next(error);
      }
    },
  );

  router.get(
    "/:novelId/materials/:id",
    validate({ params: materialParamsSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { novelId, id } = req.params as unknown as z.infer<
          typeof materialParamsSchema
        >;
        const material = await prisma.novelMaterial.findFirst({
          where: { id, novelId },
        });
        if (!material) {
          res.status(404).json({
            success: false,
            error: "material not found",
          } satisfies ApiResponse<never>);
          return;
        }
        res.status(200).json({
          success: true,
          data: material,
        } satisfies ApiResponse<typeof material>);
      } catch (error) {
        console.error("[materials] get failed:", error);
        next(error);
      }
    },
  );

  router.patch(
    "/:novelId/materials/:id",
    validate({ params: materialParamsSchema, body: updateBodySchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { novelId, id } = req.params as unknown as z.infer<
          typeof materialParamsSchema
        >;
        const update = req.body as z.infer<typeof updateBodySchema>;

        const existing = await prisma.novelMaterial.findFirst({
          where: { id, novelId },
          select: { id: true },
        });
        if (!existing) {
          res.status(404).json({
            success: false,
            error: "material not found",
          } satisfies ApiResponse<never>);
          return;
        }

        const data: Record<string, unknown> = {};
        if (update.title !== undefined) data.title = update.title;
        if (update.description !== undefined)
          data.description = update.description;
        if (update.sortOrder !== undefined)
          data.sortOrder = update.sortOrder;

        const updated = await prisma.novelMaterial.update({
          where: { id },
          data,
        });
        res.status(200).json({
          success: true,
          data: updated,
        } satisfies ApiResponse<typeof updated>);
      } catch (error) {
        console.error("[materials] update failed:", error);
        next(error);
      }
    },
  );

  router.delete(
    "/:novelId/materials/:id",
    validate({ params: materialParamsSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { novelId, id } = req.params as unknown as z.infer<
          typeof materialParamsSchema
        >;
        const existing = await prisma.novelMaterial.findFirst({
          where: { id, novelId },
          select: { id: true },
        });
        if (!existing) {
          res.status(404).json({
            success: false,
            error: "material not found",
          } satisfies ApiResponse<never>);
          return;
        }
        await prisma.novelMaterial.delete({ where: { id } });
        res.status(200).json({
          success: true,
          data: null,
        } satisfies ApiResponse<null>);
      } catch (error) {
        console.error("[materials] delete failed:", error);
        next(error);
      }
    },
  );

  router.patch(
    "/:novelId/materials/:id/toggle",
    validate({ params: materialParamsSchema, body: toggleBodySchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { novelId, id } = req.params as unknown as z.infer<
          typeof materialParamsSchema
        >;
        const { enabled } = req.body as z.infer<typeof toggleBodySchema>;

        const existing = await prisma.novelMaterial.findFirst({
          where: { id, novelId },
          select: { id: true },
        });
        if (!existing) {
          res.status(404).json({
            success: false,
            error: "material not found",
          } satisfies ApiResponse<never>);
          return;
        }

        const updated = await prisma.novelMaterial.update({
          where: { id },
          data: { enabled },
        });
        res.status(200).json({
          success: true,
          data: updated,
        } satisfies ApiResponse<typeof updated>);
      } catch (error) {
        console.error("[materials] toggle failed:", error);
        next(error);
      }
    },
  );

  return router;
}
