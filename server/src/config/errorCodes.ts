/**
 * Canonical error message constants.
 *
 * Eliminates hardcoded duplicate strings scattered across services.
 * Import the message constant (or the helper) instead of inlining the text.
 *
 * Convention: messages are in Chinese for user-facing API errors;
 * English constants are kept for internal/domain errors.
 */

/* ------------------------------------------------------------------ */
/*  Domain entity not-found messages                                    */
/* ------------------------------------------------------------------ */

export const ERR_NOVEL_NOT_FOUND = "小说不存在。";
export const ERR_CHAPTER_NOT_FOUND = "章节不存在。";
export const ERR_WORLD_NOT_FOUND = "世界设定不存在。";
export const ERR_CHARACTER_NOT_FOUND = "角色不存在。";
export const ERR_BASE_CHARACTER_NOT_FOUND = "基础角色不存在。";
export const ERR_NOVEL_OR_CHARACTER_NOT_FOUND = "小说或角色不存在。";
export const ERR_VOLUME_VERSION_NOT_FOUND = "卷级版本不存在。";
export const ERR_SNAPSHOT_NOT_FOUND = "快照不存在。";
export const ERR_BOOK_ANALYSIS_NOT_FOUND = "Book analysis not found.";

/* ------------------------------------------------------------------ */
/*  Workflow / task messages                                            */
/* ------------------------------------------------------------------ */

export const ERR_WORKFLOW_TASK_NOT_FOUND = "Workflow task not found.";
export const ERR_TASK_NOT_FOUND = "Task not found.";
export const ERR_TASK_NOT_FOUND_AFTER_RETRY = "Task not found after retry.";
export const ERR_TASK_NOT_FOUND_AFTER_CANCELLATION = "Task not found after cancellation.";
export const ERR_TASK_ARCHIVE_INVALID_STATE = "Only completed, failed, or cancelled tasks can be archived.";

/* ------------------------------------------------------------------ */
/*  Replan / execution messages                                         */
/* ------------------------------------------------------------------ */

export const ERR_NO_REPLANABLE_CHAPTERS = "当前小说没有可重规划的章节。";
export const ERR_IMAGE_GENERATION_EMPTY = "图片生成结果为空。";
export const ERR_INVALID_JSON_OBJECT = "Invalid JSON object.";

/* ------------------------------------------------------------------ */
/*  Helpers: throw helpers that pair message + status                   */
/* ------------------------------------------------------------------ */

import { AppError } from "../middleware/errorHandler";

/** Throw a 404 AppError with the given message. */
export function throwNotFound(message: string): never {
  throw new AppError(message, 404);
}

/** Throw a 400 AppError with the given message. */
export function throwBadRequest(message: string): never {
  throw new AppError(message, 400);
}
