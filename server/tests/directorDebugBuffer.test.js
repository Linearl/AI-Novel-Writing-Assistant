const assert = require("node:assert/strict");
const test = require("node:test");

const {
  directorDebugBuffer,
} = require("../dist/services/novel/director/debug/directorDebugBuffer.js");

/** Helper: 构造一条 LLM 调用记录 */
function makeLlmCall(overrides = {}) {
  return {
    timestamp: "2026-06-28T10:00:00.000Z",
    prompt: "test prompt",
    completion: "test completion",
    toolCalls: [],
    tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    durationMs: 1000,
    ...overrides,
  };
}

/** Helper: 构造一条内容快照 */
function makeContentSnapshot(overrides = {}) {
  return {
    nodeType: "draft",
    content: "chapter content",
    reason: "initial generation",
    timestamp: "2026-06-28T10:00:00.000Z",
    chapterVersion: 1,
    ...overrides,
  };
}

/** Helper: 构造一条修复尝试 */
function makeRepairAttempt(overrides = {}) {
  return {
    strategy: "dialogue_fix",
    inputSummary: "before",
    outputSummary: "after",
    success: true,
    timestamp: "2026-06-28T10:00:00.000Z",
    durationMs: 2000,
    ...overrides,
  };
}

/** Helper: 构造一条审计结果 */
function makeAuditResult(overrides = {}) {
  return {
    passed: false,
    issues: [{ code: "ERR1", message: "issue", severity: "error" }],
    timestamp: "2026-06-28T10:00:00.000Z",
    durationMs: 500,
    ...overrides,
  };
}

// ---- 基本记录与 flush ----

test("recordLlmCall + flush: 基本路径", () => {
  const buf = directorDebugBuffer;
  const taskId = "task-test-1";

  buf.recordLlmCall(taskId, makeLlmCall());
  buf.recordContentSnapshot(taskId, makeContentSnapshot());
  buf.recordRepairAttempt(taskId, makeRepairAttempt());
  buf.recordAuditResult(taskId, makeAuditResult());

  const snapshot = buf.flush(taskId);
  assert.ok(snapshot);
  assert.equal(snapshot.llmCalls.length, 1);
  assert.equal(snapshot.contentSnapshots.length, 1);
  assert.equal(snapshot.repairAttempts.length, 1);
  assert.equal(snapshot.auditResults.length, 1);
});

// ---- flush 后清空 ----

test("flush: 提取后缓冲区清空", () => {
  const buf = directorDebugBuffer;
  const taskId = "task-test-2";

  buf.recordLlmCall(taskId, makeLlmCall());
  buf.flush(taskId);

  const second = buf.flush(taskId);
  assert.equal(second, null);
});

// ---- 无数据时 flush 返回 null ----

test("flush: 无数据时返回 null", () => {
  const buf = directorDebugBuffer;
  const result = buf.flush("nonexistent-task");
  assert.equal(result, null);
});

// ---- discardOnSuccess 清空 ----

test("discardOnSuccess: 清空指定 taskId 缓冲", () => {
  const buf = directorDebugBuffer;
  const taskId = "task-test-discard";

  buf.recordLlmCall(taskId, makeLlmCall());
  buf.discardOnSuccess(taskId);

  const result = buf.flush(taskId);
  assert.equal(result, null);
});

// ---- 多 taskId 隔离 ----

test("多 taskId: 缓冲区按 taskId 隔离", () => {
  const buf = directorDebugBuffer;
  const taskA = "task-isolated-A";
  const taskB = "task-isolated-B";

  buf.recordLlmCall(taskA, makeLlmCall());
  buf.recordLlmCall(taskB, makeLlmCall({ prompt: "task B prompt" }));
  buf.recordLlmCall(taskB, makeLlmCall({ prompt: "task B prompt 2" }));

  const snapA = buf.flush(taskA);
  const snapB = buf.flush(taskB);

  assert.ok(snapA);
  assert.equal(snapA.llmCalls.length, 1);
  assert.equal(snapA.llmCalls[0].prompt, "test prompt");

  assert.ok(snapB);
  assert.equal(snapB.llmCalls.length, 2);
  assert.equal(snapB.llmCalls[0].prompt, "task B prompt");
});

// ---- 环形缓冲区溢出 ----

test("recordLlmCall: 超过 50 条时丢弃最早记录", () => {
  const buf = directorDebugBuffer;
  const taskId = "task-ring-buffer";

  for (let i = 0; i < 55; i++) {
    buf.recordLlmCall(taskId, makeLlmCall({
      prompt: `prompt-${i}`,
      tokenUsage: { promptTokens: i, completionTokens: i, totalTokens: i * 2 },
    }));
  }

  const snapshot = buf.flush(taskId);
  assert.ok(snapshot);
  assert.equal(snapshot.llmCalls.length, 50);
  // 最早的 5 条 (0-4) 应该被丢弃，第一条应该是 prompt-5
  assert.equal(snapshot.llmCalls[0].prompt, "prompt-5");
  assert.equal(snapshot.llmCalls[49].prompt, "prompt-54");
});

// ---- flush 副本隔离 ----

test("flush: 返回的是副本，不影响后续操作", () => {
  const buf = directorDebugBuffer;
  const taskId = "task-snapshot-isolation";

  buf.recordLlmCall(taskId, makeLlmCall({ prompt: "first" }));
  const snap = buf.flush(taskId);

  // 修改原始快照不影响缓冲区（因为已 flush 清空）
  snap.llmCalls[0].prompt = "mutated";

  buf.recordLlmCall(taskId, makeLlmCall({ prompt: "second" }));
  const snap2 = buf.flush(taskId);

  assert.ok(snap2);
  assert.equal(snap2.llmCalls.length, 1);
  assert.equal(snap2.llmCalls[0].prompt, "second");
});
