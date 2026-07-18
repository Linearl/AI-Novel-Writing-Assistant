import { formatChapterDetailModeLabel } from "../../../services/novel/volume/chapterDetailModeLabel"

/**
 * Legacy fixed-percentage progress map.
 * @deprecated Use StepModule.inspectProgress() as the primary progress source.
 * DIRECTOR_PROGRESS is retained only as a UI compatibility fallback.
 */
export const DIRECTOR_PROGRESS = {
  candidateSeedAlignment: 0.03,
  candidateProjectFraming: 0.06,
  candidateDirectionBatch: 0.1,
  candidateTitlePack: 0.14,
  novelCreate: 0.08,
  bookContract: 0.14,
  storyMacro: 0.22,
  constraintEngine: 0.30,
  worldSetup: 0.32,
  characterSetup: 0.36,
  characterSetupReady: 0.42,
  volumeStrategy: 0.48,
  volumeSkeleton: 0.58,
  volumeStrategyReady: 0.66,
  beatSheet: 0.72,
  chapterList: 0.78,
  chapterSync: 0.82,
  chapterDetailStart: 0.82,
  chapterDetailDone: 0.92,
  chapterBatchReady: 0.92,
} as const;

export const DIRECTOR_CHAPTER_DETAIL_MODES = ["task_sheet"] as const;

export type DirectorProgressItemKey =
  | "candidate_seed_alignment"
  | "candidate_project_framing"
  | "candidate_direction_batch"
  | "candidate_title_pack"
  | "novel_create"
  | "book_contract"
  | "story_macro"
  | "constraint_engine"
  | "world_setup"
  | "character_setup"
  | "character_cast_apply"
  | "volume_strategy"
  | "volume_skeleton"
  | "beat_sheet"
  | "chapter_list"
  | "chapter_sync"
  | "chapter_detail_bundle";

/**
 * Resolve director progress by preferring StepModule.inspectProgress() results
 * and falling back to the legacy DIRECTOR_PROGRESS fixed-percentage map.
 *
 * Usage:
 *   const progress = resolveProgress({
 *     stepModuleProgress: await module.inspectProgress(context),
 *     fallbackKey: "story_macro",
 *   });
 */
export function resolveDirectorProgress(input: {
  stepModuleProgress?: { ratio?: number; label?: string } | null;
  fallbackKey?: string;
  fallbackRatio?: number;
}): { ratio: number; label: string } {
  if (input.stepModuleProgress && input.stepModuleProgress.ratio !== undefined) {
    return {
      ratio: input.stepModuleProgress.ratio,
      label: input.stepModuleProgress.label ?? "正在执行...",
    };
  }
  if (input.fallbackKey && input.fallbackKey in DIRECTOR_PROGRESS) {
    const value = DIRECTOR_PROGRESS[input.fallbackKey as keyof typeof DIRECTOR_PROGRESS];
    return { ratio: value, label: `步骤进度（旧兼容模式）` };
  }
  if (input.fallbackRatio !== undefined) {
    return { ratio: input.fallbackRatio, label: "步骤进度" };
  }
  return { ratio: 0, label: "等待开始" };
}

export function buildChapterDetailBundleProgress(completedSteps: number, totalSteps: number): number {
  if (totalSteps <= 0) {
    return DIRECTOR_PROGRESS.chapterDetailDone;
  }
  const normalizedCompletedSteps = Math.max(0, Math.min(completedSteps, totalSteps));
  const ratio = normalizedCompletedSteps / totalSteps;
  return DIRECTOR_PROGRESS.chapterDetailStart
    + ((DIRECTOR_PROGRESS.chapterDetailDone - DIRECTOR_PROGRESS.chapterDetailStart) * ratio);
}

export function buildChapterDetailBundleLabel(
  chapterIndex: number,
  totalChapters: number,
  detailMode: (typeof DIRECTOR_CHAPTER_DETAIL_MODES)[number],
): string {
  return `正在细化第 ${chapterIndex}/${totalChapters} 章 · ${formatChapterDetailModeLabel(detailMode)}`;
}
