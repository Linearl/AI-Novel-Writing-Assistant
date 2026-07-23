/**
 * fallbackConfig.ts
 *
 * Fallback chain configuration read/write/cache.
 * Extracted from fallback.ts.
 */

import type { LLMProvider } from "@ai-novel/shared";
import { prisma } from "../db/prisma";
import { isMissingTableError } from "../platform/dbErrors";
import type { FallbackChainConfig, FallbackModelEntry } from "./fallback";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FALLBACK_CHAIN_ENABLED_KEY = "fallbackChain.enabled";

function fallbackChainEntryKey(index: number, field: string): string {
  return `fallbackChain.${index}.${field}`;
}

const FALLBACK_CHAIN_FIELDS = ["provider", "model", "temperature", "maxTokens"] as const;

const DEFAULT_FALLBACK_CHAIN_CONFIG: FallbackChainConfig = {
  enabled: false,
  chain: [],
};

let cachedFallbackChainConfig: FallbackChainConfig | null = null;

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

function normalizeChainProvider(value: string | undefined | null): LLMProvider {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error("模型链配置缺少 Provider。请在「设置 → 模型路由」中配置。");
  }
  return trimmed as LLMProvider;
}

function normalizeChainModel(value: string | undefined | null): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error("模型链配置缺少 Model。请在「设置 → 模型路由」中配置。");
  }
  return trimmed;
}

function normalizeChainTemperature(value: number | string | undefined | null): number | undefined {
  if (value === null || value === undefined || value === "" || value === "undefined") {
    return undefined;
  }
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) {
    return undefined;
  }
  return Math.min(2, Math.max(0, num));
}

function normalizeChainMaxTokens(value: string | number | undefined | null): number | undefined {
  if (value === null || value === undefined || value === "" || value === "undefined") {
    return undefined;
  }
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return undefined;
  }
  return Math.floor(num);
}

// ---------------------------------------------------------------------------
// Config builder
// ---------------------------------------------------------------------------

