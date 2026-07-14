/**
 * GlobalReviewService.ts
 *
 * REQ-2050: 全局审校服务。
 * - T2.2: Scope 解析 + token budget 裁剪
 * - T2.3: 全局审输出解析 + GlobalReviewIssue 写入
 */

import { randomUUID } from "node:crypto";
import type { LLMProvider } from "@ai-novel/shared";
import { prisma } from "../../db/prisma";
import { logger } from "../logging/LoggerService";
import { runStructuredPrompt } from "../../prompting/core/promptRunner";
import { globalReviewPrompt } from "../../prompting/prompts/audit/audit.global.prompts";
import type { GlobalReviewOutput } from "../../prompting/prompts/audit/audit.global.prompts";
import {
  type GlobalReviewScope,
  type GlobalReviewContextData,
  buildGlobalReviewContextData,
  buildGlobalReviewContextBlocks,
} from "./auditContextBuilder";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GlobalReviewOptions {
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
}

export interface GlobalReviewResult {
  reviewRunId: string;
  issueCount: number;
  issues: Array<{
    id: string;
    severity: string;
    category: string;
    description: string;
    fixDirection: string;
    affectedChapters: string[];
    primaryFixChapter: string | null;
    status: string;
  }>;
  summary: string;
}

// ---------------------------------------------------------------------------
// Scope validation
// ---------------------------------------------------------------------------

function validateScope(scope: GlobalReviewScope): void {
  if (scope.mode === "range") {
    if (scope.startChapterOrder == null || scope.endChapterOrder == null) {
      throw new Error("range 模式必须指定 startChapterOrder 和 endChapterOrder");
    }
    if (scope.startChapterOrder > scope.endChapterOrder) {
      throw new Error("startChapterOrder 不能大于 endChapterOrder");
    }
  }
}

// ---------------------------------------------------------------------------
// Core service
// ---------------------------------------------------------------------------

export class GlobalReviewService {
  async runGlobalReview(
    novelId: string,
    scope: GlobalReviewScope,
    options: GlobalReviewOptions = {},
  ): Promise<GlobalReviewResult> {
    validateScope(scope);

    const reviewRunId = `gr_${Date.now()}_${randomUUID().slice(0, 8)}`;

    // T2.2: 构建上下文（含 scope 解析 + token budget 裁剪）
    const contextData = await buildGlobalReviewContextData(novelId, scope);
    const contextBlocks = buildGlobalReviewContextBlocks(contextData);

    // 调用 LLM
    const output = await this.invokeGlobalReviewLLM(contextData, contextBlocks, options);

    // T2.3: 解析输出并写入 GlobalReviewIssue 表
    const savedIssues = await this.persistIssues(novelId, reviewRunId, output);

    return {
      reviewRunId,
      issueCount: savedIssues.length,
      issues: savedIssues,
      summary: output.summary ?? `全局审校完成，发现 ${savedIssues.length} 个跨章节问题。`,
    };
  }

  async listGlobalReviewIssues(
    novelId: string,
    options?: { status?: string; reviewRunId?: string },
  ): Promise<Array<{
    id: string;
    reviewRunId: string;
    severity: string;
    category: string;
    description: string;
    fixDirection: string;
    affectedChapters: string[];
    primaryFixChapter: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }>> {
    const where: Record<string, unknown> = { novelId };
    if (options?.status) {
      where.status = options.status;
    }
    if (options?.reviewRunId) {
      where.reviewRunId = options.reviewRunId;
    }

    const issues = await prisma.globalReviewIssue.findMany({
      where,
      orderBy: [
        { createdAt: "desc" },
      ],
    });

    return issues.map((issue) => ({
      id: issue.id,
      reviewRunId: issue.reviewRunId,
      severity: issue.severity,
      category: issue.category,
      description: issue.description,
      fixDirection: issue.fixDirection,
      affectedChapters: JSON.parse(issue.affectedChapters) as string[],
      primaryFixChapter: issue.primaryFixChapter,
      status: issue.status,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
    }));
  }

