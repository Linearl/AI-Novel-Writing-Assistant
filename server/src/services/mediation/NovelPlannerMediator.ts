/**
 * Novel-Planner 中介器实现
 * 将 novel 对 planner 的直接调用转为通过中介层
 */

import type { AuditReport, ReplanResult } from "@ai-novel/shared/types/novel";
import { plannerService } from "../planner/PlannerService";
import type { IPlannerMediator } from "./interfaces";

class NovelPlannerMediator implements IPlannerMediator {
  async ensureChapterPlan(novelId: string, chapterId: string, request?: unknown) {
    return plannerService.ensureChapterPlan(novelId, chapterId, request);
  }

  async getChapterPlan(novelId: string, chapterId: string) {
    return plannerService.getChapterPlan(novelId, chapterId);
  }

  async generateBookPlan(novelId: string, options?: unknown) {
    return plannerService.generateBookPlan(novelId, options);
  }

  async generateArcPlan(novelId: string, arcId: string, options?: unknown) {
    return plannerService.generateArcPlan(novelId, arcId, options);
  }

  async generateChapterPlan(novelId: string, chapterId: string, options?: unknown) {
    return plannerService.generateChapterPlan(novelId, chapterId, options);
  }

  async replan(novelId: string, input: unknown): Promise<ReplanResult> {
    return plannerService.replan(novelId, input);
  }

  buildReplanRecommendation(params: unknown) {
    return plannerService.buildReplanRecommendation(params);
  }

  shouldTriggerReplanFromAudit(report: AuditReport): boolean {
    return plannerService.shouldTriggerReplanFromAudit(report);
  }
}

// 单例导出
export const plannerMediator = new NovelPlannerMediator();
