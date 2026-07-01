import type { ApiResponse } from "@ai-novel/shared/types/api";
import type { PaceCurveData } from "@ai-novel/shared/types/novel";
import { apiClient } from "../client";

export async function getPaceCurveData(novelId: string) {
  const { data } = await apiClient.get<ApiResponse<PaceCurveData>>(`/novels/${novelId}/pace-curve`);
  return data;
}
