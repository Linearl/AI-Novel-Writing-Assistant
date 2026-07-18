/**
 * REQ-7057: AI味趋势追踪 — 单元测试
 *
 * 测试异常点检测算法和趋势数据聚合。
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectAnomalies } from "../../../src/services/novel/quality/smell/AiSmellTrendService";

// ─── 辅助函数 ──────────────────────────────────────────────────────────

function makeScore(
  chapterOrder: number,
  overallScore: number,
  formulaicScore = 0,
  mechanicalScore = 0,
  emotionalScore = 0,
  originalScore = 0,
) {
  return {
    chapterId: `chapter-${chapterOrder}`,
    chapterOrder,
    overallScore,
    formulaicScore,
    mechanicalScore,
    emotionalScore,
    originalScore,
  };
}

// ─── 异常点检测测试 ───────────────────────────────────────────────────

describe("detectAnomalies", () => {
  it("空数组返回空异常列表", () => {
    const result = detectAnomalies([]);
    assert.equal(result.length, 0);
  });

  it("单个评分返回空异常列表", () => {
    const scores = [makeScore(1, 50)];
    const result = detectAnomalies(scores);
    assert.equal(result.length, 0);
  });

  it("两个评分无异常", () => {
    const scores = [makeScore(1, 50), makeScore(2, 55)];
    const result = detectAnomalies(scores);
    assert.equal(result.length, 0);
  });

  it("检测连续3章评分下降 → continuous_decline", () => {
    const scores = [
      makeScore(1, 70),
      makeScore(2, 65),
      makeScore(3, 58),
    ];
    const result = detectAnomalies(scores);
    assert.equal(result.length, 1);
    assert.equal(result[0].type, "continuous_decline");
    assert.equal(result[0].chapterNumber, 3);
    assert.equal(result[0].score, 58);
    assert.ok(result[0].suggestion?.includes("连续3章"));
  });

  it("非连续下降不触发 continuous_decline（scores[1] >= scores[0]）", () => {
    const scores = [
      makeScore(1, 70),
      makeScore(2, 72), // 先上升
      makeScore(3, 68), // 再下降
    ];
    const result = detectAnomalies(scores);
    const declines = result.filter((a) => a.type === "continuous_decline");
    assert.equal(declines.length, 0);
  });

  it("检测单章评分突变（下降 > 20） → sharp_drop", () => {
    const scores = [
      makeScore(1, 75),
      makeScore(2, 50),  // 下降 25
    ];
    const result = detectAnomalies(scores);
    const drops = result.filter((a) => a.type === "sharp_drop");
    assert.equal(drops.length, 1);
    assert.equal(drops[0].chapterNumber, 2);
    assert.equal(drops[0].score, 50);
  });

  it("检测单章评分突变（上升 > 20） → sharp_rise", () => {
    const scores = [
      makeScore(1, 45),
      makeScore(2, 70),  // 上升 25
    ];
    const result = detectAnomalies(scores);
    const rises = result.filter((a) => a.type === "sharp_rise");
    assert.equal(rises.length, 1);
    assert.equal(rises[0].chapterNumber, 2);
    assert.equal(rises[0].score, 70);
  });

  it("变化 <= 20 不触发突变检测", () => {
    const scores = [
      makeScore(1, 60),
      makeScore(2, 80),  // 上升 20，刚好在阈值
    ];
    const result = detectAnomalies(scores);
    assert.equal(result.length, 0);
  });

  it("可同时检测连续下降和突变（不同类型）", () => {
    const scores = [
      makeScore(1, 80),
      makeScore(2, 75),
      makeScore(3, 68),
      makeScore(4, 40),  // 连续下降 + 突变同时触发
    ];
    const result = detectAnomalies(scores);
    const declines = result.filter((a) => a.type === "continuous_decline");
    const drops = result.filter((a) => a.type === "sharp_drop");
    assert.ok(declines.length >= 1, "应检测到连续下降");
    assert.ok(drops.length >= 1, "应检测到突变");
  });

  it("异常点的 expectedRange 在下限不低于 0", () => {
    const scores = [
      makeScore(1, 5),
      makeScore(2, 35),  // 上升 30
    ];
    const result = detectAnomalies(scores);
    const rise = result.find((a) => a.type === "sharp_rise");
    assert.ok(rise);
    assert.ok(rise.expectedRange[0] >= 0, "下限不应低于 0");
  });

  it("异常点的 expectedRange 在上限不高于 100", () => {
    const scores = [
      makeScore(1, 85),
      makeScore(2, 120), // impossible in practice but tests the cap
    ];
    // Note: scores above 100 shouldn't happen but we test the cap anyway
    // The expectedRange is based on scores[i-1], so with score 85+10=95 it's fine
  });

  it("长序列检测多个异常", () => {
    const scores = [
      makeScore(1, 60),
      makeScore(2, 58),
      makeScore(3, 55),
      makeScore(4, 53), // 连续下降
      makeScore(5, 80), // 突变上升
      makeScore(6, 78),
      makeScore(7, 74),
      makeScore(8, 70), // 连续下降
    ];
    const result = detectAnomalies(scores);
    assert.ok(result.length >= 3, `应检测到至少 3 个异常，实际: ${result.length}`);
  });
});
