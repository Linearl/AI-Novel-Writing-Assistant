const assert = require("node:assert/strict");
const test = require("node:test");
const { writeFile, readdir, readFile, utimes } = require("node:fs/promises");
const { join } = require("node:path");
const { mkdtempSync } = require("node:fs");
const { tmpdir } = require("node:os");

const {
  saveDirectorDebugLog,
  saveDirectorDebugBrief,
  saveDirectorDebugDetail,
  enforceRetention,
} = require("../dist/services/novel/director/debug/directorDebugLogger.js");

const {
  isDirectorDebugLogEnabled,
  getDirectorDebugDetailLevel,
  getDirectorDebugRetentionHours,
} = require("../dist/config/directorDebug.js");

// ============================================================
// REQ-2021 原有测试
// ============================================================

function makeEntry(overrides = {}) {
  return {
    timestamp: "2026-06-28T10:30:00.000Z",
    taskId: "task-abc123",
    novelId: "novel-xyz",
    chapterId: "chapter-001",
    autoExecution: { isBackgroundRunning: false, nextChapterId: "chapter-001" },
    circuitBreaker: { status: "open", reason: "auto_repair_exhausted" },
    recentLlmUsage: [],
    errorStack: null,
    config: { patchFailureOpenAt: 3 },
    ...overrides,
  };
}

test("isDirectorDebugLogEnabled: returns true when env is unset", () => {
  const original = process.env.DIRECTOR_DEBUG_LOG_ENABLED;
  delete process.env.DIRECTOR_DEBUG_LOG_ENABLED;
  assert.equal(isDirectorDebugLogEnabled(), true);
  if (original !== undefined) process.env.DIRECTOR_DEBUG_LOG_ENABLED = original;
});

test("isDirectorDebugLogEnabled: returns true for 'true' and '1'", () => {
  const original = process.env.DIRECTOR_DEBUG_LOG_ENABLED;
  process.env.DIRECTOR_DEBUG_LOG_ENABLED = "true";
  assert.equal(isDirectorDebugLogEnabled(), true);
  process.env.DIRECTOR_DEBUG_LOG_ENABLED = "1";
  assert.equal(isDirectorDebugLogEnabled(), true);
  process.env.DIRECTOR_DEBUG_LOG_ENABLED = "TRUE";
  assert.equal(isDirectorDebugLogEnabled(), true);
  if (original !== undefined) process.env.DIRECTOR_DEBUG_LOG_ENABLED = original;
  else delete process.env.DIRECTOR_DEBUG_LOG_ENABLED;
});

test("isDirectorDebugLogEnabled: returns false for 'false' and '0'", () => {
  const original = process.env.DIRECTOR_DEBUG_LOG_ENABLED;
  process.env.DIRECTOR_DEBUG_LOG_ENABLED = "false";
  assert.equal(isDirectorDebugLogEnabled(), false);
  process.env.DIRECTOR_DEBUG_LOG_ENABLED = "0";
  assert.equal(isDirectorDebugLogEnabled(), false);
  if (original !== undefined) process.env.DIRECTOR_DEBUG_LOG_ENABLED = original;
  else delete process.env.DIRECTOR_DEBUG_LOG_ENABLED;
});

test("saveDirectorDebugLog: creates JSON file with all expected fields", async () => {
  const logDir = mkdtempSync(join(tmpdir(), "debug-log-test-"));
  const entry = makeEntry();
  await saveDirectorDebugLog(entry, logDir);
  const files = await readdir(logDir);
  assert.equal(files.length, 1);
  assert.ok(files[0].startsWith("2026-06-28T10-30-00-000Z_task-abc123"));
  assert.ok(files[0].endsWith(".json"));
  const content = JSON.parse(await readFile(join(logDir, files[0]), "utf-8"));
  assert.equal(content.timestamp, "2026-06-28T10:30:00.000Z");
  assert.equal(content.taskId, "task-abc123");
  assert.equal(content.novelId, "novel-xyz");
  assert.equal(content.chapterId, "chapter-001");
  assert.deepEqual(content.recentLlmUsage, []);
  assert.equal(content.errorStack, null);
});

