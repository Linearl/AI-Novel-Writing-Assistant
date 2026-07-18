const test = require("node:test");
const assert = require("node:assert/strict");

const { describe, it, before, after, mock } = test;

const {
  parseRetryAfter,
  calculateWaitTime,
  isRetryableTransportError,
  invokeWithRetry,
  DEFAULT_RETRY_CONFIG,
} = require("../../dist/llm/retry.js");

describe("retry — parseRetryAfter", () => {
  it("parses seconds as number string", () => {
    assert.equal(parseRetryAfter("120"), 60); // capped at 60
    assert.equal(parseRetryAfter("5"), 5);
    assert.equal(parseRetryAfter("30"), 30);
  });

  it("parses HTTP date string", () => {
    const future = new Date(Date.now() + 10000);
    const result = parseRetryAfter(future.toUTCString());
    assert.ok(result >= 9 && result <= 12); // ~10s
  });

  it("parses past HTTP date as 0", () => {
    const past = new Date(Date.now() - 10000);
    const result = parseRetryAfter(past.toUTCString());
    assert.equal(result, 0);
  });

  it("returns 1 for empty/blank invalid values", () => {
    assert.equal(parseRetryAfter(""), 1);
    assert.equal(parseRetryAfter("   "), 1);
    assert.equal(parseRetryAfter("not-a-date"), 1);
  });

  it("caps delay at 60 seconds", () => {
    assert.equal(parseRetryAfter("300"), 60);
    assert.equal(parseRetryAfter("60"), 60);
  });
});

describe("retry — calculateWaitTime", () => {
  it("uses exponential backoff for non-429 errors", () => {
    const error = { code: "ECONNRESET" };
    const config = { maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 60000 };

    assert.equal(calculateWaitTime(error, 0, config), 1000);  // 1000 * 2^0
    assert.equal(calculateWaitTime(error, 1, config), 2000);  // 1000 * 2^1
    assert.equal(calculateWaitTime(error, 2, config), 4000);  // 1000 * 2^2
  });

  it("caps exponential backoff at maxDelayMs", () => {
    const error = { code: "ECONNRESET" };
    const config = { maxRetries: 10, baseDelayMs: 32000, maxDelayMs: 60000 };

    assert.equal(calculateWaitTime(error, 1, config), 60000); // 32000*2 > 60000
  });

  it("uses Retry-After header seconds for 429", () => {
    const error = {
      status: 429,
      headers: { "retry-after": "10" },
    };
    assert.equal(calculateWaitTime(error, 0, DEFAULT_RETRY_CONFIG), 10000);
  });

  it("uses Retry-After header HTTP date for 429", () => {
    const future = new Date(Date.now() + 5000);
    const error = {
      status: 429,
      headers: { "retry-after": future.toUTCString() },
    };
    const result = calculateWaitTime(error, 0, DEFAULT_RETRY_CONFIG);
    assert.ok(result >= 4000 && result <= 6000);
  });

  it("falls back to exponential backoff when 429 has no Retry-After", () => {
    const error = { status: 429 };
    assert.equal(calculateWaitTime(error, 0, DEFAULT_RETRY_CONFIG), 1000);
  });
});

describe("retry — isRetryableTransportError", () => {
  it("returns true for network error codes", () => {
    assert.equal(isRetryableTransportError({ code: "ECONNRESET" }), true);
    assert.equal(isRetryableTransportError({ code: "ETIMEDOUT" }), true);
    assert.equal(isRetryableTransportError({ code: "ENOTFOUND" }), true);
    assert.equal(isRetryableTransportError({ code: "ECONNREFUSED" }), true);
  });

  it("returns true for HTTP 429", () => {
    assert.equal(isRetryableTransportError({ status: 429 }), true);
  });

  it("returns true for HTTP 502/503/504", () => {
    assert.equal(isRetryableTransportError({ status: 502 }), true);
    assert.equal(isRetryableTransportError({ status: 503 }), true);
    assert.equal(isRetryableTransportError({ status: 504 }), true);
  });

  it("returns false for HTTP 401/403", () => {
    assert.equal(isRetryableTransportError({ status: 401 }), false);
    assert.equal(isRetryableTransportError({ status: 403 }), false);
  });

  it("returns false for HTTP 400", () => {
    assert.equal(isRetryableTransportError({ status: 400 }), false);
  });

  it("returns false for null/undefined", () => {
    assert.equal(isRetryableTransportError(null), false);
    assert.equal(isRetryableTransportError(undefined), false);
  });
});

describe("retry — invokeWithRetry", () => {
  it("returns result on first success", async () => {
    let callCount = 0;
    const fn = async () => {
      callCount += 1;
      return "success";
    };
    const result = await invokeWithRetry(fn, DEFAULT_RETRY_CONFIG, "test.label");
    assert.equal(result, "success");
    assert.equal(callCount, 1);
  });

  it("retries on retryable error and succeeds", async () => {
    let callCount = 0;
    const fn = async () => {
      callCount += 1;
      if (callCount <= 2) {
        throw Object.assign(new Error("Connection reset"), { code: "ECONNRESET" });
      }
      return "success";
    };
    const result = await invokeWithRetry(fn, DEFAULT_RETRY_CONFIG, "test.label");
    assert.equal(result, "success");
    assert.equal(callCount, 3);
  });

  it("retries maxRetries times then throws", async () => {
    let callCount = 0;
    const fn = async () => {
      callCount += 1;
      throw Object.assign(new Error("Network timeout"), { code: "ECONNRESET" });
    };
    await assert.rejects(
      () => invokeWithRetry(fn, DEFAULT_RETRY_CONFIG, "test.label"),
      /Network timeout/,
    );
    // 1 initial + 3 retries = 4 total
    assert.equal(callCount, 4);
  });

  it("does not retry on non-retryable errors", async () => {
    let callCount = 0;
    const fn = async () => {
      callCount += 1;
      throw Object.assign(new Error("Unauthorized"), { status: 401 });
    };
    await assert.rejects(
      () => invokeWithRetry(fn, DEFAULT_RETRY_CONFIG, "test.label"),
      /Unauthorized/,
    );
    assert.equal(callCount, 1);
  });

  it("does not retry on HTTP 400 errors", async () => {
    let callCount = 0;
    const fn = async () => {
      callCount += 1;
      throw Object.assign(new Error("Bad Request"), { status: 400 });
    };
    await assert.rejects(
      () => invokeWithRetry(fn, DEFAULT_RETRY_CONFIG, "test.label"),
      /Bad Request/,
    );
    assert.equal(callCount, 1);
  });

  it("respects custom maxRetries config", async () => {
    let callCount = 0;
    const fn = async () => {
      callCount += 1;
      throw Object.assign(new Error("timeout"), { code: "ETIMEDOUT" });
    };
    const config = { maxRetries: 1, baseDelayMs: 1, maxDelayMs: 100 };
    await assert.rejects(
      () => invokeWithRetry(fn, config, "test.label"),
      /timeout/,
    );
    // 1 initial + 1 retry = 2 total
    assert.equal(callCount, 2);
  });

  it("retries on 429 and succeeds on second attempt", async () => {
    let callCount = 0;
    const fn = async () => {
      callCount += 1;
      if (callCount === 1) {
        throw Object.assign(new Error("Too Many Requests"), {
          status: 429,
          headers: { "retry-after": "0" },
        });
      }
      return "ok";
    };
    const result = await invokeWithRetry(fn, DEFAULT_RETRY_CONFIG, "test.label");
    assert.equal(result, "ok");
    assert.equal(callCount, 2);
  });
});
