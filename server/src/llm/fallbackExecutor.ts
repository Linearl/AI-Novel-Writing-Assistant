/**
 * fallbackExecutor.ts
 *
 * Fallback chain execution — traverse multi-level fallback entries.
 * Extracted from fallback.ts.
 */

import { StructuredOutputError } from "./structuredOutput";
import type { LLMProvider } from "@ai-novel/shared";
import type { FallbackChainConfig, FallbackModelEntry, FallbackTriggerReason, FallbackSwitchLog } from "./fallback";
import { classifyFallbackTrigger } from "./fallbackClassifier";
import { logger } from "../services/logging/LoggerService";

// ---------------------------------------------------------------------------
// Logging helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Fallback chain traversal
// ---------------------------------------------------------------------------

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
