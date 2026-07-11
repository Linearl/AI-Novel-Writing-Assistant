const test = require("node:test");
const assert = require("node:assert/strict");

const {
  DirectorWorkspaceAnalyzer,
  buildManualEditFallbackDecision,
  buildManualEditInventoryFromArtifacts,
} = require("../../dist/services/novel/director/runtime/DirectorWorkspaceAnalyzer.js");
const { prisma } = require("../../dist/db/prisma.js");
const promptRunner = require("../../dist/prompting/core/promptRunner.js");
const promptContextResolution = require("../../dist/prompting/context/promptContextResolution.js");

function chapterDraft(hash) {
  return {
    id: "chapter_draft:chapter:chapter-1:Chapter:chapter-1",
    novelId: "novel-1",
    artifactType: "chapter_draft",
    targetType: "chapter",
    targetId: "chapter-1",
    version: 1,
    status: "active",
    source: "user_edited",
    contentRef: { table: "Chapter", id: "chapter-1" },
    contentHash: hash,
    schemaVersion: "test",
    protectedUserContent: true,
    updatedAt: "2026-04-28T01:00:00.000Z",
  };
}

test("manual edit inventory detects changed chapter draft hashes and dependent reports", () => {
  const currentDraft = chapterDraft("hash-new");
  const inventory = buildManualEditInventoryFromArtifacts({
    novelId: "novel-1",
    artifacts: [
      currentDraft,
      {
        id: "audit_report:chapter:chapter-1:AuditReport:audit-1",
        novelId: "novel-1",
        artifactType: "audit_report",
        targetType: "chapter",
        targetId: "chapter-1",
        version: 1,
        status: "active",
        source: "backfilled",
        contentRef: { table: "AuditReport", id: "audit-1" },
        schemaVersion: "test",
        dependsOn: [{ artifactId: currentDraft.id, version: 1 }],
      },
    ],
    previousArtifacts: [chapterDraft("hash-old")],
    chapterMetaById: {
      "chapter-1": {
        title: "第一章",
        order: 1,
        changedAt: "2026-04-28T01:00:00.000Z",
      },
    },
    generatedAt: "2026-04-28T01:01:00.000Z",
  });

  assert.equal(inventory.changedChapters.length, 1);
  assert.equal(inventory.changedChapters[0].chapterId, "chapter-1");
  assert.equal(inventory.changedChapters[0].contentHash, "hash-new");
  assert.equal(inventory.changedChapters[0].previousContentHash, "hash-old");
  assert.deepEqual(inventory.changedChapters[0].relatedArtifactIds.sort(), [
    "audit_report:chapter:chapter-1:AuditReport:audit-1",
    "chapter_draft:chapter:chapter-1:Chapter:chapter-1",
  ].sort());
});

test("manual edit fallback recommends local review for changed chapters", () => {
  const inventory = buildManualEditInventoryFromArtifacts({
    novelId: "novel-1",
    artifacts: [chapterDraft("hash-new")],
    previousArtifacts: [chapterDraft("hash-old")],
    chapterMetaById: {
      "chapter-1": {
        title: "第一章",
        order: 1,
      },
    },
    generatedAt: "2026-04-28T01:01:00.000Z",
  });
  const decision = buildManualEditFallbackDecision(inventory);

  assert.equal(decision.impactLevel, "low");
  assert.equal(decision.safeToContinue, true);
  assert.equal(decision.requiresApproval, false);
  assert.equal(decision.minimalRepairPath[0].action, "review_recent_chapters");
  assert.equal(decision.affectedArtifactIds.includes("chapter_draft:chapter:chapter-1:Chapter:chapter-1"), true);
});

test("manual edit inventory stays empty when tracked hashes did not change", () => {
  const inventory = buildManualEditInventoryFromArtifacts({
    novelId: "novel-1",
    artifacts: [chapterDraft("hash-same")],
    previousArtifacts: [chapterDraft("hash-same")],
    chapterMetaById: {
      "chapter-1": {
        title: "第一章",
        order: 1,
      },
    },
  });
  const decision = buildManualEditFallbackDecision(inventory);

  assert.equal(inventory.changedChapters.length, 0);
  assert.equal(decision.impactLevel, "none");
  assert.equal(decision.safeToContinue, true);
});

