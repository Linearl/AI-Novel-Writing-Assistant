/**
 * REQ-2022 日志写入模块
 *
 * 在 REQ-2021 的 saveDirectorDebugLog 基础上扩展：
 * - saveDirectorDebugBrief: 写入简要日志（*_brief.json），返回详细日志文件名
 * - saveDirectorDebugDetail: 写入详细日志（*_detail.json）
 * - enforceRetention: 按 retentionHours 清理过期文件
 * - saveDirectorDebugLog: 保留原有接口不变（向后兼容）
 */

import { mkdir, readdir, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { DirectorDebugBriefLogEntry, DirectorDebugDetailLogEntry } from "./directorDebugTypes";
import { getDirectorDebugRetentionHours } from "../../../../config/directorDebug";

const MAX_LOG_FILES = 100;

export interface DirectorDebugLogEntry {
  timestamp: string;
  taskId: string;
  novelId: string;
  chapterId: string | null;
  autoExecution: unknown;
  circuitBreaker: unknown;
  recentLlmUsage: unknown[];
  errorStack: string | null;
  config: unknown;
}

/**
 * 保存导演断路器调试日志到磁盘（REQ-2021 原有接口，保持向后兼容）。
 * fire-and-forget 调用: 写入失败静默忽略，不阻塞调用方。
 */
export async function saveDirectorDebugLog(
  entry: DirectorDebugLogEntry,
  logDir: string,
): Promise<void> {
  try {
    await mkdir(logDir, { recursive: true });
    const filename = `${entry.timestamp.replace(/[:.]/g, "-")}_${entry.taskId}.json`;
    const filePath = join(logDir, filename);
    await writeFile(filePath, JSON.stringify(entry, null, 2), "utf-8");
    await enforceMaxLogFiles(logDir);
  } catch {
    // 静默忽略: 不中断断路器停止流程
  }
}

/**
 * 写入简要日志文件（*_brief.json）。
 * 包含基础状态快照 + 详细日志的相对路径引用。
 *
 * @returns 详细日志的文件名，供 saveDirectorDebugDetail 使用
 */
export async function saveDirectorDebugBrief(
  entry: Omit<DirectorDebugBriefLogEntry, "detailLogPath">,
  logDir: string,
): Promise<string> {
  const timestamp = entry.timestamp.replace(/[:.]/g, "-");
  const briefFilename = `${timestamp}_${entry.taskId}_brief.json`;
  const detailFilename = `${timestamp}_${entry.taskId}_detail.json`;

  await mkdir(logDir, { recursive: true });
  const briefPath = join(logDir, briefFilename);
  await writeFile(briefPath, JSON.stringify({
    ...entry,
    detailLogPath: `./${detailFilename}`,
  }, null, 2), "utf-8");

  await enforceMaxLogFiles(logDir);
  await enforceRetention(logDir);
  return detailFilename;
}

/**
 * 写入详细日志文件（*_detail.json）。
 * 包含完整的 LLM 调用历史、章节内容演变、修复过程。
 *
 * @param filename 由 saveDirectorDebugBrief 返回的详细日志文件名
 */
export async function saveDirectorDebugDetail(
  entry: DirectorDebugDetailLogEntry,
  logDir: string,
  filename: string,
): Promise<void> {
  const filePath = join(logDir, filename);
  await writeFile(filePath, JSON.stringify(entry, null, 2), "utf-8");
}

/** 强制删除超过 MAX_LOG_FILES 的最旧文件 */
async function enforceMaxLogFiles(logDir: string): Promise<void> {
  try {
    const files = await readdir(logDir);
    if (files.length <= MAX_LOG_FILES) return;
    const sorted = files.sort();
    const toDelete = sorted.slice(0, files.length - MAX_LOG_FILES);
    await Promise.all(toDelete.map((f) => unlink(join(logDir, f))));
  } catch {
    // 静默忽略
  }
}

/**
 * 按 retentionHours 清理过期日志文件。
 * 检查文件 mtime，删除超过保留时间的文件。
 */
export async function enforceRetention(logDir: string): Promise<void> {
  const retentionMs = getDirectorDebugRetentionHours() * 3600 * 1000;
  const now = Date.now();
  try {
    const files = await readdir(logDir);
    const unlinkPromises: Promise<void>[] = [];
    for (const file of files) {
      try {
        const fileStat = await stat(join(logDir, file));
        if (now - fileStat.mtimeMs > retentionMs) {
          unlinkPromises.push(unlink(join(logDir, file)).catch(() => {}));
        }
      } catch {
        // 单文件 stat 失败时跳过
      }
    }
    await Promise.all(unlinkPromises);
  } catch {
    // 静默忽略
  }
}
