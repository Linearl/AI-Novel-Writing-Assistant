/**
 * REQ-7071: 待审自动提升 — 单元测试
 *
 * 测试 buildPreview 核心分流逻辑：去重、冲突检测三规则、runLimit。
 * Store 通过依赖注入 mock，不依赖真实数据库。
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  PendingReviewAutoPromotionService,
} = require("../dist/services/novel/state/PendingReviewAutoPromotionService.js");

const {
  PENDING_REVIEW_AUTO_PROMOTION_ELIGIBLE_AFTER_DAYS,
  PENDING_REVIEW_AUTO_PROMOTION_RUN_LIMIT,
} = require("../dist/services/novel/state/pendingReviewAutoPromotionPolicy.js");

// ─── Helpers ───────────────────────────────────────────────────────────

function fixedDate(iso) {
  return () => new Date(iso);
}

function agoDays(days, base = "2026-07-16T00:00:00.000Z") {
  const d = new Date(base);
  d.setDate(d.getDate() - days);
  return d;
}

function makeProposalRow(overrides = {}) {
  return {
    id: overrides.id ?? "p-001",
    novelId: overrides.novelId ?? "novel-1",
    chapterId: overrides.chapterId ?? null,
    sourceSnapshotId: null,
    sourceType: "auto_director",
    sourceStage: "chapter_execution",
    proposalType: overrides.proposalType ?? "relation_state_update",
    riskLevel: "medium",
    status: "pending_review",
    summary: overrides.summary ?? "测试提案",
    payloadJson: JSON.stringify(overrides.payload ?? {
      sourceCharacterId: "c-a",
      targetCharacterId: "c-b",
    }),
    evidenceJson: "[]",
    validationNotesJson: "[]",
    createdAt: overrides.createdAt ?? agoDays(30),
    updatedAt: null,
  };
}

function makeConflictRow(overrides = {}) {
  return {
    id: overrides.id ?? "conflict-001",
    chapterId: overrides.chapterId ?? null,
    conflictType: "story_logic",
    conflictKey: overrides.conflictKey ?? "test-conflict",
    title: overrides.title ?? "测试冲突",
    summary: overrides.summary ?? "冲突描述",
    severity: "medium",
    affectedCharacterIdsJson: overrides.affectedCharacterIdsJson ?? null,
    evidenceJson: "[]",
    resolutionHint: null,
    lastSeenChapterOrder: null,
    updatedAt: null,
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────

test.describe("PendingReviewAutoPromotionService — buildPreview", () => {
  test.it("空提案集返回空结果", async () => {
    const now = fixedDate("2026-07-16T00:00:00Z");
    const svc = new PendingReviewAutoPromotionService({
      now,
      proposalStore: { findMany: async () => [], update: async () => {} },
      conflictStore: { findMany: async () => [] },
    });
    const result = await svc.preview("novel-1", { since: "2026-01-01" });

    assert.strictEqual(result.scannedCount, 0);
    assert.strictEqual(result.promotable.length, 0);
    assert.strictEqual(result.superseded.length, 0);
    assert.strictEqual(result.conflictSkipped.length, 0);
    assert.strictEqual(result.deferredByRunLimit.length, 0);
    assert.ok(result.dryRun);
  });

  test.it("无冲突提案归入 promotable", async () => {
    const now = fixedDate("2026-07-16T00:00:00Z");
    const row = makeProposalRow({
      proposalType: "relation_state_update",
      payload: { sourceCharacterId: "c-a", targetCharacterId: "c-b" },
      createdAt: agoDays(30),
    });
    const svc = new PendingReviewAutoPromotionService({
      now,
      proposalStore: { findMany: async () => [row], update: async () => {} },
      conflictStore: { findMany: async () => [] },
    });
    const result = await svc.preview("novel-1", { since: "2026-01-01" });

    assert.strictEqual(result.scannedCount, 1);
    assert.strictEqual(result.promotable.length, 1);
    assert.strictEqual(result.promotable[0].proposalId, "p-001");
    assert.strictEqual(result.superseded.length, 0);
    assert.strictEqual(result.conflictSkipped.length, 0);
  });

  test.it("同 subjectKey 只保留最新一条（去重）", async () => {
    const now = fixedDate("2026-07-16T00:00:00Z");
    const payload = { sourceCharacterId: "c-a", targetCharacterId: "c-b" };
    const older = makeProposalRow({
      id: "p-old",
      proposalType: "relation_state_update",
      payload,
      createdAt: agoDays(35),
    });
    const newer = makeProposalRow({
      id: "p-new",
      proposalType: "relation_state_update",
      payload,
      createdAt: agoDays(20),
    });
    const svc = new PendingReviewAutoPromotionService({
      now,
      proposalStore: { findMany: async () => [older, newer], update: async () => {} },
      conflictStore: { findMany: async () => [] },
    });
    const result = await svc.preview("novel-1", { since: "2026-01-01" });

    assert.strictEqual(result.scannedCount, 2);
    assert.strictEqual(result.promotable.length, 1, "最新一条进入 promotable");
    assert.strictEqual(result.promotable[0].proposalId, "p-new");
    assert.strictEqual(result.superseded.length, 1, "旧提案进入 superseded");
    assert.strictEqual(result.superseded[0].proposalId, "p-old");
  });

  test.it("same_chapter 冲突跳过", async () => {
    const now = fixedDate("2026-07-16T00:00:00Z");
    const chapterId = "ch-001";
    const row = makeProposalRow({
      chapterId,
      proposalType: "relation_state_update",
      payload: { sourceCharacterId: "c-a", targetCharacterId: "c-b" },
      createdAt: agoDays(30),
    });
    const conflict = makeConflictRow({
      chapterId,
      title: "同章节冲突",
    });
    const svc = new PendingReviewAutoPromotionService({
      now,
      proposalStore: { findMany: async () => [row], update: async () => {} },
      conflictStore: { findMany: async () => [conflict] },
    });
    const result = await svc.preview("novel-1", { since: "2026-01-01" });

    assert.strictEqual(result.conflictSkipped.length, 1);
    assert.strictEqual(result.conflictSkipped[0].conflicts[0].reason, "same_chapter");
    assert.strictEqual(result.promotable.length, 0);
  });

  test.it("affected_character 冲突跳过", async () => {
    const now = fixedDate("2026-07-16T00:00:00Z");
    const row = makeProposalRow({
      proposalType: "relation_state_update",
      payload: { sourceCharacterId: "c-a", targetCharacterId: "c-z" },
      createdAt: agoDays(30),
    });
    const conflict = makeConflictRow({
      chapterId: "ch-other",
      title: "角色冲突",
      affectedCharacterIdsJson: JSON.stringify(["c-a"]),
    });
    const svc = new PendingReviewAutoPromotionService({
      now,
      proposalStore: { findMany: async () => [row], update: async () => {} },
      conflictStore: { findMany: async () => [conflict] },
    });
    const result = await svc.preview("novel-1", { since: "2026-01-01" });

    assert.strictEqual(result.conflictSkipped.length, 1);
    assert.strictEqual(result.conflictSkipped[0].conflicts[0].reason, "affected_character");
    assert.strictEqual(result.promotable.length, 0);
  });

  test.it("matched_fact 冲突跳过（information_disclosure）", async () => {
    const now = fixedDate("2026-07-16T00:00:00Z");
    const row = makeProposalRow({
      proposalType: "information_disclosure",
      payload: { holderType: "character", holderRefId: "c-a", fact: "张三是叛徒" },
      createdAt: agoDays(30),
    });
    const conflict = makeConflictRow({
      title: "张三是叛徒",
      conflictKey: "zhangsan_is_traitor",
      summary: "张三是叛徒需要确认",
    });
    const svc = new PendingReviewAutoPromotionService({
      now,
      proposalStore: { findMany: async () => [row], update: async () => {} },
      conflictStore: { findMany: async () => [conflict] },
    });
    const result = await svc.preview("novel-1", { since: "2026-01-01" });

    assert.strictEqual(result.conflictSkipped.length, 1);
    assert.strictEqual(result.conflictSkipped[0].conflicts[0].reason, "matched_fact");
    assert.strictEqual(result.promotable.length, 0);
  });

  test.it("runLimit 生效——超出部分进入 deferredByRunLimit", async () => {
    const now = fixedDate("2026-07-16T00:00:00Z");
    // 10 个不同 subjectKey 的提案，每个组 1 条，limit=3 → 3 promotable + 7 deferred
    const rows = Array.from({ length: 10 }, (_, i) =>
      makeProposalRow({
        id: `p-${String(i).padStart(3, "0")}`,
        proposalType: "relation_state_update",
        payload: {
          sourceCharacterId: `c-${i}-a`,
          targetCharacterId: `c-${i}-b`,
        },
        createdAt: agoDays(30 + i),
      }),
    );
    const svc = new PendingReviewAutoPromotionService({
      now,
      proposalStore: { findMany: async () => rows, update: async () => {} },
      conflictStore: { findMany: async () => [] },
    });
    const result = await svc.preview("novel-1", {
      since: "2026-01-01",
      runLimit: 3,
    });

    assert.strictEqual(result.promotable.length, 3);
    assert.strictEqual(result.deferredByRunLimit.length, 7);
    assert.strictEqual(result.criteria.runLimit, 3);
  });

  test.it("dryRun 模式不执行写操作", async () => {
    const now = fixedDate("2026-07-16T00:00:00Z");
    let updated = false;
    const row = makeProposalRow({
      proposalType: "relation_state_update",
      payload: { sourceCharacterId: "c-a", targetCharacterId: "c-b" },
      createdAt: agoDays(30),
    });
    const svc = new PendingReviewAutoPromotionService({
      now,
      proposalStore: {
        findMany: async () => [row],
        update: async () => { updated = true; },
      },
      conflictStore: { findMany: async () => [] },
    });
    const result = await svc.apply("novel-1", {
      since: "2026-01-01",
      dryRun: true,
    });

    assert.ok(result.dryRun);
    assert.strictEqual(result.commitResult, null);
    assert.strictEqual(updated, false, "dryRun 下不执行数据库写入");
  });

  test.it("eligibleAfterDays 自定义阈值可覆盖默认值", async () => {
    const now = fixedDate("2026-07-16T00:00:00Z");
    const row = makeProposalRow({
      proposalType: "relation_state_update",
      payload: { sourceCharacterId: "c-a", targetCharacterId: "c-b" },
      createdAt: agoDays(14),
    });
    const svc = new PendingReviewAutoPromotionService({
      now,
      proposalStore: { findMany: async () => [row], update: async () => {} },
      conflictStore: { findMany: async () => [] },
    });
    // 自定义阈值为 7 天
    const result = await svc.preview("novel-1", {
      since: "2026-01-01",
      eligibleAfterDays: 7,
    });

    assert.strictEqual(result.criteria.eligibleAfterDays, 7);
    // 行被扫描到（mock 不过滤，由 Prisma 在实际查询时按 lte 条件过滤）
    assert.strictEqual(result.scannedCount, 1);
  });

  test.it("prefix 阈值会自动钳位", async () => {
    const now = fixedDate("2026-07-16T00:00:00Z");
    const svc = new PendingReviewAutoPromotionService({
      now,
      proposalStore: { findMany: async () => [], update: async () => {} },
      conflictStore: { findMany: async () => [] },
    });
    // 传入 0 会被 clamp 到 1
    const result = await svc.preview("novel-1", {
      since: "2026-01-01",
      eligibleAfterDays: 0,
      runLimit: 0,
    });
    assert.strictEqual(result.criteria.eligibleAfterDays, 1);
    assert.strictEqual(result.criteria.runLimit, 1);
  });
});

// ─── 策略常量验证 ──────────────────────────────────────────────────────

test.describe("pendingReviewAutoPromotionPolicy", () => {
  test.it("默认阈值为 14 天", () => {
    assert.strictEqual(PENDING_REVIEW_AUTO_PROMOTION_ELIGIBLE_AFTER_DAYS, 14);
  });

  test.it("默认 runLimit 为 50", () => {
    assert.strictEqual(PENDING_REVIEW_AUTO_PROMOTION_RUN_LIMIT, 50);
  });
});
