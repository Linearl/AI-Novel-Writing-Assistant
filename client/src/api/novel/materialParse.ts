import type { ApiResponse } from "@ai-novel/shared/types/api";
import { apiClient } from "../client";

export interface MaterialParseResult {
  title?: string;
  description?: string;
  targetAudience?: string;
  bookSellingPoint?: string;
  competingFeel?: string;
  first30ChapterPromise?: string;
  styleTone?: string;
  commercialTagsText?: string;
  worldSetting?: string;
  characters?: string;
  outline?: string;
  genreHint?: string;
}

export interface ParseMaterialPayload {
  material: string;
  provider?: string;
  model?: string;
}

export async function parseMaterial(payload: ParseMaterialPayload) {
  const { data } = await apiClient.post<ApiResponse<MaterialParseResult>>(
    "/novels/parse-material",
    payload,
  );
  return data;
}
