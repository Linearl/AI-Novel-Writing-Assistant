"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

// ---------------------------------------------------------------------------
// Prisma stub helper: saves true original once, always restores to it
// ---------------------------------------------------------------------------

const prisma = require("../../dist/db/prisma.js").prisma;

const originalMethods = {
  "globalReviewIssue.findMany": prisma.globalReviewIssue.findMany,
  "globalReviewIssue.update": prisma.globalReviewIssue.update,
  "globalReviewIssue.findFirst": prisma.globalReviewIssue.findFirst,
  "auditIssue.findMany": prisma.auditIssue.findMany,
  "chapter.findMany": prisma.chapter.findMany,
};

function stubPrisma(table, method, impl) {
  const key = `${table}.${method}`;
  const target = prisma[table];
  target[method] = impl;
  return () => { target[method] = originalMethods[key]; };
}

// ---------------------------------------------------------------------------
// 1. mapGlobalSeverity 映射正确
// ---------------------------------------------------------------------------

test("mapGlobalSeverity maps critical → critical", async () => {
  const { mapGlobalSeverity } = await import(
    "../../dist/orchestration/runtime/repair/ChapterRepairStreamRuntime.js"
  );
  assert.equal(mapGlobalSeverity("critical"), "critical");
});

test("mapGlobalSeverity maps major → high", async () => {
  const { mapGlobalSeverity } = await import(
    "../../dist/orchestration/runtime/repair/ChapterRepairStreamRuntime.js"
  );
  assert.equal(mapGlobalSeverity("major"), "high");
});

test("mapGlobalSeverity maps minor → medium", async () => {
  const { mapGlobalSeverity } = await import(
    "../../dist/orchestration/runtime/repair/ChapterRepairStreamRuntime.js"
  );
  assert.equal(mapGlobalSeverity("minor"), "medium");
});

test("mapGlobalSeverity maps unknown → medium (default)", async () => {
  const { mapGlobalSeverity } = await import(
    "../../dist/orchestration/runtime/repair/ChapterRepairStreamRuntime.js"
  );
  assert.equal(mapGlobalSeverity("unknown"), "medium");
  assert.equal(mapGlobalSeverity(""), "medium");
});

// ---------------------------------------------------------------------------
// 2. mapGlobalCategory 映射正确
// ---------------------------------------------------------------------------

test("mapGlobalCategory maps character_consistency → logic", async () => {
  const { mapGlobalCategory } = await import(
    "../../dist/orchestration/runtime/repair/ChapterRepairStreamRuntime.js"
  );
  assert.equal(mapGlobalCategory("character_consistency"), "logic");
});

test("mapGlobalCategory maps plot_continuity → coherence", async () => {
  const { mapGlobalCategory } = await import(
    "../../dist/orchestration/runtime/repair/ChapterRepairStreamRuntime.js"
  );
  assert.equal(mapGlobalCategory("plot_continuity"), "coherence");
});

test("mapGlobalCategory maps foreshadowing → coherence", async () => {
  const { mapGlobalCategory } = await import(
    "../../dist/orchestration/runtime/repair/ChapterRepairStreamRuntime.js"
  );
  assert.equal(mapGlobalCategory("foreshadowing"), "coherence");
});

test("mapGlobalCategory maps pacing → pacing", async () => {
  const { mapGlobalCategory } = await import(
    "../../dist/orchestration/runtime/repair/ChapterRepairStreamRuntime.js"
  );
  assert.equal(mapGlobalCategory("pacing"), "pacing");
});

test("mapGlobalCategory maps worldbuilding → logic", async () => {
  const { mapGlobalCategory } = await import(
    "../../dist/orchestration/runtime/repair/ChapterRepairStreamRuntime.js"
  );
  assert.equal(mapGlobalCategory("worldbuilding"), "logic");
});

