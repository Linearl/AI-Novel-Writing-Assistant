"use strict";

/**
 * REQ-7055 测试：chunkFacets — 7 维 facet 类型定义和归一化
 */

const { describe, test } = require("node:test");
const assert = require("node:assert");

const {
  RAG_CHUNK_FACET_KEYS,
  normalizeRagFacetValues,
  normalizeRagFacets,
  hasRagFacets,
  matchRagFacets,
  computeFacetBoostScore,
} = require("../../dist/services/rag/chunkFacets.js");

describe("chunkFacets", () => {
  describe("RAG_CHUNK_FACET_KEYS", () => {
    test("包含 7 个维度", () => {
      assert.equal(RAG_CHUNK_FACET_KEYS.length, 7);
    });

    test("包含所有预期维度名称", () => {
      const expected = [
        "genreTags",
        "sellingPointTags",
        "targetReaders",
        "strengths",
        "weaknesses",
        "characterRole",
        "chapterAnchor",
      ];
      for (const key of expected) {
        assert.ok(RAG_CHUNK_FACET_KEYS.includes(key), `应包含 ${key}`);
      }
    });
  });

  describe("normalizeRagFacetValues", () => {
    test("去重、去空、截断到 maxEntries", () => {
      const raw = ["a", "", "b", "a", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"];
      const result = normalizeRagFacetValues(raw, 12);
      assert.ok(result.length <= 12);
      assert.deepEqual(result, ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"]);
    });

    test("默认 maxEntries 为 12", () => {
      const raw = ["x", "y", "z"];
      const result = normalizeRagFacetValues(raw);
      assert.deepEqual(result, ["x", "y", "z"]);
    });

    test("非数组输入返回空数组", () => {
      assert.deepEqual(normalizeRagFacetValues(null), []);
      assert.deepEqual(normalizeRagFacetValues(undefined), []);
      assert.deepEqual(normalizeRagFacetValues("string"), []);
      assert.deepEqual(normalizeRagFacetValues(123), []);
    });

    test("过滤空白字符串", () => {
      const raw = ["  a  ", "  ", "\t", "b"];
      const result = normalizeRagFacetValues(raw);
      assert.deepEqual(result, ["a", "b"]);
    });

    test("截断到指定 maxEntries", () => {
      const raw = ["a", "b", "c", "d", "e"];
      const result = normalizeRagFacetValues(raw, 3);
      assert.deepEqual(result, ["a", "b", "c"]);
    });
  });

  describe("normalizeRagFacets", () => {
    test("归一化完整 facet 对象", () => {
      const raw = {
        genreTags: ["玄幻", "架空"],
        sellingPointTags: ["爽文"],
        targetReaders: [],
        strengths: ["设定新颖"],
      };
      const result = normalizeRagFacets(raw);
      assert.deepEqual(result.genreTags, ["玄幻", "架空"]);
      assert.deepEqual(result.sellingPointTags, ["爽文"]);
      assert.equal(result.targetReaders, undefined);
      assert.deepEqual(result.strengths, ["设定新颖"]);
    });

    test("空输入返回空对象", () => {
      assert.deepEqual(normalizeRagFacets(null), {});
      assert.deepEqual(normalizeRagFacets(undefined), {});
      assert.deepEqual(normalizeRagFacets([]), {});
      assert.deepEqual(normalizeRagFacets("string"), {});
    });
  });

  describe("hasRagFacets", () => {
    test("有 facet 数据返回 true", () => {
      assert.equal(hasRagFacets({ genreTags: ["a"] }), true);
    });

    test("空数组不算有 facet 数据", () => {
      assert.equal(hasRagFacets({ genreTags: [] }), false);
    });

    test("非对象返回 false", () => {
      assert.equal(hasRagFacets(null), false);
      assert.equal(hasRagFacets([]), false);
      assert.equal(hasRagFacets("string"), false);
    });
  });

  describe("matchRagFacets", () => {
    test("无过滤条件时通过", () => {
      assert.equal(matchRagFacets(undefined, undefined), true);
      assert.equal(matchRagFacets({ genreTags: ["a"] }, {}), true);
    });

    test("有过滤条件但 chunk 无 facet 时不通过", () => {
      assert.equal(matchRagFacets(undefined, { genreTags: ["a"] }), false);
      assert.equal(matchRagFacets({}, { genreTags: ["a"] }), false);
    });

    test("facet 交集匹配通过", () => {
      assert.equal(
        matchRagFacets(
          { genreTags: ["玄幻", "都市"] },
          { genreTags: ["玄幻"] },
        ),
        true,
      );
    });

    test("facet 无交集不通过", () => {
      assert.equal(
        matchRagFacets(
          { genreTags: ["玄幻"] },
          { genreTags: ["科幻"] },
        ),
        false,
      );
    });

    test("多维度全部匹配才通过", () => {
      assert.equal(
        matchRagFacets(
          { genreTags: ["玄幻"], characterRole: ["主角"] },
          { genreTags: ["玄幻"], characterRole: ["配角"] },
        ),
        false,
      );
    });

    test("未指定的维度不参与过滤", () => {
      assert.equal(
        matchRagFacets(
          { genreTags: ["玄幻"], characterRole: ["主角"] },
          { genreTags: ["玄幻"] },
        ),
        true,
      );
    });
  });

  describe("computeFacetBoostScore", () => {
    test("无过滤条件返回 0", () => {
      assert.equal(computeFacetBoostScore({ genreTags: ["a"] }, undefined), 0);
      assert.equal(computeFacetBoostScore({ genreTags: ["a"] }, {}), 0);
    });

    test("chunk 无 facet 返回 0", () => {
      assert.equal(computeFacetBoostScore(undefined, { genreTags: ["a"] }), 0);
    });

    test("计算匹配比例", () => {
      const score = computeFacetBoostScore(
        { genreTags: ["玄幻"], characterRole: ["主角"] },
        { genreTags: ["玄幻"], characterRole: ["主角"], chapterAnchor: ["第3章"] },
      );
      // genreTags 和 characterRole 两个维度匹配，共 3 个维度有过滤条件
      assert.ok(score > 0 && score <= 1, `score 应在 0-1 之间，实际 ${score}`);
      assert.ok(Math.abs(score - 2 / 3) < 0.01, `score 应接近 2/3，实际 ${score}`);
    });
  });
});
