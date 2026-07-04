/**
 * REQ-2038: Setting consistency report — file-based JSON storage.
 *
 * File layout (per novel):
 *   {dataDir}/consistency-reports/{novelId}/latest.json
 *   {dataDir}/consistency-reports/{novelId}/ignored.json
 */
import fs from "node:fs/promises";
import path from "node:path";
import type {
  SettingConsistencyReport,
  IgnoredContradiction,
} from "@ai-novel/shared/types/settingConsistency";

/* ── Path helpers ──────────────────────────────────────────────────── */

function getReportDir(dataDir: string, novelId: string): string {
  return path.join(dataDir, "consistency-reports", novelId);
}

function getLatestReportPath(dataDir: string, novelId: string): string {
  return path.join(getReportDir(dataDir, novelId), "latest.json");
}

function getIgnoredPath(dataDir: string, novelId: string): string {
  return path.join(getReportDir(dataDir, novelId), "ignored.json");
}

/* ── Internal helpers ──────────────────────────────────────────────── */

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return null;
    }
    throw error;
  }
}

async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  const dir = path.dirname(filePath);
  await ensureDir(dir);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

/* ── Public API ────────────────────────────────────────────────────── */

export interface SettingConsistencyStorage {
  /** Read the latest report for a novel, or null if none exists. */
  getLatestReport(dataDir: string, novelId: string): Promise<SettingConsistencyReport | null>;

  /** Write (overwrite) the latest report for a novel. */
  saveReport(dataDir: string, report: SettingConsistencyReport): Promise<void>;

  /** Read the ignored contradiction list for a novel. Returns empty array if none. */
  getIgnoredList(dataDir: string, novelId: string): Promise<IgnoredContradiction[]>;

  /** Add a contradiction to the ignored list. */
  addIgnoredContradiction(
    dataDir: string,
    novelId: string,
    record: IgnoredContradiction,
  ): Promise<void>;
}

async function getLatestReportImpl(
  dataDir: string,
  novelId: string,
): Promise<SettingConsistencyReport | null> {
  return readJsonFile<SettingConsistencyReport>(getLatestReportPath(dataDir, novelId));
}

async function saveReportImpl(
  dataDir: string,
  report: SettingConsistencyReport,
): Promise<void> {
  await writeJsonFile(getLatestReportPath(dataDir, report.novelId), report);
}

async function getIgnoredListImpl(
  dataDir: string,
  novelId: string,
): Promise<IgnoredContradiction[]> {
  const file = await readJsonFile<{ ignoredContradictions: IgnoredContradiction[] }>(
    getIgnoredPath(dataDir, novelId),
  );
  return file?.ignoredContradictions ?? [];
}

async function addIgnoredContradictionImpl(
  dataDir: string,
  novelId: string,
  record: IgnoredContradiction,
): Promise<void> {
  const existing = await getIgnoredListImpl(dataDir, novelId);
  // Deduplicate by id
  const deduped = existing.filter((r) => r.id !== record.id);
  deduped.push(record);
  await writeJsonFile(getIgnoredPath(dataDir, novelId), {
    ignoredContradictions: deduped,
  });
}

/** Singleton implementation (stateless — all state lives on disk). */
export const settingConsistencyStorage: SettingConsistencyStorage = {
  getLatestReport: getLatestReportImpl,
  saveReport: saveReportImpl,
  getIgnoredList: getIgnoredListImpl,
  addIgnoredContradiction: addIgnoredContradictionImpl,
};
