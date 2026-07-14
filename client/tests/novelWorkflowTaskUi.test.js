import test from "node:test";
import assert from "node:assert/strict";
import {
  LIVE_TASK_STATUSES,
  BACKGROUND_RUNNING_TASK_STATUSES,
  formatWorkflowCheckpoint,
  getWorkflowBadge,
  getWorkflowDescription,
  canContinueDirector,
  canCancelDirectorTask,
  requiresCandidateSelection,
  canContinueChapterBatchAutoExecution,
  canEnterChapterExecution,
  isLiveWorkflowTask,
  isWorkflowRunningInBackground,
  isWorkflowActionRequired,
  getTaskCenterLink,
  getCandidateSelectionLink,
} from "../src/lib/novelWorkflowTaskUi.ts";

function buildTask(overrides = {}) {
  return {
    id: "task-1",
    status: "waiting_approval",
    checkpointType: "chapter_batch_ready",
    ...overrides,
  };
}

// Constants tests

test("LIVE_TASK_STATUSES contains expected statuses", () => {
  assert.ok(LIVE_TASK_STATUSES.has("queued"));
  assert.ok(LIVE_TASK_STATUSES.has("running"));
  assert.ok(LIVE_TASK_STATUSES.has("waiting_approval"));
  assert.ok(!LIVE_TASK_STATUSES.has("failed"));
  assert.ok(!LIVE_TASK_STATUSES.has("cancelled"));
});

test("BACKGROUND_RUNNING_TASK_STATUSES contains only running", () => {
  assert.ok(BACKGROUND_RUNNING_TASK_STATUSES.has("running"));
  assert.ok(!BACKGROUND_RUNNING_TASK_STATUSES.has("queued"));
  assert.ok(!BACKGROUND_RUNNING_TASK_STATUSES.has("waiting_approval"));
});

// formatWorkflowCheckpoint tests

test("formatWorkflowCheckpoint returns correct label for candidate_selection_required", () => {
  assert.equal(formatWorkflowCheckpoint("candidate_selection_required"), "等待确认书级方向");
});

test("formatWorkflowCheckpoint returns correct label for book_contract_ready", () => {
  assert.equal(formatWorkflowCheckpoint("book_contract_ready"), "Book Contract 已就绪");
});

test("formatWorkflowCheckpoint returns correct label for character_setup_required", () => {
  assert.equal(formatWorkflowCheckpoint("character_setup_required"), "角色准备待审核");
});

test("formatWorkflowCheckpoint returns correct label for volume_strategy_ready", () => {
  assert.equal(formatWorkflowCheckpoint("volume_strategy_ready"), "卷战略待审核");
});

test("formatWorkflowCheckpoint returns correct label for chapter_batch_ready", () => {
  assert.equal(formatWorkflowCheckpoint("chapter_batch_ready", "第1-5章"), "第1-5章自动执行已暂停");
});

test("formatWorkflowCheckpoint returns correct label for replan_required", () => {
  assert.equal(formatWorkflowCheckpoint("replan_required"), "等待重规划");
});

test("formatWorkflowCheckpoint returns correct label for workflow_completed", () => {
  assert.equal(formatWorkflowCheckpoint("workflow_completed"), "自动导演已完成");
});

test("formatWorkflowCheckpoint returns default label for null", () => {
  assert.equal(formatWorkflowCheckpoint(null), "自动导演");
});

test("formatWorkflowCheckpoint returns default label for undefined", () => {
  assert.equal(formatWorkflowCheckpoint(undefined), "自动导演");
});

// getWorkflowBadge tests

test("getWorkflowBadge returns null for null task", () => {
  assert.equal(getWorkflowBadge(null), null);
});

test("getWorkflowBadge returns null for undefined task", () => {
  assert.equal(getWorkflowBadge(undefined), null);
});

