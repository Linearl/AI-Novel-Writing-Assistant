/**
 * fallbackSelector.ts
 *
 * Fallback model selection logic.
 * Extracted from fallback.ts.
 */

import type { LLMProvider } from "@ai-novel/shared";
import type { FallbackTriggerReason, FallbackDecision, FallbackModelEntry } from "./fallback";

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
