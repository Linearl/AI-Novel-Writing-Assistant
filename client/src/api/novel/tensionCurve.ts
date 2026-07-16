/**
 * tensionCurve.ts — 冲突曲线 API 客户端
 *
 * 提供冲突曲线相关的 API 请求函数。
 * 底层复用现有 chapter 更新接口，增加便捷封装。
 */

import type { ApiResponse } from "@ai-novel/shared";
import type { Chapter } from "@ai-novel/shared";
import { updateNovelChapter } from "../novel/chapters";
import { apiClient } from "../client";

/**
 * 更新单个章节的冲突值
 */
export async function updateChapterConflictLevel(
  novelId: string,
  chapterId: string,
  conflictLevel: number,
): Promise<ApiResponse<Chapter>> {
  return updateNovelChapter(novelId, chapterId, { conflictLevel });
}

/**
 * 批量更新冲突值（并发）
 */
export async function batchUpdateConflictLevels(
  novelId: string,
  updates: Array<{ chapterId: string; conflictLevel: number }>,
): Promise<ApiResponse<Chapter>[]> {
  return Promise.all(
    updates.map(({ chapterId, conflictLevel }) =>
      updateNovelChapter(novelId, chapterId, { conflictLevel }),
    ),
  );
}
