import type { ApiResponse } from "@ai-novel/shared";
import { apiClient } from "../client";
import { buildExportTimestamp, extractFileName } from "./shared";

// ---------------------------------------------------------------------------
// Export helpers (GET endpoints returning text/plain)
// ---------------------------------------------------------------------------

export interface TxtExportResult {
  blob: Blob;
  fileName: string;
}

async function txtExport(
  url: string,
  fallbackFileName: string,
): Promise<TxtExportResult> {
  const response = await apiClient.get<Blob>(url, { responseType: "blob" });
  return {
    blob: response.data,
    fileName: extractFileName(response.headers["content-disposition"], fallbackFileName),
  };
}

function txtFallbackName(novelTitle: string, asset: string): string {
  const ts = buildExportTimestamp();
  const safe = novelTitle.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ").trim() || "novel";
  return `${safe}-${asset}-${ts}.txt`;
}

/** Export world settings as TXT */
export function exportWorldTxt(novelId: string, novelTitle: string) {
  return txtExport(`/novels/${novelId}/world/export/txt`, txtFallbackName(novelTitle, "world"));
}

/** Export outline as TXT */
export function exportOutlineTxt(novelId: string, novelTitle: string) {
  return txtExport(`/novels/${novelId}/outline/export/txt`, txtFallbackName(novelTitle, "outline"));
}

/** Export characters as TXT */
export function exportCharactersTxt(novelId: string, novelTitle: string) {
  return txtExport(`/novels/${novelId}/characters/export/txt`, txtFallbackName(novelTitle, "characters"));
}

/** Export a single chapter as TXT */
export function exportChapterTxt(novelId: string, chapterId: string, novelTitle: string) {
  return txtExport(
    `/novels/${novelId}/chapters/${chapterId}/export/txt`,
    txtFallbackName(novelTitle, "chapter"),
  );
}

// ---------------------------------------------------------------------------
// Import helpers (POST endpoints accepting raw text body)
// ---------------------------------------------------------------------------

export interface TxtImportResult {
  success: boolean;
  count?: number;
  error?: string;
}

async function txtImport(
  url: string,
  content: string,
  mode?: string,
): Promise<TxtImportResult> {
  const query = mode ? `?mode=${encodeURIComponent(mode)}` : "";
  const response = await apiClient.post<ApiResponse<{ count: number }>>(
    `${url}${query}`,
    content,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
  return { success: true, count: response.data.data?.count };
}

/** Import world settings from TXT. mode = "overwrite" | "merge" */
export function importWorldTxt(novelId: string, content: string, mode?: "overwrite" | "merge") {
  return txtImport(`/novels/${novelId}/world/import/txt`, content, mode);
}

/** Import outline from TXT. mode = "overwrite" | "append" */
export function importOutlineTxt(novelId: string, content: string, mode?: "overwrite" | "append") {
  return txtImport(`/novels/${novelId}/outline/import/txt`, content, mode);
}

/** Import characters from TXT. mode = "overwrite" | "merge" */
export function importCharactersTxt(novelId: string, content: string, mode?: "overwrite" | "merge") {
  return txtImport(`/novels/${novelId}/characters/import/txt`, content, mode);
}