test("workspace analyzer uses structured AI interpretation when requested", async (t) => {
  const originalResolve = promptContextResolution.resolvePromptContextBlocksForAsset;
  const originalFindUnique = prisma.novel.findUnique;
  const structuredCalls = [];
  prisma.novel.findUnique = async () => ({ id: "novel-1", title: "测试小说" });
  promptContextResolution.resolvePromptContextBlocksForAsset = async ({ fallbackBlocks }) => ({
    blocks: fallbackBlocks,
    brokerResolution: {},
  });
  promptRunner.setPromptRunnerStructuredInvokerForTests(async (input) => {
    structuredCalls.push(input);
    return {
      data: {
        productionStage: "has_seed",
        missingArtifacts: ["book_contract"],
        staleArtifacts: [],
        protectedUserContent: [],
        recommendedAction: {
          action: "create_book_contract",
          reason: "AI 判断应先建立书约。",
          affectedScope: "novel",
          riskLevel: "low",
        },
        confidence: 0.82,
        evidenceRefs: ["workspace_inventory"],
        summary: "AI workspace summary",
        riskNotes: [],
      },
      repairUsed: false,
      repairAttempts: 0,
      diagnostics: {},
    };
  });
  t.after(() => {
    promptContextResolution.resolvePromptContextBlocksForAsset = originalResolve;
    promptRunner.setPromptRunnerStructuredInvokerForTests();
    prisma.novel.findUnique = originalFindUnique;
  });

  const recorded = [];
  const analyzer = new DirectorWorkspaceAnalyzer({
    recordWorkspaceAnalysis: async (input) => recorded.push(input),
  });
  analyzer.buildInventory = async () => ({
    novelId: "novel-1",
    novelTitle: "测试小说",
    hasBookContract: false,
    hasStoryMacro: false,
    hasCharacters: false,
    hasVolumeStrategy: false,
    hasChapterPlan: false,
    chapterCount: 0,
    draftedChapterCount: 0,
    approvedChapterCount: 0,
    pendingRepairChapterCount: 0,
    hasActivePipelineJob: false,
    hasActiveDirectorRun: false,
    hasWorldBinding: false,
    hasSourceKnowledge: true,
    hasContinuationAnalysis: false,
    missingArtifactTypes: ["book_contract"],
    staleArtifacts: [],
    protectedUserContentArtifacts: [],
    needsRepairArtifacts: [],
    artifacts: [],
  });

  const analysis = await analyzer.analyze({
    novelId: "novel-1",
    workflowTaskId: "task-1",
    includeAiInterpretation: true,
  });

  assert.equal(structuredCalls.length, 1);
  assert.equal(structuredCalls[0].label, "novel.director.workspace_analysis@v1");
  assert.equal(analysis.prompt.promptId, "novel.director.workspace_analysis");
  assert.equal(analysis.interpretation.summary, "AI workspace summary");
  assert.equal(analysis.recommendation.reason, "AI 判断应先建立书约。");
  assert.equal(recorded.length, 1);
  assert.equal(recorded[0].analysis.prompt.promptId, "novel.director.workspace_analysis");
});

