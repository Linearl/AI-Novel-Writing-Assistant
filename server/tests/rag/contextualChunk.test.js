"use strict";

/**
 * REQ-7055 测试：RagContextualChunkService — 上下文前缀生成、哈希函数
 */

const { describe, test } = require("node:test");
const assert = require("node:assert");

const {
  buildContextSourceHash,
  normalizeContextPrefix,
  prependChunkPrefix,
} = require("../../dist/services/rag/RagContextualChunkService.js");

describe("RagContextualChunkService 工具函数", () => {
  describe("buildContextSourceHash", () => {
    test("相同输入生成相同哈希", () => {
      const a = buildContextSourceHash({
        ownerType: "knowledge_document",
        ownerId: "doc-001",
        title: "测试文档",
      });
      const b = buildContextSourceHash({
        ownerType: "knowledge_document",
        ownerId: "doc-001",
        title: "测试文档",
      });
      assert.equal(a, b);
    });

    test("不同输入生成不同哈希", () => {
      const a = buildContextSourceHash({
        ownerType: "knowledge_document",
        ownerId: "doc-001",
        title: "测试文档A",
      });
      const b = buildContextSourceHash({
        ownerType: "knowledge_document",
        ownerId: "doc-001",
        title: "测试文档B",
      });
      assert.notEqual(a, b);
    });

    test("哈希为 16 位 hex", () => {
      const hash = buildContextSourceHash({
        ownerType: "knowledge_document",
        ownerId: "doc-001",
        title: "测试",
      });
      assert.equal(hash.length, 16);
      assert.ok(/^[0-9a-f]+$/.test(hash));
    });

    test("title 为 undefined 时正常工作", () => {
      const hash = buildContextSourceHash({
        ownerType: "knowledge_document",
        ownerId: "doc-001",
      });
      assert.equal(typeof hash, "string");
      assert.equal(hash.length, 16);
    });
  });

  describe("normalizeContextPrefix", () => {
    test("在 maxChars 内原样返回", () => {
      const result = normalizeContextPrefix("简短前缀", 260);
      assert.equal(result, "简短前缀");
    });

    test("超过 maxChars 时截断", () => {
      const longPrefix = "a".repeat(300);
      const result = normalizeContextPrefix(longPrefix, 260);
      assert.ok(result.length <= 260);
    });

    test("在词边界截断", () => {
      const prefix = "词A 词B 词C 词D " + "x".repeat(250);
      const result = normalizeContextPrefix(prefix, 260);
      assert.ok(result.length <= 260);
      assert.ok(!result.endsWith("D "), "不应在单词中间截断");
    });

    test("去除换行和多余空白", () => {
      const result = normalizeContextPrefix("  前缀A\n前缀B   前缀C  ", 260);
      assert.equal(result, "前缀A 前缀B 前缀C");
    });

    test("默认 maxChars 为 260", () => {
      const result = normalizeContextPrefix("short");
      assert.equal(result, "short");
    });
  });

  describe("prependChunkPrefix", () => {
    test("将前缀拼接到 chunkText 前", () => {
      const result = prependChunkPrefix("正文内容", "上下文");
      assert.ok(result.startsWith("[上下文]"));
      assert.ok(result.endsWith("正文内容"));
    });

    test("空前缀不修改 chunkText", () => {
      const result = prependChunkPrefix("正文内容", "");
      assert.equal(result, "正文内容");
    });
  });
});
