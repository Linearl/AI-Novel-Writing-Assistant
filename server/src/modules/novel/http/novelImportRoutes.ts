import { Router } from "express";
import { z } from "zod";
import { validate } from "../../../middleware/validate";
import { prisma } from "../../../db/prisma";
import type { ApiResponse } from "@ai-novel/shared/types/api";

const importBodySchema = z.object({
  bundle: z.object({
    metadata: z.object({
      novelTitle: z.string().min(1).max(200),
      exportedAt: z.string().optional(),
    }),
    sections: z.record(z.string(), z.unknown()),
  }),
  scopes: z.array(z.string().min(1)).min(1),
});

export function createNovelImportRoutes(): Router {
  const router = Router();

  router.post("/import", validate({ body: importBodySchema }), async (req, res, next) => {
    try {
      const { bundle, scopes } = req.body as z.infer<typeof importBodySchema>;
      const sections = bundle.sections as Record<string, unknown>;

      // Create the novel with basic data
      const basicSection = sections.basic as { title?: string; genre?: string; description?: string } | undefined;
      const novelTitle = basicSection?.title || bundle.metadata.novelTitle;

      const novel = await prisma.novel.create({
        data: {
          title: novelTitle,
          description: basicSection?.description ?? undefined,
        },
      });

      // Import characters if selected
      if (scopes.includes("character")) {
        const characterSection = sections.character as { characters?: Array<{ name: string; description?: string; personality?: string; role?: string }> } | undefined;
        if (characterSection?.characters) {
          for (const char of characterSection.characters) {
            await prisma.character.create({
              data: {
                novelId: novel.id,
                name: char.name,
                role: char.role ?? "未指定",
                personality: char.personality ?? null,
              },
            }).catch(() => null);
          }
        }
      }

      // Import chapters if selected
      if (scopes.includes("chapter")) {
        const chapterSection = sections.chapter as { chapters?: Array<{ title?: string; content?: string; order?: number }> } | undefined;
        if (chapterSection?.chapters) {
          for (let i = 0; i < chapterSection.chapters.length; i++) {
            const ch = chapterSection.chapters[i];
            await prisma.chapter.create({
              data: {
                novelId: novel.id,
                title: ch.title ?? `第${i + 1}章`,
                content: ch.content ?? "",
                order: ch.order ?? i + 1,
              },
            }).catch(() => null);
          }
        }
      }

      const response: ApiResponse<{ novelId: string }> = {
        success: true,
        data: { novelId: novel.id },
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
