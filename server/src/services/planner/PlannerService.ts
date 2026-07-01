import type { GenerationContextPackage } from "@ai-novel/shared/types/chapterRuntime";
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import type { AuditReport, ReplanResult } from "@ai-novel/shared/types/novel";
import type { PayoffLedgerSummary } from "@ai-novel/shared/types/payoffLedger";
import { prisma } from "../../db/prisma";
import { parseJsonStringArray } from "../novel/novelP0Utils";
import { payoffLedgerSyncService } from "../payoff/PayoffLedgerSyncService";
import { StyleBindingService } from "../styleEngine/StyleBindingService";
import {
  buildDefaultPlanMetadata,
  enrichStoryPlan,
  normalizePlanMetadata,
} from "./plannerPlanMetadata";
import {
  buildChapterExecutionContractHash,
  persistStoryPlan,
  readPlanExecutionContractHash,
} from "./plannerPersistence";
import { invokePlannerLLM, type PlannerLlmOptions } from "./plannerLlm";
import {
  buildArcPlanContextBlocks,
  buildBookPlanContextBlocks,
} from "./plannerContextBlocks";
import { buildReplanDecision } from "./replanDecision";
import {
  buildPlannerStoryModeBlock,
  buildPlannerStyleEngineSummary,
} from "./plannerContextHelpers";
import {
  generateChapterPlan,
  executeReplan,
  plannerStoryModeSelect,
  type PlannerOptions,
  type GenerateChapterPlanOptions,
  type ReplanInput,
  type PlannerChapterGenerationDeps,
} from "./plannerChapterGeneration";

export type { PlannerOptions, GenerateChapterPlanOptions, ReplanInput } from "./plannerChapterGeneration";
export { normalizePlannerOutput } from "./plannerOutputNormalization";

export class PlannerService {
  private readonly styleBindingService = new StyleBindingService();

  private get chapterGenerationDeps(): PlannerChapterGenerationDeps {
    return {
      getBookPlan: (novelId) => this.getBookPlan(novelId),
      listArcPlans: (novelId) => this.listArcPlans(novelId),
      resolvePlannerStyleEngineSummary: (novelId, chapterId, taskStyleProfileId) =>
        this.resolvePlannerStyleEngineSummary(novelId, chapterId, taskStyleProfileId),
      getChapterPlan: (novelId, chapterId) => this.getChapterPlan(novelId, chapterId),
    };
  }

  /** REQ-7005: enrich plan(s) with edge table issue IDs before calling enrichStoryPlan */
  private async enrichPlanWithEdgeIssueIds<T extends { id: string }>(plan: T): Promise<T & { edgeIssueIds?: string[] }> {
    const issueRows = await prisma.storyPlanIssue.findMany({
      where: { planId: plan.id },
      select: { issueId: true },
    });
    return { ...plan, edgeIssueIds: issueRows.map((r) => r.issueId).filter((id): id is string => id != null) };
  }

