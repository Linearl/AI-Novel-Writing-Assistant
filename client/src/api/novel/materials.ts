import type { ApiResponse } from "@ai-novel/shared";
import { apiClient } from "../client";

export interface MaterialItem {
  id: string;
  title: string;
  description: string | null;
  wordCount: number;
  sortOrder: number;
  enabled: boolean;
  createdAt: string;
}

export interface MaterialFullItem extends MaterialItem {
  content: string;
}

export interface MaterialImportInput {
  title: string;
  content: string;
  sortOrder?: number;
}

export async function importMaterials(
  novelId: string,
  payload: { materials: MaterialImportInput[] },
) {
  const { data } = await apiClient.post<ApiResponse<{ items: Array<{ id: string; title: string; description: string; wordCount: number }> }>>(
    `/novels/${novelId}/materials/import`,
    payload,
  );
  return data;
}

export async function getMaterialList(novelId: string) {
  const { data } = await apiClient.get<ApiResponse<{ items: MaterialItem[] }>>(
    `/novels/${novelId}/materials`,
  );
  return data;
}

export async function getMaterialDetail(novelId: string, materialId: string) {
  const { data } = await apiClient.get<ApiResponse<MaterialFullItem>>(
    `/novels/${novelId}/materials/${materialId}`,
  );
  return data;
}

export async function updateMaterial(
  novelId: string,
  materialId: string,
  payload: { title?: string; description?: string | null; sortOrder?: number },
) {
  const { data } = await apiClient.patch<ApiResponse<MaterialItem>>(
    `/novels/${novelId}/materials/${materialId}`,
    payload,
  );
  return data;
}

export async function deleteMaterial(novelId: string, materialId: string) {
  const { data } = await apiClient.delete<ApiResponse<void>>(
    `/novels/${novelId}/materials/${materialId}`,
  );
  return data;
}

export async function toggleMaterial(
  novelId: string,
  materialId: string,
  enabled: boolean,
) {
  const { data } = await apiClient.patch<ApiResponse<MaterialItem>>(
    `/novels/${novelId}/materials/${materialId}/toggle`,
    { enabled },
  );
  return data;
}
