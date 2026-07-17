import type { Chapter } from "@ai-novel/shared";

export type BatchWriteMode = "count" | "visible_all" | "volume_all";

export interface BatchWriteRange {
  startOrder: number;
  endOrder: number;
  count: number;
  label: string;
  hint: string;
}

export function resolveBatchWriteRange(params: {
  selectedChapter: Chapter | undefined;
  chapters: Chapter[];
  batchMode: BatchWriteMode;
  batchCount: number;
}): BatchWriteRange | null {
  const { selectedChapter, chapters, batchMode, batchCount } = params;
  if (!selectedChapter || chapters.length === 0) {
    return null;
  }

  const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);
  const selectedIndex = sortedChapters.findIndex((ch) => ch.id === selectedChapter.id);
  if (selectedIndex < 0) {
    return null;
  }

  const remainingChapters = sortedChapters.slice(selectedIndex);
  const hasCountBatch = remainingChapters.length > 1;
  const hasVisibleBatch = chapters.length > 1;
  const hasVolumeBatch = chapters.length > 1;

  if (batchMode === "visible_all" && hasVisibleBatch) {
    const start = sortedChapters[0];
    const end = sortedChapters[sortedChapters.length - 1];
    return {
      startOrder: start.order,
      endOrder: end.order,
      count: sortedChapters.length,
      label: `当前可见的 ${sortedChapters.length} 章`,
      hint: `会按照当前筛选，一次写完可见的 ${sortedChapters.length} 章。`,
    };
  }

  if (batchMode === "volume_all" && hasVolumeBatch) {
    const start = sortedChapters[0];
    const end = sortedChapters[sortedChapters.length - 1];
    return {
      startOrder: start.order,
      endOrder: end.order,
      count: sortedChapters.length,
      label: `本卷全部 ${sortedChapters.length} 章`,
      hint: `会从第 ${start.order} 章到第 ${end.order} 章，连续写完当前卷全部章节。`,
    };
  }

  if (!hasCountBatch) {
    return null;
  }

  const count = Math.min(Math.max(batchCount, 2), remainingChapters.length);
  const start = remainingChapters[0];
  const end = remainingChapters[count - 1];
  return {
    startOrder: start.order,
    endOrder: end.order,
    count,
    label: `从第 ${selectedChapter.order} 章起连续 ${count} 章`,
    hint: `会从第 ${selectedChapter.order} 章开始，顺次写接下来的 ${count} 章。`,
  };
}
