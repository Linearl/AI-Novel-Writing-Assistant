import type {
  VolumeBeatSheet,
  VolumeChapterListGenerationMode,
  VolumeGenerationScopeInput,
  VolumePlan,
  VolumePlanDocument,
} from "@ai-novel/shared/types/novel";
import { findBeatSheet } from "../volumePlan.utils";
import type { ChapterDetailMode } from "../chapterDetailPlanning.shared";

export interface ChapterListGenerationRequest {
  generationMode?: VolumeChapterListGenerationMode;
  targetBeatKey?: string;
}

export interface VolumeGenerationPayload {
  scope: VolumeGenerationScopeInput;
  generationMode?: VolumeChapterListGenerationMode;
  targetVolumeId?: string;
  targetBeatKey?: string;
  targetChapterId?: string;
  detailMode?: ChapterDetailMode;
  draftVolumesOverride?: VolumePlan[];
  suppressSuccessMessage?: boolean;
  referenceExisting?: boolean;
}

export async function startStrategyGenerationAction(params: {
  ensureCharacterGuard: () => Promise<boolean>;
  userPreferredVolumeCount: number | null;
  forceSystemRecommendedVolumeCount: boolean;
  volumeCountGuidance: {
    systemRecommendedVolumeCount: number;
    allowedVolumeCountRange: { min: number; max: number };
    respectedExistingVolumeCount?: number | null;
  };
  hasUnsavedVolumeDraft: boolean;
  generate: (payload: VolumeGenerationPayload) => void;
}): Promise<void> {
  if (!(await params.ensureCharacterGuard())) {
    return;
  }
  // 直接生成，按钮已有 loading 状态反馈
  params.generate({ scope: "strategy" });
}

export async function startStrategyCritiqueAction(params: {
  ensureCharacterGuard: () => Promise<boolean>;
  generate: (payload: VolumeGenerationPayload) => void;
}): Promise<void> {
  if (!(await params.ensureCharacterGuard())) {
    return;
  }
  params.generate({ scope: "strategy_critique" });
}

export async function startSkeletonGenerationAction(params: {
  ensureCharacterGuard: () => Promise<boolean>;
  hasUnsavedVolumeDraft: boolean;
  confirm: (message: string) => Promise<boolean>;
  generate: (payload: VolumeGenerationPayload) => void;
}): Promise<void> {
  if (!(await params.ensureCharacterGuard())) {
    return;
  }
  const confirmed = await params.confirm([
    "将根据当前卷战略建议生成或重生成全书卷骨架。",
    "这一步会清空已有节奏板和相邻卷再平衡建议，但不会直接删除章节正文。",
    params.hasUnsavedVolumeDraft ? "本次会直接使用当前页面草稿作为卷骨架上下文。" : "本次会基于当前卷工作区继续推进。",
  ].join("\n\n"));
  if (!confirmed) {
    return;
  }
  params.generate({ scope: "skeleton" });
}

export async function startBeatSheetGenerationAction(params: {
  volumeId: string;
  normalizedVolumeDraft: VolumePlan[];
  strategyPlan: object | null;
  beatSheets: VolumeBeatSheet[];
  ensureCharacterGuard: () => Promise<boolean>;
  setStructuredMessage: (value: string) => void;
  referenceExisting?: boolean;
  confirm: (message: string) => Promise<boolean>;
  generate: (payload: VolumeGenerationPayload) => void;
}): Promise<void> {
  const targetVolume = params.normalizedVolumeDraft.find((volume) => volume.id === params.volumeId);
  if (!targetVolume) {
    params.setStructuredMessage("当前卷不存在，无法生成节奏板。");
    return;
  }
  if (!params.strategyPlan) {
    params.setStructuredMessage("请先生成卷战略建议，再生成当前卷节奏板。");
    return;
  }
  if (!(await params.ensureCharacterGuard())) {
    return;
  }
  const existingBeatSheet = findBeatSheet(params.beatSheets, params.volumeId);
  if (existingBeatSheet) {
    const confirmed = await params.confirm([
      `将重新生成「${targetVolume.title?.trim() || `第${targetVolume.sortOrder}卷`}」的节奏板。`,
      "这一步会覆盖当前卷现有节奏段与交付项。",
      "已有章节列表和章节细化资产不会被直接删除，但如果新节奏区间发生变化，建议随后检查章节列表是否仍然匹配。",
    ].join("\n\n"));
    if (!confirmed) {
      return;
    }
  }
  params.generate({
    scope: "beat_sheet",
    targetVolumeId: params.volumeId,
    referenceExisting: params.referenceExisting,
  });
}

export async function startChapterListGenerationAction(params: {
  volumeId: string;
  request?: ChapterListGenerationRequest;
  normalizedVolumeDraft: VolumePlan[];
  beatSheets: VolumeBeatSheet[];
  ensureCharacterGuard: () => Promise<boolean>;
  setStructuredMessage: (value: string) => void;
  generate: (payload: VolumeGenerationPayload) => void;
}): Promise<void> {
  const targetVolume = params.normalizedVolumeDraft.find((volume) => volume.id === params.volumeId);
  if (!targetVolume) {
    params.setStructuredMessage("当前卷不存在，无法生成章节列表。");
    return;
  }
  if (!findBeatSheet(params.beatSheets, params.volumeId)) {
    params.setStructuredMessage("当前卷还没有节奏板，默认不能直接拆章节列表。");
    return;
  }
  if (!(await params.ensureCharacterGuard())) {
    return;
  }
  const generationMode = params.request?.generationMode ?? "full_volume";
  const targetBeatKey = params.request?.targetBeatKey?.trim();
  if (generationMode === "single_beat" && !targetBeatKey) {
    params.setStructuredMessage("当前节奏段不存在，无法重生该段章节标题。");
    return;
  }
  params.generate({
    scope: "chapter_list",
    generationMode,
    targetVolumeId: params.volumeId,
    targetBeatKey,
  });
}

export function buildChapterListSuccessMessage(params: {
  document: VolumePlanDocument;
  targetVolumeId?: string;
  generationMode?: VolumeChapterListGenerationMode;
  targetBeatKey?: string;
  autoSyncedToChapterExecution?: boolean;
}): string {
  const updatedVolume = params.targetVolumeId
    ? params.document.volumes.find((volume) => volume.id === params.targetVolumeId)
    : undefined;
  const updatedChapterCount = updatedVolume?.chapters.length ?? 0;
  const syncSuffix = params.autoSyncedToChapterExecution ? "，并连接到章节执行区" : "";
  if (params.generationMode === "single_beat" && params.targetVolumeId && params.targetBeatKey) {
    const targetBeat = findBeatSheet(params.document.beatSheets, params.targetVolumeId)?.beats
      .find((beat) => beat.key === params.targetBeatKey);
    return updatedChapterCount > 0
      ? `当前卷节奏段「${targetBeat?.label ?? params.targetBeatKey}」已重生并自动保存${syncSuffix}，本卷现有 ${updatedChapterCount} 章，相邻卷再平衡建议也已同步更新。`
      : `当前卷节奏段「${targetBeat?.label ?? params.targetBeatKey}」已重生并自动保存${syncSuffix}，相邻卷再平衡建议也已同步更新。`;
  }
  return updatedChapterCount > 0
    ? `当前卷章节列表已生成并自动保存${syncSuffix}，现已更新为 ${updatedChapterCount} 章，相邻卷再平衡建议也已同步更新。`
    : `当前卷章节列表已生成并自动保存${syncSuffix}，相邻卷再平衡建议也已同步更新。`;
}
