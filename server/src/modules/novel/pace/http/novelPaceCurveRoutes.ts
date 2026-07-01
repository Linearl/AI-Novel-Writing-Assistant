import { Router } from "express";
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import { validate } from "../../../../middleware/validate";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import type { PaceCurveData } from "@ai-novel/shared/types/novel";

const novelIdParamsSchema = z.object({ novelId: z.string().min(1) });

const WRITTEN_GENERATION_STATES = new Set(["drafted", "reviewed", "repaired", "approved", "published"]);

export function createNovelPaceCurveRoutes(): Router {
  const router = Router();

  type P = Record<string, string>;

  router.get(
    "/novels/:novelId/pace-curve",
    validate({ params: novelIdParamsSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { novelId } = req.params as P;
        const { prisma } = await import("../../../../db/prisma");

        const volumes = await prisma.volumePlan.findMany({
          where: { novelId },
          orderBy: { sortOrder: "asc" },
          include: {
            chapters: {
              orderBy: { chapterOrder: "asc" },
              select: {
                id: true,
                chapterOrder: true,
                title: true,
                conflictLevel: true,
                revealLevel: true,
                chapterId: true,
              },
            },
          },
        });

        const chapterIds = volumes
          .flatMap((volume) => volume.chapters)
          .map((ch) => ch.chapterId)
          .filter((id): id is string => id !== null);

        const chapters = chapterIds.length > 0
          ? await prisma.chapter.findMany({
              where: { id: { in: chapterIds } },
              select: { id: true, generationState: true },
            })
          : [];

        const chapterStateMap = new Map(
          chapters.map((ch) => [ch.id, ch.generationState]),
        );

        const data: PaceCurveData = {
          novelId,
          volumes: volumes.map((volume) => ({
            volumeId: volume.id,
            volumeTitle: volume.title,
            sortOrder: volume.sortOrder,
            chapters: volume.chapters.map((chapter) => ({
              chapterOrder: chapter.chapterOrder,
              title: chapter.title,
              conflictLevel: chapter.conflictLevel,
              revealLevel: chapter.revealLevel,
              isWritten: chapter.chapterId !== null
                && WRITTEN_GENERATION_STATES.has(
                  chapterStateMap.get(chapter.chapterId) ?? "planned",
                ),
              chapterId: chapter.chapterId,
              volumeId: volume.id,
            })),
          })),
        };

        const response: ApiResponse<PaceCurveData> = { success: true, data };
        res.json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
