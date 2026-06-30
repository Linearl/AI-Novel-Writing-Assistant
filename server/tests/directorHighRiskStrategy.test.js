const assert = require("node:assert/strict");
const test = require("node:test");

const {
  resolveDirectorQualityLoopBudgetNextAction,
} = require("../dist/services/novel/director/runtime/DirectorQualityLoopBudgetLedgerService.js");

const {
  normalizeDirectorAutoExecutionPlan,
} = require("../dist/services/novel/director/automation/novelDirectorAutoExecution.js");

const {
  buildFullBookAutopilotExecutionPlan,
} = require("../../shared/dist/types/novelDirector.js");

/**
 * Helper: build a minimal budget entry with zeroed counters.
 * @param {Partial<import("@ai-novel/shared/types/novelDirector").DirectorQualityLoopBudgetEntry>} overrides
 */
function buildEntry(overrides = {}) {
  return {
    signatureKey: "sig-key-1",
    issueSignature: "content|quality_loop|risk_unknown|repair_unknown|reason_unknown",
    blockingLedgerKeys: [],
    affectedChapterWindow: { startOrder: 1, endOrder: 10, chapterOrders: [], chapterIds: [] },
    patchRepairCount: 0,
    chapterRewriteCount: 0,
    windowReplanCount: 0,
    deferredCount: 0,
    updatedAt: "2026-06-29T00:00:00.000Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. Default strategy (manual_review) uses normal budget limits
// ---------------------------------------------------------------------------
test("resolveDirectorQualityLoopBudgetNextAction: undefined config uses normal budget limits", () => {
  const entry = buildEntry();
  const action = resolveDirectorQualityLoopBudgetNextAction(entry, undefined);
  assert.equal(action, "auto_patch_repair");
});

test("resolveDirectorQualityLoopBudgetNextAction: manual_review config uses normal budget limits", () => {
  const entry = buildEntry();
  const action = resolveDirectorQualityLoopBudgetNextAction(entry, { strategy: "manual_review" });
  assert.equal(action, "auto_patch_repair");
});

test("resolveDirectorQualityLoopBudgetNextAction: patchRepair exhausted at 2 under normal budget", () => {
  const entry = buildEntry({ patchRepairCount: 2 });
  const action = resolveDirectorQualityLoopBudgetNextAction(entry, { strategy: "manual_review" });
  assert.equal(action, "auto_rewrite_chapter");
});

test("resolveDirectorQualityLoopBudgetNextAction: chapterRewrite exhausted at 1 under normal budget", () => {
  const entry = buildEntry({ chapterRewriteCount: 1 });
  const action = resolveDirectorQualityLoopBudgetNextAction(entry, { strategy: "manual_review" });
  assert.equal(action, "auto_replan_window");
});

test("resolveDirectorQualityLoopBudgetNextAction: windowReplan exhausted at 1 under normal budget", () => {
  const entry = buildEntry({ windowReplanCount: 1 });
  const action = resolveDirectorQualityLoopBudgetNextAction(entry, { strategy: "manual_review" });
  assert.equal(action, "defer_and_continue");
});

// ---------------------------------------------------------------------------
// 2. Auto-eliminate strategy doubles budget limits
// ---------------------------------------------------------------------------
test("resolveDirectorQualityLoopBudgetNextAction: auto_eliminate doubles patchRepair limit to 4", () => {
  // patchRepairCount: 3 should still be below doubled limit (4)
  // maxAutoEliminateRetries must be set high so cumulative check doesn't interfere
  const entry = buildEntry({ patchRepairCount: 3 });
  const action = resolveDirectorQualityLoopBudgetNextAction(entry, {
    strategy: "auto_eliminate",
    maxAutoEliminateRetries: 10,
  });
  assert.equal(action, "auto_patch_repair");
});

test("resolveDirectorQualityLoopBudgetNextAction: auto_eliminate patchRepair exhausted at 4", () => {
  const entry = buildEntry({ patchRepairCount: 4 });
  const action = resolveDirectorQualityLoopBudgetNextAction(entry, {
    strategy: "auto_eliminate",
    maxAutoEliminateRetries: 10,
  });
  assert.equal(action, "auto_rewrite_chapter");
});

test("resolveDirectorQualityLoopBudgetNextAction: auto_eliminate doubles chapterRewrite limit to 2", () => {
  // chapterRewriteCount: 1 should still be below doubled limit (2)
  const entry = buildEntry({ chapterRewriteCount: 1 });
  const action = resolveDirectorQualityLoopBudgetNextAction(entry, { strategy: "auto_eliminate" });
  assert.equal(action, "auto_patch_repair");
});

test("resolveDirectorQualityLoopBudgetNextAction: auto_eliminate chapterRewrite exhausted at 2", () => {
  const entry = buildEntry({ chapterRewriteCount: 2 });
  const action = resolveDirectorQualityLoopBudgetNextAction(entry, { strategy: "auto_eliminate" });
  assert.equal(action, "auto_replan_window");
});

test("resolveDirectorQualityLoopBudgetNextAction: auto_eliminate doubles windowReplan limit to 2", () => {
  // windowReplanCount: 1 should still be below doubled limit (2)
  const entry = buildEntry({ windowReplanCount: 1 });
  const action = resolveDirectorQualityLoopBudgetNextAction(entry, { strategy: "auto_eliminate" });
  assert.equal(action, "auto_patch_repair");
});

test("resolveDirectorQualityLoopBudgetNextAction: auto_eliminate windowReplan exhausted at 2", () => {
  const entry = buildEntry({ windowReplanCount: 2 });
  const action = resolveDirectorQualityLoopBudgetNextAction(entry, { strategy: "auto_eliminate" });
  assert.equal(action, "defer_and_continue");
});

// ---------------------------------------------------------------------------
// 3. Retry threshold exhaustion forces defer_and_continue
// ---------------------------------------------------------------------------
test("resolveDirectorQualityLoopBudgetNextAction: auto_eliminate forces defer when cumulative attempts reach custom maxAutoEliminateRetries", () => {
  const entry = buildEntry({
    patchRepairCount: 1,
    chapterRewriteCount: 1,
    windowReplanCount: 0,
  });
  const action = resolveDirectorQualityLoopBudgetNextAction(entry, {
    strategy: "auto_eliminate",
    maxAutoEliminateRetries: 2,
  });
  assert.equal(action, "defer_and_continue");
});

test("resolveDirectorQualityLoopBudgetNextAction: auto_eliminate forces defer when cumulative attempts reach default maxAutoEliminateRetries (3)", () => {
  const entry = buildEntry({
    patchRepairCount: 1,
    chapterRewriteCount: 1,
    windowReplanCount: 1,
  });
  const action = resolveDirectorQualityLoopBudgetNextAction(entry, {
    strategy: "auto_eliminate",
  });
  assert.equal(action, "defer_and_continue");
});

test("resolveDirectorQualityLoopBudgetNextAction: auto_eliminate does not force defer when cumulative attempts below threshold", () => {
  const entry = buildEntry({
    patchRepairCount: 1,
    chapterRewriteCount: 0,
    windowReplanCount: 0,
  });
  const action = resolveDirectorQualityLoopBudgetNextAction(entry, {
    strategy: "auto_eliminate",
    maxAutoEliminateRetries: 3,
  });
  assert.equal(action, "auto_patch_repair");
});

// ---------------------------------------------------------------------------
// 4. deferredCount short-circuits regardless of highRiskStrategy
// ---------------------------------------------------------------------------
test("resolveDirectorQualityLoopBudgetNextAction: deferredCount > 0 always returns defer_and_continue", () => {
  const entry = buildEntry({ deferredCount: 1 });
  const action = resolveDirectorQualityLoopBudgetNextAction(entry, { strategy: "auto_eliminate" });
  assert.equal(action, "defer_and_continue");
});

// ---------------------------------------------------------------------------
// 5. normalizeDirectorAutoExecutionPlan preserves highRiskStrategy
// ---------------------------------------------------------------------------
test("normalizeDirectorAutoExecutionPlan: chapter_range preserves highRiskStrategy", () => {
  const plan = {
    mode: "chapter_range",
    startOrder: 1,
    endOrder: 10,
    highRiskStrategy: { strategy: "auto_eliminate", maxAutoEliminateRetries: 5 },
  };
  const result = normalizeDirectorAutoExecutionPlan(plan);
  assert.deepEqual(result.highRiskStrategy, { strategy: "auto_eliminate", maxAutoEliminateRetries: 5 });
});

test("normalizeDirectorAutoExecutionPlan: volume preserves highRiskStrategy", () => {
  const plan = {
    mode: "volume",
    volumeOrder: 1,
    highRiskStrategy: { strategy: "auto_eliminate" },
  };
  const result = normalizeDirectorAutoExecutionPlan(plan);
  assert.deepEqual(result.highRiskStrategy, { strategy: "auto_eliminate" });
});

test("normalizeDirectorAutoExecutionPlan: book preserves highRiskStrategy", () => {
  const plan = {
    mode: "book",
    highRiskStrategy: { strategy: "auto_eliminate", maxAutoEliminateRetries: 10 },
  };
  const result = normalizeDirectorAutoExecutionPlan(plan);
  assert.deepEqual(result.highRiskStrategy, { strategy: "auto_eliminate", maxAutoEliminateRetries: 10 });
});

test("normalizeDirectorAutoExecutionPlan: undefined plan returns highRiskStrategy undefined", () => {
  const result = normalizeDirectorAutoExecutionPlan(undefined);
  assert.equal(result.highRiskStrategy, undefined);
});

test("normalizeDirectorAutoExecutionPlan: plan without highRiskStrategy returns undefined", () => {
  const result = normalizeDirectorAutoExecutionPlan({ mode: "book" });
  assert.equal(result.highRiskStrategy, undefined);
});

// ---------------------------------------------------------------------------
// 6. buildFullBookAutopilotExecutionPlan accepts and passes through highRiskStrategy
// ---------------------------------------------------------------------------
test("buildFullBookAutopilotExecutionPlan: without highRiskStrategy returns plan without it", () => {
  const plan = buildFullBookAutopilotExecutionPlan();
  assert.equal(plan.mode, "book");
  assert.equal(plan.autoReview, true);
  assert.equal(plan.autoRepair, true);
  assert.equal(plan.highRiskStrategy, undefined);
});

test("buildFullBookAutopilotExecutionPlan: passes through highRiskStrategy", () => {
  const config = { strategy: "auto_eliminate", maxAutoEliminateRetries: 7 };
  const plan = buildFullBookAutopilotExecutionPlan(config);
  assert.deepEqual(plan.highRiskStrategy, config);
});
