const test = require("node:test");
const assert = require("node:assert/strict");
const {
  loadRepetitionEnvConfig,
  buildMonitorConfigFromEnv,
} = require("../../dist/llm/repetition/config.js");

// ---- loadRepetitionEnvConfig ----

test("loadRepetitionEnvConfig uses sensible defaults", () => {
  const original = { ...process.env };
  // Clear any existing repetition env vars
  delete process.env.REPETITION_DETECTION_ENABLED;
  delete process.env.LOOP_DETECTOR_ENABLED;
  delete process.env.REPETITION_WINDOW_SIZE;
  delete process.env.REPETITION_THRESHOLD;
  delete process.env.REPETITION_RECOVERY_ENABLED;

  const config = loadRepetitionEnvConfig();
  assert.equal(config.enabled, true);
  assert.equal(config.windowSize, 200);
  assert.equal(config.threshold, 3);
  assert.equal(config.recoveryEnabled, true);

  // Restore env
  for (const [k, v] of Object.entries(original)) {
    process.env[k] = v;
  }
});

test("loadRepetitionEnvConfig reads env vars", () => {
  const original = { ...process.env };
  process.env.REPETITION_WINDOW_SIZE = "500";
  process.env.REPETITION_THRESHOLD = "5";
  process.env.REPETITION_RECOVERY_ENABLED = "false";

  const config = loadRepetitionEnvConfig();
  assert.equal(config.windowSize, 500);
  assert.equal(config.threshold, 5);
  assert.equal(config.recoveryEnabled, false);

  for (const [k, v] of Object.entries(original)) {
    process.env[k] = v;
  }
});

test("REPETITION_DETECTION_ENABLED=false disables detection", () => {
  const original = { ...process.env };
  process.env.REPETITION_DETECTION_ENABLED = "false";

  const config = loadRepetitionEnvConfig();
  assert.equal(config.enabled, false);

  for (const [k, v] of Object.entries(original)) {
    process.env[k] = v;
  }
});

test("LOOP_DETECTOR_ENABLED=false disables detection (backward compat)", () => {
  const original = { ...process.env };
  delete process.env.REPETITION_DETECTION_ENABLED;
  process.env.LOOP_DETECTOR_ENABLED = "false";

  const config = loadRepetitionEnvConfig();
  assert.equal(config.enabled, false);

  for (const [k, v] of Object.entries(original)) {
    process.env[k] = v;
  }
});

// ---- buildMonitorConfigFromEnv ----

test("buildMonitorConfigFromEnv returns monitor-ready config", () => {
  const original = { ...process.env };
  delete process.env.REPETITION_DETECTION_ENABLED;
  delete process.env.LOOP_DETECTOR_ENABLED;
  delete process.env.REPETITION_WINDOW_SIZE;
  delete process.env.REPETITION_THRESHOLD;
  delete process.env.REPETITION_RECOVERY_ENABLED;

  const config = buildMonitorConfigFromEnv();
  assert.equal(config.enabled, true);
  assert.ok(config.detector);
  assert.equal(config.detector?.warningThreshold, 3);
  assert.equal(config.detector?.criticalThreshold, 5);
  assert.ok(config.maxBufferTokens && config.maxBufferTokens >= 2000);

  for (const [k, v] of Object.entries(original)) {
    process.env[k] = v;
  }
});

test("buildMonitorConfigFromEnv with recovery disabled produces disabled monitor", () => {
  const original = { ...process.env };
  process.env.REPETITION_RECOVERY_ENABLED = "false";

  const config = buildMonitorConfigFromEnv();
  assert.equal(config.enabled, false);

  for (const [k, v] of Object.entries(original)) {
    process.env[k] = v;
  }
});
