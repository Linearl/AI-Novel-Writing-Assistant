import type { ApiResponse } from "@ai-novel/shared";
import type { LLMProvider } from "@ai-novel/shared";
import type {
  GeneratePreviewChaptersResult,
  QuickPreviewCandidate,
  QuickPreviewResult,
} from "@ai-novel/shared";
import { apiClient } from "../client";

export async function generateQuickPreview(payload: {
  inspiration: string;
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
}) {
  const { data } = await apiClient.post<ApiResponse<QuickPreviewResult>>(
    "/novels/quick-preview",
    payload,
  );
  return data;
}

export async function generatePreviewChapters(payload: {
  inspiration: string;
  candidate: QuickPreviewCandidate;
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
}) {
  const { data } = await apiClient.post<ApiResponse<GeneratePreviewChaptersResult>>(
    "/novels/quick-preview/generate-chapters",
    payload,
  );
  return data;
}
