const test = require("node:test");
const assert = require("node:assert/strict");

const {
  validateBeatStructurePreservation,
} = require("../../dist/services/novel/volume/volumeBeatSheetGeneration.js");

// --- T6: validateBeatStructurePreservation tests ---

test("validateBeatStructurePreservation accepts when both have no beats", () => {
  const result = validateBeatStructurePreservation(
    { beats: [] },
    { beats: [] },
  );
  assert.equal(result.valid, true);
  assert.equal(result.violations.length, 0);
});

test("validateBeatStructurePreservation accepts when original has no beats", () => {
  const result = validateBeatStructurePreservation(
    { beats: [] },
    { beats: [{ key: "a", label: "A", summary: "s", chapterSpanHint: "1-2章", mustDeliver: ["d"] }] },
  );
  assert.equal(result.valid, true);
});

test("validateBeatStructurePreservation accepts when regenerated has no beats", () => {
  const result = validateBeatStructurePreservation(
    { beats: [{ key: "a", label: "A", summary: "s", chapterSpanHint: "1-2章", mustDeliver: ["d"] }] },
    { beats: [] },
  );
  assert.equal(result.valid, true);
});

test("validateBeatStructurePreservation accepts identical structures", () => {
  const beats = [
    { key: "open_hook", label: "开卷", summary: "开卷摘要", chapterSpanHint: "1-3章", mustDeliver: ["d1"] },
    { key: "escalation", label: "升级", summary: "升级摘要", chapterSpanHint: "4-6章", mustDeliver: ["d2"] },
    { key: "climax", label: "高潮", summary: "高潮摘要", chapterSpanHint: "7-10章", mustDeliver: ["d3"] },
  ];
  const result = validateBeatStructurePreservation(
    { beats },
    { beats: beats.map((b) => ({ ...b })) },
  );
  assert.equal(result.valid, true);
  assert.equal(result.violations.length, 0);
});

test("validateBeatStructurePreservation accepts same structure with modified content", () => {
  const original = [
    { key: "open_hook", label: "开卷", summary: "原摘要", chapterSpanHint: "1-3章", mustDeliver: ["原"] },
    { key: "climax", label: "高潮", summary: "原摘要2", chapterSpanHint: "4-8章", mustDeliver: ["原2"] },
  ];
  const regenerated = [
    { key: "open_hook", label: "开卷新", summary: "新摘要", chapterSpanHint: "1-3章", mustDeliver: ["新"] },
    { key: "climax", label: "高潮新", summary: "新摘要2", chapterSpanHint: "4-8章", mustDeliver: ["新2"] },
  ];
  const result = validateBeatStructurePreservation(
    { beats: original },
    { beats: regenerated },
  );
  assert.equal(result.valid, true);
});

test("validateBeatStructurePreservation detects beat count mismatch", () => {
  const original = [
    { key: "a", label: "A", summary: "s", chapterSpanHint: "1-2章", mustDeliver: ["d"] },
    { key: "b", label: "B", summary: "s", chapterSpanHint: "3-5章", mustDeliver: ["d"] },
  ];
  const regenerated = [
    { key: "a", label: "A", summary: "s", chapterSpanHint: "1-2章", mustDeliver: ["d"] },
  ];
  const result = validateBeatStructurePreservation(
    { beats: original },
    { beats: regenerated },
  );
  assert.equal(result.valid, false);
  assert.ok(result.violations.some((v) => v.includes("beat count mismatch")));
});

test("validateBeatStructurePreservation detects missing keys", () => {
  const original = [
    { key: "open_hook", label: "A", summary: "s", chapterSpanHint: "1-2章", mustDeliver: ["d"] },
    { key: "climax", label: "B", summary: "s", chapterSpanHint: "3-5章", mustDeliver: ["d"] },
  ];
  const regenerated = [
    { key: "open_hook", label: "A", summary: "s", chapterSpanHint: "1-2章", mustDeliver: ["d"] },
    { key: "end_hook", label: "C", summary: "s", chapterSpanHint: "3-5章", mustDeliver: ["d"] },
  ];
  const result = validateBeatStructurePreservation(
    { beats: original },
    { beats: regenerated },
  );
  assert.equal(result.valid, false);
  assert.ok(result.violations.some((v) => v.includes("missing keys")));
  assert.ok(result.violations.some((v) => v.includes("climax")));
  assert.ok(result.violations.some((v) => v.includes("unexpected new keys")));
  assert.ok(result.violations.some((v) => v.includes("end_hook")));
});

