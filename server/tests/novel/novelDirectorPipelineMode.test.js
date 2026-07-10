const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeDirectorAutoExecutionPlan,
  buildDirectorAutoExecutionPipelineOptions,
} = require("../../dist/services/novel/director/automation/novelDirectorAutoExecution.js");

const {
  buildDirectorDisplayState,
} = require("../../dist/services/novel/director/projections/DirectorDisplayStateBuilder.js");

// --- T.2 + T.3: pipelineMode 配置传递 ---

test("normalizeDirectorAutoExecutionPlan defaults pipelineMode to batch", () => {
  const plan = normalizeDirectorAutoExecutionPlan({
    mode: "chapter_range",
    startOrder: 1,
    endOrder: 10,
  });
  assert.equal(plan.pipelineMode, "batch");
});

test("normalizeDirectorAutoExecutionPlan preserves pipelineMode pipeline", () => {
  const plan = normalizeDirectorAutoExecutionPlan({
    mode: "chapter_range",
    startOrder: 1,
    endOrder: 10,
    pipelineMode: "pipeline",
  });
  assert.equal(plan.pipelineMode, "pipeline");
});

test("normalizeDirectorAutoExecutionPlan preserves pipelineMode for book mode", () => {
  const plan = normalizeDirectorAutoExecutionPlan({
    mode: "book",
    pipelineMode: "pipeline",
  });
  assert.equal(plan.pipelineMode, "pipeline");
});

test("normalizeDirectorAutoExecutionPlan preserves pipelineMode for volume mode", () => {
  const plan = normalizeDirectorAutoExecutionPlan({
    mode: "volume",
    volumeOrder: 1,
    pipelineMode: "pipeline",
  });
  assert.equal(plan.pipelineMode, "pipeline");
});

test("normalizeDirectorAutoExecutionPlan defaults pipelineMode in fallback path", () => {
  const plan = normalizeDirectorAutoExecutionPlan(null);
  assert.equal(plan.pipelineMode, "batch");
});

test("buildDirectorAutoExecutionPipelineOptions includes pipelineMode", () => {
  const options = buildDirectorAutoExecutionPipelineOptions({
    startOrder: 1,
    endOrder: 10,
    pipelineMode: "pipeline",
  });
  assert.equal(options.pipelineMode, "pipeline");
});

test("buildDirectorAutoExecutionPipelineOptions defaults pipelineMode to batch", () => {
  const options = buildDirectorAutoExecutionPipelineOptions({
    startOrder: 1,
    endOrder: 10,
  });
  assert.equal(options.pipelineMode, "batch");
});

// --- T.7: pipeline state display in display state ---

test("buildDirectorDisplayState passes through pipelineMode and pipelineState", () => {
  const pipelineState = {
    refinementProgress: { total: 5, completed: 3, currentChapterId: "ch-003" },
    writingProgress: { total: 10, completed: 4, currentChapterId: "ch-004" },
  };
  const displayState = buildDirectorDisplayState({
    task: {
      status: "running",
      currentStage: "chapter_execution",
      currentItemKey: "chapter.draft.write",
      currentItemLabel: "执行章节生成批次",
      progress: 0.4,
      checkpointType: null,
      checkpointSummary: null,
      lastError: null,
      pendingManualRecovery: false,
    },
    projection: null,
    factStep: null,
    pipelineMode: "pipeline",
    pipelineState,
  });
  assert.equal(displayState.pipelineMode, "pipeline");
  assert.deepEqual(displayState.pipelineState, pipelineState);
});

test("buildDirectorDisplayState defaults pipelineMode to undefined when not provided", () => {
  const displayState = buildDirectorDisplayState({
    task: {
      status: "running",
      currentStage: "chapter_execution",
      currentItemKey: "chapter.draft.write",
      currentItemLabel: "执行章节生成批次",
      progress: 0.4,
      checkpointType: null,
      checkpointSummary: null,
      lastError: null,
      pendingManualRecovery: false,
    },
    projection: null,
    factStep: null,
  });
  // pipelineMode 和 pipelineState 未传入时应为 undefined（可选字段）
  assert.ok(!("pipelineMode" in displayState) || displayState.pipelineMode === undefined || displayState.pipelineMode === null);
  assert.ok(!("pipelineState" in displayState) || displayState.pipelineState === undefined || displayState.pipelineState === null);
});

test("buildDirectorDisplayState handles pipelineState with blocked chapter", () => {
  const pipelineState = {
    refinementProgress: { total: 5, completed: 3, currentChapterId: "ch-003" },
    writingProgress: { total: 10, completed: 4, currentChapterId: "ch-004" },
    blockedChapterId: "ch-005",
    blockingReason: "quality_review",
  };
  const displayState = buildDirectorDisplayState({
    task: {
      status: "running",
      currentStage: "chapter_execution",
      currentItemKey: "chapter.draft.write",
      currentItemLabel: "执行章节生成批次",
      progress: 0.4,
      checkpointType: null,
      checkpointSummary: null,
      lastError: null,
      pendingManualRecovery: false,
    },
    projection: null,
    factStep: null,
    pipelineMode: "pipeline",
    pipelineState,
  });
  assert.equal(displayState.pipelineState.blockedChapterId, "ch-005");
  assert.equal(displayState.pipelineState.blockingReason, "quality_review");
});

// --- PipelineRunOptions + PipelinePayload 验证 ---

test("PipelineRunOptions type accepts pipelineMode field", () => {
  // 验证 buildDirectorAutoExecutionPipelineOptions 输出的完整结构
  const options = buildDirectorAutoExecutionPipelineOptions({
    startOrder: 1,
    endOrder: 10,
    pipelineMode: "pipeline",
  });
  assert.ok("pipelineMode" in options);
  assert.equal(options.pipelineMode, "pipeline");
  assert.equal(options.startOrder, 1);
  assert.equal(options.endOrder, 10);
});
