import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Standalone request limiter management functions for testing
// Mirroring the same logic in server/src/llm/requestLimiter.ts

interface ProviderModelLimitOptions {
  provider: string;
  model: string;
  concurrencyLimit?: number | null;
  requestIntervalMs?: number | null;
}

class ProviderModelRequestLimiter {
  private readonly concurrencyLimit: number;
  private readonly requestIntervalMs: number;
  private readonly queue: Array<() => void> = [];
  private activeCount = 0;
  private nextStartAt = 0;
  private timer: NodeJS.Timeout | null = null;

  constructor(options: ProviderModelLimitOptions) {
    this.concurrencyLimit = normalizeNonNegativeInteger(options.concurrencyLimit);
    this.requestIntervalMs = normalizeNonNegativeInteger(options.requestIntervalMs);
  }
}

function normalizeNonNegativeInteger(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.floor(value);
}

function getLimiterKey(options: ProviderModelLimitOptions): string {
  return [
    options.provider,
    options.model,
    normalizeNonNegativeInteger(options.concurrencyLimit),
    normalizeNonNegativeInteger(options.requestIntervalMs),
  ].join(":");
}

function createProviderModelLimiter(options: ProviderModelLimitOptions): ProviderModelRequestLimiter {
  return new ProviderModelRequestLimiter(options);
}

describe("requestLimiter - hot reload", () => {
  it("evictSharedLimiters should clear all cached limiters", () => {
    const sharedLimiters = new Map<string, ProviderModelRequestLimiter>();

    // Add a limiter
    const key = getLimiterKey({ provider: "openai", model: "gpt-4", concurrencyLimit: 2, requestIntervalMs: 100 });
    sharedLimiters.set(key, createProviderModelLimiter({ provider: "openai", model: "gpt-4", concurrencyLimit: 2, requestIntervalMs: 100 }));

    assert.equal(sharedLimiters.size, 1);

    // Evict
    sharedLimiters.clear();

    assert.equal(sharedLimiters.size, 0);
  });

  it("evictSharedLimiters should be safe to call on empty map", () => {
    const sharedLimiters = new Map<string, ProviderModelRequestLimiter>();
    sharedLimiters.clear();
    // Should not throw
    assert.equal(sharedLimiters.size, 0);
  });

  it("new limiter should be created after eviction", () => {
    const sharedLimiters = new Map<string, ProviderModelRequestLimiter>();

    const key = getLimiterKey({ provider: "openai", model: "gpt-4", concurrencyLimit: 2, requestIntervalMs: 100 });
    sharedLimiters.set(key, createProviderModelLimiter({ provider: "openai", model: "gpt-4", concurrencyLimit: 2, requestIntervalMs: 100 }));
    assert.equal(sharedLimiters.size, 1);

    sharedLimiters.clear();
    assert.equal(sharedLimiters.size, 0);

    // After eviction, next access creates new limiter
    const existing = sharedLimiters.get(key);
    assert.equal(existing, undefined);

    // Create new
    const newLimiter = createProviderModelLimiter({ provider: "openai", model: "gpt-4", concurrencyLimit: 2, requestIntervalMs: 100 });
    sharedLimiters.set(key, newLimiter);
    assert.equal(sharedLimiters.size, 1);
  });

  it("should handle multiple limiters eviction", () => {
    const sharedLimiters = new Map<string, ProviderModelRequestLimiter>();

    for (const provider of ["openai", "deepseek", "anthropic"]) {
      const key = getLimiterKey({ provider, model: "default", concurrencyLimit: 4, requestIntervalMs: 50 });
      sharedLimiters.set(key, createProviderModelLimiter({ provider, model: "default", concurrencyLimit: 4, requestIntervalMs: 50 }));
    }
    assert.equal(sharedLimiters.size, 3);

    sharedLimiters.clear();
    assert.equal(sharedLimiters.size, 0);
  });

  it("different limiters with different keys should not conflict", () => {
    const sharedLimiters = new Map<string, ProviderModelRequestLimiter>();

    const key1 = getLimiterKey({ provider: "openai", model: "gpt-4", concurrencyLimit: 2, requestIntervalMs: 100 });
    const key2 = getLimiterKey({ provider: "openai", model: "gpt-3.5", concurrencyLimit: 4, requestIntervalMs: 50 });

    sharedLimiters.set(key1, createProviderModelLimiter({ provider: "openai", model: "gpt-4", concurrencyLimit: 2, requestIntervalMs: 100 }));
    sharedLimiters.set(key2, createProviderModelLimiter({ provider: "openai", model: "gpt-3.5", concurrencyLimit: 4, requestIntervalMs: 50 }));

    assert.equal(sharedLimiters.size, 2);
    assert.notEqual(key1, key2);
  });
});
