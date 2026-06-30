import type { Prisma } from "@prisma/client";

export { buildPipelineCurrentItemLabel, buildPipelineStageProgress } from "./pipelineJobState";

export const PIPELINE_HEARTBEAT_INTERVAL_MS = 15000;

const TERMINAL_CONTINUE_QUALITY_LOOP_RISK_FLAG_FRAGMENT = '"terminalAction":"defer_and_continue"';
const REPLAN_REQUIRED_QUALITY_LOOP_RISK_FLAG_FRAGMENT = '"rootCauseCode":"replan_required"';
const REPLAN_ACTION_QUALITY_LOOP_RISK_FLAG_FRAGMENT = '"recommendedAction":"replan"';

export function clampPipelineMaxRetries(value: number | null | undefined): number {
  return Math.max(0, Math.min(value ?? 1, 1));
}

export function buildEmptyChapterDetail(chapter: { order: number; title: string }): string {
  return `第${chapter.order}章「${chapter.title}」正文生成失败：模型连续未返回可保存正文，已暂停继续。`;
}

export function buildSkipCompletedChapterWhere(): Prisma.ChapterWhereInput {
  return {
    NOT: {
      AND: [
        { content: { not: null } },
        { content: { not: "" } },
        {
          OR: [
            { generationState: { in: ["approved", "published"] } },
            { chapterStatus: "completed" },
            {
              AND: [
                { riskFlags: { not: null } },
                { riskFlags: { contains: TERMINAL_CONTINUE_QUALITY_LOOP_RISK_FLAG_FRAGMENT } },
                { riskFlags: { not: { contains: REPLAN_REQUIRED_QUALITY_LOOP_RISK_FLAG_FRAGMENT } } },
                { riskFlags: { not: { contains: REPLAN_ACTION_QUALITY_LOOP_RISK_FLAG_FRAGMENT } } },
              ],
            },
          ],
        },
      ],
    },
  };
}
