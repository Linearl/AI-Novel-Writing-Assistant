/**
 * tensionCurveAnalysis.test.mjs — 节奏问题检测逻辑单元测试
 * 使用 Node.js 内置 test runner
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeTensionCurve,
  sortIssuesBySeverity,
  getIssueSeverity,
  computeTensionStats,
} from "./tensionCurveAnalysis.ts";

/**
 * @param {Partial<{id: string, order: number, conflictLevel: number|null}>} overrides
 */
function makeMockChapter(overrides = {}) {
  return {
    id: overrides.id ?? "ch-1",
    title: "Test Chapter",
    order: overrides.order ?? 1,
    conflictLevel: overrides.conflictLevel ?? 50,
    revealLevel: 50,
    content: null,
    locked: false,
    novelId: "novel-1",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  };
}

/** @param {number[]} values */
function makeChapters(values) {
  return values.map((val, i) =>
    makeMockChapter({ id: `ch-${i + 1}`, order: i + 1, conflictLevel: val }),
  );
}

// ── flatPlateau ────────────────────────────────────────────

test("flatPlateau detects when 6+ chapters have low variance", () => {
  const chapters = makeChapters([50, 51, 50, 49, 50, 52]);
  const issues = analyzeTensionCurve(chapters);
  const flat = issues.filter((i) => i.code === "flatPlateau");
  assert.ok(flat.length > 0);
  assert.equal(flat[0].severity, "warning");
});

test("flatPlateau does not flag chapters with normal variance", () => {
  const chapters = makeChapters([30, 70, 45, 80, 20, 60]);
  const issues = analyzeTensionCurve(chapters);
  const flat = issues.filter((i) => i.code === "flatPlateau");
  assert.equal(flat.length, 0);
});

test("flatPlateau does not flag short spans (less than 6)", () => {
  const chapters = makeChapters([50, 51, 50, 49, 50]);
  const issues = analyzeTensionCurve(chapters);
  const flat = issues.filter((i) => i.code === "flatPlateau");
  assert.equal(flat.length, 0);
});

// ── lateClimax ────────────────────────────────────────────

test("lateClimax detects peak in last 20%", () => {
  const chapters = makeChapters([30, 40, 50, 60, 50, 60, 55, 65, 70, 85]);
  const issues = analyzeTensionCurve(chapters);
  const late = issues.filter((i) => i.code === "lateClimax");
  assert.ok(late.length > 0);
});

test("lateClimax does not flag well-distributed peaks", () => {
  const chapters = makeChapters([30, 70, 50, 85, 60, 50, 40, 30, 45, 35]);
  const issues = analyzeTensionCurve(chapters);
  const late = issues.filter((i) => i.code === "lateClimax");
  assert.equal(late.length, 0);
});

test("lateClimax does not flag when max below 60", () => {
  const chapters = makeChapters([20, 30, 40, 50, 55]);
  const issues = analyzeTensionCurve(chapters);
  const late = issues.filter((i) => i.code === "lateClimax");
  assert.equal(late.length, 0);
});

// ── earlyPeak ─────────────────────────────────────────────

test("earlyPeak detects peak in first 30% when later half lacks comparable peaks", () => {
  const chapters = makeChapters([40, 85, 30, 35, 40, 45, 40, 35, 30, 25]);
  const issues = analyzeTensionCurve(chapters);
  const early = issues.filter((i) => i.code === "earlyPeak");
  assert.ok(early.length > 0);
});

test("earlyPeak does not flag when second half has comparable peaks", () => {
  const chapters = makeChapters([40, 85, 30, 35, 40, 50, 55, 80, 65, 60]);
  const issues = analyzeTensionCurve(chapters);
  const early = issues.filter((i) => i.code === "earlyPeak");
  assert.equal(early.length, 0);
});

// ── noTension ─────────────────────────────────────────────

test("noTension detects 3+ consecutive chapters below 20", () => {
  const chapters = makeChapters([40, 15, 18, 10, 60]);
  const issues = analyzeTensionCurve(chapters);
  const noTension = issues.filter((i) => i.code === "noTension");
  assert.ok(noTension.length > 0);
  assert.equal(noTension[0].severity, "critical");
});

