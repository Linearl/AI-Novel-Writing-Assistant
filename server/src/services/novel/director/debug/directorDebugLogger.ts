import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

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
 * 保存导演断路器调试日志到磁盘。
 * fire-and-forget 调用: 写入失败静默忽略，不阻塞调用方。
 *
 * @param logDir 日志目录绝对路径，调用方负责传入（便于测试注入临时目录）
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
