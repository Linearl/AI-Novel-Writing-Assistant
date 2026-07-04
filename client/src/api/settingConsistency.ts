/**
 * REQ-2038: Setting consistency check — client API functions.
 */
import type { ApiResponse } from "@ai-novel/shared/types/api";
import type {
  SettingConsistencyReport,
  ConsistencyCheckBody,
} from "@ai-novel/shared/types/settingConsistency";
import { apiClient } from "./client";

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

/** Fetch the latest consistency report for a novel. */
export async function getConsistencyReport(novelId: string) {
  const { data } = await apiClient.get<ApiResponse<SettingConsistencyReport>>(
    `/novels/${novelId}/settings/consistency-report`,
  );
  return data;
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
