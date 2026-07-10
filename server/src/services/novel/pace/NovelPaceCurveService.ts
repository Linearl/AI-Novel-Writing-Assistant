import type { PaceCurveData } from "@ai-novel/shared";
import { prisma } from "../../../db/prisma";

const WRITTEN_GENERATION_STATES = new Set(["drafted", "reviewed", "repaired", "approved", "published"]);

export class NovelPaceCurveService {
  async getPaceCurve(novelId: string): Promise<PaceCurveData> {
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

    return {
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
  }
}

export const novelPaceCurveService = new NovelPaceCurveService();
