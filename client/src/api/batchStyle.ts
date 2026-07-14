import type { ApiResponse, StyleDetectionReport } from "@ai-novel/shared";
import { apiClient } from "./client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BatchDetectChapterResult {
  chapterId: string;
  chapterTitle: string;
  detection: StyleDetectionReport;
}

export interface BatchDetectionResult {
  novelId: string;
  chapterCount: number;
  totalViolations: number;
  avgRiskScore: number;
  results: BatchDetectChapterResult[];
}

export type BatchPolishChapterStatus =
  | "pending"
  | "detecting"
  | "polishing"
  | "done"
  | "error"
  | "skipped"
  | "cancelled";

export interface BatchPolishChapterProgress {
  chapterId: string;
  chapterTitle: string;
  chapterOrder: number;
  status: BatchPolishChapterStatus;
  violationCount: number;
  riskScore: number | null;
  originalRiskScore: number | null;
  newRiskScore: number | null;
  issuesFixed: number;
  error?: string;
  skippedReason?: string;
}

export interface BatchPolishJobProgress {
  jobId: string;
  status: "running" | "done" | "cancelled" | "error";
  totalChapters: number;
  completedChapters: number;
  rewrittenChapters: number;
  skippedChapters: number;
  failedChapters: number;
  riskThreshold: number;
  autoApply: boolean;
  percent: number;
  results: BatchPolishChapterProgress[];
  startedAt: string;
  finishedAt?: string;
}

interface BatchStyleBaseParams {
  chapterIds?: string[];
  styleProfileId?: string;
  taskStyleProfileId?: string;
  previewAntiAiRuleIds?: string[];
  provider?: string;
  model?: string;
  temperature?: number;
  riskThreshold?: number;
  autoApply?: boolean;
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

export async function batchStyleDetect(
  novelId: string,
  params: BatchStyleBaseParams = {},
): Promise<BatchDetectionResult> {
  const { data: envelope } = await apiClient.post<ApiResponse<BatchDetectionResult>>(
    `/novels/${novelId}/batch-style-detect`,
    params,
  );
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- success response always has data
  return envelope.data!;
}

export async function batchStylePolish(
  novelId: string,
  params: BatchStyleBaseParams = {},
): Promise<{ jobId: string }> {
  const { data: envelope } = await apiClient.post<ApiResponse<{ jobId: string }>>(
    `/novels/${novelId}/batch-style-polish`,
    params,
  );
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- success response always has data
  return envelope.data!;
}

export async function getBatchPolishProgress(
  novelId: string,
  jobId: string,
): Promise<BatchPolishJobProgress> {
  const { data: envelope } = await apiClient.get<ApiResponse<BatchPolishJobProgress>>(
    `/novels/${novelId}/batch-style-polish/${jobId}/progress`,
  );
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- success response always has data
  return envelope.data!;
}

export async function cancelBatchPolish(
  novelId: string,
  jobId: string,
): Promise<void> {
  await apiClient.post<ApiResponse<null>>(
    `/novels/${novelId}/batch-style-polish/${jobId}/cancel`,
  );
}
