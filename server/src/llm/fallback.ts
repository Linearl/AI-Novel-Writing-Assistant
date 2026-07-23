import type { LLMProvider } from "@ai-novel/shared";
import { StructuredOutputError } from "./structuredOutput";
import { prisma } from "../db/prisma";
import { isMissingTableError } from "../platform/dbErrors";
import { logger } from "../services/logging/LoggerService";

// ─── 类型定义 ────────────────────────────────────────────

/** 备用模型链中的单个条目 */
export interface FallbackModelEntry {
  provider: LLMProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

/** 备用模型链配置 */
export interface FallbackChainConfig {
  enabled: boolean;
  chain: FallbackModelEntry[];
}

/** 触发备用切换的错误原因分类 */
export type FallbackTriggerReason =
  | "rate_limit"          // 429限流
  | "auth_error"          // 401/403认证失败
  | "model_unavailable"   // 503模型不可用
  | "transport_error"     // 网络/传输层错误
  | "output_format"       // 输出格式错误
  | "unknown";            // 未知/不可分类错误

/** 备用模型选择结果 */
export interface FallbackDecision {
  /** 触发备用的原因 */
  triggerReason: FallbackTriggerReason;
  /** 选中的备用模型条目，null表示无可用备用 */
  targetEntry: FallbackModelEntry | null;
  /** 目标条目在chain中的索引 */
  chainIndex: number;
  /** 跳过某些级别的说明 */
  skipReason?: string;
}

/** 备用切换日志条目 */
export interface FallbackSwitchLog {
  timestamp: string;
  level: "info" | "warn";
  event: "fallback_switch" | "fallback_failed";
  context: {
    triggerReason: FallbackTriggerReason;
    fromProvider: string;
    fromModel: string;
    toProvider: string;
    toModel: string;
    chainIndex: number;
    label?: string;
    errorMessage?: string;
  };
}

// ─── 错误分类 ────────────────────────────────────────────

/**
 * 从 error 中提取 HTTP 状态码。
 * 支持 StructuredOutputError 的 message 中包含 httpStatus、status 等标记。
 */
function extractHttpStatus(error: StructuredOutputError): number | null {
  const message = error.message;

  // 模式参考: 429 Too Many Requests, HTTP 429, status: 429, [HTTP 503] 等
  const patterns = [
    /\bstatus[:=]?\s*(\d{3})\b/i,
    /\bhttp[_\s]?(\d{3})\b/i,
    /\b(\d{3})\s+(?:too many|rate limit|unauthorized|forbidden|service unavailable|bad gateway|gateway timeout)/i,
    /(?:too many|rate limit|unauthorized|forbidden|service unavailable|bad gateway|gateway timeout)[\s\S]*?\b(\d{3})\b/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      const code = parseInt(match[1]!, 10);
      if (code >= 100 && code < 600) {
        return code;
      }
    }
  }

  return null;
}

/**
 * 检查错误消息中是否包含特定关键词
 */
