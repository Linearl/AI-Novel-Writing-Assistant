import type { BaseMessageChunk } from "@langchain/core/messages";
import type { QualityScore, ReviewIssue } from "@ai-novel/shared";
import type { StreamDoneHelpers } from "../../../llm/streaming"
import { prisma } from "../../../db/prisma"
import { streamTextPrompt } from "../../../prompting/core/promptRunner"
import { withChapterRepairContext } from "../../../prompting/prompts/novel/chapterLayeredContext"
import { auditService } from "../../../services/audit/AuditService"
import { globalReviewService } from "../../../services/audit/GlobalReviewService"
import { ChapterPatchRepairFailedError } from "../../../services/novel/chapterPatchRepairService"
import {
  isPass,
  logPipelineError,
  type RepairOptions,
  type ReviewOptions,
} from "../../../services/novel/novelCoreShared/index"
import type { ChapterArtifactSyncService } from "../ChapterArtifactSyncService";
import type { GenerationContextAssembler } from "../GenerationContextAssembler";
import {
  ChapterContextAssemblyError,
  assembleChapterAuditContextPackage,
} from "./chapterAuditContext";
import {
  createHeavyRepairPromptExecution,
  prepareChapterRepairExecution,
} from "./chapterRepairRuntime";

// ─── GlobalReviewIssue → ReviewIssue 映射 ────────────────────────────────────

/** GlobalReviewIssue.severity (critical|major|minor) → ReviewIssue.severity */
export function mapGlobalSeverity(globalSeverity: string): ReviewIssue["severity"] {
  switch (globalSeverity) {
    case "critical": return "critical";
    case "major": return "high";
    case "minor": return "medium";
    default: return "medium";
  }
}

/** GlobalReviewIssue.category → ReviewIssue.category */
export function mapGlobalCategory(globalCategory: string): ReviewIssue["category"] {
  switch (globalCategory) {
    case "character_consistency": return "logic";
    case "plot_continuity": return "coherence";
    case "foreshadowing": return "coherence";
    case "pacing": return "pacing";
    case "worldbuilding": return "logic";
    default: return "coherence";
  }
}

interface RepairReviewResult {
  score: QualityScore;
  issues: ReviewIssue[];
}

export interface ChapterRepairStreamRuntimeDeps {
  assembler?: Pick<GenerationContextAssembler, "assemble">;
  artifactSyncService: Pick<ChapterArtifactSyncService, "syncChapterArtifacts">;
  reviewChapterAfterRepair: (
    novelId: string,
    chapterId: string,
    options: ReviewOptions,
  ) => Promise<RepairReviewResult>;
  resolveAuditIssues?: (novelId: string, issueIds: string[]) => Promise<unknown>;
}

export class ChapterRepairStreamRuntime {
  constructor(private readonly deps: ChapterRepairStreamRuntimeDeps) {}

  async createRepairStream(
    novelId: string,
    chapterId: string,
    options: RepairOptions = {},
  ): Promise<{
    stream: AsyncIterable<BaseMessageChunk>;
    onDone: (fullContent: string, helpers: StreamDoneHelpers) => Promise<void>;
  }> {
    const [novel, chapter, bible] = await Promise.all([
      prisma.novel.findUnique({ where: { id: novelId } }),
      prisma.chapter.findFirst({ where: { id: chapterId, novelId } }),
      prisma.novelBible.findUnique({ where: { novelId } }),
    ]);
    if (!novel || !chapter) {
      throw new Error("小说或章节不存在");
    }

    const issues = await this.resolveRepairIssues(novelId, chapterId, options);
    const assembledContextPackage = await assembleChapterAuditContextPackage({
      assembler: this.deps.assembler,
      novelId,
      chapterId,
      options,
      operation: "repair",
    });
    const repairContextPackage = withChapterRepairContext(assembledContextPackage, issues);
    if (!repairContextPackage.chapterRepairContext) {
      const error = new Error("chapterRepairContext missing after successful context assembly");
      logPipelineError("Failed to derive repair context from assembled chapter context package.", {
        novelId,
        chapterId,
        operation: "repair",
        provider: options.provider ?? null,
        model: options.model ?? null,
        error: error.message,
      });
      throw new ChapterContextAssemblyError(novelId, chapterId, "repair", error);
    }

    const prepared = await prepareChapterRepairExecution({
      novelId,
      chapterId,
      novelTitle: novel.title,
      chapterTitle: chapter.title,
      content: chapter.content ?? "",
      issues,
      repairContext: repairContextPackage.chapterRepairContext,
      bibleContent: bible?.rawContent ?? "",
      options: {
        provider: options.provider,
        model: options.model,
        temperature: options.temperature,
        repairMode: options.repairMode,
        userInstruction: options.userInstruction,
      },
    });

    if (prepared.kind === "patched") {
      return {
        stream: createSingleChunkStream(prepared.content),
        onDone: async (fullContent: string, helpers: StreamDoneHelpers) => {
          await this.finalizeRepairResult({
            novelId,
            chapterId,
            options,
            content: prepared.content.trim() || fullContent,
            issues,
            repairMode: prepared.finalRepairMode,
            helpers,
          });
        },
      };
    }

    const streamed = await streamTextPrompt(createHeavyRepairPromptExecution(prepared));
    return {
      stream: streamed.stream as AsyncIterable<BaseMessageChunk>,
      onDone: async (fullContent: string, helpers: StreamDoneHelpers) => {
        const completed = await streamed.complete;
        await this.finalizeRepairResult({
          novelId,
          chapterId,
          options,
          content: completed.output.trim() || fullContent,
          issues,
          repairMode: prepared.finalRepairMode,
          helpers,
        });
      },
    };
  }