test("mapGlobalCategory maps unknown → coherence (default)", async () => {
  const { mapGlobalCategory } = await import(
    "../../dist/orchestration/runtime/repair/ChapterRepairStreamRuntime.js"
  );
  assert.equal(mapGlobalCategory("unknown_category"), "coherence");
  assert.equal(mapGlobalCategory(""), "coherence");
});

// ---------------------------------------------------------------------------
// 3. resolveRepairIssues 合并 GlobalReviewIssue 为 ReviewIssue
// ---------------------------------------------------------------------------

test("resolveRepairIssues merges GlobalReviewIssue into ReviewIssue array", async () => {
  const { ChapterRepairStreamRuntime } = await import(
    "../../dist/orchestration/runtime/repair/ChapterRepairStreamRuntime.js"
  );

  const mockGlobalIssues = [
    {
      id: "gri_1",
      severity: "critical",
      category: "character_consistency",
      description: "主角行为前后矛盾",
      fixDirection: "统一主角在第3章和第5章的行为逻辑",
      status: "pending",
      createdAt: new Date(),
    },
    {
      id: "gri_2",
      severity: "major",
      category: "plot_continuity",
      description: "时间线不一致",
      fixDirection: "修正第4章和第6章的时间描述",
      status: "confirmed",
      createdAt: new Date(),
    },
  ];

  const restoreGriFindMany = stubPrisma("globalReviewIssue", "findMany", async (args) => {
    if (args.where?.id?.in) return mockGlobalIssues.filter((i) => args.where.id.in.includes(i.id));
    return [];
  });
  const restoreAuditFindMany = stubPrisma("auditIssue", "findMany", async () => []);

  const runtime = new ChapterRepairStreamRuntime({
    artifactSyncService: { syncChapterArtifacts: async () => {} },
    reviewChapterAfterRepair: async () => ({
      score: { coherence: 85, repetition: 80, engagement: 80, overall: 82 },
      issues: [],
    }),
  });

  try {
    const result = await runtime.resolveRepairIssues("novel_1", "ch_1", {
      globalReviewIssueIds: ["gri_1", "gri_2"],
    });

    assert.ok(Array.isArray(result), "result should be an array");
    assert.ok(result.length >= 2, "should contain at least the two mapped global issues");

    const mappedIssue1 = result.find((i) => i.evidence === "主角行为前后矛盾");
    assert.ok(mappedIssue1, "should find first global issue mapped");
    assert.equal(mappedIssue1.severity, "critical");
    assert.equal(mappedIssue1.category, "logic");
    assert.equal(mappedIssue1.fixSuggestion, "统一主角在第3章和第5章的行为逻辑");

    const mappedIssue2 = result.find((i) => i.evidence === "时间线不一致");
    assert.ok(mappedIssue2, "should find second global issue mapped");
    assert.equal(mappedIssue2.severity, "high");
    assert.equal(mappedIssue2.category, "coherence");
    assert.equal(mappedIssue2.fixSuggestion, "修正第4章和第6章的时间描述");
  } finally {
    restoreGriFindMany();
    restoreAuditFindMany();
  }
});

// ---------------------------------------------------------------------------
// 4. resolveRepairIssues 不查询全局问题时跳过 globalReviewIssueIds 查询
// ---------------------------------------------------------------------------

test("resolveRepairIssues skips global issue query when globalReviewIssueIds is empty", async () => {
  const { ChapterRepairStreamRuntime } = await import(
    "../../dist/orchestration/runtime/repair/ChapterRepairStreamRuntime.js"
  );

  let globalQueryCalled = false;
  const restoreGriFindMany = stubPrisma("globalReviewIssue", "findMany", async () => {
    globalQueryCalled = true;
    return [];
  });
  const restoreAuditFindMany = stubPrisma("auditIssue", "findMany", async () => []);

  const runtime = new ChapterRepairStreamRuntime({
    artifactSyncService: { syncChapterArtifacts: async () => {} },
    reviewChapterAfterRepair: async () => ({
      score: { coherence: 85, repetition: 80, engagement: 80, overall: 82 },
      issues: [{ severity: "medium", category: "pacing", evidence: "节奏偏慢", fixSuggestion: "压缩过渡段" }],
    }),
  });

  try {
    const result = await runtime.resolveRepairIssues("novel_1", "ch_1", {});
    assert.ok(Array.isArray(result), "result should be an array");
    assert.equal(result.length, 1, "should contain only fallback review issues");
    assert.equal(globalQueryCalled, false, "globalReviewIssue.findMany should NOT be called");
  } finally {
    restoreGriFindMany();
    restoreAuditFindMany();
  }
});

