"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  parseChapterNumber,
  extractChapterId,
  extractRange,
  extractExplicitChapterOrders,
  slug,
} = require("../dist/agents/planner/utils.js");

// ---------------------------------------------------------------------------
// parseChapterNumber
// ---------------------------------------------------------------------------

test("parseChapterNumber parses Arabic numerals", () => {
  assert.equal(parseChapterNumber("1"), 1);
  assert.equal(parseChapterNumber("42"), 42);
  assert.equal(parseChapterNumber("100"), 100);
});

test("parseChapterNumber parses Chinese numerals", () => {
  assert.equal(parseChapterNumber("一"), 1);
  assert.equal(parseChapterNumber("三"), 3);
  assert.equal(parseChapterNumber("十"), 10);
  assert.equal(parseChapterNumber("二十"), 20);
  assert.equal(parseChapterNumber("二十三"), 23);
  assert.equal(parseChapterNumber("一百"), 100);
  assert.equal(parseChapterNumber("一百二十三"), 123);
});

test("parseChapterNumber parses 第X章 format", () => {
  assert.equal(parseChapterNumber("第五章"), 5);
  assert.equal(parseChapterNumber("第十章"), 10);
});

test("parseChapterNumber returns null for invalid input", () => {
  assert.equal(parseChapterNumber(""), null);
  assert.equal(parseChapterNumber("abc"), null);
  assert.equal(parseChapterNumber("0"), null);
  assert.equal(parseChapterNumber("-1"), null);
});

// ---------------------------------------------------------------------------
// extractChapterId
// ---------------------------------------------------------------------------

test("extractChapterId extracts chapter ID from English pattern", () => {
  const result = extractChapterId("fix chapter id: abc123DEF in the draft");
  assert.equal(result, "abc123DEF");
});

test("extractChapterId extracts chapter ID from Chinese pattern", () => {
  const result = extractChapterId("章节ID：xyz789abc");
  assert.equal(result, "xyz789abc");
});

test("extractChapterId returns null when no match", () => {
  assert.equal(extractChapterId("no id here"), null);
});

test("extractChapterId ignores IDs shorter than 6 chars", () => {
  assert.equal(extractChapterId("chapter id: abc12"), null);
});

// ---------------------------------------------------------------------------
// extractRange
// ---------------------------------------------------------------------------

test("extractRange extracts range with dash separator", () => {
  const result = extractRange("修改1-5章内容");
  assert.deepEqual(result, { startOrder: 1, endOrder: 5 });
});

test("extractRange extracts range with Chinese chapter markers", () => {
  const result = extractRange("从第三章到第七章");
  assert.deepEqual(result, { startOrder: 3, endOrder: 7 });
});

test("extractRange returns null when no range found", () => {
  assert.equal(extractRange("只修改第一章"), null);
});

test("extractRange normalizes reversed ranges", () => {
  const result = extractRange("10~5");
  assert.deepEqual(result, { startOrder: 5, endOrder: 10 });
});

// ---------------------------------------------------------------------------
// extractExplicitChapterOrders
// ---------------------------------------------------------------------------

test("extractExplicitChapterOrders finds multiple chapter references", () => {
  const result = extractExplicitChapterOrders("修改第1章、第3章和第五章");
  assert.deepEqual(result, [1, 3, 5]);
});

test("extractExplicitChapterOrders deduplicates chapter numbers", () => {
  const result = extractExplicitChapterOrders("第1章和第一章重复");
  assert.deepEqual(result, [1]);
});

test("extractExplicitChapterOrders returns empty for no matches", () => {
  assert.deepEqual(extractExplicitChapterOrders("没有章节引用"), []);
});

// ---------------------------------------------------------------------------
// slug
// ---------------------------------------------------------------------------

test("slug normalizes special characters", () => {
  const result = slug("hello world! @#$");
  assert.match(result, /^hello_world___/);
});

test("slug truncates to 80 characters", () => {
  const long = "a".repeat(100);
  assert.ok(slug(long).length <= 80);
});

test("slug falls back to timestamp-based key for empty input", () => {
  const result = slug("   ");
  assert.match(result, /^k_\d+$/);
});