function containsKeyword(message: string, keywords: string[]): boolean {
  const lower = message.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

/**
 * 根据错误信息将错误分类为 FallbackTriggerReason。
 *
 * 分类优先级：
 * 1. HTTP状态码 (429 → rate_limit, 401/403 → auth_error, 503 → model_unavailable, 400 → unknown)
 * 2. error.category (transport_error → transport_error)
 * 3. error.category (schema_mismatch/malformed_json/incomplete_json/thinking_pollution → output_format)
 * 4. 消息关键词兜底
 * 5. 默认 → unknown
 */
export function classifyFallbackTrigger(error: StructuredOutputError): FallbackTriggerReason {
  const httpStatus = extractHttpStatus(error);

  // HTTP 429 — 限流
  if (httpStatus === 429) {
    return "rate_limit";
  }

  // HTTP 401/403 — 认证/授权
  if (httpStatus === 401 || httpStatus === 403) {
    return "auth_error";
  }

  // HTTP 503 — 模型不可用
  if (httpStatus === 503) {
    return "model_unavailable";
  }

  // HTTP 400 — 不触发切换
  if (httpStatus === 400) {
    return "unknown";
  }

  // error.category: transport_error
  if (error.category === "transport_error") {
    return "transport_error";
  }

  // error.category: output_format 类
  if (
    error.category === "schema_mismatch"
    || error.category === "malformed_json"
    || error.category === "incomplete_json"
    || error.category === "thinking_pollution"
  ) {
    return "output_format";
  }

  // 消息关键词兜底
  const message = error.message;
  if (containsKeyword(message, ["429", "too many requests", "rate limit", "rate_limit"])) {
    return "rate_limit";
  }
  if (containsKeyword(message, ["401", "403", "unauthorized", "forbidden", "auth", "invalid api key", "invalid token"])) {
    return "auth_error";
  }
  if (containsKeyword(message, ["503", "service unavailable", "model unavailable", "overloaded"])) {
    return "model_unavailable";
  }

  return "unknown";
}

// ─── 备用模型选择 ────────────────────────────────────────

/**
 * 根据触发原因和备用链选择合适的备用模型。
 *
 * 选择策略：
 * - rate_limit / auth_error / transport_error → 优先选择不同 Provider 的模型
 * - model_unavailable → 优先选择同 Provider 的不同模型（模型维度下线）
 * - output_format → 优先选择同 Provider 的不同模型（格式支持差异）
 * - unknown → 不选择备用
 *
 * 优先级过滤逻辑：
 * - 优先不同Provider时：先跳过同Provider的条目，若链中无其他Provider则回退到同Provider
 * - 优先同Provider不同模型时：先跳过不同Provider的条目，若链中无同Provider条目则接受不同Provider
 * - 始终跳过与当前模型完全相同的条目
 */
export function selectFallbackModel(
  triggerReason: FallbackTriggerReason,
  currentProvider: LLMProvider,
  currentModel: string,
  chain: FallbackModelEntry[],
): FallbackDecision {
  if (triggerReason === "unknown") {
    return {
      triggerReason,
      targetEntry: null,
      chainIndex: -1,
      skipReason: "unknown error type does not trigger fallback switch",
    };
  }

  if (chain.length === 0) {
    return {
      triggerReason,
      targetEntry: null,
      chainIndex: -1,
      skipReason: "fallback chain is empty",
    };
  }

  const preferDifferentProvider =
    triggerReason === "rate_limit"
    || triggerReason === "auth_error"
    || triggerReason === "transport_error";

  const validEntries = chain
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => !(
      entry.provider === currentProvider && entry.model === currentModel
    ));

  if (validEntries.length === 0) {
    return {
      triggerReason,
      targetEntry: null,
      chainIndex: -1,
      skipReason: "all chain entries are identical to the current model",
    };
  }

  if (preferDifferentProvider) {
    // 优先选择不同Provider的条目
    const differentProviderEntry = validEntries.find(
      ({ entry }) => entry.provider !== currentProvider,
    );
    if (differentProviderEntry) {
      // 检查后面是否还有不同Provider的条目可跳过当前
      const hasLaterDifferent = validEntries.slice(
        validEntries.indexOf(differentProviderEntry) + 1,
      ).some(({ entry }) => entry.provider !== currentProvider);

      let skipReason: string | undefined;
      if (!hasLaterDifferent) {
        // 如果后面没有更多不同Provider的条目，可能前面跳过了同Provider的
        const skippedSameProvider = validEntries
          .slice(0, validEntries.indexOf(differentProviderEntry))
          .filter(({ entry }) => entry.provider === currentProvider);
        if (skippedSameProvider.length > 0) {
          skipReason = `skipped ${skippedSameProvider.length} same-provider entry(s), prefer different provider for ${triggerReason}`;
        }
      }

      return {
        triggerReason,
        targetEntry: differentProviderEntry.entry,
        chainIndex: differentProviderEntry.index,
        skipReason,
      };
    }

    // 没有不同Provider的条目，回退到同Provider
    const sameProviderEntry = validEntries[0]!;
    return {
      triggerReason,
      targetEntry: sameProviderEntry.entry,
      chainIndex: sameProviderEntry.index,
      skipReason: "no different-provider entry available, falling back to same provider",
    };
  }

  // model_unavailable / output_format: 优先同Provider不同模型
  const sameProviderEntry = validEntries.find(
    ({ entry }) => entry.provider === currentProvider,
  );
  if (sameProviderEntry) {
    return {
      triggerReason,
      targetEntry: sameProviderEntry.entry,
      chainIndex: sameProviderEntry.index,
    };
  }

  // 没有同Provider的条目，接受第一个有效条目（不同Provider）
  const firstDifferent = validEntries[0]!;
  return {
    triggerReason,
    targetEntry: firstDifferent.entry,
    chainIndex: firstDifferent.index,
    skipReason: "no same-provider entry available, falling back to different provider",
  };
}

// ─── 配置读写 ────────────────────────────────────────────

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

// ─── 切换日志 ────────────────────────────────────────────

/**
 * 记录备用模型切换事件
 */
export function logFallbackSwitch(params: {
  triggerReason: FallbackTriggerReason;
  from: { provider: string; model: string };
  to: FallbackModelEntry;
  chainIndex: number;
  label?: string;
}): void {
  const log: FallbackSwitchLog = {
    timestamp: new Date().toISOString(),
    level: "warn",
    event: "fallback_switch",
    context: {
      triggerReason: params.triggerReason,
      fromProvider: params.from.provider,
      fromModel: params.from.model,
      toProvider: params.to.provider,
      toModel: params.to.model,
      chainIndex: params.chainIndex,
      label: params.label,
    },
  };

  logger.warn("[llm.fallback]", {
    event: log.event,
    triggerReason: log.context.triggerReason,
    fromProvider: log.context.fromProvider,
    fromModel: log.context.fromModel,
    toProvider: log.context.toProvider,
    toModel: log.context.toModel,
    chainIndex: log.context.chainIndex,
    ...(log.context.label ? { label: log.context.label } : {}),
  });
}

