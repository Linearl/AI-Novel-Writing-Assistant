import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  classifyError,
  isErrorRetryable,
  getErrorCategory,
  getErrorSeverity,
  ERROR_HANDLING_MAP,
} from "../../src/llm/errorClassifier";

import {
  StructuredOutputError,
  type StructuredOutputErrorCategory,
  type StructuredOutputDiagnostics,
} from "../../src/llm/structuredOutput";

function makeStructuredError(category: StructuredOutputErrorCategory): StructuredOutputError {
  return new StructuredOutputError({
    message: `Test error for ${category}`,
    category,
    diagnostics: {
      strategy: "prompt_json",
      profile: {
        family: "test",
        nativeJsonSchema: false,
        nativeJsonObject: false,
        requiresNonThinkingForStructured: false,
        supportsReasoningToggle: false,
        omitMaxTokensForNativeStructured: false,
        preferredStructuredStrategy: "prompt_json",
      },
      reasoningForcedOff: false,
      fallbackAvailable: false,
      fallbackUsed: false,
      errorCategory: category,
    } as StructuredOutputDiagnostics,
  });
}

describe("errorClassifier", () => {
  describe("ERROR_HANDLING_MAP", () => {
    it("contains all 8 error categories", () => {
      const expected = [
        "retryable_transport",
        "rate_limited",
        "auth_error",
        "invalid_request",
        "strategy_fallback",
        "model_unavailable",
        "output_parse_error",
        "system_error",
      ];
      for (const category of expected) {
        assert.ok(ERROR_HANDLING_MAP[category], `Missing category: ${category}`);
      }
    });

    it("every entry has complete metadata", () => {
      const validSeverities = new Set(["low", "medium", "high", "critical"]);
      const validActions = new Set([
        "retry_with_backoff",
        "wait_and_retry",
        "switch_provider",
        "degrade_strategy",
        "require_user_config",
        "require_human_intervention",
      ]);
      for (const [key, meta] of Object.entries(ERROR_HANDLING_MAP)) {
        assert.equal(meta.category, key, `${key}: category mismatch`);
        assert.ok(
          validSeverities.has(meta.severity),
          `${key}: invalid severity ${meta.severity}`,
        );
        assert.equal(
          typeof meta.isRetryable,
          "boolean",
          `${key}: isRetryable must be boolean`,
        );
        assert.ok(
          validActions.has(meta.recommendedAction),
          `${key}: invalid action ${meta.recommendedAction}`,
        );
        assert.ok(
          typeof meta.userMessage === "string" && meta.userMessage.length > 0,
          `${key}: missing userMessage`,
        );
      }
    });
  });

  describe("classifyError - StructuredOutputErrorCategory mapping", () => {
    it("maps transport_error to retryable_transport", () => {
      const error = makeStructuredError("transport_error");
      const result = classifyError(error);
      assert.equal(result.category, "retryable_transport");
      assert.equal(result.isRetryable, true);
      assert.equal(result.recommendedAction, "retry_with_backoff");
    });

    it("maps unsupported_native_json to strategy_fallback", () => {
      const error = makeStructuredError("unsupported_native_json");
      const result = classifyError(error);
      assert.equal(result.category, "strategy_fallback");
      assert.equal(result.isRetryable, true);
      assert.equal(result.recommendedAction, "degrade_strategy");
    });

    it("maps thinking_pollution to output_parse_error", () => {
      const error = makeStructuredError("thinking_pollution");
      const result = classifyError(error);
      assert.equal(result.category, "output_parse_error");
      assert.equal(result.recommendedAction, "retry_with_backoff");
    });

    it("maps incomplete_json to output_parse_error", () => {
      const error = makeStructuredError("incomplete_json");
      const result = classifyError(error);
      assert.equal(result.category, "output_parse_error");
    });

    it("maps malformed_json to output_parse_error", () => {
      const error = makeStructuredError("malformed_json");
      const result = classifyError(error);
      assert.equal(result.category, "output_parse_error");
    });

    it("maps schema_mismatch to strategy_fallback", () => {
      const error = makeStructuredError("schema_mismatch");
      const result = classifyError(error);
      assert.equal(result.category, "strategy_fallback");
      assert.equal(result.recommendedAction, "degrade_strategy");
    });
  });

  describe("classifyError - HTTP status code mapping", () => {
    it("maps HTTP 429 to rate_limited", () => {
      const result = classifyError({ status: 429, message: "Too Many Requests" });
      assert.equal(result.category, "rate_limited");
      assert.equal(result.isRetryable, true);
      assert.equal(result.recommendedAction, "wait_and_retry");
    });

    it("maps HTTP 401 to auth_error", () => {
      const result = classifyError({ status: 401, message: "Unauthorized" });
      assert.equal(result.category, "auth_error");
      assert.equal(result.isRetryable, false);
      assert.equal(result.recommendedAction, "require_user_config");
    });

    it("maps HTTP 403 to auth_error", () => {
      const result = classifyError({ status: 403, message: "Forbidden" });
      assert.equal(result.category, "auth_error");
    });

    it("maps HTTP 400 to invalid_request", () => {
      const result = classifyError({ status: 400, message: "Bad Request" });
      assert.equal(result.category, "invalid_request");
      assert.equal(result.isRetryable, false);
    });

    it("maps HTTP 502 to retryable_transport", () => {
      const result = classifyError({ status: 502, message: "Bad Gateway" });
      assert.equal(result.category, "retryable_transport");
      assert.equal(result.isRetryable, true);
    });

    it("maps HTTP 503 to retryable_transport", () => {
      const result = classifyError({ status: 503, message: "Service Unavailable" });
      assert.equal(result.category, "retryable_transport");
    });

    it("maps HTTP 504 to retryable_transport", () => {
      const result = classifyError({ status: 504, message: "Gateway Timeout" });
      assert.equal(result.category, "retryable_transport");
    });

    it("maps other 5xx to model_unavailable", () => {
      const result = classifyError({ status: 500, message: "Internal Server Error" });
      assert.equal(result.category, "model_unavailable");
      assert.equal(result.recommendedAction, "switch_provider");
    });

    it("uses statusCode as fallback for status", () => {
      const result = classifyError({ statusCode: 429, message: "Rate limited" });
      assert.equal(result.category, "rate_limited");
    });

    it("extracts status from Axios-style response object", () => {
      const result = classifyError({
        response: { status: 503 },
        message: "Request failed",
      });
      assert.equal(result.category, "retryable_transport");
    });
  });

  describe("classifyError - network error code mapping", () => {
    it("maps ECONNRESET to retryable_transport", () => {
      const result = classifyError({ code: "ECONNRESET", message: "Connection reset" });
      assert.equal(result.category, "retryable_transport");
    });

    it("maps ETIMEDOUT to retryable_transport", () => {
      const result = classifyError({ code: "ETIMEDOUT", message: "Timed out" });
      assert.equal(result.category, "retryable_transport");
    });

    it("maps ENOTFOUND to retryable_transport", () => {
      const result = classifyError({ code: "ENOTFOUND", message: "Not found" });
      assert.equal(result.category, "retryable_transport");
    });

    it("maps ECONNREFUSED to retryable_transport", () => {
      const result = classifyError({ code: "ECONNREFUSED", message: "Connection refused" });
      assert.equal(result.category, "retryable_transport");
    });

    it("falls back to system_error for unknown network codes", () => {
      const result = classifyError({ code: "UNKNOWN_CODE", message: "Something happened" });
      assert.equal(result.category, "system_error");
    });
  });

  describe("classifyError - message content classification", () => {
    it("detects rate limit from message", () => {
      const result = classifyError(new Error("Rate limit exceeded"));
      assert.equal(result.category, "rate_limited");
    });

    it("detects auth error from message", () => {
      const result = classifyError(new Error("Invalid API key provided"));
      assert.equal(result.category, "auth_error");
    });

    it("detects timeout from message", () => {
      const result = classifyError(new Error("Request timed out after 30s"));
      assert.equal(result.category, "retryable_transport");
    });

    it("detects overloaded from message", () => {
      const result = classifyError(new Error("Server is overloaded"));
      assert.equal(result.category, "model_unavailable");
    });
  });

  describe("classifyError - safe fallback", () => {
    it("falls back to system_error for null", () => {
      const result = classifyError(null);
      assert.equal(result.category, "system_error");
      assert.equal(result.isRetryable, false);
      assert.equal(result.severity, "critical");
    });

    it("falls back to system_error for undefined", () => {
      const result = classifyError(undefined);
      assert.equal(result.category, "system_error");
    });

    it("falls back to system_error for unknown errors", () => {
      const result = classifyError({ foo: "bar" });
      assert.equal(result.category, "system_error");
    });

    it("falls back to system_error for empty objects", () => {
      const result = classifyError({});
      assert.equal(result.category, "system_error");
    });

    it("falls back to system_error for plain strings without clear indicators", () => {
      const result = classifyError("something went wrong");
      assert.equal(result.category, "system_error");
    });
  });

  describe("convenience functions", () => {
    it("isErrorRetryable returns true for retryable errors", () => {
      assert.equal(isErrorRetryable({ code: "ECONNRESET" }), true);
      assert.equal(isErrorRetryable({ status: 429 }), true);
      assert.equal(isErrorRetryable({ status: 502 }), true);
    });

    it("isErrorRetryable returns false for non-retryable errors", () => {
      assert.equal(isErrorRetryable({ status: 401 }), false);
      assert.equal(isErrorRetryable({ status: 400 }), false);
      assert.equal(isErrorRetryable(null), false);
    });

    it("getErrorCategory returns correct category", () => {
      assert.equal(getErrorCategory({ status: 429 }), "rate_limited");
      assert.equal(getErrorCategory({ status: 401 }), "auth_error");
      assert.equal(getErrorCategory({ code: "ECONNRESET" }), "retryable_transport");
    });

    it("getErrorSeverity returns correct severity", () => {
      assert.equal(getErrorSeverity({ status: 429 }), "medium");
      assert.equal(getErrorSeverity({ status: 401 }), "high");
      assert.equal(getErrorSeverity(null), "critical");
    });

    it("Error instances are classified correctly", () => {
      const error = new Error("Connection timeout");
      assert.equal(getErrorCategory(error), "retryable_transport");
    });
  });

  describe("error cause chain", () => {
    it("extracts network code from error cause", () => {
      const error = new Error("Request failed");
      (error as NodeJS.ErrnoException).cause = {
        code: "ECONNRESET",
        message: "socket hang up",
      };
      const result = classifyError(error);
      assert.equal(result.category, "retryable_transport");
    });
  });
});
