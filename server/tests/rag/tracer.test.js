"use strict";

/**
 * REQ-7055 测试：RagRetrievalTracer — SHA-256 摘要、时间快照、候选计数
 */

const { describe, test } = require("node:test");
const assert = require("node:assert");

const {
  digestQuery,
  createEmptyTimingSnapshot,
  createEmptyCountsSnapshot,
} = require("../../dist/services/rag/RagRetrievalTracer.js");

describe("RagRetrievalTracer 工具函数", () => {
  describe("digestQuery", () => {
    test("相同查询生成相同摘要", () => {
      const a = digestQuery("测试查询");
      const b = digestQuery("测试查询");
      assert.equal(a, b);
    });

    test("不同查询生成不同摘要", () => {
      const a = digestQuery("查询A");
      const b = digestQuery("查询B");
      assert.notEqual(a, b);
    });

    test("摘要为 24 位 hex", () => {
      const hash = digestQuery("测试");
      assert.equal(hash.length, 24);
      assert.ok(/^[0-9a-f]+$/.test(hash));
    });
  });

  describe("createEmptyTimingSnapshot", () => {
    test("所有阶段初始为 0", () => {
      const timing = createEmptyTimingSnapshot();
      assert.equal(timing.vectorMs, 0);
      assert.equal(timing.keywordMs, 0);
      assert.equal(timing.fusionMs, 0);
      assert.equal(timing.rerankerMs, 0);
      assert.equal(timing.decayMs, 0);
      assert.equal(timing.totalMs, 0);
    });
  });

  describe("createEmptyCountsSnapshot", () => {
    test("所有计数初始为 0", () => {
      const counts = createEmptyCountsSnapshot();
      assert.equal(counts.vector, 0);
      assert.equal(counts.keyword, 0);
      assert.equal(counts.fused, 0);
      assert.equal(counts.rerankerInput, 0);
      assert.equal(counts.rerankerOutput, 0);
      assert.equal(counts.final, 0);
    });
  });
});