test("saveDirectorDebugLog: auto-creates directory if it does not exist", async () => {
  const logDir = join(tmpdir(), `debug-log-nested-${Date.now()}-sub/dir`);
  const entry = makeEntry();
  await saveDirectorDebugLog(entry, logDir);
  const files = await readdir(logDir);
  assert.equal(files.length, 1);
});

test("saveDirectorDebugLog: enforces max 100 files by deleting oldest", async () => {
  const logDir = mkdtempSync(join(tmpdir(), "debug-log-cleanup-test-"));
  for (let i = 0; i < 102; i++) {
    const ts = `2026-06-28T${String(i).padStart(2, "0")}-00-00.000Z`;
    const filename = `${ts.replace(/[:.]/g, "-")}_task-${String(i).padStart(3, "0")}.json`;
    await writeFile(join(logDir, filename), "{}", "utf-8");
  }
  const entry = makeEntry({ timestamp: "2026-06-28T99:00:00.000Z", taskId: "task-trigger" });
  await saveDirectorDebugLog(entry, logDir);
  const files = await readdir(logDir);
  assert.equal(files.length, 100);
  assert.ok(!files.includes("2026-06-28T00-00-00.000Z_task-000.json"));
});

test("saveDirectorDebugLog: silent on write failure (no throw)", async () => {
  const logDir = join(tmpdir(), `debug-log-fail-${Date.now()}`);
  const entry = makeEntry();
  await saveDirectorDebugLog(entry, logDir + "/../nonexistent-root-does-not-exist");
});

// ============================================================
// REQ-2022 新增测试：配置模块
// ============================================================

test("getDirectorDebugDetailLevel: 默认值为 standard", () => {
  const original = process.env.DIRECTOR_DEBUG_LOG_DETAIL_LEVEL;
  delete process.env.DIRECTOR_DEBUG_LOG_DETAIL_LEVEL;
  assert.equal(getDirectorDebugDetailLevel(), "standard");
  if (original !== undefined) process.env.DIRECTOR_DEBUG_LOG_DETAIL_LEVEL = original;
});

test("getDirectorDebugDetailLevel: 支持 minimal 和 verbose", () => {
  const original = process.env.DIRECTOR_DEBUG_LOG_DETAIL_LEVEL;
  process.env.DIRECTOR_DEBUG_LOG_DETAIL_LEVEL = "minimal";
  assert.equal(getDirectorDebugDetailLevel(), "minimal");
  process.env.DIRECTOR_DEBUG_LOG_DETAIL_LEVEL = "verbose";
  assert.equal(getDirectorDebugDetailLevel(), "verbose");
  process.env.DIRECTOR_DEBUG_LOG_DETAIL_LEVEL = "invalid";
  assert.equal(getDirectorDebugDetailLevel(), "standard");
  if (original !== undefined) process.env.DIRECTOR_DEBUG_LOG_DETAIL_LEVEL = original;
  else delete process.env.DIRECTOR_DEBUG_LOG_DETAIL_LEVEL;
});

test("getDirectorDebugRetentionHours: 默认值为 168（7 天）", () => {
  const original = process.env.DIRECTOR_DEBUG_LOG_RETENTION_HOURS;
  delete process.env.DIRECTOR_DEBUG_LOG_RETENTION_HOURS;
  assert.equal(getDirectorDebugRetentionHours(), 168);
  if (original !== undefined) process.env.DIRECTOR_DEBUG_LOG_RETENTION_HOURS = original;
});

