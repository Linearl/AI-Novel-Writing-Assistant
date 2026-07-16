import type { ApiResponse } from "./api.js";

/**
 * REQ-2054: NovelMaterial shared types.
 * Used by both client and server for material CRUD operations.
 */

export interface NovelMaterial {
  id: string;
  novelId: string;
  title: string;
  description: string | null;
  content: string;
  wordCount: number;
  sortOrder: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NovelMaterialListItem {
  id: string;
  title: string;
  description: string | null;
  wordCount: number;
  sortOrder: number;
  enabled: boolean;
  createdAt: string;
}

export interface NovelMaterialImportItem {
  title: string;
  content: string;
  sortOrder?: number;
}

export interface NovelMaterialImportRequest {
  materials: NovelMaterialImportItem[];
}

export interface NovelMaterialImportResponse {
  items: Array<{
    id: string;
    title: string;
    description: string;
    wordCount: number;
  }>;
}

export interface NovelMaterialListResponse {
  items: NovelMaterialListItem[];
}

export interface NovelMaterialDetailResponse extends NovelMaterialListItem {
  content: string;
}

export interface NovelMaterialUpdateRequest {
  title?: string;
  description?: string | null;
  sortOrder?: number;
}

export interface NovelMaterialToggleRequest {
  enabled: boolean;
}

export type NovelMaterialImportApiResponse = ApiResponse<NovelMaterialImportResponse>;
export type NovelMaterialListApiResponse = ApiResponse<NovelMaterialListResponse>;
export type NovelMaterialDetailApiResponse = ApiResponse<NovelMaterialDetailResponse>;
