import { StructuredOutputError, type StructuredOutputErrorCategory } from "./structuredOutput";

/** 统一错误分类枚举 */
export type ErrorCategory =
  | "retryable_transport"
  | "rate_limited"
  | "auth_error"
  | "invalid_request"
  | "strategy_fallback"
  | "model_unavailable"
  | "output_parse_error"
  | "system_error";

/** 错误严重度 */
export type ErrorSeverity = "low" | "medium" | "high" | "critical";

/** 推荐处理动作 */
export type RecommendedAction =
  | "retry_with_backoff"
  | "wait_and_retry"
  | "switch_provider"
  | "degrade_strategy"
  | "require_user_config"
  | "require_human_intervention";

/** 错误分类的处理策略元数据 */
export interface ErrorHandlingMeta {
  category: ErrorCategory;
  severity: ErrorSeverity;
  isRetryable: boolean;
  recommendedAction: RecommendedAction;
  userMessage?: string;
}

/** 错误分类映射表 */
export const ERROR_HANDLING_MAP: Record<ErrorCategory, ErrorHandlingMeta> = {
  retryable_transport: {
    category: "retryable_transport",
    severity: "medium",
    isRetryable: true,
    recommendedAction: "retry_with_backoff",
    userMessage: "网络连接异常，正在自动重试...",
  },
  rate_limited: {
    category: "rate_limited",
    severity: "medium",
    isRetryable: true,
    recommendedAction: "wait_and_retry",
    userMessage: "请求频率超限，正在等待后重试...",
  },
  auth_error: {
    category: "auth_error",
    severity: "high",
    isRetryable: false,
    recommendedAction: "require_user_config",
    userMessage: "API Key 无效或权限不足，请在设置页面检查。",
  },
  invalid_request: {
    category: "invalid_request",
    severity: "high",
    isRetryable: false,
    recommendedAction: "require_user_config",
    userMessage: "请求参数错误，请检查模型配置。",
  },
  strategy_fallback: {
    category: "strategy_fallback",
    severity: "low",
    isRetryable: true,
    recommendedAction: "degrade_strategy",
    userMessage: "当前模型格式兼容性不足，正在尝试替代策略...",
  },
  model_unavailable: {
    category: "model_unavailable",
    severity: "high",
    isRetryable: true,
    recommendedAction: "switch_provider",
    userMessage: "当前模型服务不可用，正在切换到备用模型...",
  },
  output_parse_error: {
    category: "output_parse_error",
    severity: "medium",
    isRetryable: true,
    recommendedAction: "retry_with_backoff",
    userMessage: "输出格式异常，正在重试...",
  },
  system_error: {
    category: "system_error",
    severity: "critical",
    isRetryable: false,
    recommendedAction: "require_human_intervention",
    userMessage: "系统内部错误，请联系管理员。",
  },
};

/** StructuredOutputErrorCategory → ErrorCategory 映射表 */
const STRUCTURED_OUTPUT_CATEGORY_MAP: Record<
  StructuredOutputErrorCategory,
  ErrorCategory
> = {
  transport_error: "retryable_transport",
  unsupported_native_json: "strategy_fallback",
  thinking_pollution: "output_parse_error",
  incomplete_json: "output_parse_error",
  malformed_json: "output_parse_error",
  schema_mismatch: "strategy_fallback",
};

/** 从 StructuredOutputErrorCategory 映射 */
function classifyFromStructuredOutputCategory(
  category: StructuredOutputErrorCategory,
): ErrorHandlingMeta {
  const target = STRUCTURED_OUTPUT_CATEGORY_MAP[category];
  return ERROR_HANDLING_MAP[target];
}

/** 从 HTTP 状态码映射 */
function classifyFromHttpStatus(status: number): ErrorHandlingMeta {
  if (status === 429) {
    return ERROR_HANDLING_MAP.rate_limited;
  }
  if (status === 401 || status === 403) {
    return ERROR_HANDLING_MAP.auth_error;
  }
  if (status === 400) {
    return ERROR_HANDLING_MAP.invalid_request;
  }
  if (status === 502 || status === 503 || status === 504) {
    return ERROR_HANDLING_MAP.retryable_transport;
  }
  // 其他 5xx 兜底
  if (status >= 500 && status < 600) {
    return ERROR_HANDLING_MAP.model_unavailable;
  }
  return ERROR_HANDLING_MAP.system_error;
}

/** 从网络错误码映射 */
function classifyFromNetworkCode(code: string): ErrorHandlingMeta {
  const retryableCodes = [
    "ECONNRESET",
    "ETIMEDOUT",
    "ENOTFOUND",
    "ECONNREFUSED",
  ];
  if (retryableCodes.includes(code)) {
    return ERROR_HANDLING_MAP.retryable_transport;
  }
  return ERROR_HANDLING_MAP.system_error;
}

