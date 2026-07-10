"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  toText,
  extractJSONObject,
  extractJSONArray,
  normalizeScore,
  ruleScore,
  isPass,
  normalizeBeatStatus,
  normalizeBeatOrder,
  normalizeOptionalTextForCreate,
  normalizeOptionalTextForUpdate,
  estimateChangedLines,
  buildStorylineDiffSummary,
  countCharacterMentions,
  estimateAffectedChapterCount,
  extractFacts,
  QUALITY_THRESHOLD,
} = require("../../dist/services/novel/novelCoreShared.js");

// ---------------------------------------------------------------------------
// toText
// ---------------------------------------------------------------------------

test("toText returns string as-is", () => {
  assert.equal(toText("hello"), "hello");
});

test("toText joins array of strings", () => {
  assert.equal(toText(["hello", " ", "world"]), "hello world");
});

test("toText extracts .text from array of objects", () => {
  assert.equal(toText([{ text: "a" }, { text: "b" }]), "ab");
});

test("toText handles mixed array", () => {
  assert.equal(toText(["a", { text: "b" }, 123]), "ab");
});

test("toText JSON-stringifies non-string non-array values", () => {
  assert.equal(toText({ key: "value" }), '{"key":"value"}');
  assert.equal(toText(null), '""');
  assert.equal(toText(undefined), '""');
});

// ---------------------------------------------------------------------------
// extractJSONObject
// ---------------------------------------------------------------------------

test("extractJSONObject extracts JSON from plain text", () => {
  const result = extractJSONObject('Here is {"key": "value"} in text');
  assert.equal(result, '{"key": "value"}');
});

test("extractJSONObject strips markdown code fences", () => {
  const result = extractJSONObject('```json\n{"a": 1}\n```');
  assert.equal(result, '{"a": 1}');
});

test("extractJSONObject throws when no JSON found", () => {
  assert.throws(() => extractJSONObject("no json here"), /未检测到有效 JSON 对象/);
});

// ---------------------------------------------------------------------------
// extractJSONArray
// ---------------------------------------------------------------------------

test("extractJSONArray extracts array from text", () => {
  const result = extractJSONArray('Results: [1, 2, 3] done');
  assert.equal(result, "[1, 2, 3]");
});

test("extractJSONArray throws when no array found", () => {
  assert.throws(() => extractJSONArray("no array here"), /未检测到有效 JSON 数组/);
});

// ---------------------------------------------------------------------------
// normalizeScore
// ---------------------------------------------------------------------------

test("normalizeScore clamps values to 0-100", () => {
  const result = normalizeScore({ coherence: 150, repetition: -10, engagement: 50 });
  assert.equal(result.coherence, 100);
  assert.equal(result.repetition, 0);
  assert.equal(result.engagement, 50);
});

test("normalizeScore computes overall as average when not provided", () => {
  const result = normalizeScore({ coherence: 80, repetition: 80, pacing: 80, voice: 80, engagement: 80 });
  assert.equal(result.overall, 80);
});

test("normalizeScore uses provided overall over computed", () => {
  const result = normalizeScore({ coherence: 80, repetition: 80, pacing: 80, voice: 80, engagement: 80, overall: 99 });
  assert.equal(result.overall, 99);
});

test("normalizeScore defaults repetition to 100", () => {
  const result = normalizeScore({});
  assert.equal(result.repetition, 100);
});

test("normalizeScore handles NaN and Infinity", () => {
  const result = normalizeScore({ coherence: NaN, pacing: Infinity });
  assert.equal(result.coherence, 0);
  assert.equal(result.pacing, 0);
});

// ---------------------------------------------------------------------------
// ruleScore
// ---------------------------------------------------------------------------

test("ruleScore returns a complete QualityScore object", () => {
  const result = ruleScore("这是测试内容。".repeat(50));
  assert.ok(typeof result.coherence === "number");
  assert.ok(typeof result.repetition === "number");
  assert.ok(typeof result.pacing === "number");
  assert.ok(typeof result.voice === "number");
  assert.ok(typeof result.engagement === "number");
  assert.ok(typeof result.overall === "number");
});