  async getChapterPlan(novelId: string, chapterId: string) {
    const plan = await prisma.storyPlan.findFirst({
      where: { novelId, chapterId, level: "chapter", status: { not: "stale" } },
      include: {
        scenes: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
    if (!plan) return null;
    const enriched = await this.enrichPlanWithEdgeIssueIds(plan);
    return enrichStoryPlan(enriched as any);
  }

  async getBookPlan(novelId: string) {
    const plan = await prisma.storyPlan.findFirst({
      where: { novelId, level: "book" },
      include: {
        scenes: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
    if (!plan) return null;
    const enriched = await this.enrichPlanWithEdgeIssueIds(plan);
    return enrichStoryPlan(enriched as any);
  }

  async listArcPlans(novelId: string) {
    const plans = await prisma.storyPlan.findMany({
      where: { novelId, level: "arc" },
      include: {
        scenes: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: [
        { updatedAt: "desc" },
        { createdAt: "desc" },
      ],
      take: 6,
    });
    const enriched = await Promise.all(plans.map((p) => this.enrichPlanWithEdgeIssueIds(p)));
    return enriched.map((plan) => enrichStoryPlan(plan as any));
  }

  async buildPlanPromptBlock(novelId: string, chapterId: string): Promise<string> {
    const plan = await this.getChapterPlan(novelId, chapterId);
    if (!plan) {
      return "";
    }
    const participants = parseJsonStringArray(plan.participantsJson);
    const reveals = parseJsonStringArray(plan.revealsJson);
    const riskNotes = parseJsonStringArray(plan.riskNotesJson);
    const sceneLines = plan.scenes
      .map((scene: (typeof plan.scenes)[number]) => `${scene.sortOrder}. ${scene.title}${scene.objective ? ` | 目标:${scene.objective}` : ""}${scene.conflict ? ` | 冲突:${scene.conflict}` : ""}${scene.reveal ? ` | 揭露:${scene.reveal}` : ""}${scene.emotionBeat ? ` | 情绪:${scene.emotionBeat}` : ""}`)
      .join("\n");
    return [
      `Plan title: ${plan.title}`,
      plan.planRole ? `Plan role: ${plan.planRole}` : "",
      plan.phaseLabel ? `Phase: ${plan.phaseLabel}` : "",
      `Objective: ${plan.objective}`,
      participants.length > 0 ? `Participants: ${participants.join("、")}` : "",
      reveals.length > 0 ? `Key reveals: ${reveals.join("；")}` : "",
      riskNotes.length > 0 ? `Risk notes: ${riskNotes.join("；")}` : "",
      plan.mustAdvanceJson ? `Must advance: ${parseJsonStringArray(plan.mustAdvanceJson).join("；")}` : "",
      plan.mustPreserveJson ? `Must preserve: ${parseJsonStringArray(plan.mustPreserveJson).join("；")}` : "",
      plan.hookTarget ? `Hook target: ${plan.hookTarget}` : "",
      sceneLines ? `Scenes:\n${sceneLines}` : "",
    ].filter(Boolean).join("\n");
  }

  async ensureChapterPlan(novelId: string, chapterId: string, options: PlannerOptions = {}) {
    const existing = await this.getChapterPlan(novelId, chapterId);
    if (existing && existing.scenes.length > 0) {
      const chapter = await prisma.chapter.findFirst({
        where: { id: chapterId, novelId },
        select: {
          expectation: true,
          targetWordCount: true,
          conflictLevel: true,
          revealLevel: true,
          mustAvoid: true,
          taskSheet: true,
          sceneCards: true,
          hook: true,
        },
      });
      const currentContractHash = chapter ? buildChapterExecutionContractHash(chapter) : null;
      const plannedContractHash = readPlanExecutionContractHash(existing.rawPlanJson);
      if (currentContractHash && plannedContractHash === currentContractHash) {
        return existing;
      }
    }
    return this.generateChapterPlan(novelId, chapterId, options);
  }

  async generateBookPlan(novelId: string, options: PlannerOptions = {}) {
    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
      select: {
        title: true,
        description: true,
        targetAudience: true,
        bookSellingPoint: true,
        competingFeel: true,
        first30ChapterPromise: true,
        narrativePov: true,
        pacePreference: true,
        emotionIntensity: true,
        styleTone: true,
        bible: { select: { rawContent: true } },
        genre: { select: { name: true } },
        chapters: { orderBy: { order: "asc" }, select: { title: true, order: true, expectation: true } },
        plotBeats: { orderBy: { chapterOrder: "asc" }, take: 8 },
        primaryStoryMode: { select: plannerStoryModeSelect },
        secondaryStoryMode: { select: plannerStoryModeSelect },
      },
    });
    if (!novel) {
      throw new Error("小说不存在。");
    }
    const storyModeBlock = buildPlannerStoryModeBlock(novel);
    const styleEngine = await this.resolvePlannerStyleEngineSummary(novelId, undefined, options.taskStyleProfileId);
    const contextBlocks = buildBookPlanContextBlocks({
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
      bible: novel.bible?.rawContent ?? "无",
      chapterDrafts: novel.chapters.map((item) => `${item.order}.${item.title} ${item.expectation ?? ""}`).join("\n") || "无",
      plotBeats: novel.plotBeats.map((item) => `${item.chapterOrder ?? "-"} ${item.title} ${item.content}`).join("\n") || "无",
      storyModeBlock,
      styleEngine,
    });
    const output = await invokePlannerLLM({
      options,
      scopeLabel: `全书规划：${novel.title}`,
      planLevel: "book",
      contextBlocks,
    });
    const metadata = normalizePlanMetadata("book", output, buildDefaultPlanMetadata("book"));
    return persistStoryPlan({
      novelId,
      level: "book",
      title: output.title || `${novel.title} 全书规划`,
      objective: output.objective || "建立全书目标与主线推进。",
      participants: output.participants ?? [],
      reveals: output.reveals ?? [],
      riskNotes: output.riskNotes ?? [],
      hookTarget: output.hookTarget || null,
      scenes: [],
      planRole: metadata.planRole,
      phaseLabel: metadata.phaseLabel,
      mustAdvance: metadata.mustAdvance,
      mustPreserve: metadata.mustPreserve,
      sourceIssueIds: metadata.sourceIssueIds,
      replannedFromPlanId: metadata.replannedFromPlanId,
    });
  }

  async generateArcPlan(novelId: string, arcId: string, options: PlannerOptions = {}) {
    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
      select: {
        title: true,
        description: true,
        targetAudience: true,
        bookSellingPoint: true,
        competingFeel: true,
        first30ChapterPromise: true,
        narrativePov: true,
        pacePreference: true,
        emotionIntensity: true,
        styleTone: true,
        bible: { select: { rawContent: true } },
        genre: { select: { name: true } },
        chapters: { orderBy: { order: "asc" }, select: { title: true, order: true, expectation: true } },
        primaryStoryMode: { select: plannerStoryModeSelect },
        secondaryStoryMode: { select: plannerStoryModeSelect },
      },
    });
    if (!novel) {
      throw new Error("小说不存在。");
    }
    const storyModeBlock = buildPlannerStoryModeBlock(novel);
    const styleEngine = await this.resolvePlannerStyleEngineSummary(novelId, undefined, options.taskStyleProfileId);
    const contextBlocks = buildArcPlanContextBlocks({
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
      bible: novel.bible?.rawContent ?? "无",
      chapters: novel.chapters.map((item) => `${item.order}.${item.title} ${item.expectation ?? ""}`).join("\n") || "无",
      storyModeBlock,
      styleEngine,
    });
    const output = await invokePlannerLLM({
      options,
      scopeLabel: `分段规划：${arcId}`,
      planLevel: "arc",
      contextBlocks,
    });
    const metadata = normalizePlanMetadata("arc", output, buildDefaultPlanMetadata("arc"));
    return persistStoryPlan({
      novelId,
      level: "arc",
      externalRef: arcId,
      title: output.title || `Arc ${arcId}`,
      objective: output.objective || `围绕 ${arcId} 推进主线`,
      participants: output.participants ?? [],
      reveals: output.reveals ?? [],
      riskNotes: output.riskNotes ?? [],
      hookTarget: output.hookTarget || null,
      scenes: [],
      planRole: metadata.planRole,
      phaseLabel: metadata.phaseLabel,
      mustAdvance: metadata.mustAdvance,
      mustPreserve: metadata.mustPreserve,
      sourceIssueIds: metadata.sourceIssueIds,
      replannedFromPlanId: metadata.replannedFromPlanId,
    });
  }

  async generateChapterPlan(novelId: string, chapterId: string, options: GenerateChapterPlanOptions = {}) {
    return generateChapterPlan(this.chapterGenerationDeps, novelId, chapterId, options);
  }

  async replan(novelId: string, input: ReplanInput): Promise<ReplanResult> {
    return executeReplan(this.chapterGenerationDeps, novelId, input);
  }

  shouldTriggerReplanFromAudit(auditReports: AuditReport[], ledgerSummary?: PayoffLedgerSummary | null): boolean {
    return buildReplanDecision({
      auditReports,
      ledgerSummary,
    }).recommended;
  }

  buildReplanRecommendation(input: {
    auditReports?: AuditReport[];
    ledgerSummary?: PayoffLedgerSummary | null;
    contextPackage?: GenerationContextPackage | null;
    targetChapterOrder?: number | null;
    requestedWindowSize?: number | null;
    blockingLedgerKeys?: string[];
    forceRecommended?: boolean;
    reason?: string | null;
    triggerType?: string | null;
  }) {
    return buildReplanDecision({
      auditReports: input.auditReports ?? [],
      ledgerSummary: input.ledgerSummary ?? null,
      snapshot: input.contextPackage?.canonicalState ?? null,
      nextAction: input.contextPackage?.nextAction ?? null,
      chapterStateGoal: input.contextPackage?.chapterStateGoal ?? null,
      protectedSecrets: input.contextPackage?.protectedSecrets ?? [],
      targetChapterOrder: input.targetChapterOrder ?? input.contextPackage?.chapter?.order ?? null,
      requestedWindowSize: input.requestedWindowSize ?? null,
      blockingLedgerKeys: input.blockingLedgerKeys ?? [],
      forceRecommended: input.forceRecommended,
      reason: input.reason,
      triggerType: input.triggerType,
    });
  }

  private async resolvePlannerStyleEngineSummary(
    novelId: string,
    chapterId?: string,
    taskStyleProfileId?: string,
  ): Promise<string> {
    try {
      const styleContext = await this.styleBindingService.resolveForGeneration({
        novelId,
        chapterId,
        taskStyleProfileId,
      });
      return buildPlannerStyleEngineSummary(styleContext);
    } catch {
      return "无";
    }
  }
}

export const plannerService = new PlannerService();
