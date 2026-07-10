import type { ApiResponse } from "@ai-novel/shared";
import { apiClient } from "./client";

export interface AtmosphereCardMeta {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string | null;
  filePath: string;
  applicableEmotions: string;
  triggerKeywords: string;
  enabled: boolean;
}

export async function getAtmosphereCards(): Promise<{
  cards: AtmosphereCardMeta[];
  categories: string[];
}> {
  const { data } = await apiClient.get<ApiResponse<{ cards: AtmosphereCardMeta[]; categories: string[] }>>("/atmosphere-cards");
  return data.data!;
}

export async function getAtmosphereCardDetail(key: string): Promise<AtmosphereCardMeta & { body: string }> {
  const { data } = await apiClient.get<ApiResponse<AtmosphereCardMeta & { body: string }>>(`/atmosphere-cards/${key}`);
  return data.data!;
}

export async function toggleAtmosphereCard(key: string, enabled: boolean): Promise<AtmosphereCardMeta> {
  const { data } = await apiClient.put<ApiResponse<AtmosphereCardMeta>>(`/atmosphere-cards/${key}/toggle`, { enabled });
  return data.data!;
}

export async function toggleAllAtmosphereCards(enabled: boolean): Promise<{ count: number; enabled: boolean }> {
  const { data } = await apiClient.put<ApiResponse<{ count: number; enabled: boolean }>>("/atmosphere-cards/bulk/toggle", { enabled });
  return data.data!;
}