test("ruleScore gives higher engagement for text with keywords", () => {
  const withKeyword = ruleScore("内容包含悬念和危机，转折非常多。".repeat(30));
  const withoutKeyword = ruleScore("普通的描述文字没有任何关键词。".repeat(30));
  assert.ok(withKeyword.engagement >= withoutKeyword.engagement);
});

test("ruleScore gives higher voice score for longer texts with more sentences", () => {
  const long = ruleScore("第一句。".repeat(30));
  const short = ruleScore("简短。");
  assert.ok(long.voice >= short.voice);
});

// ---------------------------------------------------------------------------
// isPass
// ---------------------------------------------------------------------------

test("isPass returns true when all thresholds met", () => {
  assert.equal(isPass({ coherence: 85, repetition: 80, engagement: 80, pacing: 80, voice: 80, overall: 80 }), true);
});

test("isPass returns false when coherence below threshold", () => {
  assert.equal(isPass({ coherence: 79, repetition: 80, engagement: 80, pacing: 80, voice: 80, overall: 80 }), false);
});

test("isPass returns false when engagement below threshold", () => {
  assert.equal(isPass({ coherence: 85, repetition: 80, engagement: 74, pacing: 80, voice: 80, overall: 80 }), false);
});

// ---------------------------------------------------------------------------
// normalizeBeatStatus
// ---------------------------------------------------------------------------

test("normalizeBeatStatus maps various completion values", () => {
  assert.equal(normalizeBeatStatus("completed"), "completed");
  assert.equal(normalizeBeatStatus("done"), "completed");
  assert.equal(normalizeBeatStatus("finish"), "completed");
  assert.equal(normalizeBeatStatus("已完"), "completed");
});

test("normalizeBeatStatus maps skip values", () => {
  assert.equal(normalizeBeatStatus("skipped"), "skipped");
  assert.equal(normalizeBeatStatus("跳过"), "skipped");
});

test("normalizeBeatStatus defaults to planned", () => {
  assert.equal(normalizeBeatStatus("planned"), "planned");
  assert.equal(normalizeBeatStatus(null), "planned");
  assert.equal(normalizeBeatStatus(undefined), "planned");
  assert.equal(normalizeBeatStatus("random"), "planned");
});

// ---------------------------------------------------------------------------
// normalizeBeatOrder
// ---------------------------------------------------------------------------

test("normalizeBeatOrder returns parsed number", () => {
  assert.equal(normalizeBeatOrder(5, 1), 5);
  assert.equal(normalizeBeatOrder("10", 1), 10);
});

test("normalizeBeatOrder clamps to minimum 1", () => {
  assert.equal(normalizeBeatOrder(0, 1), 1);
  assert.equal(normalizeBeatOrder(-3, 1), 1);
});

test("normalizeBeatOrder returns fallback for non-finite values", () => {
  assert.equal(normalizeBeatOrder("abc", 7), 7);
  assert.equal(normalizeBeatOrder(NaN, 3), 3);
  assert.equal(normalizeBeatOrder(Infinity, 2), 2);
});

// ---------------------------------------------------------------------------
// normalizeOptionalTextForCreate
// ---------------------------------------------------------------------------

test("normalizeOptionalTextForCreate returns trimmed string", () => {
  assert.equal(normalizeOptionalTextForCreate("  hello  "), "hello");
});

test("normalizeOptionalTextForCreate returns null for empty/whitespace", () => {
  assert.equal(normalizeOptionalTextForCreate("   "), null);
  assert.equal(normalizeOptionalTextForCreate(""), null);
});

test("normalizeOptionalTextForCreate returns null for non-string", () => {
  assert.equal(normalizeOptionalTextForCreate(null), null);
  assert.equal(normalizeOptionalTextForCreate(undefined), null);
});

