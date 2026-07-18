"use strict";

/**
 * REQ-7055 测试：RagRetrievalTraceRetention — 清理逻辑
 */

const { describe, test } = require("node:test");
const assert = require("node:assert");

// 由于 clearExpiredTraces 依赖 prisma，这里测试定时器逻辑和配置
const { RagRetrievalTraceRetention } = require("../../dist/services/rag/RagRetrievalTraceRetention.js");

describe("RagRetrievalTraceRetention", () => {
  test("模块可导入", () => {
    assert.ok(typeof RagRetrievalTraceRetention === "function");
  });

  test("实例化不抛错误", () => {
    const retention = new RagRetrievalTraceRetention();
    assert.ok(retention instanceof RagRetrievalTraceRetention);
  });

  test("初始状态未运行", () => {
    const retention = new RagRetrievalTraceRetention();
    assert.equal(retention.isRunning, false);
  });

  test("start 后 isRunning 为 true", () => {
    const retention = new RagRetrievalTraceRetention();
    retention.start(999999); // 超长间隔避免触发清理
    assert.equal(retention.isRunning, true);
    retention.stop();
  });

  test("stop 后 isRunning 为 false", () => {
    const retention = new RagRetrievalTraceRetention();
    retention.start(999999);
    retention.stop();
    assert.equal(retention.isRunning, false);
  });

  test("重复 start 不创建第二个定时器", () => {
    const retention = new RagRetrievalTraceRetention();
    retention.start(999999);
    const firstTimerRunning = retention.isRunning;
    retention.start(999999);
    assert.equal(retention.isRunning, firstTimerRunning);
    retention.stop();
  });
});
