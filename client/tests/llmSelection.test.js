import test from "node:test";
import assert from "node:assert/strict";

import {
  sanitizeModelList,
  resolveModel,
  getProviderSelectionModels,
  isRunnableProviderConfig,
} from "../src/lib/llmSelection.ts";

// ---------------------------------------------------------------------------
// sanitizeModelList
// ---------------------------------------------------------------------------

test("sanitizeModelList returns empty array for non-array input", () => {
  assert.deepEqual(sanitizeModelList(null), []);
  assert.deepEqual(sanitizeModelList(undefined), []);
  assert.deepEqual(sanitizeModelList("not-array"), []);
  assert.deepEqual(sanitizeModelList(42), []);
});

test("sanitizeModelList trims and deduplicates model strings", () => {
  const result = sanitizeModelList(["  deepseek-chat  ", "deepseek-chat", "gpt-4o", "", "  gpt-4o  "]);
  assert.deepEqual(result, ["deepseek-chat", "gpt-4o"]);
});

test("sanitizeModelList filters non-string entries", () => {
  const result = sanitizeModelList([123, null, "valid-model", { name: "obj" }]);
  assert.deepEqual(result, ["valid-model"]);
});

// ---------------------------------------------------------------------------
// resolveModel
// ---------------------------------------------------------------------------

test("resolveModel returns trimmed currentModel when non-empty", () => {
  assert.equal(resolveModel("  gpt-4o  ", ["deepseek-chat"]), "gpt-4o");
});

test("resolveModel falls back to first model when currentModel is empty", () => {
  assert.equal(resolveModel("", ["deepseek-chat", "gpt-4o"]), "deepseek-chat");
});

test("resolveModel returns empty string when both currentModel and models are empty", () => {
  assert.equal(resolveModel("", []), "");
});

// ---------------------------------------------------------------------------
// getProviderSelectionModels
// ---------------------------------------------------------------------------

test("getProviderSelectionModels merges currentModel and models list", () => {
  const config = { currentModel: "model-a", models: ["model-b", "model-c"], isConfigured: true, isActive: true, provider: "openai" };
  const result = getProviderSelectionModels(config);
  assert.deepEqual(result, ["model-a", "model-b", "model-c"]);
});

test("getProviderSelectionModels handles missing models array", () => {
  const config = { currentModel: "model-a", models: null, isConfigured: true, isActive: true, provider: "openai" };
  const result = getProviderSelectionModels(config);
  assert.deepEqual(result, ["model-a"]);
});

// ---------------------------------------------------------------------------
// isRunnableProviderConfig
// ---------------------------------------------------------------------------

test("isRunnableProviderConfig returns true when configured, active, and has models", () => {
  const config = { currentModel: "m", models: [], isConfigured: true, isActive: true, provider: "openai" };
  assert.equal(isRunnableProviderConfig(config), true);
});

test("isRunnableProviderConfig returns false when not configured", () => {
  const config = { currentModel: "m", models: [], isConfigured: false, isActive: true, provider: "openai" };
  assert.equal(isRunnableProviderConfig(config), false);
});

test("isRunnableProviderConfig returns false when not active", () => {
  const config = { currentModel: "m", models: [], isConfigured: true, isActive: false, provider: "openai" };
  assert.equal(isRunnableProviderConfig(config), false);
});

test("isRunnableProviderConfig returns false when no models available", () => {
  const config = { currentModel: "", models: [], isConfigured: true, isActive: true, provider: "openai" };
  assert.equal(isRunnableProviderConfig(config), false);
});