function buildChainConfigFromEntries(
  enabled: boolean,
  entries: FallbackModelEntry[],
): FallbackChainConfig {
  const validEntries = entries.filter(
    (entry) =>
      typeof entry.provider === "string"
      && entry.provider.trim().length > 0
      && typeof entry.model === "string"
      && entry.model.trim().length > 0,
  );
  // 最多3级
  const chain = validEntries.slice(0, 3);
  return {
    enabled: enabled && chain.length > 0,
    chain,
  };
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * 读取多级备用链配置。
 * 向后兼容：如果没有chain配置但启用了，chain为空时配置视为disabled。
 */
export async function getFallbackChainConfig(
  forceRefresh = false,
): Promise<FallbackChainConfig> {
  if (!forceRefresh && cachedFallbackChainConfig) {
    return cachedFallbackChainConfig;
  }

  try {
    // 先读取 enabled 标志
    const enabledRow = await prisma.appSetting.findUnique({
      where: { key: FALLBACK_CHAIN_ENABLED_KEY },
    });
    const enabled = enabledRow?.value === "true";

    if (!enabled) {
      cachedFallbackChainConfig = { ...DEFAULT_FALLBACK_CHAIN_CONFIG };
      return cachedFallbackChainConfig;
    }

    // 读取最多3级的备用链配置
    const allKeys: string[] = [FALLBACK_CHAIN_ENABLED_KEY];
    for (let i = 0; i < 3; i += 1) {
      for (const field of FALLBACK_CHAIN_FIELDS) {
        allKeys.push(fallbackChainEntryKey(i, field));
      }
    }

    const rows = await prisma.appSetting.findMany({
      where: { key: { in: allKeys } },
    });
    const valueMap = new Map(rows.map((row) => [row.key, row.value]));

    const entries: FallbackModelEntry[] = [];
    for (let i = 0; i < 3; i += 1) {
      const provider = valueMap.get(fallbackChainEntryKey(i, "provider"));
      const model = valueMap.get(fallbackChainEntryKey(i, "model"));
      if (provider || model) {
        entries.push({
          provider: normalizeChainProvider(provider),
          model: normalizeChainModel(model ?? undefined),
          temperature: normalizeChainTemperature(valueMap.get(fallbackChainEntryKey(i, "temperature"))),
          maxTokens: normalizeChainMaxTokens(valueMap.get(fallbackChainEntryKey(i, "maxTokens"))),
        });
      }
    }

    cachedFallbackChainConfig = buildChainConfigFromEntries(true, entries);
    return cachedFallbackChainConfig;
  } catch (error) {
    if (isMissingTableError(error)) {
      cachedFallbackChainConfig = { ...DEFAULT_FALLBACK_CHAIN_CONFIG };
      return cachedFallbackChainConfig;
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Save
// ---------------------------------------------------------------------------

export interface StoredFallbackChainConfig {
  enabled: boolean;
  entries: Array<{
    provider: LLMProvider;
    model: string;
    temperature?: number;
    maxTokens?: number | null;
  }>;
}

/**
 * 保存多级备用链配置到 AppSetting 表。
 * 同时清理多于3级的旧键。
 */
export async function saveFallbackChainConfig(
  config: Partial<StoredFallbackChainConfig>,
): Promise<FallbackChainConfig> {
  const previous = await getFallbackChainConfig(true);
  const enabled = config.enabled ?? previous.enabled;
  const entries = config.entries ?? previous.chain.map((entry) => ({
    provider: entry.provider,
    model: entry.model,
    temperature: entry.temperature,
    maxTokens: entry.maxTokens ?? null,
  }));

  // 规范化并限制3级
  const normalizedEntries = entries.slice(0, 3).map((entry) => ({
    provider: normalizeChainProvider(entry.provider),
    model: normalizeChainModel(entry.model),
    temperature: normalizeChainTemperature(entry.temperature) ?? 0.3,
    maxTokens: normalizeChainMaxTokens(entry.maxTokens),
  }));

  const newConfig = buildChainConfigFromEntries(
    enabled,
    normalizedEntries.map((e) => ({
      provider: e.provider,
      model: e.model,
      temperature: e.temperature,
      maxTokens: e.maxTokens,
    })),
  );

  try {
    const upsertOps = [
      prisma.appSetting.upsert({
        where: { key: FALLBACK_CHAIN_ENABLED_KEY },
        update: { value: String(newConfig.enabled) },
        create: { key: FALLBACK_CHAIN_ENABLED_KEY, value: String(newConfig.enabled) },
      }),
    ];

    for (let i = 0; i < 3; i += 1) {
      const entry = normalizedEntries[i];
      if (entry) {
        upsertOps.push(
          prisma.appSetting.upsert({
            where: { key: fallbackChainEntryKey(i, "provider") },
            update: { value: entry.provider },
            create: { key: fallbackChainEntryKey(i, "provider"), value: entry.provider },
          }),
          prisma.appSetting.upsert({
            where: { key: fallbackChainEntryKey(i, "model") },
            update: { value: entry.model },
            create: { key: fallbackChainEntryKey(i, "model"), value: entry.model },
          }),
          prisma.appSetting.upsert({
            where: { key: fallbackChainEntryKey(i, "temperature") },
            update: { value: String(entry.temperature) },
            create: { key: fallbackChainEntryKey(i, "temperature"), value: String(entry.temperature) },
          }),
          prisma.appSetting.upsert({
            where: { key: fallbackChainEntryKey(i, "maxTokens") },
            update: { value: entry.maxTokens == null ? "" : String(entry.maxTokens) },
            create: { key: fallbackChainEntryKey(i, "maxTokens"), value: entry.maxTokens == null ? "" : String(entry.maxTokens) },
          }),
        );
      } else {
        // 清理未使用的级别
        for (const field of FALLBACK_CHAIN_FIELDS) {
          const key = fallbackChainEntryKey(i, field);
          upsertOps.push(
            prisma.appSetting.upsert({
              where: { key },
              update: { value: "" },
              create: { key, value: "" },
            }),
          );
        }
      }
    }

    await prisma.$transaction(upsertOps);

    // 清理多余级别（>3），在事务外执行
    for (let i = 3; i < 5; i += 1) {
      for (const field of FALLBACK_CHAIN_FIELDS) {
        await prisma.appSetting.deleteMany({ where: { key: fallbackChainEntryKey(i, field) } });
      }
    }

    cachedFallbackChainConfig = newConfig;
    return newConfig;
  } catch (error) {
    if (isMissingTableError(error)) {
      cachedFallbackChainConfig = newConfig;
      return newConfig;
    }
    throw error;
  }
}

/**
 * 清除备用链配置缓存（用于测试）
 */
export function clearFallbackChainCache(): void {
  cachedFallbackChainConfig = null;
}
