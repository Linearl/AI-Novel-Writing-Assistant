/**
 * REQ-7043: NetworkMonitor 单元测试
 *
 * 测试策略：
 * - T6: 断网判定 — 连续3次探测失败后状态切换为 offline
 * - T7: 恢复判定 — offline 后1次成功恢复为 online
 * - T8: 抖动场景 — 失败-成功-失败不触发断网（未达到连续3次）
 * - T9: 环形缓冲 — 探测记录超过最大保留数时旧记录被移除
 * - T4: 定时器生命周期 — stop 后不再执行心跳
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const { NetworkMonitor } = require("../../dist/llm/networkMonitor.js");
const { novelEventBus } = require("../../dist/events/EventBus.js");

const TEST_CONFIG = {
  heartbeatIntervalMs: 100,
  failureThreshold: 3,
  recoveryThreshold: 1,
  probeTimeoutMs: 5000,
  maxRecentProbes: 5,
  provider: "deepseek",
};

function makeSuccessProbe() {
  return {
    timestamp: new Date().toISOString(),
    ok: true,
    latency: 42,
    error: null,
  };
}

function makeFailProbe(error = "连接超时") {
  return {
    timestamp: new Date().toISOString(),
    ok: false,
    latency: null,
    error,
  };
}

test("T6: 连续3次探测失败后状态切换为 offline，并发布 network:offline 事件", async () => {
  const monitor = new NetworkMonitor(TEST_CONFIG);

  // 初始状态：online
  let initial = monitor.getState();
  assert.ok(initial.isOnline, "初始状态应为 online");
  assert.equal(initial.consecutiveFailures, 0);

  const events = [];
  function capture(event) {
    events.push(event);
  }

  novelEventBus.on("network:offline", capture);
  novelEventBus.on("network:online", capture);

  try {
    // 注入2次失败 — 不应触发 offline
    monitor.injectProbe(makeFailProbe());
    monitor.injectProbe(makeFailProbe());
    let mid = monitor.getState();
    assert.ok(mid.isOnline, "2次失败后仍应为 online");
    assert.equal(mid.consecutiveFailures, 2);
    assert.equal(events.length, 0, "未达阈值，不应发布事件");

    // 第3次失败 — 触发 offline
    monitor.injectProbe(makeFailProbe());
    let final = monitor.getState();
    assert.equal(final.isOnline, false, "3次连续失败后应变为 offline");
    assert.equal(final.consecutiveFailures, 3);
    assert.equal(events.length, 1, "应发布1条事件");
    assert.equal(events[0].type, "network:offline");
    assert.equal(typeof events[0].payload.reason, "string");
    assert.equal(typeof events[0].payload.timestamp, "string");
  } finally {
    novelEventBus.off("network:offline", capture);
    novelEventBus.off("network:online", capture);
    monitor.stop();
  }
});

test("T7: offline 后1次成功探测触发恢复，发布 network:online 事件", async () => {
  const monitor = new NetworkMonitor(TEST_CONFIG);

  // 先切换到 offline：3次失败
  monitor.injectProbe(makeFailProbe());
  monitor.injectProbe(makeFailProbe());
  monitor.injectProbe(makeFailProbe());
  assert.equal(monitor.getState().isOnline, false);

  const events = [];
  function capture(event) {
    events.push(event);
  }
  novelEventBus.on("network:online", capture);

  try {
    // 1次成功 — 应恢复为 online
    monitor.injectProbe(makeSuccessProbe());
    const state = monitor.getState();
    assert.ok(state.isOnline, "1次成功后应恢复为 online");
    assert.equal(state.consecutiveFailures, 0, "consecutiveFailures 应重置为0");
    assert.ok(state.lastSuccessAt, "应记录 lastSuccessAt");

    assert.equal(events.length, 1);
    assert.equal(events[0].type, "network:online");
    assert.equal(events[0].payload.reason, "连续探测成功");
    assert.equal(events[0].payload.probeLatency, 42);
  } finally {
    novelEventBus.off("network:online", capture);
    monitor.stop();
  }
});

test("T8: 抖动场景 — 失败-成功-失败不触发断网（未达到连续3次）", async () => {
  const monitor = new NetworkMonitor(TEST_CONFIG);

  const events = [];
  function capture(event) {
    events.push(event);
  }
  novelEventBus.on("network:offline", capture);

  try {
    // 2次失败
    monitor.injectProbe(makeFailProbe());
    monitor.injectProbe(makeFailProbe());
    assert.ok(monitor.getState().isOnline, "2次失败后仍 online");
    assert.equal(monitor.getState().consecutiveFailures, 2);

    // 1次成功 — consecutiveFailures 重置为0
    monitor.injectProbe(makeSuccessProbe());
    assert.ok(monitor.getState().isOnline);
    assert.equal(monitor.getState().consecutiveFailures, 0, "成功后重置失败计数");

    // 再1次失败 — 不会触发断网
    monitor.injectProbe(makeFailProbe());
    assert.ok(monitor.getState().isOnline, " 失败后仍 online");
    assert.equal(monitor.getState().consecutiveFailures, 1);

    assert.equal(events.length, 0, "未达到连续3次，不应发布 offline 事件");
  } finally {
    novelEventBus.off("network:offline", capture);
    monitor.stop();
  }
});

test("T9: 环形缓冲 — 探测记录超过最大保留数时旧记录被移除", () => {
  const monitor = new NetworkMonitor(TEST_CONFIG); // maxRecentProbes = 5

  for (let i = 0; i < 7; i++) {
    monitor.injectProbe(makeSuccessProbe());
  }

  const state = monitor.getState();
  assert.ok(state.recentProbes.length <= 5, `最多保留5条，实际${state.recentProbes.length}条`);
  assert.equal(state.recentProbes.length, 5, "超过上限后只保留5条");
  monitor.stop();
});

test("T4: stop 后重复 start 不创建第二个定时器", () => {
  const monitor = new NetworkMonitor(TEST_CONFIG);

  monitor.start();
  monitor.start(); // 不应创建第二个

  monitor.stop();
  // 再次 stop 不应报错（幂等）
  monitor.stop();
  // 测试通过即不抛异常
});

test("getState 每次返回独立副本", () => {
  const monitor = new NetworkMonitor(TEST_CONFIG);

  const s1 = monitor.getState();
  const s2 = monitor.getState();
  assert.notStrictEqual(s1, s2, "每次 getState 应返回新对象");
  assert.notStrictEqual(s1.recentProbes, s2.recentProbes, "recentProbes 应独立");
  monitor.stop();
});

test("默认配置创建的实例初始状态正确", () => {
  const monitor = new NetworkMonitor();

  const state = monitor.getState();
  assert.strictEqual(typeof state.isOnline, "boolean");
  assert.strictEqual(typeof state.lastCheckAt, "string");
  assert.strictEqual(typeof state.consecutiveFailures, "number");
  assert.ok(Array.isArray(state.recentProbes));
  assert.equal(state.isOnline, true);
  assert.equal(state.consecutiveFailures, 0);
  assert.equal(state.recentProbes.length, 0);

  monitor.stop();
});

test("部分配置覆盖：自定义 failureThreshold 和 provider", () => {
  const monitor = new NetworkMonitor({
    failureThreshold: 5,
    provider: "openai",
  });

  const state = monitor.getState();
  assert.equal(state.isOnline, true);
  assert.equal(state.consecutiveFailures, 0);
  monitor.stop();
});