/** 从错误消息内容辅助分类 */
function classifyFromErrorMessage(message: string): ErrorHandlingMeta {
  const lower = message.toLowerCase();

  // Rate limit indicators in message
  if (
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("quota exceeded") ||
    lower.includes("请求过于频繁")
  ) {
    return ERROR_HANDLING_MAP.rate_limited;
  }

  // Auth indicators
  if (
    lower.includes("unauthorized") ||
    lower.includes("forbidden") ||
    lower.includes("authentication") ||
    lower.includes("invalid api key") ||
    lower.includes("incorrect api key") ||
    lower.includes("api key not found") ||
    lower.includes("permission denied")
  ) {
    return ERROR_HANDLING_MAP.auth_error;
  }

  // Invalid request indicators
  if (
    lower.includes("invalid request") ||
    lower.includes("bad request") ||
    lower.includes("parameter") ||
    lower.includes("invalid parameter")
  ) {
    return ERROR_HANDLING_MAP.invalid_request;
  }

  // Model unavailable indicators
  if (
    lower.includes("overloaded") ||
    lower.includes("service unavailable") ||
    lower.includes("model not found") ||
    lower.includes("model is not available") ||
    lower.includes("server error") ||
    lower.includes("internal server error")
  ) {
    return ERROR_HANDLING_MAP.model_unavailable;
  }

  // Network/timeout indicators
  if (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("network") ||
    lower.includes("connection") ||
    lower.includes("econnrefused") ||
    lower.includes("econnreset") ||
    lower.includes("etimedout") ||
    lower.includes("enotfound") ||
    lower.includes("abort") ||
    lower.includes("aborted")
  ) {
    return ERROR_HANDLING_MAP.retryable_transport;
  }

  return ERROR_HANDLING_MAP.system_error;
}

/** 提取 HTTP 状态码 */
function extractHttpStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }
  const e = error as Record<string, unknown>;

  if (typeof e.status === "number" && e.status >= 100) {
    return e.status;
  }
  if (typeof e.statusCode === "number" && e.statusCode >= 100) {
    return e.statusCode;
  }
  // Axios-style error
  if (typeof e.response === "object" && e.response !== null) {
    const resp = e.response as Record<string, unknown>;
    if (typeof resp.status === "number" && resp.status >= 100) {
      return resp.status;
    }
  }

  return null;
}

/** 提取网络错误码 */
function extractNetworkCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }
  const e = error as Record<string, unknown>;

  if (typeof e.code === "string" && e.code.length > 0) {
    return e.code;
  }
  // Nested error cause chain
  if (e.cause && typeof e.cause === "object") {
    const cause = e.cause as Record<string, unknown>;
    if (typeof cause.code === "string" && cause.code.length > 0) {
      return cause.code;
    }
  }

  return null;
}

/** 提取错误消息 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (typeof error === "object" && error !== null) {
    const e = error as Record<string, unknown>;
    if (typeof e.message === "string") {
      return e.message;
    }
  }
  return String(error ?? "");
}

/** 统一的错误分类入口函数 */
export function classifyError(error: unknown): ErrorHandlingMeta {
  // 防御: null/undefined
  if (error == null) {
    return ERROR_HANDLING_MAP.system_error;
  }

  // 1. StructuredOutputError 直接读取 category
  if (error instanceof StructuredOutputError) {
    return classifyFromStructuredOutputCategory(error.category);
  }

  // 2. HTTP 状态码匹配
  const httpStatus = extractHttpStatus(error);
  if (httpStatus !== null) {
    return classifyFromHttpStatus(httpStatus);
  }

  // 3. 网络错误码匹配
  const networkCode = extractNetworkCode(error);
  if (networkCode !== null) {
    return classifyFromNetworkCode(networkCode);
  }

  // 4. 错误消息内容辅助分类
  const message = extractErrorMessage(error);
  if (message.length > 0) {
    return classifyFromErrorMessage(message);
  }

  // 5. 安全兜底
  return ERROR_HANDLING_MAP.system_error;
}

/** 便捷查询：判断错误是否可重试 */
export function isErrorRetryable(error: unknown): boolean {
  return classifyError(error).isRetryable;
}

/** 便捷查询：获取错误分类 */
export function getErrorCategory(error: unknown): ErrorCategory {
  return classifyError(error).category;
}

/** 便捷查询：获取错误严重度 */
export function getErrorSeverity(error: unknown): ErrorSeverity {
  return classifyError(error).severity;
}
