import { z } from "zod";
import type { BuiltinLLMProvider, LLMProvider } from "@ai-novel/shared";
import { prisma } from "../../../db/prisma";
import { llmProviderSchema } from "../../../llm/providerSchema";
import {
  isBuiltInProvider,
  PROVIDERS,
} from "../../../llm/providers";

export const MAX_PROVIDER_CONCURRENCY_LIMIT = 100;
export const MAX_PROVIDER_REQUEST_INTERVAL_MS = 3_600_000;

export const providerSchema = z.object({
  provider: llmProviderSchema,
});

export const upsertApiKeySchema = z.object({
  displayName: z.string().trim().min(1).optional(),
  key: z.string().trim().optional(),
  model: z.string().trim().optional(),
  imageModel: z.string().trim().optional(),
  baseURL: z.union([z.string().trim().url("API URL 格式不正确。"), z.literal("")]).optional(),
  isActive: z.boolean().optional(),
  reasoningEnabled: z.boolean().optional(),
  concurrencyLimit: z.coerce.number().int().min(0).max(MAX_PROVIDER_CONCURRENCY_LIMIT).optional(),
  requestIntervalMs: z.coerce.number().int().min(0).max(MAX_PROVIDER_REQUEST_INTERVAL_MS).optional(),
});

export type APIKeyRecordLike = {
  provider: string;
  displayName: string | null;
  key: string | null;
  model: string | null;
  baseURL: string | null;
  isActive: boolean;
  reasoningEnabled?: boolean | null;
  concurrencyLimit?: number | null;
  requestIntervalMs?: number | null;
};

export type BuiltInProviderStatus = {
  provider: BuiltinLLMProvider;
  kind: "builtin";
  name: string;
  displayName?: string;
  currentModel: string;
  currentImageModel: string | null;
  currentBaseURL: string;
  models: string[];
  imageModels: string[];
  defaultModel: string;
  defaultImageModel: string | null;
  defaultBaseURL: string;
  requiresApiKey: boolean;
  isConfigured: boolean;
  isActive: boolean;
  reasoningEnabled: boolean;
  concurrencyLimit: number;
  requestIntervalMs: number;
  supportsImageGeneration: boolean;
};

export type CustomProviderStatus = {
  provider: string;
  kind: "custom";
  name: string;
  displayName?: string;
  currentModel: string;
  currentImageModel: string | null;
  currentBaseURL: string;
  models: string[];
  imageModels: string[];
  defaultModel: string;
  defaultImageModel: null;
  defaultBaseURL: string;
  requiresApiKey: boolean;
  isConfigured: boolean;
  isActive: boolean;
  reasoningEnabled: boolean;
  concurrencyLimit: number;
  requestIntervalMs: number;
  supportsImageGeneration: boolean;
};

export function normalizeOptionalText(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function normalizeProviderLimit(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.floor(value);
}

export function getFallbackModels(provider: LLMProvider, currentModel?: string): string[] {
  const models = isBuiltInProvider(provider) ? PROVIDERS[provider].models : [];
  return Array.from(new Set([...models, currentModel ?? ""].filter(Boolean)));
}

export async function getAllPersistedModels(provider: LLMProvider): Promise<string[]> {
  try {
    const record = await prisma.appSetting.findUnique({
      where: { key: `provider.persistedModels.${provider}` },
    });
    if (!record?.value) return [];
    const parsed = JSON.parse(record.value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
  } catch {
    return [];
  }
}
