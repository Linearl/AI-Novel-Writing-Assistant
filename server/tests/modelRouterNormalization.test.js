"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeRequestProtocol,
  normalizeStructuredResponseFormat,
  toStructuredOutputStrategy,
  MODEL_ROUTE_TASK_TYPES,
} = require("../dist/llm/modelRouter.js");

// ---------------------------------------------------------------------------
// normalizeRequestProtocol
// ---------------------------------------------------------------------------

test("normalizeRequestProtocol returns openai_compatible when valid", () => {
  assert.equal(normalizeRequestProtocol("openai_compatible"), "openai_compatible");
});

test("normalizeRequestProtocol returns anthropic when valid", () => {
  assert.equal(normalizeRequestProtocol("anthropic"), "anthropic");
});

test("normalizeRequestProtocol defaults to auto for unknown values", () => {
  assert.equal(normalizeRequestProtocol("unknown"), "auto");
  assert.equal(normalizeRequestProtocol("http"), "auto");
});

test("normalizeRequestProtocol defaults to auto for null/undefined", () => {
  assert.equal(normalizeRequestProtocol(null), "auto");
  assert.equal(normalizeRequestProtocol(undefined), "auto");
  assert.equal(normalizeRequestProtocol(""), "auto");
});

// ---------------------------------------------------------------------------
// normalizeStructuredResponseFormat
// ---------------------------------------------------------------------------

test("normalizeStructuredResponseFormat returns json_schema when valid", () => {
  assert.equal(normalizeStructuredResponseFormat("json_schema"), "json_schema");
});

test("normalizeStructuredResponseFormat returns json_object when valid", () => {
  assert.equal(normalizeStructuredResponseFormat("json_object"), "json_object");
});

test("normalizeStructuredResponseFormat returns prompt_json when valid", () => {
  assert.equal(normalizeStructuredResponseFormat("prompt_json"), "prompt_json");
});

test("normalizeStructuredResponseFormat defaults to auto for unknown", () => {
  assert.equal(normalizeStructuredResponseFormat("xml"), "auto");
  assert.equal(normalizeStructuredResponseFormat(null), "auto");
});

// ---------------------------------------------------------------------------
// toStructuredOutputStrategy
// ---------------------------------------------------------------------------

test("toStructuredOutputStrategy returns null for auto", () => {
  assert.equal(toStructuredOutputStrategy("auto"), null);
});

test("toStructuredOutputStrategy returns value for non-auto", () => {
  assert.equal(toStructuredOutputStrategy("json_schema"), "json_schema");
  assert.equal(toStructuredOutputStrategy("json_object"), "json_object");
  assert.equal(toStructuredOutputStrategy("prompt_json"), "prompt_json");
});

// ---------------------------------------------------------------------------
// MODEL_ROUTE_TASK_TYPES
// ---------------------------------------------------------------------------

test("MODEL_ROUTE_TASK_TYPES includes expected task types", () => {
  const expected = ["planner", "writer", "review", "repair", "summary", "chat"];
  for (const taskType of expected) {
    assert.ok(MODEL_ROUTE_TASK_TYPES.includes(taskType), `Missing task type: ${taskType}`);
  }
});