test("getWorkflowBadge returns running label for running task with chapter_batch_ready", () => {
  const task = buildTask({
    status: "running",
    executionScopeLabel: "第1-3章",
  });
  const result = getWorkflowBadge(task);
  assert.equal(result.label, "第1-3章自动执行中");
  assert.equal(result.variant, "default");
});

test("getWorkflowBadge returns paused label for failed task with chapter_batch_ready", () => {
  const task = buildTask({
    status: "failed",
    executionScopeLabel: "第1-3章",
  });
  const result = getWorkflowBadge(task);
  assert.equal(result.label, "第1-3章自动执行已暂停");
  assert.equal(result.variant, "destructive");
});

test("getWorkflowBadge returns cancelled label for cancelled task with chapter_batch_ready", () => {
  const task = buildTask({
    status: "cancelled",
    checkpointType: "chapter_batch_ready",
    executionScopeLabel: "第1-3章",
  });
  const result = getWorkflowBadge(task);
  assert.equal(result.label, "第1-3章自动执行已取消");
  assert.equal(result.variant, "outline");
});

test("getWorkflowBadge returns checkpoint label for waiting_approval task", () => {
  const task = buildTask({
    status: "waiting_approval",
    checkpointType: "candidate_selection_required",
  });
  const result = getWorkflowBadge(task);
  assert.equal(result.label, "等待确认书级方向");
  assert.equal(result.variant, "secondary");
});

test("getWorkflowBadge returns running label for running task", () => {
  const task = buildTask({
    status: "running",
    checkpointType: null,
  });
  const result = getWorkflowBadge(task);
  assert.equal(result.label, "自动导演进行中");
  assert.equal(result.variant, "default");
});

test("getWorkflowBadge returns queued label for queued task", () => {
  const task = buildTask({
    status: "queued",
    checkpointType: null,
  });
  const result = getWorkflowBadge(task);
  assert.equal(result.label, "自动导演排队中");
  assert.equal(result.variant, "secondary");
});

test("getWorkflowBadge returns failed label for failed task", () => {
  const task = buildTask({
    status: "failed",
    checkpointType: null,
  });
  const result = getWorkflowBadge(task);
  assert.equal(result.label, "自动导演失败");
  assert.equal(result.variant, "destructive");
});

test("getWorkflowBadge returns cancelled label for cancelled task", () => {
  const task = buildTask({
    status: "cancelled",
    checkpointType: null,
  });
  const result = getWorkflowBadge(task);
  assert.equal(result.label, "自动导演已取消");
  assert.equal(result.variant, "outline");
});

test("getWorkflowBadge uses displayStatus when available", () => {
  const task = buildTask({
    status: "running",
    checkpointType: null,
    displayStatus: "自定义状态",
  });
  const result = getWorkflowBadge(task);
  assert.equal(result.label, "自定义状态");
});

test("getWorkflowBadge returns completed label for completed workflow", () => {
  const task = buildTask({
    status: "completed",
    checkpointType: "workflow_completed",
  });
  const result = getWorkflowBadge(task);
  assert.equal(result.label, "自动导演已完成");
  assert.equal(result.variant, "outline");
});

// getWorkflowDescription tests

test("getWorkflowDescription returns null for null task", () => {
  assert.equal(getWorkflowDescription(null), null);
});

test("getWorkflowDescription returns progress for running chapter_batch_ready task", () => {
  const task = buildTask({
    status: "running",
    executionScopeLabel: "第1-3章",
    progress: 0.5,
  });
  const result = getWorkflowDescription(task);
  assert.ok(result.includes("第1-3章"));
  assert.ok(result.includes("50%"));
});

test("getWorkflowDescription returns blockingReason when available", () => {
  const task = buildTask({
    status: "waiting_approval",
    blockingReason: "需要用户确认",
  });
  const result = getWorkflowDescription(task);
  assert.equal(result, "需要用户确认");
});

test("getWorkflowDescription returns checkpointSummary when available", () => {
  const task = buildTask({
    status: "waiting_approval",
    checkpointSummary: "正在生成章节",
  });
  const result = getWorkflowDescription(task);
  assert.equal(result, "正在生成章节");
});

