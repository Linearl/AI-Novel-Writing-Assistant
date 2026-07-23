/**
 * fallback.ts
 *
 * Fallback chain types and unified re-export hub.
 *
 * After REQ-2071 split:
 *   - fallback.ts              (~40 lines): type definitions + re-exports
 *   - fallbackClassifier.ts     (~130 lines): classifyFallbackTrigger
 *   - fallbackSelector.ts       (~140 lines): selectFallbackModel
 *   - fallbackConfig.ts         (~250 lines): getFallbackChainConfig, saveFallbackChainConfig, clearFallbackChainCache
 *   - fallbackExecutor.ts       (~160 lines): executeWithFallbackChain, logFallbackSwitch, logFallbackFailed
 */

import type { LLMProvider } from "@ai-novel/shared";

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

// ─── Re-exports from split modules ──────────────────────

export { classifyFallbackTrigger } from "./fallbackClassifier";
export { selectFallbackModel } from "./fallbackSelector";
export {
  getFallbackChainConfig,
  saveFallbackChainConfig,
  clearFallbackChainCache,
  type StoredFallbackChainConfig,
} from "./fallbackConfig";
export {
  executeWithFallbackChain,
  logFallbackSwitch,
  logFallbackFailed,
} from "./fallbackExecutor";
