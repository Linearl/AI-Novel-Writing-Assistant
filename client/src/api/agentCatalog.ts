import type { ApiResponse } from "@ai-novel/shared";
import type { AgentCatalog } from "@ai-novel/shared";
import { apiClient } from "./client";

export async function getAgentCatalog() {
  const { data } = await apiClient.get<ApiResponse<AgentCatalog>>("/agent-catalog");
  return data;
}
