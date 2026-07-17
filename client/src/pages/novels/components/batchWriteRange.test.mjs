import test from "node:test";
import assert from "node:assert/strict";

import { resolveBatchWriteRange } from "./batchWriteRange.ts";

function buildChapter(id, order) {
  return {
    id,
    title: `第${order}章`,
    order,
    locked: false,
    novelId: "novel-1",
    createdAt: "2026-07-17T00:00:00.000Z",
    updatedAt: "2026-07-17T00:00:00.000Z",
  };
}

function buildChapters(orders) {
  return orders.map((order) => buildChapter(`ch-${order}`, order));
}

test("resolveBatchWriteRange returns null when no selected chapter", () => {
  const result = resolveBatchWriteRange({
    selectedChapter: undefined,
    chapters: buildChapters([1, 2, 3]),
    batchMode: "count",
    batchCount: 3,
  });
  assert.equal(result, null);
});

test("resolveBatchWriteRange returns null when no chapters", () => {
  const result = resolveBatchWriteRange({
    selectedChapter: buildChapter("ch-1", 1),
    chapters: [],
    batchMode: "count",
    batchCount: 3,
  });
  assert.equal(result, null);
});

test("resolveBatchWriteRange count mode computes range from selected chapter", () => {
  const chapters = buildChapters([1, 2, 3, 4, 5]);
  const result = resolveBatchWriteRange({
    selectedChapter: chapters[2],
    chapters,
    batchMode: "count",
    batchCount: 2,
  });
  assert.ok(result);
  assert.equal(result.startOrder, 3);
  assert.equal(result.endOrder, 4);
  assert.equal(result.count, 2);
});

test("resolveBatchWriteRange count mode clamps batchCount to remaining chapters", () => {
  const chapters = buildChapters([1, 2, 3]);
  const result = resolveBatchWriteRange({
    selectedChapter: chapters[1],
    chapters,
    batchMode: "count",
    batchCount: 10,
  });
  assert.ok(result);
  assert.equal(result.startOrder, 2);
  assert.equal(result.endOrder, 3);
  assert.equal(result.count, 2);
});

test("resolveBatchWriteRange count mode returns null when only one remaining chapter", () => {
  const chapters = buildChapters([1, 2, 3]);
  const result = resolveBatchWriteRange({
    selectedChapter: chapters[2],
    chapters,
    batchMode: "count",
    batchCount: 3,
  });
  assert.equal(result, null);
});

test("resolveBatchWriteRange visible_all mode covers all chapters", () => {
  const chapters = buildChapters([1, 2, 3, 4]);
  const result = resolveBatchWriteRange({
    selectedChapter: chapters[1],
    chapters,
    batchMode: "visible_all",
    batchCount: 3,
  });
  assert.ok(result);
  assert.equal(result.startOrder, 1);
  assert.equal(result.endOrder, 4);
  assert.equal(result.count, 4);
});

test("resolveBatchWriteRange volume_all mode covers all chapters", () => {
  const chapters = buildChapters([1, 2, 3]);
  const result = resolveBatchWriteRange({
    selectedChapter: chapters[0],
    chapters,
    batchMode: "volume_all",
    batchCount: 3,
  });
  assert.ok(result);
  assert.equal(result.startOrder, 1);
  assert.equal(result.endOrder, 3);
  assert.equal(result.count, 3);
});

test("resolveBatchWriteRange handles unsorted chapters by sorting on order", () => {
  const chapters = buildChapters([5, 1, 3, 2, 4]);
  const result = resolveBatchWriteRange({
    selectedChapter: chapters[1],
    chapters,
    batchMode: "visible_all",
    batchCount: 3,
  });
  assert.ok(result);
  assert.equal(result.startOrder, 1);
  assert.equal(result.endOrder, 5);
});