  private async resolveRepairIssues(
    novelId: string,
    chapterId: string,
    options: RepairOptions,
  ): Promise<ReviewIssue[]> {
    if (Array.isArray(options.reviewIssues)) {
      return options.reviewIssues;
    }

    const auditIssues = options.auditIssueIds?.length
      ? await prisma.auditIssue.findMany({
        where: { id: { in: options.auditIssueIds } },
        orderBy: { createdAt: "asc" },
      })
      : [];
    if (auditIssues.length > 0) {
      return auditIssues.map((item) => ({
        severity: item.severity as ReviewIssue["severity"],
        category: item.auditType === "continuity"
          ? "coherence"
          : item.auditType === "character"
            ? "logic"
            : "pacing",
        evidence: item.evidence,
        fixSuggestion: item.fixSuggestion,
      }));
    }

    // REQ-2060: 查询 GlobalReviewIssue 并转换为 ReviewIssue 格式追加
    const globalIssues = options.globalReviewIssueIds?.length
      ? await prisma.globalReviewIssue.findMany({
        where: {
          id: { in: options.globalReviewIssueIds },
          status: { in: ["pending", "confirmed"] },
        },
        orderBy: { createdAt: "asc" },
      })
      : [];

    if (globalIssues.length > 0) {
      const mappedGlobalIssues: ReviewIssue[] = globalIssues.map((item) => ({
        severity: mapGlobalSeverity(item.severity),
        category: mapGlobalCategory(item.category),
        evidence: item.description,
        fixSuggestion: item.fixDirection,
      }));

      // 若同时有 auditIssueIds 未匹配到（已在上面 return），这里追加到空列表
      // 若 reviewIssues 也未指定，fallback review 之后与全局问题合并
      const fallbackReview = await this.deps.reviewChapterAfterRepair(novelId, chapterId, {
        ...options,
        directorDebugTaskId: options.directorDebugTaskId,
      });
      return [...fallbackReview.issues, ...mappedGlobalIssues];
    }

    const fallbackReview = await this.deps.reviewChapterAfterRepair(novelId, chapterId, {
      ...options,
      directorDebugTaskId: options.directorDebugTaskId,
    });
    return fallbackReview.issues;
  }

