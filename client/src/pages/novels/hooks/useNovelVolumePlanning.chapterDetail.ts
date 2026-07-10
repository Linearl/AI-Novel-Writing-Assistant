import type { VolumePlan, VolumePlanDocument } from "@ai-novel/shared";
import {
  CHAPTER_DETAIL_MODES,
  detailModeLabel,
  hasAnyChapterDetailDraft,
  hasChapterDetailDraft,
  type ChapterDetailBundleRequest,
  type ChapterDetailMode,
} from "../chapterDetailPlanning.shared";

interface ChapterDetailTarget {
  chapterId: string;
  chapterOrder: number;
  title: string;
}

interface ResolvedChapterDetailBatch {
  label: string;
  missingCount: number;
  targets: ChapterDetailTarget[];
  hasExistingDrafts: boolean;
}

interface ChapterDetailMutationPayload {
  targetVolumeId: string;
  targetChapterId: string;
  detailMode: ChapterDetailMode;
  draftVolumesOverride: VolumePlan[];
  suppressSuccessMessage: true;
}

interface ChapterDetailMutationResult {
  nextDocument: VolumePlanDocument;
}

interface RunChapterDetailBatchGenerationArgs {
  initialDraft: VolumePlan[];
  label: string;
  targetVolumeId: string;
  targets: ChapterDetailTarget[];
  setIsGenerating: (value: boolean) => void;
  setCurrentChapterId: (value: string) => void;
  setCurrentMode: (value: ChapterDetailMode | "") => void;
  setStructuredMessage: (value: string) => void;
  generateChapterDetail: (
    payload: ChapterDetailMutationPayload,
  ) => Promise<ChapterDetailMutationResult>;
}

function describeChapterTarget(target: ChapterDetailTarget): string {
  return `第${target.chapterOrder}章《${target.title || "未命名章节"}》`;
}

function buildFallbackLabel(targets: ChapterDetailTarget[]): string {
  if (targets.length === 1) {
    return describeChapterTarget(targets[0]);
  }
  const first = targets[0];
  const last = targets[targets.length - 1];
  if (!first || !last) {
    return "当前章节范围";
  }
  return `第${first.chapterOrder}-${last.chapterOrder}章（共 ${targets.length} 章）`;
}

function resolveMissingChapterDetailModes(
  draft: VolumePlan[],
  targetVolumeId: string,
  targetChapterId: string,
): ChapterDetailMode[] {
  const chapter = draft
    .find((volume) => volume.id === targetVolumeId)
    ?.chapters.find((item) => item.id === targetChapterId);
  if (!chapter) {
    return [];
  }
  return CHAPTER_DETAIL_MODES.filter((mode) => !hasChapterDetailDraft(chapter, mode));
}

export function resolveChapterDetailBatch(
  volume: VolumePlan | undefined,
  request: ChapterDetailBundleRequest,
): ResolvedChapterDetailBatch {
  const requestedIds = typeof request === "string"
    ? [request]
    : Array.from(new Set(request.chapterIds.map((id) => id.trim()).filter(Boolean)));
  const matchedChapters = requestedIds
    .map((chapterId) => volume?.chapters.find((chapter) => chapter.id === chapterId))
    .filter((chapter): chapter is VolumePlan["chapters"][number] => Boolean(chapter));

  return {
    label: typeof request === "string"
      ? buildFallbackLabel(matchedChapters.map((chapter) => ({
        chapterId: chapter.id,
        chapterOrder: chapter.chapterOrder,
        title: chapter.title,
      })))
      : request.label?.trim() || buildFallbackLabel(matchedChapters.map((chapter) => ({
        chapterId: chapter.id,
        chapterOrder: chapter.chapterOrder,
        title: chapter.title,
      }))),
    missingCount: Math.max(requestedIds.length - matchedChapters.length, 0),
    targets: matchedChapters.map((chapter) => ({
      chapterId: chapter.id,
      chapterOrder: chapter.chapterOrder,
      title: chapter.title,
    })),
    hasExistingDrafts: matchedChapters.some((chapter) => hasAnyChapterDetailDraft(chapter)),
  };
}

