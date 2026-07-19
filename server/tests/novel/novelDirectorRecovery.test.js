const test = require("node:test");
const assert = require("node:assert/strict");

const {
  resolveAssetFirstRecoveryFromSnapshot,
  resolveObservedResumePhaseFromWorkspace,
  resolveSafeDirectorPipelineStartPhase,
} = require("../../dist/orchestration/pipeline/recovery/novelDirectorRecovery.js");

test("observed resume phase only advances to structured outline when strategy plan exists", () => {
  const phase = resolveObservedResumePhaseFromWorkspace({
    hasVolumeWorkspace: true,
    hasVolumeStrategyPlan: true,
  });

  assert.equal(phase, "structured_outline");
});

test("observed resume phase does not treat placeholder legacy volumes as structured outline progress", () => {
  const phase = resolveObservedResumePhaseFromWorkspace({
    hasVolumeWorkspace: true,
    hasVolumeStrategyPlan: false,
  });

  assert.equal(phase, null);
});

test("safe pipeline phase falls back to volume strategy when structured outline assets are incomplete", () => {
  const phase = resolveSafeDirectorPipelineStartPhase({
    requestedPhase: "structured_outline",
    hasStoryMacroPlan: true,
    hasBookContract: true,
    hasWorldSetupPrepared: true,
    hasCharacters: true,
    hasVolumeWorkspace: true,
    hasVolumeStrategyPlan: false,
  });

  assert.equal(phase, "volume_strategy");
});

test("safe pipeline phase does not let stale volume strategy skip missing book assets", () => {
  const phase = resolveSafeDirectorPipelineStartPhase({
    requestedPhase: "structured_outline",
    hasStoryMacroPlan: false,
    hasBookContract: false,
    hasCharacters: true,
    hasVolumeWorkspace: true,
    hasVolumeStrategyPlan: true,
  });

  assert.equal(phase, "story_macro");
});

test("safe pipeline phase resumes book contract when story macro exists without contract", () => {
  const phase = resolveSafeDirectorPipelineStartPhase({
    requestedPhase: "story_macro",
    hasStoryMacroPlan: true,
    hasBookContract: false,
    hasCharacters: false,
    hasVolumeWorkspace: false,
    hasVolumeStrategyPlan: false,
  });

  assert.equal(phase, "book_contract");
});

test("safe pipeline phase skips character setup when characters already exist", () => {
  const phase = resolveSafeDirectorPipelineStartPhase({
    requestedPhase: "story_macro",
    hasStoryMacroPlan: true,
    hasBookContract: true,
    hasWorldSetupPrepared: true,
    hasCharacters: true,
    hasVolumeWorkspace: false,
    hasVolumeStrategyPlan: false,
  });

  assert.equal(phase, "volume_strategy");
});

test("safe pipeline phase prepares book world before character setup", () => {
  const phase = resolveSafeDirectorPipelineStartPhase({
    requestedPhase: "character_setup",
    hasStoryMacroPlan: true,
    hasBookContract: true,
    hasWorldSetupPrepared: false,
    hasCharacters: false,
    hasVolumeWorkspace: false,
    hasVolumeStrategyPlan: false,
  });

  assert.equal(phase, "world_setup");
});

test("safe pipeline phase treats skipped world setup as prepared", () => {
  const phase = resolveSafeDirectorPipelineStartPhase({
    requestedPhase: "character_setup",
    hasStoryMacroPlan: true,
    hasBookContract: true,
    hasWorldSetupPrepared: true,
    hasCharacters: false,
    hasVolumeWorkspace: false,
    hasVolumeStrategyPlan: false,
  });

  assert.equal(phase, "character_setup");
});

test("asset-first recovery resumes auto execution from existing executable assets", () => {
  const recovery = resolveAssetFirstRecoveryFromSnapshot({
    runMode: "auto_to_execution",
    structuredOutlineRecoveryStep: "chapter_sync",
    volumeCount: 2,
    hasVolumeStrategyPlan: true,
    hasActivePipelineJob: false,
    hasExecutableRange: true,
    hasAutoExecutionState: true,
    latestCheckpointType: "chapter_batch_ready",
  });

  assert.deepEqual(recovery, {
    type: "auto_execution",
    resumeCheckpointType: "chapter_batch_ready",
  });
});

