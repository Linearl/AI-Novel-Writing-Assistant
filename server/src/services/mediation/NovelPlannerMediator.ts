/**
 * Novel-Planner 中介器实现
 * 将 novel 对 planner 的直接调用转为通过中介层
 */

import type { AuditReport, ReplanResult } from "@ai-novel/shared/types/novel";
import type { PayoffLedgerSummary } from "@ai-novel/shared/types/payoffLedger";
import { plannerService } from "../planner/PlannerService";
import type { IPlannerMediator } from "./interfaces";

/* eslint-disable @typescript-eslint/no-explicit-any */

class NovelPlannerMediator implements IPlannerMediator {
  async ensureChapterPlan(novelId: string, chapterId: string, request?: any) {
    return plannerService.ensureChapterPlan(novelId, chapterId, request);
  }

  async getChapterPlan(novelId: string, chapterId: string) {
    return plannerService.getChapterPlan(novelId, chapterId);
  }

  async generateBookPlan(novelId: string, options?: any) {
    return plannerService.generateBookPlan(novelId, options);
  }

  async generateArcPlan(novelId: string, arcId: string, options?: any) {
    return plannerService.generateArcPlan(novelId, arcId, options);
  }

  async generateChapterPlan(novelId: string, chapterId: string, options?: any) {
    return plannerService.generateChapterPlan(novelId, chapterId, options);
  }

  async replan(novelId: string, input: any): Promise<ReplanResult> {
    return plannerService.replan(novelId, input);
  }

  buildReplanRecommendation(params: any) {
    return plannerService.buildReplanRecommendation(params);
  }

  shouldTriggerReplanFromAudit(report: AuditReport | AuditReport[], ledgerSummary?: PayoffLedgerSummary | null): boolean {
    return plannerService.shouldTriggerReplanFromAudit(
      Array.isArray(report) ? report : [report],
      ledgerSummary
    );
  }
}

// 单例导出
export const plannerMediator = new NovelPlannerMediator();
