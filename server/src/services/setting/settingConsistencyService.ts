/**
 * REQ-2038: Setting consistency check service.
 *
 * Orchestrates: prompt loading -> LLM invocation -> report storage -> ignore filtering.
 */
import { getRegisteredPromptAsset } from "../../prompting/registry";
import { runStructuredPrompt } from "../../prompting/core/promptRunner";
import { resolveDataRoot } from "../../runtime/appPaths";
import { settingConsistencyStorage } from "./settingConsistencyStorage";
import type {
  SettingConsistencyReport,
  IgnoredContradiction,
} from "@ai-novel/shared";

/* ── Prompt ID constants ───────────────────────────────────────────── */

const PROMPT_ID = "setting.consistency.check";
const PROMPT_VERSION = "v1";

/* ── Service implementation ────────────────────────────────────────── */

export interface SettingConsistencyService {
  /**
   * Run LLM-based consistency check on the provided settings.
   * Saves the report to disk and returns it (with ignored items filtered out).
   */
  checkConsistency(
    novelId: string,
    settings: Record<string, unknown>,
    options?: { provider?: string; model?: string },
  ): Promise<SettingConsistencyReport>;

  /** Read the latest saved report for a novel, or null if none exists. */
  getReport(novelId: string): Promise<SettingConsistencyReport | null>;

  /** Mark a contradiction as ignored. */
  ignoreContradiction(
    novelId: string,
    contradictionId: string,
    reason?: string,
  ): Promise<void>;
}

function getDataDir(): string {
  return resolveDataRoot();
}

async function checkConsistencyImpl(
  novelId: string,
  settings: Record<string, unknown>,
  options?: { provider?: string; model?: string },
): Promise<SettingConsistencyReport> {
  const asset = getRegisteredPromptAsset(PROMPT_ID, PROMPT_VERSION);
  if (!asset) {
    throw new Error(`Prompt asset ${PROMPT_ID}@${PROMPT_VERSION} not found in registry.`);
  }

  const settingsJson = JSON.stringify(settings, null, 2);

  const result = await runStructuredPrompt({
    asset: asset as Parameters<typeof runStructuredPrompt>[0]["asset"],
    promptInput: {
      novelId,
      settingsJson,
      retry: false,
    },
    options: {
      provider: options?.provider,
      model: options?.model,
      novelId,
    },
  });

  const report = result.output as SettingConsistencyReport;
  const dataDir = getDataDir();

  // Save report to disk
  await settingConsistencyStorage.saveReport(dataDir, report);

  // Filter out ignored contradictions before returning
  const ignored = await settingConsistencyStorage.getIgnoredList(dataDir, novelId);
  const ignoredIds = new Set(ignored.map((r) => r.id));
  const filteredReport: SettingConsistencyReport = {
    ...report,
    contradictions: report.contradictions.filter((c) => !ignoredIds.has(c.id)),
  };

  return filteredReport;
}

async function getReportImpl(novelId: string): Promise<SettingConsistencyReport | null> {
  const dataDir = getDataDir();
  const report = await settingConsistencyStorage.getLatestReport(dataDir, novelId);
  if (!report) {
    return null;
  }

  // Filter out ignored contradictions
  const ignored = await settingConsistencyStorage.getIgnoredList(dataDir, novelId);
  const ignoredIds = new Set(ignored.map((r) => r.id));
  return {
    ...report,
    contradictions: report.contradictions.filter((c) => !ignoredIds.has(c.id)),
  };
}

async function ignoreContradictionImpl(
  novelId: string,
  contradictionId: string,
  reason?: string,
): Promise<void> {
  const dataDir = getDataDir();
  const record: IgnoredContradiction = {
    id: contradictionId,
    ignoredAt: new Date().toISOString(),
    reason,
  };
  await settingConsistencyStorage.addIgnoredContradiction(dataDir, novelId, record);
}

/** Singleton service instance. */
export const settingConsistencyService: SettingConsistencyService = {
  checkConsistency: checkConsistencyImpl,
  getReport: getReportImpl,
  ignoreContradiction: ignoreContradictionImpl,
};