test("getWorkflowDescription returns null when no description available", () => {
  const task = buildTask({
    status: "waiting_approval",
  });
  const result = getWorkflowDescription(task);
  assert.equal(result, null);
});

test("getWorkflowDescription returns resumeAction when available", () => {
  const task = buildTask({
    status: "waiting_approval",
    resumeAction: "继续生成",
  });
  const result = getWorkflowDescription(task);
  assert.equal(result, "推荐继续：继续生成");
});

test("getWorkflowDescription returns nextActionLabel when available", () => {
  const task = buildTask({
    status: "waiting_approval",
    nextActionLabel: "审核章节",
  });
  const result = getWorkflowDescription(task);
  assert.equal(result, "下一步：审核章节");
});

// canContinueDirector tests

test("canContinueDirector returns false for null task", () => {
  assert.equal(canContinueDirector(null), false);
});

test("canContinueDirector returns true for waiting_approval task", () => {
  const task = buildTask({
    status: "waiting_approval",
    checkpointType: "volume_strategy_ready",
  });
  assert.equal(canContinueDirector(task), true);
});

test("canContinueDirector returns false for candidate_selection_required", () => {
  const task = buildTask({
    status: "waiting_approval",
    checkpointType: "candidate_selection_required",
  });
  assert.equal(canContinueDirector(task), false);
});

test("canContinueDirector returns false for running task", () => {
  const task = buildTask({
    status: "running",
    checkpointType: null,
  });
  assert.equal(canContinueDirector(task), false);
});

// canCancelDirectorTask tests

test("canCancelDirectorTask returns false for null task", () => {
  assert.equal(canCancelDirectorTask(null), false);
});

test("canCancelDirectorTask returns true for pendingManualRecovery task", () => {
  const task = buildTask({
    status: "completed",
    pendingManualRecovery: true,
  });
  assert.equal(canCancelDirectorTask(task), true);
});

test("canCancelDirectorTask returns true for queued task", () => {
  const task = buildTask({ status: "queued" });
  assert.equal(canCancelDirectorTask(task), true);
});

test("canCancelDirectorTask returns true for running task", () => {
  const task = buildTask({ status: "running" });
  assert.equal(canCancelDirectorTask(task), true);
});

test("canCancelDirectorTask returns true for waiting_approval task", () => {
  const task = buildTask({ status: "waiting_approval" });
  assert.equal(canCancelDirectorTask(task), true);
});

test("canCancelDirectorTask returns true for failed task", () => {
  const task = buildTask({ status: "failed" });
  assert.equal(canCancelDirectorTask(task), true);
});

test("canCancelDirectorTask returns false for completed task", () => {
  const task = buildTask({ status: "completed" });
  assert.equal(canCancelDirectorTask(task), false);
});

// requiresCandidateSelection tests

test("requiresCandidateSelection returns false for null task", () => {
  assert.equal(requiresCandidateSelection(null), false);
});

test("requiresCandidateSelection returns true for waiting_approval with candidate_selection_required", () => {
  const task = buildTask({
    status: "waiting_approval",
    checkpointType: "candidate_selection_required",
  });
  assert.equal(requiresCandidateSelection(task), true);
});

test("requiresCandidateSelection returns false for running task", () => {
  const task = buildTask({
    status: "running",
    checkpointType: "candidate_selection_required",
  });
  assert.equal(requiresCandidateSelection(task), false);
});

// canContinueChapterBatchAutoExecution tests

test("canContinueChapterBatchAutoExecution returns false for null task", () => {
  assert.equal(canContinueChapterBatchAutoExecution(null), false);
});

test("canContinueChapterBatchAutoExecution returns true for failed chapter_batch_ready task", () => {
  const task = buildTask({
    status: "failed",
  });
  assert.equal(canContinueChapterBatchAutoExecution(task), true);
});

