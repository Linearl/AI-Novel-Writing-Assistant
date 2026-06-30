import { prisma } from "../../db/prisma";
import type { PromptContextBlock } from "../../prompting/core/promptTypes";
import { characterDynamicsQueryService } from "../novel/dynamics/CharacterDynamicsQueryService";
import { contextAssemblyService } from "../novel/production/ContextAssemblyService";
import { buildStateContextBlockFromCanonical } from "../novel/state/CanonicalStateService";
import { payoffLedgerSyncService } from "../payoff/PayoffLedgerSyncService";
import { mapRowToPlan } from "../novel/storyMacro/storyMacroPlanPersistence";
import {
  buildDefaultPlanMetadata,
} from "./plannerPlanMetadata";
import {
  buildChapterPlanContextBlocks,
} from "./plannerContextBlocks";
import {
  buildCurrentVolumeWindowSummary,
  buildPlannerCharacterDynamicsContext,
  buildPlannerPayoffLedgerContext,
  buildPlannerStoryModeBlock,
  buildStoryMacroSummary,
  type PlannerMappedVolume,
} from "./plannerContextHelpers";
import {
  compactText,
  plannerStoryModeSelect,
  takeUnique,
  buildPlannerStateDrivenDirective,
  buildPlannerStateGoalText,
} from "./plannerHelpers";

interface GenerateChapterPlanContextInput {
  novelId: string;
  chapterId: string;
  options: {
    taskStyleProfileId?: string;
    replanContext?: {
      reason: string;
      triggerType: string;
      triggerReason?: string;
      windowReason?: string;
      whyTheseChapters?: string;
      sourceIssueIds: string[];
      windowIndex: number;
      windowSize: number;
      affectedChapterOrders: number[];
      anchorChapterOrder?: number | null;
      blockingLedgerKeys?: string[];
      replannedFromPlanId: string | null;
    };
  };
  getBookPlan: (novelId: string) => Promise<any>;
  listArcPlans: (novelId: string) => Promise<any[]>;
  resolveStyleEngine: (novelId: string, chapterId?: string, taskStyleProfileId?: string) => Promise<string>;
}

function buildReplanContextBlock(replanContext: NonNullable<GenerateChapterPlanContextInput["options"]["replanContext"]>): string {
  return [
    `重规划原因：${replanContext.reason}`,
    `触发类型：${replanContext.triggerType}`,
    replanContext.triggerReason
      ? `状态触发理由：${replanContext.triggerReason}`
      : "",
    replanContext.windowReason
      ? `选窗理由：${replanContext.windowReason}`
      : "",
    replanContext.whyTheseChapters
      ? `为何改这几章：${replanContext.whyTheseChapters}`
      : "",
    `重规划窗口：第 ${replanContext.affectedChapterOrders.join("、")} 章`,
    typeof replanContext.anchorChapterOrder === "number"
      ? `锚点章节：第 ${replanContext.anchorChapterOrder} 章`
      : "",
    replanContext.sourceIssueIds.length > 0
      ? `来源问题：${replanContext.sourceIssueIds.join("、")}`
      : "",
    replanContext.blockingLedgerKeys?.length
      ? `账本风险：${replanContext.blockingLedgerKeys.join("、")}`
      : "",
    replanContext.replannedFromPlanId
      ? `上一版计划：${replanContext.replannedFromPlanId}`
      : "",
  ].filter(Boolean).join("\n");
}