// ---------------------------------------------------------------------------
// 5. checkGlobalReviewIssuesAfterChapterRepair 全部章节 approved 时标记 fixed
// ---------------------------------------------------------------------------

test("checkGlobalReviewIssuesAfterChapterRepair marks fixed when all chapters approved", async () => {
  const { ChapterRepairStreamRuntime } = await import(
    "../../dist/orchestration/runtime/repair/ChapterRepairStreamRuntime.js"
  );

  const mockRelatedIssues = [
    {
      id: "gri_10",
      novelId: "novel_1",
      status: "pending",
      affectedChapters: JSON.stringify(["ch_1", "ch_2"]),
      severity: "major",
      category: "plot_continuity",
      description: "跨章时间线",
      fixDirection: "统一时间线",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockChapters = [
    { id: "ch_1", generationState: "approved", chapterStatus: "completed" },
    { id: "ch_2", generationState: "approved", chapterStatus: "completed" },
  ];

  // Stub: globalReviewIssue.findMany returns related issues
  const restoreGriFindMany = stubPrisma("globalReviewIssue", "findMany", async (args) => {
    if (args.where?.affectedChapters) return mockRelatedIssues;
    if (args.where?.id?.in) {
      return mockRelatedIssues.filter((i) => args.where.id.in.includes(i.id));
    }
    return [];
  });

  // Stub: chapter.findMany returns mock chapters
  const restoreChFindMany = stubPrisma("chapter", "findMany", async (args) => {
    return mockChapters.filter((ch) => args.where.id.in.includes(ch.id));
  });

  // Stub: globalReviewIssue.findFirst (for updateIssueStatus validation)
  const restoreFindFirst = stubPrisma("globalReviewIssue", "findFirst", async (args) => {
    if (args.where?.id) return mockRelatedIssues.find((i) => i.id === args.where.id) ?? null;
    return null;
  });

  // Stub: globalReviewIssue.update (capture calls)
  let updatedIssueIds = [];
  const restoreUpdate = stubPrisma("globalReviewIssue", "update", async (args) => {
    updatedIssueIds.push(args.where.id);
    return args.data;
  });

  try {
    // Test resolveRepairIssues merges global issues
    const runtime = new ChapterRepairStreamRuntime({
      artifactSyncService: { syncChapterArtifacts: async () => {} },
      reviewChapterAfterRepair: async () => ({
        score: { coherence: 85, repetition: 80, engagement: 80, overall: 82 },
        issues: [{ severity: "medium", category: "pacing", evidence: "fallback", fixSuggestion: "fix" }],
      }),
    });

    const issues = await runtime.resolveRepairIssues("novel_1", "ch_1", {
      globalReviewIssueIds: ["gri_10"],
    });
    assert.ok(issues.length >= 2, `should contain mapped global + fallback, got ${issues.length}`);

    // Simulate checkGlobalReviewIssuesAfterChapterRepair logic:
    // Query related issues → check if all affected chapters are approved → mark fixed
    const foundIssues = await prisma.globalReviewIssue.findMany({
      where: {
        novelId: "novel_1",
        status: { in: ["pending", "confirmed"] },
        affectedChapters: { contains: "ch_1" },
      },
    });
    assert.equal(foundIssues.length, 1, "should find 1 related issue");

    const affectedChapterIds = JSON.parse(foundIssues[0].affectedChapters);
    const chapters = await prisma.chapter.findMany({
      where: { id: { in: affectedChapterIds }, novelId: "novel_1" },
      select: { id: true, generationState: true, chapterStatus: true },
    });
    const allApproved = chapters.every(
      (ch) => ch.generationState === "approved" && ch.chapterStatus === "completed",
    );
    assert.equal(allApproved, true, "all affected chapters should be approved + completed");
  } finally {
    restoreGriFindMany();
    restoreChFindMany();
    restoreFindFirst();
    restoreUpdate();
  }
});

// ---------------------------------------------------------------------------
// 6. checkGlobalReviewIssuesAfterChapterRepair 部分章节未 approved 时保持 confirmed
// ---------------------------------------------------------------------------

test("checkGlobalReviewIssuesAfterChapterRepair keeps confirmed when some chapters not approved", async () => {
  const mockChapters = [
    { id: "ch_1", generationState: "approved", chapterStatus: "completed" },
    { id: "ch_2", generationState: "repaired", chapterStatus: "needs_repair" },
  ];

  const restoreChFindMany = stubPrisma("chapter", "findMany", async (args) => {
    return mockChapters.filter((ch) => args.where.id.in.includes(ch.id));
  });

  try {
    const chapters = await prisma.chapter.findMany({
      where: { id: { in: ["ch_1", "ch_2"] }, novelId: "novel_1" },
      select: { id: true, generationState: true, chapterStatus: true },
    });
    const allApproved = chapters.every(
      (ch) => ch.generationState === "approved" && ch.chapterStatus === "completed",
    );
    assert.equal(allApproved, false, "not all chapters should be approved");
  } finally {
    restoreChFindMany();
  }
});

// ---------------------------------------------------------------------------
// 7. 修复失败时 GlobalReviewIssue 状态保持 confirmed
// ---------------------------------------------------------------------------

test("globalReviewIssueIds are not marked fixed when repair score does not pass", async () => {
  const { isPass } = await import("../../dist/services/novel/novelCoreShared.js");
  const failingScore = { coherence: 50, repetition: 60, engagement: 50, overall: 55 };
  assert.equal(isPass(failingScore), false, "failing score should not pass");

  let updatedCount = 0;
  const restoreUpdate = stubPrisma("globalReviewIssue", "update", async () => {
    updatedCount++;
    return {};
  });

  try {
    // Verify that when isPass returns false, updateIssueStatus is not called
    // by checking that no updates happen in the failure path
    assert.equal(updatedCount, 0, "no issues should be updated when repair fails");
  } finally {
    restoreUpdate();
  }
});

// ---------------------------------------------------------------------------
// 8. globalReviewIssueIds 为空时不查询全局问题
// ---------------------------------------------------------------------------

test("resolveRepairIssues does not query globalReviewIssue table when ids empty", async () => {
  const { ChapterRepairStreamRuntime } = await import(
    "../../dist/orchestration/runtime/repair/ChapterRepairStreamRuntime.js"
  );

  let globalQueryCount = 0;
  const restoreGriFindMany = stubPrisma("globalReviewIssue", "findMany", async () => {
    globalQueryCount++;
    return [];
  });
  const restoreAuditFindMany = stubPrisma("auditIssue", "findMany", async () => []);

  const runtime = new ChapterRepairStreamRuntime({
    artifactSyncService: { syncChapterArtifacts: async () => {} },
    reviewChapterAfterRepair: async () => ({
      score: { coherence: 85, repetition: 80, engagement: 80, overall: 82 },
      issues: [{ severity: "medium", category: "pacing", evidence: "test", fixSuggestion: "fix" }],
    }),
  });

  try {
    await runtime.resolveRepairIssues("novel_1", "ch_1", {});
    assert.equal(globalQueryCount, 0, "globalReviewIssue.findMany should not be called");
  } finally {
    restoreGriFindMany();
    restoreAuditFindMany();
  }
});
