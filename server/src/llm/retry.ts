import { logger } from "../services/logging/LoggerService";
import { classifyError, isErrorRetryable } from "./errorClassifier";

// ─── 类型定义 ────────────────────────────────────────────

/** 重试配置 */
export interface RetryConfig {
  /** 最大重试次数（默认 3） */
  maxRetries: number;
  /** 基础延迟时间 ms（默认 1000） */
  baseDelayMs: number;
  /** 最大延迟时间 ms（默认 60000） */
  maxDelayMs: number;
}

/** 默认重试配置 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 60000,
};

// ─── Retry-After 解析 ────────────────────────────────────

/**
 * 解析 Retry-After 头值。
 * 支持两种格式：
 * - 秒数（如 "120"）
 * - HTTP 日期（如 "Wed, 21 Oct 2015 07:28:00 GMT"）
 *
 * @returns 等待秒数，上限 60 秒
 */
export function parseRetryAfter(value: string): number {
  if (!value || typeof value !== "string") {
    return 1;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return 1;
  }

  // 尝试解析为秒数
  const seconds = parseInt(trimmed, 10);
  if (!isNaN(seconds) && seconds > 0) {
    return Math.min(seconds, 60);
  }

  // 尝试解析为 HTTP 日期
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    const deltaSeconds = Math.max(
      0,
      Math.floor((date.getTime() - Date.now()) / 1000),
    );
    return Math.min(deltaSeconds, 60);
  }

  // 默认 1 秒
  return 1;
}

// ─── 重试等待时间计算 ────────────────────────────────────

/**
 * 计算重试等待时间。
 *
 * 规则：
 * - 429 响应有 Retry-After 头时，使用 Retry-After 指定的时间
 * - 其他情况使用指数退避：baseDelayMs * 2^attempt
 * - 最终结果不超过 maxDelayMs
 */
export function calculateWaitTime(
  error: unknown,
  attempt: number,
  config: RetryConfig,
): number {
  // 检查 Retry-After 头
  if (typeof error === "object" && error !== null) {
    const e = error as Record<string, unknown>;

    // 检测 HTTP 429 状态码
    const status = e.status ?? e.statusCode;
    if (status === 429) {
      const headers = e.headers as Record<string, string> | undefined;
      const retryAfter = headers?.["retry-after"]
        ?? headers?.["Retry-After"]
        ?? headers?.["retry_after"];
      if (typeof retryAfter === "string" && retryAfter.trim()) {
        return parseRetryAfter(retryAfter) * 1000;
      }
    }
  }

  // 指数退避
  const delay = config.baseDelayMs * Math.pow(2, attempt);
  return Math.min(delay, config.maxDelayMs);
}

// ─── 重试判断 ────────────────────────────────────────────

/**
 * 判断错误是否为可重试的传输层错误。
 * 复用 errorClassifier 的分类逻辑。
 *
 * 可重试：retryable_transport（网络错误、502/503/504）、rate_limited（429）
 * 不可重试：auth_error（401/403）、invalid_request（400）、system_error 等
 */
export function isRetryableTransportError(error: unknown): boolean {
  return isErrorRetryable(error);
}

// ─── 核心重试函数 ─────────────────────────────────────────

/**
 * 执行带指数退避重试的异步函数。
 *
 * 工作流程：
 * 1. 执行 fn()
 * 2. 成功 → 返回结果
 * 3. 失败 + 可重试 + 未达最大次数 → 等待后重试
 * 4. 失败 + 不可重试 / 已达最大次数 → 抛出错误
 *
 * @param fn - 要执行的异步函数
 * @param config - 重试配置
 * @param label - 调用标签（用于日志）
 * @returns fn 的返回值
 */
export async function invokeWithRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
  label: string,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= config.maxRetries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isRetryableTransportError(error) || attempt >= config.maxRetries) {
        throw error;
      }

      const waitTime = calculateWaitTime(error, attempt, config);

      logger.warn("[llm.retry]", {
        event: "retry",
        label,
        attempt: attempt + 1,
        maxRetries: config.maxRetries,
        waitTimeMs: waitTime,
        errorCategory: classifyError(error).category,
        errorMessage:
          error instanceof Error ? error.message : String(error),
      });

      await new Promise<void>((resolve) => setTimeout(resolve, waitTime));
    }
  }

  // 理论上不会走到这里（loop 内已 throw），但 TypeScript 需要
  throw lastError;
}
