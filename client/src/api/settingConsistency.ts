/**
 * REQ-2038: Setting consistency check — client API functions.
 */
import type { ApiResponse } from "@ai-novel/shared";
import type {
  SettingConsistencyReport,
  ConsistencyCheckBody,
} from "@ai-novel/shared";
import { apiClient, type ApiHttpError } from "./client";

/** Trigger an async consistency check for a novel's world settings. */
export async function triggerConsistencyCheck(
  novelId: string,
  body: ConsistencyCheckBody,
) {
  const { data } = await apiClient.post<ApiResponse<SettingConsistencyReport>>(
    `/novels/${novelId}/settings/consistency-check`,
    body,
  );
  return data;
}

/** Fetch the latest consistency report for a novel. Returns null if no report exists. */
export async function getConsistencyReport(novelId: string): Promise<ApiResponse<SettingConsistencyReport> | null> {
  try {
    const { data } = await apiClient.get<ApiResponse<SettingConsistencyReport>>(
      `/novels/${novelId}/settings/consistency-report`,
      { silentErrorStatuses: [404] },
    );
    return data;
  } catch (error) {
    const httpError = error as ApiHttpError;
    if (httpError.status === 404) {
      return null;
    }
    throw error;
  }
}

/** Ignore a contradiction in the latest report. */
export async function ignoreContradiction(
  novelId: string,
  contradictionId: string,
  reason?: string,
) {
  const { data } = await apiClient.post<ApiResponse<null>>(
    `/novels/${novelId}/settings/consistency-report/ignore`,
    { contradictionId, reason },
  );
  return data;
}
