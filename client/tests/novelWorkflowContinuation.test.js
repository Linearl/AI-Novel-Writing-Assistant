import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveWorkflowContinuationFeedback,
  resolveDirectorContinueMode,
} from "../src/lib/novelWorkflowContinuation.ts";

// ---------------------------------------------------------------------------
// resolveWorkflowContinuationFeedback
// ---------------------------------------------------------------------------

test("returns error tone with failureSummary when task has failed status", () => {
  const task = {
    kind: "director_command",
    status: "failed",
    failureSummary: "Quality below threshold",
    blockingReason: null,
    lastError: null,
  };
  const result = resolveWorkflowContinuationFeedback(task);
  assert.equal(result.tone, "error");
  assert.equal(result.message, "Quality below threshold");
});

test("falls back to blockingReason when failureSummary is empty", () => {
  const task = {
    kind: "director_command",
    status: "failed",
    failureSummary: "",
    blockingReason: "World constraint conflict",
    lastError: null,
  };
  const result = resolveWorkflowContinuationFeedback(task);
  assert.equal(result.tone, "error");
  assert.equal(result.message, "World constraint conflict");
});

test("falls back to lastError when failureSummary and blockingReason are empty", () => {
  const task = {
    kind: "director_command",
    status: "failed",
    failureSummary: "",
    blockingReason: "",
    lastError: "Network timeout",
  };
  const result = resolveWorkflowContinuationFeedback(task);
  assert.equal(result.tone, "error");
  assert.equal(result.message, "Network timeout");
});

test("returns success tone for non-failed task with auto_execute_range mode", () => {
  const result = resolveWorkflowContinuationFeedback(
    { kind: "director_command", status: "queued", failureSummary: null, blockingReason: null, lastError: null },
    { mode: "auto_execute_range", scopeLabel: "第5-10章" },
  );
  assert.equal(result.tone, "success");
  assert.equal(result.message, "已继续自动执行第5-10章。");
});

test("returns success tone with skip_quality_repair message", () => {
  const result = resolveWorkflowContinuationFeedback(
    { kind: "director_command", status: "queued", failureSummary: null, blockingReason: null, lastError: null },
    { mode: "skip_quality_repair" },
  );
  assert.equal(result.tone, "success");
  assert.match(result.message, /已跳过本次质量建议/);
});

test("uses executionScopeLabel from task when no option scopeLabel", () => {
  const task = {
    kind: "director_command",
    status: "queued",
    executionScopeLabel: "第1-3章",
    failureSummary: null,
    blockingReason: null,
    lastError: null,
  };
  const result = resolveWorkflowContinuationFeedback(task, { mode: "auto_execute_range" });
  assert.equal(result.message, "已继续自动执行第1-3章。");
});

test("returns null/undefined task as success with default scope", () => {
  const result = resolveWorkflowContinuationFeedback(null);
  assert.equal(result.tone, "success");
  assert.match(result.message, /自动导演已继续推进/);
});

// ---------------------------------------------------------------------------
// resolveDirectorContinueMode
// ---------------------------------------------------------------------------

test("returns resume when task has pendingManualRecovery", () => {
  const task = { pendingManualRecovery: true, checkpointType: "chapter_batch_ready", currentItemKey: null, currentStage: null };
  assert.equal(resolveDirectorContinueMode(task), "resume");
});

test("returns skip_quality_repair when checkpointType is replan_required", () => {
  const task = { pendingManualRecovery: false, checkpointType: "replan_required", currentItemKey: null, currentStage: null };
  assert.equal(resolveDirectorContinueMode(task), "skip_quality_repair");
});

test("returns skip_quality_repair when currentItemKey is quality_repair", () => {
  const task = { pendingManualRecovery: false, checkpointType: null, currentItemKey: "quality_repair", currentStage: null };
  assert.equal(resolveDirectorContinueMode(task), "skip_quality_repair");
});

test("returns skip_quality_repair when currentStage contains quality keyword", () => {
  const task = { pendingManualRecovery: false, checkpointType: null, currentItemKey: null, currentStage: "质量审核中" };
  assert.equal(resolveDirectorContinueMode(task), "skip_quality_repair");
});

test("returns auto_execute_range when checkpointType is chapter_batch_ready", () => {
  const task = { pendingManualRecovery: false, checkpointType: "chapter_batch_ready", currentItemKey: null, currentStage: null };
  assert.equal(resolveDirectorContinueMode(task), "auto_execute_range");
});

test("returns resume as default for null task", () => {
  assert.equal(resolveDirectorContinueMode(null), "resume");
});

test("returns resume as default for empty task", () => {
  assert.equal(resolveDirectorContinueMode({}), "resume");
});