test("asset-first recovery treats full-book autopilot as auto execution", () => {
  const recovery = resolveAssetFirstRecoveryFromSnapshot({
    runMode: "full_book_autopilot",
    structuredOutlineRecoveryStep: "completed",
    volumeCount: 4,
    hasVolumeStrategyPlan: true,
    hasActivePipelineJob: false,
    hasExecutableRange: true,
    hasAutoExecutionState: true,
    latestCheckpointType: "replan_required",
  });

  assert.deepEqual(recovery, {
    type: "auto_execution",
    resumeCheckpointType: "replan_required",
  });
});

test("asset-first recovery routes to structured outline when persisted range still lacks execution contracts", () => {
  // 卷工作区 cursor 误报已完成（chapter_sync），但执行区持久化章节仍缺细化。
  // 此时必须回到节奏 / 拆章补齐，而不是进入 auto_execution 抛错卡死。
  const recovery = resolveAssetFirstRecoveryFromSnapshot({
    runMode: "auto_to_execution",
    structuredOutlineRecoveryStep: "chapter_sync",
    volumeCount: 2,
    hasVolumeStrategyPlan: true,
    hasActivePipelineJob: false,
    hasExecutableRange: true,
    hasAutoExecutionState: true,
    hasMissingExecutionContractInRange: true,
    latestCheckpointType: "chapter_batch_ready",
  });

  assert.deepEqual(recovery, {
    type: "phase",
    phase: "structured_outline",
  });
});

test("asset-first recovery does not interrupt an active batch to补齐细化", () => {
  // 有进行中的批次时，缺口信号不应打断当前批次。
  const recovery = resolveAssetFirstRecoveryFromSnapshot({
    runMode: "auto_to_execution",
    structuredOutlineRecoveryStep: "chapter_sync",
    volumeCount: 2,
    hasVolumeStrategyPlan: true,
    hasActivePipelineJob: true,
    hasExecutableRange: true,
    hasAutoExecutionState: true,
    hasMissingExecutionContractInRange: true,
    latestCheckpointType: "chapter_batch_ready",
  });

  assert.equal(recovery.type, "auto_execution");
});

test("asset-first recovery keeps structured outline first when requested scope is not fully detailed", () => {
  const recovery = resolveAssetFirstRecoveryFromSnapshot({
    runMode: "auto_to_execution",
    structuredOutlineRecoveryStep: "chapter_detail_bundle",
    volumeCount: 10,
    hasVolumeStrategyPlan: true,
    hasActivePipelineJob: true,
    hasExecutableRange: true,
    hasAutoExecutionState: true,
    latestCheckpointType: "chapter_batch_ready",
  });

  assert.deepEqual(recovery, {
    type: "phase",
    phase: "structured_outline",
  });
});

test("asset-first recovery keeps structured outline at chapter sync when execution range is stale", () => {
  const recovery = resolveAssetFirstRecoveryFromSnapshot({
    runMode: "auto_to_execution",
    structuredOutlineRecoveryStep: "chapter_sync",
    volumeCount: 10,
    hasVolumeStrategyPlan: true,
    hasActivePipelineJob: true,
    hasExecutableRange: false,
    hasAutoExecutionState: true,
    latestCheckpointType: "chapter_batch_ready",
  });

  assert.deepEqual(recovery, {
    type: "phase",
    phase: "structured_outline",
  });
});

test("asset-first recovery resumes structured outline instead of regressing to volume strategy", () => {
  const recovery = resolveAssetFirstRecoveryFromSnapshot({
    runMode: "auto_to_ready",
    structuredOutlineRecoveryStep: "chapter_detail_bundle",
    volumeCount: 2,
    hasVolumeStrategyPlan: true,
    hasActivePipelineJob: false,
    hasExecutableRange: false,
    hasAutoExecutionState: false,
    latestCheckpointType: null,
  });

  assert.deepEqual(recovery, {
    type: "phase",
    phase: "structured_outline",
  });
});