// ---------------------------------------------------------------------------
// normalizeOptionalTextForUpdate
// ---------------------------------------------------------------------------

test("normalizeOptionalTextForUpdate returns undefined for undefined input", () => {
  assert.equal(normalizeOptionalTextForUpdate(undefined), undefined);
});

test("normalizeOptionalTextForUpdate returns null for null input", () => {
  assert.equal(normalizeOptionalTextForUpdate(null), null);
});

test("normalizeOptionalTextForUpdate returns trimmed string", () => {
  assert.equal(normalizeOptionalTextForUpdate("  text  "), "text");
});

test("normalizeOptionalTextForUpdate returns null for empty trimmed", () => {
  assert.equal(normalizeOptionalTextForUpdate("   "), null);
});

// ---------------------------------------------------------------------------
// estimateChangedLines
// ---------------------------------------------------------------------------

test("estimateChangedLines counts differing lines", () => {
  assert.equal(estimateChangedLines("a\nb\nc", "a\nx\nc"), 1);
});

test("estimateChangedLines handles different lengths", () => {
  assert.equal(estimateChangedLines("a\nb", "a\nb\nc"), 1);
  assert.equal(estimateChangedLines("a\nb\nc", "a\nb"), 1);
});

test("estimateChangedLines returns 0 for identical content", () => {
  assert.equal(estimateChangedLines("same\ncontent", "same\ncontent"), 0);
});

// ---------------------------------------------------------------------------
// buildStorylineDiffSummary
// ---------------------------------------------------------------------------

test("buildStorylineDiffSummary formats summary string", () => {
  const result = buildStorylineDiffSummary("a\nb\nc", "a\nx\ny");
  assert.match(result, /changed=\d+; added=\d+; removed=\d+/);
});

// ---------------------------------------------------------------------------
// countCharacterMentions
// ---------------------------------------------------------------------------

test("countCharacterMentions counts unique characters found", () => {
  assert.equal(countCharacterMentions("张三和李四在一起，张三很开心", ["张三", "李四", "王五"]), 2);
});

test("countCharacterMentions returns 0 when no names match", () => {
  assert.equal(countCharacterMentions("没有相关名字", ["张三", "李四"]), 0);
});

test("countCharacterMentions ignores empty names", () => {
  assert.equal(countCharacterMentions("张三在这里", ["", "张三", "  "]), 1);
});

// ---------------------------------------------------------------------------
// estimateAffectedChapterCount
// ---------------------------------------------------------------------------

test("estimateAffectedChapterCount returns count of explicit chapter references", () => {
  assert.equal(estimateAffectedChapterCount("第1章的内容和第3章的修改", 10, 5), 2);
});

test("estimateAffectedChapterCount infers from changedLines when no explicit references", () => {
  const result = estimateAffectedChapterCount("no chapter refs", 20, 8);
  assert.ok(result >= 1 && result <= 20);
});

test("estimateAffectedChapterCount caps at chapterTotal", () => {
  const result = estimateAffectedChapterCount("第1章第2章第3章第4章第5章", 3, 10);
  assert.equal(result, 3);
});

// ---------------------------------------------------------------------------
// extractFacts
// ---------------------------------------------------------------------------

test("extractFacts categorizes world-related lines", () => {
  const facts = extractFacts("这个世界有着独特的规则体系运行着。");
  assert.ok(facts.some((f) => f.category === "world"));
});

test("extractFacts categorizes character-related lines", () => {
  const facts = extractFacts("他作为主角在故事中成长了很多。");
  assert.ok(facts.some((f) => f.category === "character"));
});

test("extractFacts defaults to plot category", () => {
  const facts = extractFacts("发生了一件重要的事情推动了故事发展。");
  assert.ok(facts.some((f) => f.category === "plot"));
});

test("extractFacts filters lines shorter than 8 chars", () => {
  const facts = extractFacts("短");
  assert.equal(facts.length, 0);
});