function mapVolumePlansToPlannerVolumes(
  volumePlans: any[],
  novelId: string,
): PlannerMappedVolume[] {
  const mappedVolumes = volumePlans.map((volume) => ({
    id: volume.id,
    novelId,
    sortOrder: volume.sortOrder,
    title: volume.title,
    summary: volume.summary,
    mainPromise: volume.mainPromise,
    escalationMode: volume.escalationMode,
    protagonistChange: volume.protagonistChange,
    climax: volume.climax,
    nextVolumeHook: volume.nextVolumeHook,
    resetPoint: volume.resetPoint,
    openPayoffs: volume.openPayoffsJson ? JSON.parse(volume.openPayoffsJson) as string[] : [],
    status: volume.status,
    sourceVersionId: volume.sourceVersionId,
    chapters: volume.chapters.map((item: any) => ({
      id: item.id,
      volumeId: item.volumeId,
      chapterOrder: item.chapterOrder,
      title: item.title,
      summary: item.summary,
      purpose: item.purpose,
      conflictLevel: item.conflictLevel,
      revealLevel: item.revealLevel,
      targetWordCount: item.targetWordCount,
      mustAvoid: item.mustAvoid,
      taskSheet: item.taskSheet,
      payoffRefs: item.payoffRefsJson ? JSON.parse(item.payoffRefsJson) as string[] : [],
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
    createdAt: volume.createdAt.toISOString(),
    updatedAt: volume.updatedAt.toISOString(),
  }));
  return mappedVolumes.map((volume) => ({
    sortOrder: volume.sortOrder,
    title: volume.title,
    summary: volume.summary,
    mainPromise: volume.mainPromise,
    climax: volume.climax,
    openPayoffs: volume.openPayoffs,
    updatedAt: volume.updatedAt,
    chapters: volume.chapters.map((item: any) => ({
      chapterOrder: item.chapterOrder,
      title: item.title,
      summary: item.summary,
    })),
  }));
}

interface ChapterPlanContextResult {
  novel: any;
  chapter: any;
  bible: any;
  plotBeats: any[];
  summaries: any[];
  characters: any[];
  bookPlan: any;
  arcPlans: any[];
  recentDecisions: any[];
  openAuditIssues: string[];
  styleEngine: string;
  plannerVolumes: PlannerMappedVolume[];
  storyModeBlock: string;
  defaultMetadata: any;
  resolvedStateDrivenContext: any;
  plannerStateGoalText: string;
  replanContextBlock: string;
  contextBlocks: PromptContextBlock[];
  outputScopeLabel: string;
}

async function fetchChapterPlanContext(input: GenerateChapterPlanContextInput): Promise<ChapterPlanContextResult> {
  const { novelId, chapterId, options, getBookPlan, listArcPlans, resolveStyleEngine } = input;
  const [novel, chapter, bible, plotBeats, summaries, characters, bookPlan, arcPlans, volumePlans, recentAuditReports, recentDecisions, storyMacroPlanRow, styleEngine, pendingReviewProposalCount] = await Promise.all([
    prisma.novel.findUnique({
      where: { id: novelId },
      select: {
        id: true,
        title: true,
        description: true,
        outline: true,
        structuredOutline: true,
        estimatedChapterCount: true,
        genre: { select: { name: true } },
        targetAudience: true,
        bookSellingPoint: true,
        competingFeel: true,
        first30ChapterPromise: true,
        narrativePov: true,
        pacePreference: true,
        emotionIntensity: true,
        styleTone: true,
        primaryStoryMode: { select: plannerStoryModeSelect },
        secondaryStoryMode: { select: plannerStoryModeSelect },
      },
    }),
    prisma.chapter.findFirst({
      where: { id: chapterId, novelId },
      select: {
        id: true,
        title: true,
        order: true,
        expectation: true,
        content: true,
        targetWordCount: true,
        conflictLevel: true,
        revealLevel: true,
        mustAvoid: true,
        hook: true,
        taskSheet: true,
        sceneCards: true,
      },
    }),
    prisma.novelBible.findUnique({
      where: { novelId },
      select: { rawContent: true },
    }),
    prisma.plotBeat.findMany({
      where: { novelId },
      orderBy: { chapterOrder: "asc" },
      take: 8,
    }),
    prisma.chapterSummary.findMany({
      where: { novelId },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.character.findMany({
      where: { novelId },
      select: { id: true, name: true, role: true, currentGoal: true, currentState: true },
    }),
    getBookPlan(novelId),
    listArcPlans(novelId),
    prisma.volumePlan.findMany({
      where: { novelId },
      orderBy: { sortOrder: "asc" },
      include: {
        chapters: {
          orderBy: { chapterOrder: "asc" },
        },
      },
    }),
    prisma.auditReport.findMany({
      where: { novelId },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: {
        issues: {
          where: { status: "open" },
        },
      },
    }),
    prisma.creativeDecision.findMany({
      where: { novelId },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        category: true,
        content: true,
        importance: true,
      },
    }),
    prisma.storyMacroPlan.findUnique({
      where: { novelId },
    }),
    resolveStyleEngine(novelId, chapterId, options.taskStyleProfileId),
    prisma.stateChangeProposal.count({
      where: {
        novelId,
        status: "pending_review",
      },
    }),
  ]);
  if (!novel || !chapter) {
    throw new Error("小说或章节不存在。");
  }
  const storyModeBlock = buildPlannerStoryModeBlock(novel);
  const storyMacroPlan = storyMacroPlanRow ? mapRowToPlan(storyMacroPlanRow) : null;
  const payoffLedger = await payoffLedgerSyncService.getPayoffLedger(novelId, {
    chapterOrder: chapter.order,
  }).catch(() => ({
    summary: {
      totalCount: 0,
      pendingCount: 0,
      urgentCount: 0,
      overdueCount: 0,
      paidOffCount: 0,
      failedCount: 0,
      updatedAt: null,
    },
    items: [],
    updatedAt: null,
  }));
  const characterDynamicsOverview = await characterDynamicsQueryService.getOverview(novelId, {
    chapterOrder: chapter.order,
  }).catch(() => null);
  const characterDynamicsContext = buildPlannerCharacterDynamicsContext(characterDynamicsOverview);
  const plannerVolumes = mapVolumePlansToPlannerVolumes(volumePlans, novelId);
  const defaultMetadata = buildDefaultPlanMetadata("chapter", {
    chapterOrder: chapter.order,
    totalChapters: novel.estimatedChapterCount ?? null,
    expectation: chapter.expectation ?? null,
  });
  const openAuditIssues = recentAuditReports.flatMap((report) => report.issues.map((issue) => (
    `${issue.auditType}/${issue.severity}: ${issue.description} | 证据=${issue.evidence}`
  )));
  const resolvedStateDrivenContext = await contextAssemblyService.build({
    novelId,
    chapterId,
    chapterOrder: chapter.order,
    includeCurrentChapterState: false,
    policy: {
      kickoffMode: "manual_start",
      advanceMode: options.replanContext ? "stage_review" : "manual",
    },
    pendingReviewProposalCount,
    openAuditIssueCount: openAuditIssues.length,
    hasRepairableDraft: Boolean(chapter.content?.trim()),
  });
  const plannerStateGoalText = buildPlannerStateGoalText({
    summary: resolvedStateDrivenContext.chapterStateGoal?.summary ?? null,
    targetConflicts: resolvedStateDrivenContext.chapterStateGoal?.targetConflicts ?? [],
    targetRelationships: resolvedStateDrivenContext.chapterStateGoal?.targetRelationships ?? [],
    targetPayoffs: resolvedStateDrivenContext.chapterStateGoal?.targetPayoffs ?? [],
    protectedSecrets: resolvedStateDrivenContext.protectedSecrets,
    recentTimeline: resolvedStateDrivenContext.recentTimeline.map((item: any) => item.summary),
  });
  const replanContextBlock = options.replanContext
    ? buildReplanContextBlock(options.replanContext)
    : "无";
  const contextBlocks = buildChapterPlanContextBlocks({
    novelTitle: novel.title,
    description: novel.description,
    genreName: novel.genre?.name ?? null,
    targetAudience: novel.targetAudience,
    bookSellingPoint: novel.bookSellingPoint,
    competingFeel: novel.competingFeel,
    first30ChapterPromise: novel.first30ChapterPromise,
    narrativePov: novel.narrativePov,
    pacePreference: novel.pacePreference,
    emotionIntensity: novel.emotionIntensity,
    styleTone: novel.styleTone,
    chapterExpectation: chapter.expectation,
    chapterTaskSheet: chapter.taskSheet,
    chapterTargetWordCount: chapter.targetWordCount,
    bible: bible?.rawContent ?? "无",
    styleEngine,
    outline: novel.outline,
    structuredOutline: novel.structuredOutline,
    mappedVolumes: plannerVolumes.map((volume) => ({
      sortOrder: volume.sortOrder,
      title: volume.title,
      summary: volume.summary,
      mainPromise: volume.mainPromise,
      climax: volume.climax,
      updatedAt: volume.updatedAt,
      chapters: volume.chapters,
    })),
    bookPlan: bookPlan ? `${bookPlan.title} | ${bookPlan.objective}${bookPlan.phaseLabel ? ` | 阶段=${bookPlan.phaseLabel}` : ""}` : "无",
    arcPlans: arcPlans.length > 0
      ? arcPlans.map((plan: any) => `${plan.externalRef ?? "-"} ${plan.title} | ${plan.objective}${plan.phaseLabel ? ` | 阶段=${plan.phaseLabel}` : ""}`).join("\n")
      : "无",
    characters: characters.map((item: any) => `${item.id}|${item.name}|${item.role}|goal=${item.currentGoal ?? ""}|state=${item.currentState ?? ""}`).join("\n") || "无",
    recentSummaries: summaries.map((item: any) => `${item.summary}`).join("\n") || "无",
    plotBeats: plotBeats.map((item: any) => `${item.chapterOrder ?? "-"} ${item.title} ${item.content}`).join("\n") || "无",
    stateSnapshot: buildStateContextBlockFromCanonical(resolvedStateDrivenContext.snapshot),
    openAuditIssues: openAuditIssues.join("\n") || "无",
    recentDecisions: recentDecisions.map((item: any) => `${item.category}/${item.importance}: ${item.content}`).join("\n") || "无",
    characterDynamicsSummary: characterDynamicsContext.summary,
    characterVolumeAssignments: characterDynamicsContext.volumeAssignments,
    characterRelationStages: characterDynamicsContext.relationStages,
    characterCandidateGuards: characterDynamicsContext.candidateGuards,
    stateDrivenDirective: buildPlannerStateDrivenDirective({
      nextAction: resolvedStateDrivenContext.nextAction,
      pendingReviewProposalCount,
      openAuditIssueCount: openAuditIssues.length,
    }),
    stateDrivenGoal: plannerStateGoalText,
    defaultMetadata: [
      `planRole=${defaultMetadata.planRole ?? "progress"} | phase=${defaultMetadata.phaseLabel ?? "无"}`,
      `mustAdvance=${defaultMetadata.mustAdvance.join("；") || "无"}`,
      `mustPreserve=${defaultMetadata.mustPreserve.join("；") || "无"}`,
    ].join("\n"),
    replanContext: replanContextBlock,
    storyMacroSummary: buildStoryMacroSummary(storyMacroPlan),
    currentVolumeWindow: buildCurrentVolumeWindowSummary(plannerVolumes, chapter.order),
    payoffLedgerSummary: buildPlannerPayoffLedgerContext(payoffLedger, chapter.order),
    storyModeBlock,
  });

  return {
    novel,
    chapter,
    bible,
    plotBeats,
    summaries,
    characters,
    bookPlan,
    arcPlans,
    recentDecisions,
    openAuditIssues,
    styleEngine,
    plannerVolumes,
    storyModeBlock,
    defaultMetadata,
    resolvedStateDrivenContext,
    plannerStateGoalText,
    replanContextBlock,
    contextBlocks,
    outputScopeLabel: `章节规划：第${chapter.order}章《${chapter.title}》`,
  };
}

export { fetchChapterPlanContext, mapVolumePlansToPlannerVolumes };