test("asset-first recovery does not jump into structured outline with placeholder volumes only", () => {
  const recovery = resolveAssetFirstRecoveryFromSnapshot({
    runMode: "auto_to_ready",
    structuredOutlineRecoveryStep: "beat_sheet",
    volumeCount: 1,
    hasVolumeStrategyPlan: false,
    hasActivePipelineJob: false,
    hasExecutableRange: false,
    hasAutoExecutionState: false,
    latestCheckpointType: null,
  });

  assert.equal(recovery, null);
});

// ---------------------------------------------------------------------------
// REQ-7085: 自动导演自主处理未细化章节
// 1-10 已细化且已写，11-30 未细化 -> 不应返回 auto_execution 卡死循环
// ---------------------------------------------------------------------------

test("REQ-7085: asset-first recovery routes to structured outline when range is exhausted but book has unrefined chapters", () => {
  // 场景：auto_to_execution + 默认范围 1-10 已全部细化且已写。
  // 11-30 章存在于执行区但缺少 taskSheet/sceneCards。
  // 当前范围检测认为 hasMissingExecutionContractInRange=false，
  // 但全书层面仍有未细化章节 -> 必须回到 structured_outline 补齐。
  const recovery = resolveAssetFirstRecoveryFromSnapshot({
    runMode: "auto_to_execution",
    structuredOutlineRecoveryStep: "completed",
    volumeCount: 3,
    hasVolumeStrategyPlan: true,
    hasActivePipelineJob: false,
    hasExecutableRange: true,
    hasAutoExecutionState: true,
    hasMissingExecutionContractInRange: false,
    hasAnyUnpreparedChapters: true,
    latestCheckpointType: "chapter_batch_ready",
  });

  assert.deepEqual(recovery, {
    type: "phase",
    phase: "structured_outline",
  });
});

test("REQ-7085: asset-first recovery does not interrupt active batch when book has unrefined chapters outside range", () => {
  // 有进行中的批次时，即使全书层面有未细化章节，也不打断当前批次。
  const recovery = resolveAssetFirstRecoveryFromSnapshot({
    runMode: "auto_to_execution",
    structuredOutlineRecoveryStep: "completed",
    volumeCount: 3,
    hasVolumeStrategyPlan: true,
    hasActivePipelineJob: true,
    hasExecutableRange: true,
    hasAutoExecutionState: true,
    hasMissingExecutionContractInRange: false,
    hasAnyUnpreparedChapters: true,
    latestCheckpointType: "chapter_batch_ready",
  });

  assert.equal(recovery.type, "auto_execution");
});

test("REQ-7085: asset-first recovery resumes auto execution when all book chapters are refined", () => {
  // 全书所有章节均已细化 -> 回归 auto_execution，不误回到 structured_outline。
  const recovery = resolveAssetFirstRecoveryFromSnapshot({
    runMode: "auto_to_execution",
    structuredOutlineRecoveryStep: "completed",
    volumeCount: 3,
    hasVolumeStrategyPlan: true,
    hasActivePipelineJob: false,
    hasExecutableRange: true,
    hasAutoExecutionState: true,
    hasMissingExecutionContractInRange: false,
    hasAnyUnpreparedChapters: false,
    latestCheckpointType: "chapter_batch_ready",
  });

  assert.equal(recovery.type, "auto_execution");
});

test("REQ-7085: asset-first recovery keeps structured outline priority when range lacks contracts and book has unrefined chapters", () => {
  // 范围内也缺细化时，优先走原有 hasMissingExecutionContractInRange 分支，
  // hasAnyUnpreparedChapters 不应改变该优先级。
  const recovery = resolveAssetFirstRecoveryFromSnapshot({
    runMode: "auto_to_execution",
    structuredOutlineRecoveryStep: "chapter_sync",
    volumeCount: 2,
    hasVolumeStrategyPlan: true,
    hasActivePipelineJob: false,
    hasExecutableRange: true,
    hasAutoExecutionState: true,
    hasMissingExecutionContractInRange: true,
    hasAnyUnpreparedChapters: true,
    latestCheckpointType: "chapter_batch_ready",
  });

  assert.deepEqual(recovery, {
    type: "phase",
    phase: "structured_outline",
  });
});

