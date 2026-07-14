import type { ApiResponse } from "@ai-novel/shared";
import { apiClient } from "../client";

export type GlobalReviewIssueSeverity = "critical" | "major" | "minor";

export type GlobalReviewIssueCategory =
  | "character_consistency"
  | "plot_continuity"
  | "foreshadowing"
  | "pacing"
  | "worldbuilding";

export type GlobalReviewIssueStatus = "pending" | "acknowledged" | "fixed" | "dismissed";

export interface GlobalReviewIssue {
  id: string;
  severity: GlobalReviewIssueSeverity;
  category: GlobalReviewIssueCategory;
  description: string;
  fixDirection: string;
  affectedChapters: string[];
  primaryFixChapter: string | null;
  status: GlobalReviewIssueStatus;
  reviewRunId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GlobalReviewRunResult {
  reviewRunId: string;
  issueCount: number;
  summary: string;
  issues: GlobalReviewIssue[];
}

export interface RunGlobalReviewPayload {
  mode?: "currentVolume" | "range";
  startChapterOrder?: number;
  endChapterOrder?: number;
}

export async function runGlobalReview(
  novelId: string,
  payload: RunGlobalReviewPayload = {},
) {
  const { data } = await apiClient.post<ApiResponse<GlobalReviewRunResult>>(
    `/novels/${novelId}/global-review`,
    payload,
  );
  return data;
}

export async function listGlobalReviewIssues(
  novelId: string,
  params?: { status?: string },
) {
  const { data } = await apiClient.get<ApiResponse<GlobalReviewIssue[]>>(
    `/novels/${novelId}/global-review-issues`,
    { params },
  );
  return data;
}

export async function updateGlobalReviewIssueStatus(
  novelId: string,
  issueId: string,
  status: GlobalReviewIssueStatus,
) {
  const { data } = await apiClient.post<ApiResponse<GlobalReviewIssue>>(
    `/novels/${novelId}/global-review-issues/${issueId}/status`,
    { status },
  );
  return data;
}