test("canContinueChapterBatchAutoExecution returns true for cancelled chapter_batch_ready task", () => {
  const task = buildTask({
    status: "cancelled",
  });
  assert.equal(canContinueChapterBatchAutoExecution(task), true);
});

test("canContinueChapterBatchAutoExecution returns false for failed non-chapter_batch_ready task", () => {
  const task = buildTask({
    status: "failed",
    checkpointType: "replan_required",
  });
  assert.equal(canContinueChapterBatchAutoExecution(task), false);
});

// canEnterChapterExecution tests

test("canEnterChapterExecution returns false for null task", () => {
  assert.equal(canEnterChapterExecution(null), false);
});

test("canEnterChapterExecution returns true for chapter_batch_ready task", () => {
  const task = buildTask({
    checkpointType: "chapter_batch_ready",
  });
  assert.equal(canEnterChapterExecution(task), true);
});

test("canEnterChapterExecution returns true for workflow_completed task", () => {
  const task = buildTask({
    checkpointType: "workflow_completed",
  });
  assert.equal(canEnterChapterExecution(task), true);
});

test("canEnterChapterExecution returns false for other checkpoint types", () => {
  const task = buildTask({
    checkpointType: "replan_required",
  });
  assert.equal(canEnterChapterExecution(task), false);
});

// isLiveWorkflowTask tests

test("isLiveWorkflowTask returns false for null task", () => {
  assert.equal(isLiveWorkflowTask(null), false);
});

test("isLiveWorkflowTask returns true for queued task", () => {
  assert.equal(isLiveWorkflowTask(buildTask({ status: "queued" })), true);
});

test("isLiveWorkflowTask returns true for running task", () => {
  assert.equal(isLiveWorkflowTask(buildTask({ status: "running" })), true);
});

test("isLiveWorkflowTask returns true for waiting_approval task", () => {
  assert.equal(isLiveWorkflowTask(buildTask({ status: "waiting_approval" })), true);
});

test("isLiveWorkflowTask returns false for failed task", () => {
  assert.equal(isLiveWorkflowTask(buildTask({ status: "failed" })), false);
});

// isWorkflowRunningInBackground tests

test("isWorkflowRunningInBackground returns false for null task", () => {
  assert.equal(isWorkflowRunningInBackground(null), false);
});

test("isWorkflowRunningInBackground returns true for running task", () => {
  assert.equal(isWorkflowRunningInBackground(buildTask({ status: "running" })), true);
});

test("isWorkflowRunningInBackground returns false for queued task", () => {
  assert.equal(isWorkflowRunningInBackground(buildTask({ status: "queued" })), false);
});

// isWorkflowActionRequired tests

test("isWorkflowActionRequired returns false for null task", () => {
  assert.equal(isWorkflowActionRequired(null), false);
});

test("isWorkflowActionRequired returns true for waiting_approval task", () => {
  assert.equal(isWorkflowActionRequired(buildTask({ status: "waiting_approval" })), true);
});

test("isWorkflowActionRequired returns true for failed task", () => {
  assert.equal(isWorkflowActionRequired(buildTask({ status: "failed" })), true);
});

test("isWorkflowActionRequired returns true for cancelled task", () => {
  assert.equal(isWorkflowActionRequired(buildTask({ status: "cancelled" })), true);
});

test("isWorkflowActionRequired returns false for running task", () => {
  assert.equal(isWorkflowActionRequired(buildTask({ status: "running" })), false);
});

// getTaskCenterLink tests

test("getTaskCenterLink returns correct link", () => {
  assert.equal(getTaskCenterLink("task_123"), "/tasks?kind=novel_workflow&id=task_123");
});

// getCandidateSelectionLink tests

test("getCandidateSelectionLink returns correct link", () => {
  const result = getCandidateSelectionLink("task_123");
  assert.ok(result.includes("workflowTaskId=task_123"));
  assert.ok(result.includes("mode=director"));
  assert.ok(result.startsWith("/novels/create?"));
});
