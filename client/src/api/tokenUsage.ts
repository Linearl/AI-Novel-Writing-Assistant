import type { ApiResponse, NovelTokenStatsResponse } from "@ai-novel/shared";
import { apiClient } from "./client";

export async function fetchNovelTokenStats(novelId: string) {
  const { data } = await apiClient.get<ApiResponse<NovelTokenStatsResponse>>(
    `/llm/novels/${encodeURIComponent(novelId)}/token-stats`,
  );
  return data;
}
