/**
 * novelVolumeChapterMirror.ts
 *
 * Chapter mirroring & hydration helpers extracted from NovelVolumeService.
 * Pure extraction — no functional changes.
 */

import type { VolumePlanDocument } from "@ai-novel/shared";
import { prisma } from "../../../db/prisma";

export async function hydrateCanonicalChapterFields(
  novelId: string,
  document: VolumePlanDocument,
): Promise<{ document: VolumePlanDocument; changed: boolean }> {
  const chapterRows = await prisma.chapter.findMany({
    where: { novelId },
    orderBy: { order: "asc" },
    select: {
      id: true,
      order: true,
      title: true,
      expectation: true,
      targetWordCount: true,
      conflictLevel: true,
      revealLevel: true,
      mustAvoid: true,
      taskSheet: true,
      sceneCards: true,
      tensionLevel: true,
    },
  });
  if (chapterRows.length === 0) {
    return { document, changed: false };
  }

  const chapterById = new Map(chapterRows.map((row) => [row.id, row] as const));
  const chapterByOrder = new Map(chapterRows.map((row) => [row.order, row] as const));
  let changed = false;
  const volumes = document.volumes.map((volume) => {
    const chapters = volume.chapters.map((chapter) => {
      const row = chapter.chapterId
        ? chapterById.get(chapter.chapterId) ?? chapterByOrder.get(chapter.chapterOrder)
        : chapterByOrder.get(chapter.chapterOrder);
      if (!row) {
        return chapter;
      }
      const nextChapter = {
        ...chapter,
        chapterId: row.id,
        chapterOrder: row.order,
        title: row.title,
        summary: row.expectation?.trim() || chapter.summary,
        tensionLevel: (row.tensionLevel as import("@ai-novel/shared/types/novel").TensionLevel) ?? chapter.tensionLevel ?? null,
        targetWordCount: row.targetWordCount ?? null,
        conflictLevel: row.conflictLevel ?? null,
        revealLevel: row.revealLevel ?? null,
        mustAvoid: row.mustAvoid ?? null,
        taskSheet: row.taskSheet ?? null,
        sceneCards: row.sceneCards ?? null,
      };
      if (JSON.stringify(nextChapter) !== JSON.stringify(chapter)) {
        changed = true;
      }
      return nextChapter;
    });
    return changed ? { ...volume, chapters } : volume;
  });

  return { document: changed ? { ...document, volumes } : document, changed };
}

export function mirrorChapterIntoDocument(
  document: VolumePlanDocument,
  chapter: {
    id?: string | null;
    order: number;
    title: string;
    expectation?: string | null;
    tensionLevel?: string | null;
    targetWordCount?: number | null;
    conflictLevel?: number | null;
    revealLevel?: number | null;
    mustAvoid?: string | null;
    taskSheet?: string | null;
    sceneCards?: string | null;
  },
): VolumePlanDocument | null {
  let changed = false;
  const nextVolumes = document.volumes.map((volume) => {
    const chapters = volume.chapters.map((item) => {
      const matchesChapter = chapter.id
        ? item.chapterId === chapter.id || item.chapterOrder === chapter.order
        : item.chapterOrder === chapter.order;
      if (!matchesChapter) {
        return item;
      }
      changed = true;
      return {
        ...item,
        chapterId: chapter.id ?? item.chapterId ?? null,
        chapterOrder: chapter.order,
        title: chapter.title,
        summary: chapter.expectation?.trim() || item.summary,
        tensionLevel: (chapter.tensionLevel as import("@ai-novel/shared/types/novel").TensionLevel | null) ?? item.tensionLevel ?? null,
        targetWordCount: chapter.targetWordCount ?? null,
        conflictLevel: chapter.conflictLevel ?? null,
        revealLevel: chapter.revealLevel ?? null,
        mustAvoid: chapter.mustAvoid ?? null,
        taskSheet: chapter.taskSheet ?? null,
        sceneCards: chapter.sceneCards ?? null,
      };
    });
    return changed ? { ...volume, chapters } : volume;
  });
  if (!changed) {
    return null;
  }
  return { ...document, volumes: nextVolumes };
}
