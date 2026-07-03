const test = require("node:test");
const assert = require("node:assert/strict");
const { detectConsecutiveRepeat, detectRepeatInText, createDetectorConfig } = require("../dist/llm/repetition/detector.js");

// ---- No repetition ----

test("returns none when no repetition", () => {
  const tokens = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
  const result = detectConsecutiveRepeat(tokens);
  assert.equal(result.severity, "none");
  assert.equal(result.repeatCount, 0);
});

test("returns none when only one repeat (below threshold)", () => {
  const tokens = ["a", "b", "c", "a", "b", "c"];
  const result = detectConsecutiveRepeat(tokens, { warningThreshold: 3 });
  assert.equal(result.severity, "none");
});

// ---- Warning level ----

test("detects warning when block repeats exactly warningThreshold times", () => {
  // "a b c" repeated 3 times
  const tokens = ["a", "b", "c", "a", "b", "c", "a", "b", "c"];
  const result = detectConsecutiveRepeat(tokens, { warningThreshold: 3, criticalThreshold: 5 });
  assert.equal(result.severity, "warning");
  assert.equal(result.repeatCount, 3);
  assert.deepEqual(result.blockTokens, ["a", "b", "c"]);
});

// ---- Critical level ----

test("detects critical when block repeats at or above criticalThreshold", () => {
  // "h e l l o" repeated 5 times = 25 tokens
  const tokens = ["h", "e", "l", "l", "o", "h", "e", "l", "l", "o", "h", "e", "l", "l", "o", "h", "e", "l", "l", "o", "h", "e", "l", "l", "o"];
  const result = detectConsecutiveRepeat(tokens, { warningThreshold: 3, criticalThreshold: 5 });
  assert.equal(result.severity, "critical");
  assert.equal(result.repeatCount, 5);
  assert.deepEqual(result.blockTokens, ["h", "e", "l", "l", "o"]);
});

// ---- Block size detection ----

test("finds largest repeating block", () => {
  // "a b" repeated 4 times (block size 2) should be detected
  const tokens = ["a", "b", "a", "b", "a", "b", "a", "b"];
  const result = detectConsecutiveRepeat(tokens, { warningThreshold: 3 });
  assert.equal(result.severity, "warning");
  assert.equal(result.repeatCount, 4);
  assert.deepEqual(result.blockTokens, ["a", "b"]);
});

test("finds larger block when multiple sizes repeat", () => {
  // "x y z" repeated 3 times
  const tokens = ["x", "y", "z", "x", "y", "z", "x", "y", "z"];
  const result = detectConsecutiveRepeat(tokens, { warningThreshold: 3, maxBlockSize: 5 });
  assert.equal(result.severity, "warning");
  assert.equal(result.repeatCount, 3);
  assert.deepEqual(result.blockTokens, ["x", "y", "z"]);
});

// ---- Custom thresholds ----

test("custom warningThreshold is respected", () => {
  const tokens = ["a", "b", "a", "b", "a", "b"];
  const result = detectConsecutiveRepeat(tokens, { warningThreshold: 4 });
  assert.equal(result.severity, "none");
});

test("custom criticalThreshold is respected", () => {
  // "a b" repeated 6 times
  const tokens = ["a", "b", "a", "b", "a", "b", "a", "b", "a", "b", "a", "b"];
  const result = detectConsecutiveRepeat(tokens, { warningThreshold: 3, criticalThreshold: 6 });
  // 6 >= 6 -> critical
  assert.equal(result.severity, "critical");
  assert.equal(result.repeatCount, 6);
});

// ---- Edge cases ----

test("returns none for empty token array", () => {
  const result = detectConsecutiveRepeat([]);
  assert.equal(result.severity, "none");
});

test("returns none for tokens shorter than minBlockSize * warningThreshold", () => {
  const result = detectConsecutiveRepeat(["a", "b"], { warningThreshold: 3, minBlockSize: 2 });
  assert.equal(result.severity, "none");
});

// ---- detectRepeatInText convenience ----

test("detectRepeatInText tokenizes and detects", () => {
  // CJK text repeated 3 times
  const text = "你好世界你好世界你好世界";
  const result = detectRepeatInText(text, { warningThreshold: 3, minBlockSize: 2 });
  assert.equal(result.severity, "warning");
  assert.equal(result.repeatCount, 3);
});

test("detectRepeatInText returns none for unique text", () => {
  const result = detectRepeatInText("今天天气真好，我们一起去散步吧。");
  assert.equal(result.severity, "none");
});

// ---- totalTokensChecked ----

test("totalTokensChecked reflects input length", () => {
  const tokens = ["a", "b", "c", "d", "e"];
  const result = detectConsecutiveRepeat(tokens);
  assert.equal(result.totalTokensChecked, 5);
});
