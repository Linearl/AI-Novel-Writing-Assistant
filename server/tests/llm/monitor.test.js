const test = require("node:test");
const assert = require("node:assert/strict");
const {
  RepetitionMonitor,
  createMonitorConfig,
  RECOVERY_REMIND,
  RECOVERY_REPLAN,
  RECOVERY_STOP,
} = require("../../dist/llm/repetition/monitor.js");

// ---- Basic functionality ----

test("monitor detects no repetition in normal text", () => {
  const monitor = new RepetitionMonitor();
  const result = monitor.processChunk("这是一段正常的小说文本，不会重复。");
  assert.equal(result.severity, "none");
  assert.equal(monitor.shouldRecover(), false);
  assert.equal(monitor.getRecoveryAction(), null);
});

test("monitor detects repetition when text repeats", () => {
  const monitor = new RepetitionMonitor({
    detector: { warningThreshold: 3, maxBlockSize: 5, minBlockSize: 2 },
  });
  // Feed repeated CJK text: 3 x "你好世界"
  monitor.processChunk("你好世界你好世界你好世界");
  assert.equal(monitor.shouldRecover(), true);
  assert.equal(monitor.getRecoveryAction(), RECOVERY_REMIND);
});

// ---- Recovery escalation ----

test("escalates from REMIND to REPLAN after reset+repeat cycle", () => {
  const monitor = new RepetitionMonitor({
    detector: { warningThreshold: 3, maxBlockSize: 5, minBlockSize: 2 },
    recovery: { replanAfter: 2, stopAfter: 10 },
  });
  // First detection -> REMIND (escalation 1)
  monitor.processChunk("甲乙丙甲乙丙甲乙丙");
  assert.equal(monitor.getRecoveryAction(), RECOVERY_REMIND);

  // Simulate new stream segment: reset, then repeat again
  monitor.reset();
  monitor.processChunk("甲乙丙甲乙丙甲乙丙");
  // Second escalation -> REPLAN (escalation 2)
  assert.equal(monitor.getRecoveryAction(), RECOVERY_REPLAN);
});

test("escalates to STOP after multiple reset+repeat cycles", () => {
  const monitor = new RepetitionMonitor({
    detector: { warningThreshold: 3, maxBlockSize: 5, minBlockSize: 2 },
    recovery: { replanAfter: 2, stopAfter: 3 },
  });
  // Escalation 1 -> REMIND
  monitor.processChunk("甲乙丙甲乙丙甲乙丙");
  assert.equal(monitor.getRecoveryAction(), RECOVERY_REMIND);

  // Escalation 2 -> REPLAN
  monitor.reset();
  monitor.processChunk("甲乙丙甲乙丙甲乙丙");
  assert.equal(monitor.getRecoveryAction(), RECOVERY_REPLAN);

  // Escalation 3 -> STOP
  monitor.reset();
  monitor.processChunk("甲乙丙甲乙丙甲乙丙");
  assert.equal(monitor.getRecoveryAction(), RECOVERY_STOP);
  assert.equal(monitor.shouldStop(), true);
});

// ---- shouldStop ----

test("shouldStop returns false when no recovery", () => {
  const monitor = new RepetitionMonitor();
  assert.equal(monitor.shouldStop(), false);
});

// ---- Recovery message ----

test("getRecoveryMessage returns empty when no recovery", () => {
  const monitor = new RepetitionMonitor();
  monitor.processChunk("hello");
  assert.equal(monitor.getRecoveryMessage(), "");
});

test("getRecoveryMessage returns remind message on first detection", () => {
  const monitor = new RepetitionMonitor({
    detector: { warningThreshold: 3, maxBlockSize: 5, minBlockSize: 2 },
  });
  monitor.processChunk("你好世界你好世界你好世界");
  const msg = monitor.getRecoveryMessage();
  assert.ok(msg.length > 0);
});

// ---- Reset ----

test("resetAll clears all state including escalation", () => {
  const monitor = new RepetitionMonitor({
    detector: { warningThreshold: 3, maxBlockSize: 5, minBlockSize: 2 },
  });
  monitor.processChunk("你好世界你好世界你好世界");
  assert.equal(monitor.shouldRecover(), true);

  monitor.resetAll();
  assert.equal(monitor.shouldRecover(), false);
  assert.equal(monitor.getRecoveryAction(), null);
  assert.equal(monitor.getEscalationCount(), 0);
});

// ---- Enabled flag ----

test("disabled monitor always returns none", () => {
  const monitor = new RepetitionMonitor({ enabled: false });
  assert.equal(monitor.isEnabled(), false);
  const result = monitor.processChunk("你好世界你好世界你好世界你好世界");
  assert.equal(result.severity, "none");
  assert.equal(monitor.shouldRecover(), false);
});

// ---- Config creation ----

test("createMonitorConfig merges defaults", () => {
  const config = createMonitorConfig({ enabled: false });
  assert.equal(config.enabled, false);
  assert.equal(typeof config.maxBufferTokens, "number");
  assert.ok(config.detector);
  assert.ok(config.recovery);
});

// ---- Multiple chunks building up repetition ----

test("handles streaming chunks that build up repetitive text", () => {
  const monitor = new RepetitionMonitor({
    detector: { warningThreshold: 3, maxBlockSize: 5, minBlockSize: 2 },
  });
  // Small CJK chunks that accumulate into repetition
  monitor.processChunk("你好");
  monitor.processChunk("世界");
  assert.equal(monitor.shouldRecover(), false); // One occurrence of "你好世界"

  monitor.processChunk("你好");
  monitor.processChunk("世界");
  assert.equal(monitor.shouldRecover(), false); // Two occurrences, below threshold

  monitor.processChunk("你好");
  monitor.processChunk("世界");
  // Now 3 occurrences of "你好世界" -> should detect
  assert.equal(monitor.shouldRecover(), true);
});

// ---- getLastDetection ----

test("getLastDetection returns the most recent detection result", () => {
  const monitor = new RepetitionMonitor();
  assert.equal(monitor.getLastDetection(), null);

  monitor.processChunk("unique text");
  const det = monitor.getLastDetection();
  assert.ok(det !== null);
  assert.equal(det.severity, "none");
});

// ---- Escalation count ----

test("getEscalationCount tracks progression across reset cycles", () => {
  const monitor = new RepetitionMonitor({
    detector: { warningThreshold: 3, maxBlockSize: 5, minBlockSize: 2 },
    recovery: { replanAfter: 10, stopAfter: 20 },
  });
  assert.equal(monitor.getEscalationCount(), 0);

  monitor.processChunk("甲乙甲乙甲乙");
  assert.equal(monitor.getEscalationCount(), 1);

  // Reset + repeat -> escalation count increases
  monitor.reset();
  monitor.processChunk("甲乙甲乙甲乙");
  assert.equal(monitor.getEscalationCount(), 2);
});

// ---- Persistent detection does not double-escalate ----

test("persistent detection across chunks does not double-escalate", () => {
  const monitor = new RepetitionMonitor({
    detector: { warningThreshold: 3, maxBlockSize: 5, minBlockSize: 2 },
    recovery: { replanAfter: 2, stopAfter: 10 },
  });
  monitor.processChunk("你好世界你好世界你好世界");
  assert.equal(monitor.getEscalationCount(), 1);

  // More of the same: detection persists but should NOT escalate again
  monitor.processChunk("你好世界你好世界你好世界");
  assert.equal(monitor.getEscalationCount(), 1);
  assert.equal(monitor.getRecoveryAction(), RECOVERY_REMIND);
});
