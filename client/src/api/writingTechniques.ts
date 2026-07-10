import { apiClient } from "./client";

export interface WritingTechnique {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string | null;
  filePath: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WritingTechniqueDetail extends WritingTechnique {
  body: string;
}

export interface ResolvedTechnique {
  key: string;
  name: string;
  description: string;
  category: string | null;
}

// 列表
export async function getWritingTechniques(params?: {
  category?: string;
  enabled?: boolean;
}): Promise<{ techniques: WritingTechnique[]; categories: string[] }> {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set("category", params.category);
  if (params?.enabled !== undefined) searchParams.set("enabled", String(params.enabled));
  const qs = searchParams.toString();
  const { data } = await apiClient.get(`/writing-techniques${qs ? `?${qs}` : ""}`);
  return data.data;
}

// 详情
export async function getWritingTechniqueByKey(key: string): Promise<WritingTechniqueDetail> {
  const { data } = await apiClient.get(`/writing-techniques/${key}`);
  return data.data;
}

// 全局开关
export async function toggleWritingTechnique(key: string, enabled: boolean): Promise<void> {
  await apiClient.put(`/writing-techniques/${key}/toggle`, { enabled });
}

// 批量开关
export async function toggleAllWritingTechniques(enabled: boolean): Promise<{ count: number; enabled: boolean }> {
  const { data } = await apiClient.put(`/writing-techniques/bulk/toggle`, { enabled });
  return data.data;
}

// 三级池子解析
export async function resolveTechniquePool(params?: {
  styleProfileId?: string;
  novelId?: string;
}): Promise<ResolvedTechnique[]> {
  const searchParams = new URLSearchParams();
  if (params?.styleProfileId) searchParams.set("styleProfileId", params.styleProfileId);
  if (params?.novelId) searchParams.set("novelId", params.novelId);
  const qs = searchParams.toString();
  const { data } = await apiClient.get(`/writing-techniques/pool/resolve${qs ? `?${qs}` : ""}`);
  return data.data;
}

// 画像绑定 - 列表
export async function getProfileTechniqueBindings(styleProfileId: string) {
  const { data } = await apiClient.get(`/writing-techniques/bindings/profile/${styleProfileId}`);
  return data.data;
}

// 画像绑定 - 设置
export async function setProfileTechniqueBindings(styleProfileId: string, techniqueKeys: string[]): Promise<void> {
  await apiClient.put(`/writing-techniques/bindings/profile/${styleProfileId}`, { techniqueKeys });
}

// 导入技法
export async function importWritingTechnique(
  content: string,
  fileName?: string,
): Promise<WritingTechniqueDetail> {
  const { data } = await apiClient.post("/writing-techniques/import", { content, fileName });
  return data.data;
}

// 小说绑定 - 列表
export async function getNovelTechniqueBindings(novelId: string) {
  const { data } = await apiClient.get(`/writing-techniques/bindings/novel/${novelId}`);
  return data.data;
}

// 小说绑定 - 设置
export async function setNovelTechniqueBindings(novelId: string, techniqueKeys: string[]): Promise<void> {
  await apiClient.put(`/writing-techniques/bindings/novel/${novelId}`, { techniqueKeys });
}

// AI 推荐技法 for 画像
export interface WritingTechniqueRecommendation {
  key: string;
  name: string;
  description: string;
  category: string;
  reason: string;
}

export async function recommendTechniquesForProfile(
  styleProfileId: string,
  profileName: string,
  profileDescription?: string,
): Promise<WritingTechniqueRecommendation[]> {
  const { data } = await apiClient.post("/writing-techniques/recommend-for-profile", {
    styleProfileId,
    profileName,
    profileDescription,
  });
  return data.data;
}