test("getDirectorDebugRetentionHours: 解析正整数", () => {
  const original = process.env.DIRECTOR_DEBUG_LOG_RETENTION_HOURS;
  process.env.DIRECTOR_DEBUG_LOG_RETENTION_HOURS = "24";
  assert.equal(getDirectorDebugRetentionHours(), 24);
  process.env.DIRECTOR_DEBUG_LOG_RETENTION_HOURS = "abc";
  assert.equal(getDirectorDebugRetentionHours(), 168);
  process.env.DIRECTOR_DEBUG_LOG_RETENTION_HOURS = "-5";
  assert.equal(getDirectorDebugRetentionHours(), 168);
  if (original !== undefined) process.env.DIRECTOR_DEBUG_LOG_RETENTION_HOURS = original;
  else delete process.env.DIRECTOR_DEBUG_LOG_RETENTION_HOURS;
});

// ============================================================
// REQ-2022 新增测试：文件分离
// ============================================================

function makeBriefEntry(overrides = {}) {
  return {
    timestamp: "2026-06-28T10:30:00.000Z",
    taskId: "task-xyz789",
    novelId: "novel-abc",
    chapterId: "chapter-001",
    autoExecution: { isBackgroundRunning: false },
    circuitBreaker: { status: "open" },
    recentLlmUsage: [],
    errorStack: null,
    config: {},
    detailLevel: "standard",
    summary: {
      totalLlmCalls: 5,
      totalTokens: 1000,
      repairAttempts: 2,
      lastAuditPassed: false,
    },
    ...overrides,
  };
}

function makeDetailEntry(overrides = {}) {
  return {
    timestamp: "2026-06-28T10:30:00.000Z",
    taskId: "task-xyz789",
    novelId: "novel-abc",
    chapterId: "chapter-001",
    detailLevel: "standard",
    llmCallHistory: [
      {
        timestamp: "2026-06-28T10:00:00.000Z",
        prompt: "generate chapter",
        completion: "chapter content",
        toolCalls: [],
        tokenUsage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
        durationMs: 1000,
      },
    ],
    contentSnapshots: [
      {
        nodeType: "draft",
        content: "initial draft",
        reason: "initial",
        timestamp: "2026-06-28T10:00:00.000Z",
        chapterVersion: 1,
      },
    ],
    repairAttempts: [
      {
        strategy: "dialogue_fix",
        inputSummary: "before",
        outputSummary: "after",
        success: true,
        timestamp: "2026-06-28T10:01:00.000Z",
        durationMs: 500,
      },
    ],
    auditResults: [
      {
        passed: true,
        issues: [],
        timestamp: "2026-06-28T10:02:00.000Z",
        durationMs: 300,
      },
    ],
    ...overrides,
  };
}

test("saveDirectorDebugBrief: 创建简要日志并返回详细日志文件名", async () => {
  const logDir = mkdtempSync(join(tmpdir(), "debug-brief-test-"));
  const entry = makeBriefEntry();
  const detailFilename = await saveDirectorDebugBrief(entry, logDir);

  assert.ok(detailFilename.endsWith("_detail.json"));

  const files = await readdir(logDir);
  const briefFiles = files.filter((f) => f.endsWith("_brief.json"));
  assert.equal(briefFiles.length, 1);

  const content = JSON.parse(await readFile(join(logDir, briefFiles[0]), "utf-8"));
  assert.equal(content.taskId, "task-xyz789");
  assert.equal(content.detailLevel, "standard");
  assert.equal(content.detailLogPath, `./${detailFilename}`);
  assert.deepEqual(content.summary, {
    totalLlmCalls: 5,
    totalTokens: 1000,
    repairAttempts: 2,
    lastAuditPassed: false,
  });
});

