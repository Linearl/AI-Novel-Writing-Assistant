/**
 * Novel-Planner 中介层接口
 * 解耦 novel 和 planner 的双向循环引用
 */

import type { AuditReport, ReplanResult } from "@ai-novel/shared";
import type { PayoffLedgerSummary } from "@ai-novel/shared";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface IPlannerMediator {
  ensureChapterPlan(novelId: string, chapterId: string, request?: any): Promise<unknown>;
  getChapterPlan(novelId: string, chapterId: string): Promise<unknown>;
  generateBookPlan(novelId: string, options?: any): Promise<unknown>;
  generateArcPlan(novelId: string, arcId: string, options?: any): Promise<unknown>;
  generateChapterPlan(novelId: string, chapterId: string, options?: any): Promise<unknown>;
  replan(novelId: string, input: any): Promise<ReplanResult>;
  buildReplanRecommendation(params: any): any;
  shouldTriggerReplanFromAudit(report: AuditReport | AuditReport[], ledgerSummary?: PayoffLedgerSummary | null): boolean;
}
