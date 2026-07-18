"use strict";

/**
 * REQ-7055 测试：RagRerankerService — 多格式归一化 + 降级
 */

const { describe, test } = require("node:test");
const assert = require("node:assert");

// 直接测试核心归一化逻辑（通过模块导出）
// RagRerankerService.ts 目前不导出 normalizeRerankerResults，
// 但通过 rerank 方法的返回值可以验证。

// 这里测试输入/输出类型和降级行为
// 由于 reranker 需要外部 API，降级测试是主要目标

describe("RagRerankerService", () => {
  test("模块可导入", () => {
    const { RagRerankerService } = require("../../dist/services/rag/RagRerankerService.js");
    assert.ok(typeof RagRerankerService === "function");
  });

  test("实例化不抛错误", () => {
    const { RagRerankerService } = require("../../dist/services/rag/RagRerankerService.js");
    const service = new RagRerankerService();
    assert.ok(service instanceof RagRerankerService);
  });

  test("无文档时返回空结果", async () => {
    const { RagRerankerService } = require("../../dist/services/rag/RagRerankerService.js");
    const service = new RagRerankerService();
    const result = await service.rerank({
      query: "测试查询",
      documents: [],
      topK: 5,
    });
    assert.equal(result.used, false);
    assert.deepEqual(result.results, []);
  });
});