test("noTension does not flag spans shorter than 3", () => {
  const chapters = makeChapters([15, 18, 60]);
  const issues = analyzeTensionCurve(chapters);
  const noTension = issues.filter((i) => i.code === "noTension");
  assert.equal(noTension.length, 0);
});

test("noTension does not flag chapters with normal conflict", () => {
  const chapters = makeChapters([30, 40, 50, 60, 70]);
  const issues = analyzeTensionCurve(chapters);
  const noTension = issues.filter((i) => i.code === "noTension");
  assert.equal(noTension.length, 0);
});

// ── excessiveTension ──────────────────────────────────────

test("excessiveTension detects 5+ consecutive chapters above 90", () => {
  const chapters = makeChapters([30, 95, 92, 98, 91, 94, 40]);
  const issues = analyzeTensionCurve(chapters);
  const excessive = issues.filter((i) => i.code === "excessiveTension");
  assert.ok(excessive.length > 0);
  assert.equal(excessive[0].severity, "critical");
});

test("excessiveTension does not flag spans shorter than 5", () => {
  const chapters = makeChapters([95, 92, 98, 91]);
  const issues = analyzeTensionCurve(chapters);
  const excessive = issues.filter((i) => i.code === "excessiveTension");
  assert.equal(excessive.length, 0);
});

test("excessiveTension respects boundary at value 91", () => {
  const chapters = makeChapters([91, 91, 91, 91, 91]);
  const issues = analyzeTensionCurve(chapters);
  const excessive = issues.filter((i) => i.code === "excessiveTension");
  assert.ok(excessive.length > 0);
});

// ── edge cases ────────────────────────────────────────────

test("analyzeTensionCurve handles empty chapters", () => {
  assert.deepEqual(analyzeTensionCurve([]), []);
});

test("analyzeTensionCurve handles single chapter", () => {
  const issues = analyzeTensionCurve([makeMockChapter()]);
  assert.equal(issues.length, 0);
});

// ── utilities ─────────────────────────────────────────────

test("sortIssuesBySeverity puts critical before warning", () => {
  const issues = [
    { code: /** @type {import("./tensionCurveTypes.ts").TensionIssueCode} */ ("flatPlateau"), severity: /** @type {const} */ ("warning"), affectedChapters: [], description: "", suggestion: "" },
    { code: /** @type {import("./tensionCurveTypes.ts").TensionIssueCode} */ ("excessiveTension"), severity: /** @type {const} */ ("critical"), affectedChapters: [], description: "", suggestion: "" },
  ];
  const sorted = sortIssuesBySeverity(issues);
  assert.equal(sorted[0].severity, "critical");
  assert.equal(sorted[1].severity, "warning");
});

test("getIssueSeverity returns critical for noTension and excessiveTension", () => {
  assert.equal(getIssueSeverity("noTension"), "critical");
  assert.equal(getIssueSeverity("excessiveTension"), "critical");
});

test("getIssueSeverity returns warning for others", () => {
  assert.equal(getIssueSeverity("flatPlateau"), "warning");
  assert.equal(getIssueSeverity("lateClimax"), "warning");
  assert.equal(getIssueSeverity("earlyPeak"), "warning");
});

test("computeTensionStats for varied series", () => {
  const chapters = makeChapters([50, 60, 40, 70, 30]);
  const stats = computeTensionStats(chapters);
  assert.equal(stats.avg, 50);
  assert.equal(stats.max, 70);
  assert.equal(stats.min, 30);
  assert.ok(stats.stdDev > 0);
});

test("computeTensionStats returns zero for empty chapters", () => {
  assert.deepEqual(computeTensionStats([]), { avg: 0, max: 0, min: 0, stdDev: 0 });
});

test("computeTensionStats zero stdDev for flat series", () => {
  const chapters = makeChapters([50, 50, 50, 50]);
  const stats = computeTensionStats(chapters);
  assert.equal(stats.stdDev, 0);
});