test("REQ-7085: asset-first recovery routes to structured outline for full-book autopilot when book has unrefined chapters", () => {
  // full_book_autopilot 模式下，全书范围检测已能覆盖，
  // 但 hasAnyUnpreparedChapters=true 时仍应回到 structured_outline。
  const recovery = resolveAssetFirstRecoveryFromSnapshot({
    runMode: "full_book_autopilot",
    structuredOutlineRecoveryStep: "completed",
    volumeCount: 3,
    hasVolumeStrategyPlan: true,
    hasActivePipelineJob: false,
    hasExecutableRange: true,
    hasAutoExecutionState: true,
    hasMissingExecutionContractInRange: false,
    hasAnyUnpreparedChapters: true,
    latestCheckpointType: "chapter_batch_ready",
  });

  assert.deepEqual(recovery, {
    type: "phase",
    phase: "structured_outline",
  });
});

test("REQ-7085 regression: asset-first recovery does not re-refine when all chapters are refined (EARS-3)", () => {
  // 回归：全部章节已细化时，hasAnyUnpreparedChapters=false，
  // 恢复应进入 auto_execution 而非 structured_outline，避免重复细化已完成章节。
  const recovery = resolveAssetFirstRecoveryFromSnapshot({
    runMode: "auto_to_execution",
    structuredOutlineRecoveryStep: "completed",
    volumeCount: 3,
    hasVolumeStrategyPlan: true,
    hasActivePipelineJob: false,
    hasExecutableRange: true,
    hasAutoExecutionState: true,
    hasMissingExecutionContractInRange: false,
    hasAnyUnpreparedChapters: false,
    latestCheckpointType: "chapter_batch_ready",
  });

  assert.equal(recovery.type, "auto_execution");
  assert.equal(recovery.resumeCheckpointType, "chapter_batch_ready");
});

test("REQ-7085 regression: asset-first recovery distinguishes partial vs all complete (EARS-4)", () => {
  // EARS-4: 恢复逻辑能区分"规划完成但未执行"和"全部完成"
  // 场景 A: 部分完成 - 1-10 已写，11-30 未细化 -> structured_outline
  const partialRecovery = resolveAssetFirstRecoveryFromSnapshot({
    runMode: "full_book_autopilot",
    structuredOutlineRecoveryStep: "completed",
    volumeCount: 3,
    hasVolumeStrategyPlan: true,
    hasActivePipelineJob: false,
    hasExecutableRange: true,
    hasAutoExecutionState: true,
    hasMissingExecutionContractInRange: false,
    hasAnyUnpreparedChapters: true,
    latestCheckpointType: "chapter_batch_ready",
  });

  // 场景 B: 全部完成 - 全书所有章节均已细化 -> auto_execution
  const allCompleteRecovery = resolveAssetFirstRecoveryFromSnapshot({
    runMode: "full_book_autopilot",
    structuredOutlineRecoveryStep: "completed",
    volumeCount: 3,
    hasVolumeStrategyPlan: true,
    hasActivePipelineJob: false,
    hasExecutableRange: true,
    hasAutoExecutionState: true,
    hasMissingExecutionContractInRange: false,
    hasAnyUnpreparedChapters: false,
    latestCheckpointType: "chapter_batch_ready",
  });

  assert.equal(partialRecovery.type, "phase", "部分完成时应回到 structured_outline");
  assert.equal(allCompleteRecovery.type, "auto_execution", "全部完成时应进入 auto_execution");
  assert.notEqual(partialRecovery.type, allCompleteRecovery.type, "部分完成与全部完成的恢复策略必须不同");
});
