"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  safeJson,
  asObject,
  isRecord,
  extractErrorCode,
  canRetry,
  buildFinalMessage,
  normalizeAgent,
} = require("../../dist/agents/runtime/runtimeHelpers.js");

// ---------------------------------------------------------------------------
// safeJson
// ---------------------------------------------------------------------------

test("safeJson serializes objects", () => {
  assert.equal(safeJson({ key: "value" }), '{"key":"value"}');
});

test("safeJson handles null/undefined", () => {
  assert.equal(safeJson(null), "{}");
  assert.equal(safeJson(undefined), "{}");
});

// ---------------------------------------------------------------------------
// asObject
// ---------------------------------------------------------------------------

test("asObject parses valid JSON", () => {
  const result = asObject('{"key": "value"}');
  assert.deepEqual(result, { key: "value" });
});

test("asObject returns empty for invalid JSON", () => {
  assert.deepEqual(asObject("not json"), {});
});

test("asObject returns empty for null/empty", () => {
  assert.deepEqual(asObject(null), {});
  assert.deepEqual(asObject(""), {});
  assert.deepEqual(asObject("   "), {});
});

test("asObject returns empty for arrays and primitives", () => {
  assert.deepEqual(asObject("[1,2,3]"), {});
  assert.deepEqual(asObject('"string"'), {});
});

// ---------------------------------------------------------------------------
// isRecord
// ---------------------------------------------------------------------------

test("isRecord returns true for plain objects", () => {
  assert.equal(isRecord({}), true);
  assert.equal(isRecord({ a: 1 }), true);
});

test("isRecord returns false for arrays, null, primitives", () => {
  assert.equal(isRecord([]), false);
  assert.equal(isRecord(null), false);
  assert.equal(isRecord(undefined), false);
  assert.equal(isRecord("string"), false);
  assert.equal(isRecord(42), false);
});

// ---------------------------------------------------------------------------
// extractErrorCode
// ---------------------------------------------------------------------------

test("extractErrorCode extracts code from AgentToolError", () => {
  const error = { name: "AgentToolError", code: "TIMEOUT", message: "timed out" };
  assert.equal(extractErrorCode(error), "TIMEOUT");
});

test("extractErrorCode returns INTERNAL for non-AgentToolError", () => {
  assert.equal(extractErrorCode(new Error("something")), "INTERNAL");
  assert.equal(extractErrorCode(null), "INTERNAL");
  assert.equal(extractErrorCode("string error"), "INTERNAL");
});

// ---------------------------------------------------------------------------
// canRetry
// ---------------------------------------------------------------------------

test("canRetry returns true for TIMEOUT and INTERNAL", () => {
  assert.equal(canRetry("TIMEOUT"), true);
  assert.equal(canRetry("INTERNAL"), true);
});

test("canRetry returns false for other codes", () => {
  assert.equal(canRetry("NOT_FOUND"), false);
  assert.equal(canRetry("VALIDATION"), false);
  assert.equal(canRetry("PERMISSION_DENIED"), false);
});

// ---------------------------------------------------------------------------
// buildFinalMessage
// ---------------------------------------------------------------------------

test("buildFinalMessage with results shows summary list", () => {
  const results = [
    { tool: "create_novel", success: true, summary: "已创建小说。" },
    { tool: "generate_outline", success: true, summary: "已生成大纲。" },
  ];
  const message = buildFinalMessage(results, false);
  assert.match(message, /已完成以下步骤/);
  assert.match(message, /已创建小说/);
  assert.match(message, /已生成大纲/);
  assert.match(message, /执行完成/);
});

test("buildFinalMessage with waitingForApproval adds approval notice", () => {
  const results = [
    { tool: "save_draft", success: true, summary: "已保存草稿。" },
  ];
  const message = buildFinalMessage(results, true);
  assert.match(message, /已暂停等待审批/);
});

test("buildFinalMessage with no results shows no steps message", () => {
  const message = buildFinalMessage([], false);
  assert.match(message, /没有可执行的工具步骤/);
});

// ---------------------------------------------------------------------------
// normalizeAgent
// ---------------------------------------------------------------------------

test("normalizeAgent returns valid agent names as-is", () => {
  assert.equal(normalizeAgent("Writer"), "Writer");
  assert.equal(normalizeAgent("Reviewer"), "Reviewer");
  assert.equal(normalizeAgent("Continuity"), "Continuity");
  assert.equal(normalizeAgent("Repair"), "Repair");
});

test("normalizeAgent defaults to Planner for unknown values", () => {
  assert.equal(normalizeAgent("Unknown"), "Planner");
  assert.equal(normalizeAgent(null), "Planner");
  assert.equal(normalizeAgent(undefined), "Planner");
  assert.equal(normalizeAgent(""), "Planner");
});
