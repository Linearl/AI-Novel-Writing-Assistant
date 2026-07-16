/**
 * curveCoordinates.test.mjs — 坐标计算工具单元测试
 * 使用 Node.js 内置 test runner
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  computeCurveCoordinates,
  generateCurvePath,
  computeNodePosition,
  extractConflictValues,
  extractRevealValues,
  clampConflictValue,
  computeConflictFromDrag,
  COORDINATE_PADDING,
  NODE_SPACING_X,
  NODE_Y_MAX,
} from "./curveCoordinates.ts";

// ── Helpers ──────────────────────────────────────────────

/** @type {import("./tensionCurveTypes.ts").CurveBounds} */
const mockBounds = { width: 800, height: 400 };

/**
 * @param {Record<string, unknown>} overrides
 */
function makeMockChapter(overrides = {}) {
  return {
    id: /** @type {string} */ (overrides.id ?? "ch-1"),
    title: /** @type {string} */ (overrides.title ?? "Test"),
    order: /** @type {number} */ (overrides.order ?? 1),
    conflictLevel: /** @type {number|null} */ (overrides.conflictLevel ?? 50),
    revealLevel: /** @type {number|null} */ (overrides.revealLevel ?? 50),
    content: /** @type {string|null} */ (overrides.content ?? null),
    locked: false,
    novelId: "novel-1",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  };
}

// ── Tests ────────────────────────────────────────────────

test("computeCurveCoordinates returns empty array for no chapters", () => {
  assert.deepEqual(computeCurveCoordinates([], mockBounds), []);
});

test("computeCurveCoordinates maps single chapter to center of canvas", () => {
  const chapters = [makeMockChapter({ conflictLevel: 50 })];
  const points = computeCurveCoordinates(chapters, mockBounds);
  assert.equal(points.length, 1);
  // conflict 50 → midpoint of Y range
  assert.ok(Math.abs(points[0].y - mockBounds.height / 2) < 5);
});

test("computeCurveCoordinates maps first chapter to padded left, last to padded right", () => {
  const chapters = [
    makeMockChapter({ id: "ch-1", order: 1, conflictLevel: 30 }),
    makeMockChapter({ id: "ch-2", order: 2, conflictLevel: 70 }),
  ];
  const points = computeCurveCoordinates(chapters, mockBounds);
  assert.equal(points[0].x, COORDINATE_PADDING);
  assert.equal(points[1].x, mockBounds.width - COORDINATE_PADDING);
});

test("computeCurveCoordinates maps conflict=0 to bottom of canvas", () => {
  const chapters = [makeMockChapter({ conflictLevel: 0 })];
  const points = computeCurveCoordinates(chapters, mockBounds);
  assert.ok(Math.abs(points[0].y - (mockBounds.height - COORDINATE_PADDING)) < 5);
});

test("computeCurveCoordinates maps conflict=100 to top of canvas", () => {
  const chapters = [makeMockChapter({ conflictLevel: 100 })];
  const points = computeCurveCoordinates(chapters, mockBounds);
  assert.ok(Math.abs(points[0].y - COORDINATE_PADDING) < 5);
});

test("computeCurveCoordinates uses default 50 for null conflictLevel", () => {
  const chapters = [makeMockChapter({ conflictLevel: null })];
  const points = computeCurveCoordinates(chapters, mockBounds);
  assert.ok(Math.abs(points[0].y - mockBounds.height / 2) < 5);
});

test("generateCurvePath returns empty string for empty points", () => {
  assert.equal(generateCurvePath([]), "");
});

test("generateCurvePath generates valid SVG path", () => {
  const points = [
    { x: 0, y: 100, chapter: makeMockChapter() },
    { x: 200, y: 50, chapter: makeMockChapter() },
    { x: 400, y: 200, chapter: makeMockChapter() },
  ];
  const path = generateCurvePath(points);
  assert.ok(path.length > 0);
  assert.ok(path.startsWith("M"));
});

test("extractConflictValues extracts conflict values from chapters", () => {
  const chapters = [
    makeMockChapter({ id: "ch-1", order: 1, conflictLevel: 30 }),
    makeMockChapter({ id: "ch-2", order: 2, conflictLevel: null }),
    makeMockChapter({ id: "ch-3", order: 3, conflictLevel: 80 }),
  ];
  assert.deepEqual(extractConflictValues(chapters), [30, 50, 80]);
});

test("extractRevealValues extracts reveal values from chapters", () => {
  const chapters = [
    makeMockChapter({ id: "ch-1", order: 1, revealLevel: 20 }),
    makeMockChapter({ id: "ch-2", order: 2, revealLevel: null }),
    makeMockChapter({ id: "ch-3", order: 3, revealLevel: 90 }),
  ];
  assert.deepEqual(extractRevealValues(chapters), [20, 50, 90]);
});

test("computeNodePosition first node at left", () => {
  const pos = computeNodePosition(0, 50, 5, 800);
  assert.equal(pos.x, COORDINATE_PADDING);
});

test("computeNodePosition last node at right", () => {
  const pos = computeNodePosition(4, 50, 5, 800);
  assert.equal(pos.x, 800 - COORDINATE_PADDING);
});

test("computeNodePosition maps conflict=100 to y=0", () => {
  const pos = computeNodePosition(0, 100, 1, 800);
  assert.equal(pos.y, 0);
});

test("computeNodePosition maps conflict=0 to NODE_Y_MAX", () => {
  const pos = computeNodePosition(0, 0, 1, 800);
  assert.equal(pos.y, NODE_Y_MAX);
});

test("clampConflictValue returns value within bounds unchanged", () => {
  assert.equal(clampConflictValue(50), 50);
});

test("clampConflictValue clamps to 0 minimum", () => {
  assert.equal(clampConflictValue(-5), 0);
});

test("clampConflictValue clamps to 100 maximum", () => {
  assert.equal(clampConflictValue(120), 100);
});

test("clampConflictValue rounds values", () => {
  assert.equal(clampConflictValue(45.7), 46);
});

test("computeConflictFromDrag increases conflict on upward drag", () => {
  const result = computeConflictFromDrag(50, -40);
  assert.ok(result > 50);
});

test("computeConflictFromDrag decreases conflict on downward drag", () => {
  const result = computeConflictFromDrag(50, 40);
  assert.ok(result < 50);
});

test("computeConflictFromDrag clamps result to 0-100", () => {
  assert.equal(computeConflictFromDrag(10, 200), 0);
  assert.equal(computeConflictFromDrag(90, -200), 100);
});

test("COORDINATE_PADDING is 40", () => {
  assert.equal(COORDINATE_PADDING, 40);
});

test("NODE_SPACING_X is 120", () => {
  assert.equal(NODE_SPACING_X, 120);
});

test("NODE_Y_MAX is 400", () => {
  assert.equal(NODE_Y_MAX, 400);
});
