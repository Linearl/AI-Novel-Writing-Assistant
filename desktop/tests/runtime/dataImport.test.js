const test = require("node:test");
const assert = require("node:assert/strict");

// Set paths module dependency before requiring dataImport.
process.env.AI_NOVEL_APP_DATA_DIR = "/tmp/ai-novel-desktop-test";

const {
  extractPendingDatabaseImportPath,
  createDatabaseImportRelaunchArgs,
  createSanitizedRelaunchArgs,
} = require("../../dist/runtime/dataImport.js");

// ---------- extractPendingDatabaseImportPath ----------

test("extractPendingDatabaseImportPath returns null when no import arg present", () => {
  const result = extractPendingDatabaseImportPath(["node", "main.js"]);
  assert.equal(result, null);
});

test("extractPendingDatabaseImportPath extracts path from --ai-novel-import-db= arg", () => {
  const result = extractPendingDatabaseImportPath([
    "node",
    "main.js",
    "--ai-novel-import-db=/path/to/db.sqlite",
  ]);
  assert.ok(result !== null);
  // The path should be resolved to an absolute path.
  assert.ok(result.includes("path"));
  assert.ok(result.endsWith("db.sqlite"));
});

test("extractPendingDatabaseImportPath normalizes whitespace in path", () => {
  const result = extractPendingDatabaseImportPath([
    "node",
    "main.js",
    "--ai-novel-import-db=  /spaced/path/db.sqlite  ",
  ]);
  assert.ok(result !== null);
  assert.ok(result.endsWith("db.sqlite"));
  // Whitespace should be trimmed.
  assert.ok(!result.includes("  "));
});

test("extractPendingDatabaseImportPath returns null for empty path after prefix", () => {
  const result = extractPendingDatabaseImportPath([
    "node",
    "main.js",
    "--ai-novel-import-db=",
  ]);
  assert.equal(result, null);
});

test("extractPendingDatabaseImportPath returns null for whitespace-only path", () => {
  const result = extractPendingDatabaseImportPath([
    "node",
    "main.js",
    "--ai-novel-import-db=   ",
  ]);
  assert.equal(result, null);
});

test("extractPendingDatabaseImportPath ignores other --args", () => {
  const result = extractPendingDatabaseImportPath([
    "node",
    "main.js",
    "--some-other-flag",
    "--port=3000",
  ]);
  assert.equal(result, null);
});

test("extractPendingDatabaseImportPath uses first matching arg only", () => {
  const result = extractPendingDatabaseImportPath([
    "node",
    "main.js",
    "--ai-novel-import-db=/first/path.db",
    "--ai-novel-import-db=/second/path.db",
  ]);
  assert.ok(result !== null);
  assert.ok(result.endsWith("path.db"));
});

// ---------- createDatabaseImportRelaunchArgs ----------

test("createDatabaseImportRelaunchArgs appends import arg to args", () => {
  const result = createDatabaseImportRelaunchArgs("/source/db.sqlite", [
    "node",
    "main.js",
  ]);
  assert.ok(Array.isArray(result));
  assert.ok(result.some((arg) => arg.startsWith("--ai-novel-import-db=")));
  const importArg = result.find((arg) => arg.startsWith("--ai-novel-import-db="));
  assert.ok(importArg.endsWith("db.sqlite"));
});

test("createDatabaseImportRelaunchArgs strips existing import arg from argv", () => {
  const result = createDatabaseImportRelaunchArgs("/new/source.db", [
    "node",
    "main.js",
    "--ai-novel-import-db=/old/source.db",
  ]);
  // Should not contain the old import path.
  const importArgs = result.filter((arg) => arg.startsWith("--ai-novel-import-db="));
  assert.equal(importArgs.length, 1);
  assert.ok(importArgs[0].endsWith("source.db"));
  // The new source should be in the result.
  assert.ok(result.some((arg) => arg.includes("new")));
});

test("createDatabaseImportRelaunchArgs preserves other args", () => {
  const result = createDatabaseImportRelaunchArgs("/db.sqlite", [
    "node",
    "main.js",
    "--port=3000",
    "--verbose",
  ]);
  assert.ok(result.includes("--port=3000"));
  assert.ok(result.includes("--verbose"));
});

test("createDatabaseImportRelaunchArgs skips process.execPath (argv[0])", () => {
  const result = createDatabaseImportRelaunchArgs("/db.sqlite", [
    "node",
    "main.js",
    "--port=3000",
  ]);
  // slice(1) skips argv[0] (process.execPath). "main.js" is the entry script arg.
  assert.ok(!result.includes("node"));
  assert.ok(result.includes("main.js"));
  assert.ok(result.includes("--port=3000"));
});

// ---------- createSanitizedRelaunchArgs ----------

test("createSanitizedRelaunchArgs strips import arg from argv", () => {
  const result = createSanitizedRelaunchArgs([
    "node",
    "main.js",
    "--ai-novel-import-db=/db.sqlite",
    "--port=3000",
  ]);
  assert.ok(!result.some((arg) => arg.startsWith("--ai-novel-import-db=")));
  assert.ok(result.includes("--port=3000"));
});

test("createSanitizedRelaunchArgs returns all non-import args when no import arg present", () => {
  const result = createSanitizedRelaunchArgs(["node", "main.js", "--port=3000"]);
  // slice(1) skips argv[0] (process.execPath). Result includes "main.js".
  assert.deepEqual(result, ["main.js", "--port=3000"]);
});

test("createSanitizedRelaunchArgs strips multiple import args", () => {
  const result = createSanitizedRelaunchArgs([
    "node",
    "main.js",
    "--ai-novel-import-db=/a.db",
    "--port=3000",
    "--ai-novel-import-db=/b.db",
  ]);
  assert.equal(result.length, 2);
  assert.ok(result.includes("main.js"));
  assert.ok(result.includes("--port=3000"));
});

test("createSanitizedRelaunchArgs handles minimal argv (only execPath)", () => {
  const result = createSanitizedRelaunchArgs(["node"]);
  assert.deepEqual(result, []);
});

test("createSanitizedRelaunchArgs handles argv with only entry script", () => {
  const result = createSanitizedRelaunchArgs(["node", "main.js"]);
  assert.deepEqual(result, ["main.js"]);
});
