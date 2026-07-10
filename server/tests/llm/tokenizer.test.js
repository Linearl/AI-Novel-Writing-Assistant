const test = require("node:test");
const assert = require("node:assert/strict");
const { tokenizeForNgram } = require("../../dist/llm/repetition/tokenizer.js");

// ---- CJK tokenization ----

test("CJK characters are split into individual tokens", () => {
  const tokens = tokenizeForNgram("你好世界");
  assert.deepEqual(tokens, ["你", "好", "世", "界"]);
});

test("Japanese hiragana/katakana are individual tokens", () => {
  const tokens = tokenizeForNgram("こんにちは");
  assert.equal(tokens.length, 5);
  assert.deepEqual(tokens, ["こ", "ん", "に", "ち", "は"]);
});

test("Korean characters are individual tokens", () => {
  const tokens = tokenizeForNgram("안녕하세요");
  assert.equal(tokens.length, 5);
});

// ---- Latin tokenization ----

test("Latin text is split by whitespace", () => {
  const tokens = tokenizeForNgram("hello world foo");
  assert.deepEqual(tokens, ["hello", "world", "foo"]);
});

test("Punctuation is stripped / acts as separator", () => {
  const tokens = tokenizeForNgram("hello, world! foo-bar");
  assert.deepEqual(tokens, ["hello", "world", "foo", "bar"]);
});

// ---- Mixed CJK + Latin ----

test("Mixed CJK and Latin text tokenizes correctly", () => {
  const tokens = tokenizeForNgram("这是test文本OK");
  // Each CJK char is individual; Latin words are separate tokens
  assert.deepEqual(tokens, ["这", "是", "test", "文", "本", "OK"]);
});

test("Mixed text with spaces", () => {
  const tokens = tokenizeForNgram("hello 你好 world");
  assert.deepEqual(tokens, ["hello", "你", "好", "world"]);
});

// ---- Edge cases ----

test("Empty string returns empty array", () => {
  assert.deepEqual(tokenizeForNgram(""), []);
});

test("Whitespace only returns empty array", () => {
  assert.deepEqual(tokenizeForNgram("   "), []);
});

test("Single CJK character returns single-element array", () => {
  assert.deepEqual(tokenizeForNgram("中"), ["中"]);
});

test("Single Latin word returns single-element array", () => {
  assert.deepEqual(tokenizeForNgram("hello"), ["hello"]);
});

test("Repeated CJK characters produce correct token count", () => {
  const tokens = tokenizeForNgram("啊啊啊啊啊");
  assert.equal(tokens.length, 5);
  // Each token is the same character
  assert.ok(tokens.every((t) => t === "啊"));
});

test("Long paragraph with mixed content", () => {
  const input = "第一章 开始。The story begins. 一切从这里开始。";
  const tokens = tokenizeForNgram(input);
  // Should have individual CJK chars plus Latin words
  assert.ok(tokens.length > 5);
  // Latin words are properly split
  assert.ok(tokens.some((t) => t === "The"));
  assert.ok(tokens.some((t) => t === "story"));
  assert.ok(tokens.some((t) => t === "begins"));
  // CJK chars are individual
  assert.ok(tokens.includes("第"));
  assert.ok(tokens.includes("一"));
  assert.ok(tokens.includes("章"));
  // CJK punctuation is individual token
  assert.ok(tokens.includes("。"));
});