export function buildChapterDetailBatchConfirmationMessage(
  batch: ResolvedChapterDetailBatch,
): string {
  return [
    batch.targets.length === 1
      ? `将基于当前内容为${batch.label} AI 补齐章节目标、执行边界和任务单。`
      : `将基于当前内容为${batch.label}连续补齐章节目标、执行边界和任务单。`,
    batch.hasExistingDrafts
      ? "会优先沿用各章已填写结果，只修正空缺、模糊和不够可执行的部分。"
      : "当前这些章节还是空白，AI 会先补出首版，再按现有标题和摘要逐章收束。",
    "不会改动章节标题和摘要。",
    batch.missingCount > 0 ? `有 ${batch.missingCount} 章已不在当前卷草稿中，会自动跳过。` : "",
  ].filter(Boolean).join("\n\n");
}

const MAX_RETRY_COUNT = 3;
const RETRY_DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runChapterDetailBatchGeneration({
  initialDraft,
  label,
  targetVolumeId,
  targets,
  setIsGenerating,
  setCurrentChapterId,
  setCurrentMode,
  setStructuredMessage,
  generateChapterDetail,
}: RunChapterDetailBatchGenerationArgs): Promise<void> {
  let workingDraft = initialDraft;
  let processedModeCount = 0;
  let failedCount = 0;
  const failedChapters: string[] = [];
  setIsGenerating(true);
  setCurrentMode("");
  setCurrentChapterId(targets[0]?.chapterId ?? "");
  setStructuredMessage(`正在为${label}补齐缺失的章节目标、执行边界和任务单...`);

  try {
    for (const target of targets) {
      const missingModes = resolveMissingChapterDetailModes(workingDraft, targetVolumeId, target.chapterId);
      if (missingModes.length === 0) {
        continue;
      }
      setCurrentChapterId(target.chapterId);
      for (const mode of missingModes) {
        setCurrentMode(mode);
        let lastError: unknown = null;
        for (let attempt = 1; attempt <= MAX_RETRY_COUNT; attempt++) {
          try {
            const result = await generateChapterDetail({
              targetVolumeId,
              targetChapterId: target.chapterId,
              detailMode: mode,
              draftVolumesOverride: workingDraft,
              suppressSuccessMessage: true,
            });
            workingDraft = result.nextDocument.volumes;
            processedModeCount += 1;
            lastError = null;
            break;
          } catch (error) {
            lastError = error;
            if (attempt < MAX_RETRY_COUNT) {
              setStructuredMessage(
                `第${target.chapterOrder}章 ${detailModeLabel(mode)} 生成失败（第${attempt}次），${RETRY_DELAY_MS / 1000}秒后重试...`,
              );
              await sleep(RETRY_DELAY_MS);
            }
          }
        }
        if (lastError) {
          failedCount += 1;
          failedChapters.push(describeChapterTarget(target));
          console.error(`[chapterDetailBatch] ${describeChapterTarget(target)} ${detailModeLabel(mode)} 最终失败:`, lastError);
        }
      }
    }

    if (failedCount === 0) {
      setStructuredMessage(
        processedModeCount > 0
          ? `${label}的章节目标、执行边界和任务单已补齐并自动保存。`
          : `${label}当前已经完整，无需重复生成章节细化。`,
      );
    } else if (processedModeCount > 0) {
      setStructuredMessage(
        `部分完成：${processedModeCount} 项已保存，${failedCount} 项失败（${failedChapters.join("、")}）。可重新尝试失败章节。`,
      );
    } else {
      setStructuredMessage(
        `${label}细化全部失败（${failedChapters.join("、")}）。请检查网络或模型配置后重试。`,
      );
    }
  } finally {
    setIsGenerating(false);
    setCurrentChapterId("");
    setCurrentMode("");
  }
}