test("saveDirectorDebugBrief + saveDirectorDebugDetail: 文件名一致且内容分离", async () => {
  const logDir = mkdtempSync(join(tmpdir(), "debug-split-test-"));
  const briefEntry = makeBriefEntry();
  const detailFilename = await saveDirectorDebugBrief(briefEntry, logDir);

  // 写入详细日志
  const detailEntry = makeDetailEntry({ taskId: briefEntry.taskId });
  await saveDirectorDebugDetail(detailEntry, logDir, detailFilename);

  const files = await readdir(logDir);
  assert.equal(files.length, 2);

  const briefFile = files.find((f) => f.endsWith("_brief.json"));
  const detailFile = files.find((f) => f.endsWith("_detail.json"));
  assert.ok(briefFile);
  assert.ok(detailFile);

  // 详细日志文件名与简要日志引用一致
  const briefContent = JSON.parse(await readFile(join(logDir, briefFile), "utf-8"));
  assert.equal(briefContent.detailLogPath, `./${detailFile}`);

  // 详细日志包含完整字段
  const detailContent = JSON.parse(await readFile(join(logDir, detailFile), "utf-8"));
  assert.equal(detailContent.llmCallHistory.length, 1);
  assert.equal(detailContent.contentSnapshots.length, 1);
  assert.equal(detailContent.repairAttempts.length, 1);
  assert.equal(detailContent.auditResults.length, 1);
});

test("saveDirectorDebugBrief: summary 统计信息正确写入", async () => {
  const logDir = mkdtempSync(join(tmpdir(), "debug-summary-test-"));
  const entry = makeBriefEntry({
    summary: {
      totalLlmCalls: 42,
      totalTokens: 99999,
      repairAttempts: 7,
      lastAuditPassed: true,
    },
  });
  await saveDirectorDebugBrief(entry, logDir);

  const files = await readdir(logDir);
  const content = JSON.parse(await readFile(join(logDir, files[0]), "utf-8"));
  assert.equal(content.summary.totalLlmCalls, 42);
  assert.equal(content.summary.totalTokens, 99999);
  assert.equal(content.summary.repairAttempts, 7);
  assert.equal(content.summary.lastAuditPassed, true);
});

test("saveDirectorDebugDetail: 写入指定文件名", async () => {
  const logDir = mkdtempSync(join(tmpdir(), "debug-detail-test-"));
  const entry = makeDetailEntry();
  const filename = "2026-06-28T10-30-00-000Z_task-xyz789_detail.json";
  await saveDirectorDebugDetail(entry, logDir, filename);

  const content = JSON.parse(await readFile(join(logDir, filename), "utf-8"));
  assert.equal(content.taskId, "task-xyz789");
  assert.equal(content.llmCallHistory.length, 1);
  assert.equal(content.llmCallHistory[0].prompt, "generate chapter");
});

// ============================================================
// REQ-2022 新增测试：保留时间清理
// ============================================================

test("enforceRetention: 删除超过保留时间的文件", async () => {
  const logDir = mkdtempSync(join(tmpdir(), "debug-retention-test-"));
  const original = process.env.DIRECTOR_DEBUG_LOG_RETENTION_HOURS;
  process.env.DIRECTOR_DEBUG_LOG_RETENTION_HOURS = "1"; // 1 小时

  // 创建一个"超期"文件（mtime 设为 2 小时前）
  const oldFile = "2026-01-01T00-00-00.000Z_task-old.json";
  await writeFile(join(logDir, oldFile), "{}", "utf-8");
  const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000);
  await utimes(join(logDir, oldFile), twoHoursAgo, twoHoursAgo);

  // 创建一个"新鲜"文件（mtime 为当前）
  const freshFile = "2026-06-28T10-00-00.000Z_task-fresh.json";
  await writeFile(join(logDir, freshFile), "{}", "utf-8");

  await enforceRetention(logDir);

  const remaining = await readdir(logDir);
  assert.ok(!remaining.includes(oldFile));
  assert.ok(remaining.includes(freshFile));

  if (original !== undefined) process.env.DIRECTOR_DEBUG_LOG_RETENTION_HOURS = original;
  else delete process.env.DIRECTOR_DEBUG_LOG_RETENTION_HOURS;
});

test("enforceRetention: 空目录不报错", async () => {
  const logDir = mkdtempSync(join(tmpdir(), "debug-retention-empty-"));
  await enforceRetention(logDir);
  const remaining = await readdir(logDir);
  assert.equal(remaining.length, 0);
});
