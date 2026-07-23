/**
 * fallbackClassifier.ts
 *
 * Error classification for fallback chain triggering.
 * Extracted from fallback.ts.
 */

import { StructuredOutputError } from "./structuredOutput";
import type { FallbackTriggerReason } from "./fallback";

// ---------------------------------------------------------------------------
// HTTP status extraction
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

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