test("validateBeatStructurePreservation detects key case mismatch as identical", () => {
  const original = [
    { key: "Open_Hook", label: "A", summary: "s", chapterSpanHint: "1-2章", mustDeliver: ["d"] },
  ];
  const regenerated = [
    { key: "open_hook", label: "A", summary: "s", chapterSpanHint: "1-2章", mustDeliver: ["d"] },
  ];
  const result = validateBeatStructurePreservation(
    { beats: original },
    { beats: regenerated },
  );
  assert.equal(result.valid, true);
});

test("validateBeatStructurePreservation detects chapter count exceeding tolerance", () => {
  const original = [
    { key: "a", label: "A", summary: "s", chapterSpanHint: "1-2章", mustDeliver: ["d"] },
    { key: "b", label: "B", summary: "s", chapterSpanHint: "5-10章", mustDeliver: ["d"] },
  ];
  const regenerated = [
    { key: "a", label: "A", summary: "s", chapterSpanHint: "1-2章", mustDeliver: ["d"] },
    { key: "b", label: "B", summary: "s", chapterSpanHint: "5-15章", mustDeliver: ["d"] },
  ];
  const result = validateBeatStructurePreservation(
    { beats: original },
    { beats: regenerated },
  );
  assert.equal(result.valid, false);
  assert.ok(result.violations.some((v) => v.includes('beat "b"')));
  assert.ok(result.violations.some((v) => v.includes("exceeds tolerance")));
});

test("validateBeatStructurePreservation accepts chapter count within tolerance", () => {
  const original = [
    { key: "a", label: "A", summary: "s", chapterSpanHint: "1-2章", mustDeliver: ["d"] },
    { key: "b", label: "B", summary: "s", chapterSpanHint: "5-10章", mustDeliver: ["d"] },
  ];
  const regenerated = [
    { key: "a", label: "A", summary: "s", chapterSpanHint: "1-2章", mustDeliver: ["d"] },
    { key: "b", label: "B", summary: "s", chapterSpanHint: "5-11章", mustDeliver: ["d"] },
  ];
  const result = validateBeatStructurePreservation(
    { beats: original },
    { beats: regenerated },
  );
  assert.equal(result.valid, true);
});

test("validateBeatStructurePreservation detects key position mismatch", () => {
  const original = [
    { key: "open_hook", label: "A", summary: "s", chapterSpanHint: "1-2章", mustDeliver: ["d"] },
    { key: "climax", label: "B", summary: "s", chapterSpanHint: "3-5章", mustDeliver: ["d"] },
  ];
  const regenerated = [
    { key: "climax", label: "B", summary: "s", chapterSpanHint: "1-2章", mustDeliver: ["d"] },
    { key: "open_hook", label: "A", summary: "s", chapterSpanHint: "3-5章", mustDeliver: ["d"] },
  ];
  const result = validateBeatStructurePreservation(
    { beats: original },
    { beats: regenerated },
  );
  assert.equal(result.valid, false);
  assert.ok(result.violations.some((v) => v.includes("key position")));
});

test("validateBeatStructurePreservation collects multiple violations", () => {
  const original = [
    { key: "open_hook", label: "A", summary: "s", chapterSpanHint: "1-2章", mustDeliver: ["d"] },
    { key: "climax", label: "B", summary: "s", chapterSpanHint: "5-10章", mustDeliver: ["d"] },
  ];
  const regenerated = [
    { key: "open_hook", label: "A", summary: "s", chapterSpanHint: "1-2章", mustDeliver: ["d"] },
    { key: "end_hook", label: "C", summary: "s", chapterSpanHint: "5-20章", mustDeliver: ["d"] },
  ];
  const result = validateBeatStructurePreservation(
    { beats: original },
    { beats: regenerated },
  );
  assert.equal(result.valid, false);
  assert.ok(result.violations.length >= 2);
});

test("validateBeatStructurePreservation respects custom tolerance", () => {
  const original = [
    { key: "a", label: "A", summary: "s", chapterSpanHint: "1-2章", mustDeliver: ["d"] },
  ];
  const regenerated = [
    { key: "a", label: "A", summary: "s", chapterSpanHint: "1-4章", mustDeliver: ["d"] },
  ];
  // Default tolerance (1): 2 vs 4 = diff 2, should fail
  const resultStrict = validateBeatStructurePreservation(
    { beats: original },
    { beats: regenerated },
  );
  assert.equal(resultStrict.valid, false);

  // Custom tolerance (2): diff 2 <= tolerance 2, should pass
  const resultLenient = validateBeatStructurePreservation(
    { beats: original },
    { beats: regenerated },
    2,
  );
  assert.equal(resultLenient.valid, true);
});
