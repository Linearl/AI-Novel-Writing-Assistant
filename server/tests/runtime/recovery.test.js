const test = require("node:test");
const assert = require("node:assert/strict");
const {
  determineRecoveryAction,
  createRecoveryState,
  buildRecoveryMessage,
  REMIND_PROMPT,
  REPLAN_PROMPT,
  RECOVERY_REMIND,
  RECOVERY_REPLAN,
  RECOVERY_STOP,
} = require("../../dist/llm/repetition/recovery.js");

// ---- Escalation logic ----

test("first warning triggers REMIND", () => {
  const state = createRecoveryState();
  const result = determineRecoveryAction(state, "warning");
  assert.equal(result.action, RECOVERY_REMIND);
  assert.equal(result.state.escalationCount, 1);
});

test("second consecutive warning triggers REPLAN", () => {
  const state1 = createRecoveryState();
  const r1 = determineRecoveryAction(state1, "warning");
  const r2 = determineRecoveryAction(r1.state, "warning");
  assert.equal(r2.action, RECOVERY_REPLAN);
  assert.equal(r2.state.escalationCount, 2);
});

test("fourth consecutive warning triggers STOP", () => {
  let state = createRecoveryState();
  for (let i = 0; i < 3; i++) {
    state = determineRecoveryAction(state, "warning").state;
  }
  const result = determineRecoveryAction(state, "warning");
  assert.equal(result.action, RECOVERY_STOP);
  assert.equal(result.state.escalationCount, 4);
});

test("severity none resets escalation", () => {
  let state = createRecoveryState();
  // Build up 3 escalations
  for (let i = 0; i < 3; i++) {
    state = determineRecoveryAction(state, "warning").state;
  }
  assert.equal(state.escalationCount, 3);

  // Now a "none" resets
  const reset = determineRecoveryAction(state, "none");
  assert.equal(reset.state.escalationCount, 0);
  assert.equal(reset.state.lastAction, null);
});

test("critical severity escalates like warning", () => {
  const state = createRecoveryState();
  const result = determineRecoveryAction(state, "critical");
  assert.equal(result.action, RECOVERY_REMIND);
  assert.equal(result.state.escalationCount, 1);
});

test("critical after warning escalates faster", () => {
  const state = createRecoveryState();
  const r1 = determineRecoveryAction(state, "warning");
  const r2 = determineRecoveryAction(r1.state, "critical");
  assert.equal(r2.action, RECOVERY_REPLAN);
});

// ---- Custom thresholds ----

test("custom config with lower replanAfter", () => {
  const state = createRecoveryState();
  const result = determineRecoveryAction(state, "warning", { replanAfter: 1, stopAfter: 5 });
  assert.equal(result.action, RECOVERY_REPLAN);
});

// ---- buildRecoveryMessage ----

test("buildRecoveryMessage returns correct prompts", () => {
  assert.equal(buildRecoveryMessage(RECOVERY_REMIND), REMIND_PROMPT);
  assert.equal(buildRecoveryMessage(RECOVERY_REPLAN), REPLAN_PROMPT);
  assert.equal(buildRecoveryMessage(RECOVERY_STOP), "Repetition loop detected. Generation stopped.");
});

// ---- createRecoveryState ----

test("createRecoveryState returns initial state", () => {
  const state = createRecoveryState();
  assert.equal(state.escalationCount, 0);
  assert.equal(state.lastAction, null);
});
