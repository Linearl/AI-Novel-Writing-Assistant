import type {
  NovelRiskRecord,
  RiskAssessment,
  RiskReopenImpact,
  RiskStatus,
  RiskType,
  RiskSeverity,
} from "@ai-novel/shared";
import type { ApiResponse } from "@ai-novel/shared";
import { apiClient } from "./client";

export interface RiskExportResult {
  format: string;
  content: string;
}

export async function listRisks(
  novelId: string,
  filters?: { status?: RiskStatus; type?: RiskType; severity?: RiskSeverity },
) {
  const { data } = await apiClient.get<ApiResponse<NovelRiskRecord[]>>(`/novels/${novelId}/risks`, {
    params: filters,
  });
  return data;
}

export async function getRisk(novelId: string, riskId: string) {
  const { data } = await apiClient.get<ApiResponse<NovelRiskRecord>>(`/novels/${novelId}/risks/${riskId}`);
  return data;
}

export async function createRisk(
  novelId: string,
  payload: {
    type?: string;
    severity?: string;
    title: string;
    description?: string;
    chapterId?: string;
    chapterRange?: string;
    volumeId?: string;
    impactAssessment?: string;
    triggerSource?: string;
    sourceMetadata?: unknown;
  },
) {
  const { data } = await apiClient.post<ApiResponse<NovelRiskRecord>>(`/novels/${novelId}/risks`, payload);
  return data;
}

export async function updateRiskStatus(
  novelId: string,
  riskId: string,
  status: RiskStatus,
  comment?: string,
) {
  const { data } = await apiClient.patch<ApiResponse<NovelRiskRecord>>(
    `/novels/${novelId}/risks/${riskId}/status`,
    { status, comment },
  );
  return data;
}

export async function getAssessment(novelId: string) {
  const { data } = await apiClient.get<ApiResponse<RiskAssessment>>(`/novels/${novelId}/risks/assessment`);
  return data;
}

export async function exportRisks(
  novelId: string,
  format: "json" | "md" = "json",
) {
  const { data } = await apiClient.post<ApiResponse<RiskExportResult>>(
    `/novels/${novelId}/risks/export`,
    {},
    { params: { format } },
  );
  return data;
}

export async function getReopenImpact(novelId: string, riskId: string) {
  const { data } = await apiClient.get<ApiResponse<RiskReopenImpact>>(
    `/novels/${novelId}/risks/${riskId}/reopen-impact`,
  );
  return data;
}

export async function reopenRisk(novelId: string, riskId: string) {
  const { data } = await apiClient.post<ApiResponse<NovelRiskRecord>>(
    `/novels/${novelId}/risks/${riskId}/reopen`,
  );
  return data;
}