/**
 * 记录备用模型切换失败事件
 */
export function logFallbackFailed(params: {
  triggerReason: FallbackTriggerReason;
  from?: { provider: string; model: string };
  target: FallbackModelEntry;
  error: unknown;
  chainIndex: number;
  label?: string;
}): void {
  const errorMessage = params.error instanceof Error
    ? params.error.message
    : String(params.error);

  const log: FallbackSwitchLog = {
    timestamp: new Date().toISOString(),
    level: "warn",
    event: "fallback_failed",
    context: {
      triggerReason: params.triggerReason,
      fromProvider: params.from?.provider ?? "unknown",
      fromModel: params.from?.model ?? "unknown",
      toProvider: params.target.provider,
      toModel: params.target.model,
      chainIndex: params.chainIndex,
      label: params.label,
      errorMessage,
    },
  };

  logger.warn("[llm.fallback]", {
    event: log.event,
    triggerReason: log.context.triggerReason,
    fromProvider: log.context.fromProvider,
    fromModel: log.context.fromModel,
    toProvider: log.context.toProvider,
    toModel: log.context.toModel,
    chainIndex: log.context.chainIndex,
    errorMessage: log.context.errorMessage,
    ...(log.context.label ? { label: log.context.label } : {}),
  });
}

// ─── 备用链遍历执行 ──────────────────────────────────────

/**
 * 备用链遍历选项类型，避免直接导入 structuredInvoke 的类型。
 */
interface FallbackChainExecutionInput {
  /** 主模型的 provider */
  primaryProvider: LLMProvider;
  /** 主模型的 model */
  primaryModel: string;
  /** 触发备用的错误 */
  error: StructuredOutputError;
  /** 备用链配置 */
  chainConfig: FallbackChainConfig;
  /** 调用标签 */
  label: string;
  /** 执行单次尝试的函数，接受 FallbackModelEntry */
  executeWithTarget: (
    entry: FallbackModelEntry,
    chainIndex: number,
  ) => Promise<unknown>;
}

/**
 * 遍历多级备用链，依次尝试每个备用模型，直到成功或全部失败。
 *
 * 工作流程：
 * 1. classifyFallbackTrigger 分类错误
 * 2. selectFallbackModel 选择第一个合适的备用条目
 * 3. 执行该条目，成功则返回
 * 4. 失败则跳过该条目，从 chain 中选择下一个合适的备用
 * 5. 所有条目都失败后抛出最终错误
 */
export async function executeWithFallbackChain(
  input: FallbackChainExecutionInput,
): Promise<unknown> {
  const triggerReason = classifyFallbackTrigger(input.error);

  // unknown 不触发切换
  if (triggerReason === "unknown") {
    throw input.error;
  }

  // 构建可用备用列表（排除与主模型重复的条目）
  const remaining = input.chainConfig.chain.filter(
    (entry) => !(
      entry.provider === input.primaryProvider
      && entry.model === input.primaryModel
    ),
  );

  if (remaining.length === 0) {
    logFallbackFailed({
      triggerReason,
      from: { provider: input.primaryProvider, model: input.primaryModel },
      target: { provider: input.primaryProvider, model: input.primaryModel },
      error: new Error("no valid fallback entries in chain (all match primary)"),
      chainIndex: -1,
      label: input.label,
    });
    throw input.error;
  }

  let lastError: unknown = input.error;
  let triedProviders = new Set<string>();

  for (let i = 0; i < remaining.length; i += 1) {
    const entry = remaining[i]!;

    // 跳过已经尝试过的 provider+model 组合
    const entryKey = `${entry.provider}:${entry.model}`;
    if (triedProviders.has(entryKey)) {
      continue;
    }

    logFallbackSwitch({
      triggerReason,
      from: { provider: input.primaryProvider, model: input.primaryModel },
      to: entry,
      chainIndex: i,
      label: input.label,
    });

    try {
      const result = await input.executeWithTarget(entry, i);
      return result;
    } catch (error) {
      triedProviders.add(entryKey);
      lastError = error;

      logFallbackFailed({
        triggerReason,
        from: { provider: input.primaryProvider, model: input.primaryModel },
        target: entry,
        error,
        chainIndex: i,
        label: input.label,
      });

      // 继续尝试下一个备用条目
    }
  }

  // 所有备用都失败了
  logger.error("[llm.fallback]", {
    event: "fallback_chain_exhausted",
    triggerReason,
    primaryProvider: input.primaryProvider,
    primaryModel: input.primaryModel,
    triedCount: triedProviders.size,
    label: input.label,
  });

  throw lastError instanceof StructuredOutputError
    ? lastError
    : input.error;
}