  private async finalizeRepairResult(input: {
    novelId: string;
    chapterId: string;
    options: RepairOptions;
    content: string;
    issues?: ReviewIssue[];
    repairMode?: string;
    helpers: StreamDoneHelpers;
  }): Promise<void> {
    const runId = `chapter-repair:${input.chapterId}`;
    input.helpers.writeFrame({
      type: "run_status",
      runId,
      status: "running",
      phase: "finalizing",
      message: "修复稿已生成，正在保存正文并重新审校。",
    });

    const repairedContent = input.content.trim();
    if (!repairedContent) {
      throw new ChapterPatchRepairFailedError("修复结果为空，未保存章节正文。");
    }

    // 保存修复版本记录
    const latestVersion = await prisma.chapterRepairVersion.findFirst({
      where: { novelId: input.novelId, chapterId: input.chapterId },
      orderBy: { versionIndex: "desc" },
      select: { versionIndex: true },
    });
    const nextVersionIndex = (latestVersion?.versionIndex ?? 0) + 1;

    await prisma.chapterRepairVersion.create({
      data: {
        novelId: input.novelId,
        chapterId: input.chapterId,
        versionIndex: nextVersionIndex,
        content: repairedContent,
        repairMode: input.repairMode ?? null,
        issuesJson: input.issues ? JSON.stringify(input.issues) : null,
        tokenUsageJson: null,
        userInstruction: input.options.userInstruction ?? null,
      },
    });

    await prisma.chapter.update({
      where: { id: input.chapterId },
      data: { content: repairedContent, generationState: "repaired" },
    });
    await this.deps.artifactSyncService.syncChapterArtifacts(
      input.novelId,
      input.chapterId,
      repairedContent,
      {
        scheduleBackgroundSync: true,
        awaitArtifactDelta: true,
        skipLegacySummaryAndFacts: true,
        provider: input.options.provider,
        model: input.options.model,
      },
    );

    const review = await this.deps.reviewChapterAfterRepair(input.novelId, input.chapterId, {
      provider: input.options.provider,
      model: input.options.model,
      temperature: input.options.temperature,
      content: repairedContent,
      directorDebugTaskId: input.options.directorDebugTaskId,
    });

    // DEBUG: 记录审核结果
    const passResult = isPass(review.score);
    console.log("[RepairStream] Review result:", {
      chapterId: input.chapterId,
      score: review.score,
      isPass: passResult,
      thresholds: { coherence: 80, repetition: 75, engagement: 75 },
      coherencePass: review.score.coherence >= 80,
      repetitionPass: review.score.repetition >= 75,
      engagementPass: review.score.engagement >= 75,
    });

    if (passResult) {
      console.log("[RepairStream] isPass=true, updating chapter status to approved/completed");
      await prisma.chapter.update({
        where: { id: input.chapterId },
        data: {
          generationState: "approved",
          chapterStatus: "completed",
        },
      });
      console.log("[RepairStream] Chapter status updated successfully");
      if (input.options.auditIssueIds?.length) {
        const resolveAuditIssues = this.deps.resolveAuditIssues
          ?? ((novelId: string, issueIds: string[]) => auditService.resolveIssues(novelId, issueIds));
        await resolveAuditIssues(input.novelId, input.options.auditIssueIds).catch(() => null);
        console.log("[RepairStream] Audit issues resolved");
      }

      // REQ-2060: 修复通过后标记全局审校问题为 fixed，并检查关联章节
      if (input.options.globalReviewIssueIds?.length && isPass(review.score)) {
        try {
          await globalReviewService.updateIssueStatus(
            input.novelId,
            input.options.globalReviewIssueIds[0],
            "fixed",
          ).catch(() => null);
          // 批量标记剩余的全局问题为 fixed
          for (const issueId of input.options.globalReviewIssueIds.slice(1)) {
            await globalReviewService.updateIssueStatus(
              input.novelId,
              issueId,
              "fixed",
            ).catch(() => null);
          }
          console.log("[RepairStream] Global review issues marked as fixed");
        } catch {
          // 全局审校问题状态更新失败不阻断修复流程
        }

        // 检查其他关联问题是否也应标记为 fixed
        await checkGlobalReviewIssuesAfterChapterRepair(
          input.novelId,
          input.chapterId,
        ).catch(() => null);
      }
    } else {
      console.log("[RepairStream] isPass=false, chapter status NOT updated");
    }

    input.helpers.writeFrame({
      type: "run_status",
      runId,
      status: "succeeded",
      phase: "completed",
      message: isPass(review.score)
        ? "章节修复已完成，本章已达到可继续推进状态。"
        : "修复稿已保存，但仍有问题待继续处理。",
    });
  }
}

async function* createSingleChunkStream(content: string): AsyncIterable<BaseMessageChunk> {
  yield { content } as BaseMessageChunk;
}

/**
 * REQ-2060: 修复通过后检查其他关联的 GlobalReviewIssue，
 * 若其 affectedChapters 中所有章节均已 approved + completed，则标记为 fixed。
 */
async function checkGlobalReviewIssuesAfterChapterRepair(
  novelId: string,
  repairedChapterId: string,
): Promise<void> {
  const relatedIssues = await prisma.globalReviewIssue.findMany({
    where: {
      novelId,
      status: { in: ["pending", "confirmed"] },
      affectedChapters: { contains: repairedChapterId },
    },
  });

  for (const issue of relatedIssues) {
    const affectedChapterIds: string[] = JSON.parse(issue.affectedChapters);
    if (affectedChapterIds.length === 0) continue;

    const allApproved = await areAllChaptersApproved(novelId, affectedChapterIds);
    if (allApproved) {
      await globalReviewService.updateIssueStatus(novelId, issue.id, "fixed").catch(() => null);
    }
  }
}

/**
 * 检查指定章节列表是否全部处于 approved + completed 状态。
 */
async function areAllChaptersApproved(
  novelId: string,
  chapterIds: string[],
): Promise<boolean> {
  const chapters = await prisma.chapter.findMany({
    where: {
      id: { in: chapterIds },
      novelId,
    },
    select: { id: true, generationState: true, chapterStatus: true },
  });

  if (chapters.length !== chapterIds.length) return false;

  return chapters.every(
    (ch) => ch.generationState === "approved" && ch.chapterStatus === "completed",
  );
}
