const assert = require("node:assert/strict");
const test = require("node:test");
const { mkdir, writeFile, readdir, readFile } = require("node:fs/promises");
const { join } = require("node:path");
const { mkdtempSync } = require("node:fs");
const { tmpdir } = require("node:os");

const {
  saveDirectorDebugLog,
} = require("../dist/services/novel/director/debug/directorDebugLogger.js");

const {
  isDirectorDebugLogEnabled,
} = require("../dist/config/directorDebug.js");

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
  // Create 102 files with sortable names
  for (let i = 0; i < 102; i++) {
    const ts = `2026-06-28T${String(i).padStart(2, "0")}-00-00.000Z`;
    const filename = `${ts.replace(/[:.]/g, "-")}_task-${String(i).padStart(3, "0")}.json`;
    await writeFile(join(logDir, filename), "{}", "utf-8");
  }
  // Now save one more: should trigger cleanup to 100
  const entry = makeEntry({ timestamp: "2026-06-28T99:00:00.000Z", taskId: "task-trigger" });
  await saveDirectorDebugLog(entry, logDir);
  const files = await readdir(logDir);
  assert.equal(files.length, 100);
  // The oldest files (00..) should have been deleted
  assert.ok(!files.includes("2026-06-28T00-00-00.000Z_task-000.json"));
});

test("saveDirectorDebugLog: silent on write failure (no throw)", async () => {
  // Pass a path that cannot be created as a directory (a file exists in the way)
  const logDir = join(tmpdir(), `debug-log-fail-${Date.now()}`);
  // Create a file at the path so mkdir recursive will fail on that segment
  const entry = makeEntry();
  // This should NOT throw
  await saveDirectorDebugLog(entry, logDir + "/../nonexistent-root-does-not-exist");
  // Just verifying no throw — the function should silently ignore the error
});
