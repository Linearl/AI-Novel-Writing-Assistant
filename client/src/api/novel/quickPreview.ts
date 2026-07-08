import type { ApiResponse } from "@ai-novel/shared/types/api";
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import type { QuickPreviewResult } from "@ai-novel/shared/types/novelQuickPreview";
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
