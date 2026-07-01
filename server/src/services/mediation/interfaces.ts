/**
 * Novel-Planner 中介层接口
 * 解耦 novel 和 planner 的双向循环引用
 */

import type { GenerationContextPackage } from "@ai-novel/shared/types/chapterRuntime";
import type { AuditReport, ReplanResult } from "@ai-novel/shared/types/novel";

export interface IPlannerMediator {
  /**
   * 确保章节计划存在
   */
  ensureChapterPlan(
    novelId: string,
    chapterId: string,
    request?: unknown
  ): Promise<unknown>;

  /**
   * 获取章节计划
   */
  getChapterPlan(novelId: string, chapterId: string): Promise<unknown>;

  /**
   * 生成书籍计划
   */
  generateBookPlan(novelId: string, options?: unknown): Promise<unknown>;

  /**
   * 生成弧线计划
   */
  generateArcPlan(novelId: string, arcId: string, options?: unknown): Promise<unknown>;

  /**
   * 生成章节计划
   */
  generateChapterPlan(novelId: string, chapterId: string, options?: unknown): Promise<unknown>;

  /**
   * 重新规划
   */
  replan(novelId: string, input: unknown): Promise<ReplanResult>;

  /**
   * 构建重新规划建议
   */
  buildReplanRecommendation(params: unknown): unknown;

  /**
   * 判断是否应该触发重新规划
   */
  shouldTriggerReplanFromAudit(report: AuditReport): boolean;
}