test("workspace analyzer defaults to deterministic inventory interpretation", async (t) => {
  const structuredCalls = [];
  promptRunner.setPromptRunnerStructuredInvokerForTests(async (input) => {
    structuredCalls.push(input);
    throw new Error("structured LLM should not be called by default");
  });

  // Save original prisma methods for restore
  const originals = {
    novelFindUnique: prisma.novel.findUnique,
    bookContractFindUnique: prisma.bookContract?.findUnique,
    storyMacroPlanFindUnique: prisma.storyMacroPlan?.findUnique,
    characterCount: prisma.character?.count,
    characterFindFirst: prisma.character?.findFirst,
    volumePlanFindMany: prisma.volumePlan?.findMany,
    volumeChapterPlanCount: prisma.volumeChapterPlan?.count,
    volumeChapterPlanFindMany: prisma.volumeChapterPlan?.findMany,
    worldFindUnique: prisma.world?.findUnique,
    knowledgeDocumentFindUnique: prisma.knowledgeDocument?.findUnique,
    bookAnalysisFindUnique: prisma.bookAnalysis?.findUnique,
    chapterFindMany: prisma.chapter?.findMany,
    qualityReportFindMany: prisma.qualityReport?.findMany,
    auditReportFindMany: prisma.auditReport?.findMany,
    storyStateSnapshotFindMany: prisma.storyStateSnapshot?.findMany,
    payoffLedgerItemFindMany: prisma.payoffLedgerItem?.findMany,
    characterResourceLedgerItemFindMany: prisma.characterResourceLedgerItem?.findMany,
    generationJobFindFirst: prisma.generationJob?.findFirst,
    novelWorkflowTaskFindFirst: prisma.novelWorkflowTask?.findFirst,
    directorArtifactFindMany: prisma.directorArtifact?.findMany,
  };

  // Mock novel findUnique (with continuationSetupJson for hasSourceKnowledge)
  prisma.novel.findUnique = async () => ({
    id: "novel-1",
    title: "测试小说",
    worldId: null,
    continuationSetupJson: JSON.stringify({ sourceKnowledgeDocumentId: "kd-1" }),
    updatedAt: new Date(),
  });

  // Mock all plan-data calls to return empty/null (no contracts, characters, volumes)
  if (prisma.bookContract) prisma.bookContract.findUnique = async () => null;
  if (prisma.storyMacroPlan) prisma.storyMacroPlan.findUnique = async () => null;
  if (prisma.character) prisma.character.count = async () => 0;
  if (prisma.character) prisma.character.findFirst = async () => null;
  if (prisma.volumePlan) prisma.volumePlan.findMany = async () => [];
  if (prisma.volumeChapterPlan) prisma.volumeChapterPlan.count = async () => 0;
  if (prisma.volumeChapterPlan) prisma.volumeChapterPlan.findMany = async () => [];
  // worldId is null, so world is not queried
  if (prisma.knowledgeDocument) prisma.knowledgeDocument.findUnique = async () => ({
    id: "kd-1",
    activeVersionId: "v1",
    activeVersionNumber: 1,
    updatedAt: new Date(),
  });
  if (prisma.bookAnalysis) prisma.bookAnalysis.findUnique = async () => null;

  // Mock all chapter/state-data calls to return empty
  if (prisma.chapter) prisma.chapter.findMany = async () => [];
  if (prisma.qualityReport) prisma.qualityReport.findMany = async () => [];
  if (prisma.auditReport) prisma.auditReport.findMany = async () => [];
  if (prisma.storyStateSnapshot) prisma.storyStateSnapshot.findMany = async () => [];
  if (prisma.payoffLedgerItem) prisma.payoffLedgerItem.findMany = async () => [];
  if (prisma.characterResourceLedgerItem) prisma.characterResourceLedgerItem.findMany = async () => [];
  if (prisma.generationJob) prisma.generationJob.findFirst = async () => null;
  if (prisma.novelWorkflowTask) prisma.novelWorkflowTask.findFirst = async () => null;
  if (prisma.directorArtifact) prisma.directorArtifact.findMany = async () => [];

  t.after(() => {
    promptRunner.setPromptRunnerStructuredInvokerForTests();
    // Restore all prisma methods
    prisma.novel.findUnique = originals.novelFindUnique;
    if (prisma.bookContract && originals.bookContractFindUnique) prisma.bookContract.findUnique = originals.bookContractFindUnique;
    if (prisma.storyMacroPlan && originals.storyMacroPlanFindUnique) prisma.storyMacroPlan.findUnique = originals.storyMacroPlanFindUnique;
    if (prisma.character && originals.characterCount) prisma.character.count = originals.characterCount;
    if (prisma.character && originals.characterFindFirst) prisma.character.findFirst = originals.characterFindFirst;
    if (prisma.volumePlan && originals.volumePlanFindMany) prisma.volumePlan.findMany = originals.volumePlanFindMany;
    if (prisma.volumeChapterPlan && originals.volumeChapterPlanCount) prisma.volumeChapterPlan.count = originals.volumeChapterPlanCount;
    if (prisma.volumeChapterPlan && originals.volumeChapterPlanFindMany) prisma.volumeChapterPlan.findMany = originals.volumeChapterPlanFindMany;
    if (prisma.world && originals.worldFindUnique) prisma.world.findUnique = originals.worldFindUnique;
    if (prisma.knowledgeDocument && originals.knowledgeDocumentFindUnique) prisma.knowledgeDocument.findUnique = originals.knowledgeDocumentFindUnique;
    if (prisma.bookAnalysis && originals.bookAnalysisFindUnique) prisma.bookAnalysis.findUnique = originals.bookAnalysisFindUnique;
    if (prisma.chapter && originals.chapterFindMany) prisma.chapter.findMany = originals.chapterFindMany;
    if (prisma.qualityReport && originals.qualityReportFindMany) prisma.qualityReport.findMany = originals.qualityReportFindMany;
    if (prisma.auditReport && originals.auditReportFindMany) prisma.auditReport.findMany = originals.auditReportFindMany;
    if (prisma.storyStateSnapshot && originals.storyStateSnapshotFindMany) prisma.storyStateSnapshot.findMany = originals.storyStateSnapshotFindMany;
    if (prisma.payoffLedgerItem && originals.payoffLedgerItemFindMany) prisma.payoffLedgerItem.findMany = originals.payoffLedgerItemFindMany;
    if (prisma.characterResourceLedgerItem && originals.characterResourceLedgerItemFindMany) prisma.characterResourceLedgerItem.findMany = originals.characterResourceLedgerItemFindMany;
    if (prisma.generationJob && originals.generationJobFindFirst) prisma.generationJob.findFirst = originals.generationJobFindFirst;
    if (prisma.novelWorkflowTask && originals.novelWorkflowTaskFindFirst) prisma.novelWorkflowTask.findFirst = originals.novelWorkflowTaskFindFirst;
    if (prisma.directorArtifact && originals.directorArtifactFindMany) prisma.directorArtifact.findMany = originals.directorArtifactFindMany;
  });

  const analyzer = new DirectorWorkspaceAnalyzer({
    recordWorkspaceAnalysis: async () => {},
  });

  const analysis = await analyzer.analyze({
    novelId: "novel-1",
  });

  assert.equal(structuredCalls.length, 0);
  assert.equal(analysis.prompt, null);
  assert.equal(analysis.interpretation.productionStage, "has_seed");
  assert.equal(analysis.recommendation.action, "create_book_contract");
});
