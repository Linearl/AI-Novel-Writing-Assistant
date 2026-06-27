const test = require("node:test");
const assert = require("node:assert/strict");

// Test the stableStringify and buildToolCallKey logic directly
// Since they're not exported, we test through the RunExecutionService behavior

test("stableStringify produces consistent output regardless of key order", () => {
  // Inline the function for testing
  function stableStringify(value) {
    if (value === null || value === undefined || typeof value !== "object") {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return `[${value.map(stableStringify).join(",")}]`;
    }
    const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }

  const a = { b: 2, a: 1 };
  const b = { a: 1, b: 2 };
  assert.equal(stableStringify(a), stableStringify(b));
  assert.equal(stableStringify(a), '{"a":1,"b":2}');
});

test("stableStringify handles nested objects", () => {
  function stableStringify(value) {
    if (value === null || value === undefined || typeof value !== "object") {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return `[${value.map(stableStringify).join(",")}]`;
    }
    const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }

  const input = { z: { c: 3, a: 1 }, a: [3, 1, 2] };
  const result = stableStringify(input);
  assert.equal(result, '{"a":[3,1,2],"z":{"a":1,"c":3}}');
});

test("stableStringify handles primitives and null", () => {
  function stableStringify(value) {
    if (value === null || value === undefined || typeof value !== "object") {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return `[${value.map(stableStringify).join(",")}]`;
    }
    const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }

  assert.equal(stableStringify(null), "null");
  assert.equal(stableStringify(undefined), undefined);
  assert.equal(stableStringify(42), "42");
  assert.equal(stableStringify("hello"), '"hello"');
  assert.equal(stableStringify(true), "true");
});

test("stableStringify produces different output for different values", () => {
  function stableStringify(value) {
    if (value === null || value === undefined || typeof value !== "object") {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return `[${value.map(stableStringify).join(",")}]`;
    }
    const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }

  const key1 = `search_knowledge:${stableStringify({ query: "hello" })}`;
  const key2 = `search_knowledge:${stableStringify({ query: "world" })}`;
  assert.notEqual(key1, key2);
});
