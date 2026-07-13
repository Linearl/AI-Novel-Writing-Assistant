import type { VolumeSyncPreview } from "@ai-novel/shared";
import { logger } from "../../logging/LoggerService";

export interface TitleChangedChapter {
  chapterId: string;
  novelId: string;
  oldTitle: string;
  newTitle: string;
  order: number;
}

export interface ChapterTitleSyncRegenerationDeps {
  runPipelineChapter: (
    novelId: string,
    chapterId: string,
  ) => Promise<unknown>;
}

/**
 * 从 VolumeSyncPreview 中筛选出标题发生变更且已有内容的章节，
 * 并触发异步内容重新生成（fire-and-forget）。
 */
export function collectTitleChangedChapters(
  preview: VolumeSyncPreview,
  novelId: string,
  existingChapters: Array<{ id: string; title: string; content?: string | null; chapterStatus?: string | null; order: number }>,
): TitleChangedChapter[] {
  const result: TitleChangedChapter[] = [];
  for (const item of preview.items) {
    if (item.action !== "update") continue;
    if (!item.changedFields.includes("标题")) continue;
    if (!item.hasContent) continue;
    const existing = existingChapters.find((ch) => ch.order === item.chapterOrder);
    if (!existing) continue;
    if (!existing.content?.trim()) continue;
    if (existing.chapterStatus === "generating") continue;
    result.push({
      chapterId: existing.id,
      novelId,
      oldTitle: item.previousTitle ?? existing.title,
      newTitle: item.nextTitle,
      order: item.chapterOrder,
    });
  }
  return result;
}

export async function regenerateChaptersForTitleChanges(
  chapters: TitleChangedChapter[],
  deps: ChapterTitleSyncRegenerationDeps,
): Promise<void> {
  if (chapters.length === 0) return;
  logger.info("[ChapterTitleSync] 开始重新生成标题变更章节", {
    count: chapters.length,
    chapterOrders: chapters.map((ch) => ch.order),
  });
  for (const chapter of chapters) {
    try {
      await deps.runPipelineChapter(chapter.novelId, chapter.chapterId);
      logger.info("[ChapterTitleSync] 章节重新生成完成", {
        chapterOrder: chapter.order,
        newTitle: chapter.newTitle,
      });
    } catch (err) {
      logger.warn("[ChapterTitleSync] 章节重新生成失败，保留旧内容", {
        chapterOrder: chapter.order,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
