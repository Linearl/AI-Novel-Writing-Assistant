const test = require("node:test");
const assert = require("node:assert/strict");
const { tokenizeForNgram } = require("../dist/llm/repetition/tokenizer.js");
const { detectConsecutiveRepeat } = require("../dist/llm/repetition/detector.js");
const { RepetitionMonitor } = require("../dist/llm/repetition/monitor.js");

// ---- End-to-end: tokenize -> detect -> recovery ----

test("full pipeline detects CJK repetition and triggers recovery", () => {
  // Simulate LLM output that enters a loop
  const repetitiveOutput = "他走在路上，看着远方。他走在路上，看着远方。他走在路上，看着远方。";

  const tokens = tokenizeForNgram(repetitiveOutput);
  assert.ok(tokens.length > 5, "should tokenize into multiple tokens");

  const detection = detectConsecutiveRepeat(tokens, {
    warningThreshold: 3,
    maxBlockSize: 30,
    minBlockSize: 2,
  });

  assert.equal(detection.severity, "warning");
  assert.ok(detection.repeatCount >= 3);
  assert.ok(detection.blockTokens.length > 0);
});

test("streaming simulation: chunks building into repetition triggers monitor", () => {
  const monitor = new RepetitionMonitor({
    detector: { warningThreshold: 3, maxBlockSize: 30, minBlockSize: 2 },
    recovery: { replanAfter: 2, stopAfter: 10 },
    enabled: true,
  });

  // Simulate normal streaming
  const chunks1 = ["第一章", "开始。", "这是一个", "美好的", "故事。"];
  for (const chunk of chunks1) {
    const result = monitor.processChunk(chunk);
    assert.equal(result.severity, "none");
  }

  // Simulate repetitive streaming (same block 3 times)
  const repetitiveChunks = [
    "他走在路上，",
    "看着远方。",
    "他走在路上，",
    "看着远方。",
    "他走在路上，",
    "看着远方。",
  ];
  for (const chunk of repetitiveChunks) {
    monitor.processChunk(chunk);
  }

  assert.equal(monitor.shouldRecover(), true);
  assert.equal(monitor.getRecoveryAction(), "RECOVERY_REMIND");
});

test("normal output is not affected by repetition monitor", () => {
  const monitor = new RepetitionMonitor({
    detector: { warningThreshold: 3, maxBlockSize: 10, minBlockSize: 2 },
  });

  const normalChunks = [
    "第一章",
    "清晨的阳光",
    "透过窗帘",
    "照进了房间。",
    "小明慢慢醒来，",
    "伸了个懒腰。",
    "今天是新的一天，",
    "他决定去公园散步。",
  ];

  for (const chunk of normalChunks) {
    const result = monitor.processChunk(chunk);
    assert.equal(result.severity, "none");
  }
  assert.equal(monitor.shouldRecover(), false);
});

test("monitor escalation across multiple stream segments", () => {
  const monitor = new RepetitionMonitor({
    detector: { warningThreshold: 3, maxBlockSize: 20, minBlockSize: 2 },
    recovery: { replanAfter: 2, stopAfter: 3 },
  });

  // Segment 1: repetitive output -> escalation 1 -> REMIND
  const seg1 = ["你好世界", "你好世界", "你好世界"];
  for (const c of seg1) monitor.processChunk(c);
  assert.equal(monitor.getRecoveryAction(), "RECOVERY_REMIND");
  assert.equal(monitor.getEscalationCount(), 1);

  // Segment 2: new stream, same problem -> escalation 2 -> REPLAN
  monitor.reset();
  const seg2 = ["你好世界", "你好世界", "你好世界"];
  for (const c of seg2) monitor.processChunk(c);
  assert.equal(monitor.getRecoveryAction(), "RECOVERY_REPLAN");
  assert.equal(monitor.getEscalationCount(), 2);

  // Segment 3: yet again -> escalation 3 -> STOP (stopAfter: 3)
  monitor.reset();
  const seg3 = ["你好世界", "你好世界", "你好世界"];
  for (const c of seg3) monitor.processChunk(c);
  assert.equal(monitor.getRecoveryAction(), "RECOVERY_STOP");
  assert.equal(monitor.shouldStop(), true);
});

test("recovery message content varies by action level", () => {
  const monitor = new RepetitionMonitor({
    detector: { warningThreshold: 3, maxBlockSize: 20, minBlockSize: 2 },
    recovery: { replanAfter: 2, stopAfter: 5 },
  });

  // REMIND message
  monitor.processChunk("甲乙丙甲乙丙甲乙丙");
  const remindMsg = monitor.getRecoveryMessage();
  assert.ok(remindMsg.length > 0);

  // REPLAN message
  monitor.reset();
  monitor.processChunk("甲乙丙甲乙丙甲乙丙");
  const replanMsg = monitor.getRecoveryMessage();
  assert.ok(replanMsg.length > 0);
  assert.notEqual(remindMsg, replanMsg, "REPLAN message should differ from REMIND");

  // STOP message
  monitor.reset();
  monitor.processChunk("甲乙丙甲乙丙甲乙丙");
  const stopMsg = monitor.getRecoveryMessage();
  assert.ok(stopMsg.length > 0);
  assert.notEqual(stopMsg, remindMsg);
});

test("disabled monitor produces no detections", () => {
  const monitor = new RepetitionMonitor({ enabled: false });

  // Feed extremely repetitive text
  for (let i = 0; i < 10; i++) {
    const result = monitor.processChunk("你好世界");
    assert.equal(result.severity, "none");
  }
  assert.equal(monitor.shouldRecover(), false);
  assert.equal(monitor.getRecoveryAction(), null);
});

test("mixed CJK and Latin repetition is detected", () => {
  const monitor = new RepetitionMonitor({
    detector: { warningThreshold: 3, maxBlockSize: 20, minBlockSize: 2 },
  });

  // Mixed CJK+Latin repeated 3 times
  monitor.processChunk("Chapter One 开始。Chapter One 开始。Chapter One 开始。");
  assert.equal(monitor.shouldRecover(), true);
  assert.ok(monitor.getLastDetection().repeatCount >= 3);
});

test("Korean text repetition is detected", () => {
  const monitor = new RepetitionMonitor({
    detector: { warningThreshold: 3, maxBlockSize: 20, minBlockSize: 2 },
  });

  monitor.processChunk("안녕하세요世界안녕하세요世界안녕하세요世界");
  assert.equal(monitor.shouldRecover(), true);
});