  async updateIssueStatus(
    novelId: string,
    issueId: string,
    status: string,
  ): Promise<void> {
    const validStatuses = ["pending", "acknowledged", "fixed", "dismissed"];
    if (!validStatuses.includes(status)) {
      throw new Error(`无效的状态: ${status}，可选值: ${validStatuses.join(", ")}`);
    }

    const issue = await prisma.globalReviewIssue.findFirst({
      where: { id: issueId, novelId },
    });
    if (!issue) {
      throw new Error("全局审校问题不存在");
    }

    await prisma.globalReviewIssue.update({
      where: { id: issueId },
      data: { status },
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async invokeGlobalReviewLLM(
    contextData: GlobalReviewContextData,
    contextBlocks: ReturnType<typeof buildGlobalReviewContextBlocks>,
    options: GlobalReviewOptions,
  ): Promise<GlobalReviewOutput> {
    try {
      const result = await runStructuredPrompt({
        asset: globalReviewPrompt,
        promptInput: {
          novelTitle: contextData.novelTitle,
          bookContract: contextData.bookContract,
          storyMacro: contextData.storyMacro,
          chapterSummaries: contextData.chapters.map((ch) => {
            const parts: string[] = [`[第${ch.order}章 ${ch.title}]`];
            if (ch.summary) parts.push(ch.summary);
            if (ch.keyEvents) parts.push(`关键事件: ${ch.keyEvents}`);
            if (ch.characterStates) parts.push(`角色状态: ${ch.characterStates}`);
            return parts.join("\n");
          }).join("\n\n"),
          fullTexts: contextData.chapters.map((ch) => {
            return `=== 第${ch.order}章 ${ch.title} ===\n${ch.content ?? "(无正文)"}`;
          }).join("\n\n"),
          characterArcPlan: contextData.characterArcPlan,
          payoffLedger: contextData.payoffLedger,
          volumeOverview: contextData.volumeOverview,
        },
        contextBlocks,
        options: {
          provider: options.provider,
          model: options.model,
          temperature: options.temperature ?? 0.1,
          novelId: contextData.novelId,
          stage: "global_review",
          triggerReason: "global_review",
        },
      });
      return result.output;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`全局审校 LLM 调用失败: ${message}`);
    }
  }

  private async persistIssues(
    novelId: string,
    reviewRunId: string,
    output: GlobalReviewOutput,
  ): Promise<Array<{
    id: string;
    severity: string;
    category: string;
    description: string;
    fixDirection: string;
    affectedChapters: string[];
    primaryFixChapter: string | null;
    status: string;
  }>> {
    const issues = output.crossChapterIssues ?? [];
    if (issues.length === 0) return [];

    const created = await prisma.$transaction(
      issues.map((issue) =>
        prisma.globalReviewIssue.create({
          data: {
            novelId,
            reviewRunId,
            severity: issue.severity,
            category: issue.category,
            description: issue.description,
            fixDirection: issue.fixDirection,
            affectedChapters: JSON.stringify(issue.affectedChapters),
            primaryFixChapter: issue.primaryFixChapter ?? null,
            status: "pending",
          },
        })
      ),
    );

    return created.map((issue) => ({
      id: issue.id,
      severity: issue.severity,
      category: issue.category,
      description: issue.description,
      fixDirection: issue.fixDirection,
      affectedChapters: JSON.parse(issue.affectedChapters) as string[],
      primaryFixChapter: issue.primaryFixChapter,
      status: issue.status,
    }));
  }

  // ---------------------------------------------------------------------------
  // T3.2: 卷完成自动触发全局审（可选，标记为 P1）
  // ---------------------------------------------------------------------------

  /**
   * 检测指定卷的所有章节是否已完成审校，如已完成则自动触发全局审校。
   * 返回 null 表示不满足触发条件（未全部审校），否则返回全局审校结果。
   */
  async autoTriggerOnVolumeCompletion(
    novelId: string,
    volumePlanId: string,
    options: GlobalReviewOptions = {},
  ): Promise<GlobalReviewResult | null> {
    const volumePlan = await prisma.volumePlan.findUnique({
      where: { id: volumePlanId },
      select: {
        id: true,
        novelId: true,
        sortOrder: true,
        title: true,
      },
    });
    if (!volumePlan || volumePlan.novelId !== novelId) {
      return null;
    }

    // 获取该卷所有章节（过滤掉 chapterId 为 null 的条目）
    const volumeChapters = await prisma.volumeChapterPlan.findMany({
      where: { volumeId: volumePlanId, chapterId: { not: null } },
      select: { chapterId: true },
    });
    const chapterIds = volumeChapters
      .map((vc) => vc.chapterId)
      .filter((id): id is string => id !== null);
    if (chapterIds.length === 0) {
      return null;
    }

    // 检查所有章节是否都有审校报告
    const chaptersWithAudit = await prisma.chapter.findMany({
      where: {
        id: { in: chapterIds },
        auditReports: { some: {} },
      },
      select: { id: true },
    });

    if (chaptersWithAudit.length < chapterIds.length) {
      // 未全部审校，不触发
      return null;
    }

    // 全部已审校，自动触发全局审校
    logger.info(
      `[GlobalReview] 卷"${volumePlan.title}"(order=${volumePlan.sortOrder}) 所有${chapterIds.length}章已完成审校，自动触发全局审校`,
    );

    return this.runGlobalReview(
      novelId,
      {
        mode: "currentVolume",
      },
      options,
    );
  }
}

export const globalReviewService = new GlobalReviewService();
