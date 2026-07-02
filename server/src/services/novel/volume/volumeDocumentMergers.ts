import type {
  VolumeBeatSheet,
  VolumeChapterListGenerationMode,
  VolumeChapterPlan,
  VolumePlan,
  VolumePlanDocument,
  VolumeRebalanceDecision,
  VolumeStrategyPlan,
} from "@ai-novel/shared/types/novel";
import { buildVolumeWorkspaceDocument } from "./volumeWorkspaceDocument";
import type { ChapterDetailMode } from "./volumeModels";
import {
  parseBeatChapterSpan,
  resolveVolumeChapterBeatKey,
} from "./volumeBeatKeyResolution";
import {
  withVolumeChapterListPartialStatus,
} from "./volumeChapterListStatus";

export interface GeneratedVolumeChapterBlock {
  beatKey: string;
  beatLabel: string;
  chapterCount: number;
  chapters: Array<{
    beatKey: string;
    title: string;
    summary: string;
  }>;
}

// ---------------------------------------------------------------------------
// Simple document merge functions
// ---------------------------------------------------------------------------

export function mergeStrategyPlan(document: VolumePlanDocument, strategyPlan: VolumeStrategyPlan): VolumePlanDocument {
  return buildVolumeWorkspaceDocument({
    novelId: document.novelId,
    volumes: document.volumes,
    strategyPlan,
    critiqueReport: null,
    beatSheets: [],
    rebalanceDecisions: [],
    source: "volume",
    activeVersionId: document.activeVersionId,
  });
}

export function mergeCritiqueReport(document: VolumePlanDocument, critiqueReport: VolumePlanDocument["critiqueReport"]): VolumePlanDocument {
  return buildVolumeWorkspaceDocument({
    novelId: document.novelId,
    volumes: document.volumes,
    strategyPlan: document.strategyPlan,
    critiqueReport,
    beatSheets: document.beatSheets,
    rebalanceDecisions: document.rebalanceDecisions,
    source: "volume",
    activeVersionId: document.activeVersionId,
  });
}

export function mergeSkeleton(document: VolumePlanDocument, generatedVolumes: Array<{
  title: string;
  summary?: string | null;
  openingHook: string;
  mainPromise: string;
  primaryPressureSource: string;
  coreSellingPoint: string;
  escalationMode: string;
  protagonistChange: string;
  midVolumeRisk: string;
  climax: string;
  payoffType: string;
  nextVolumeHook: string;
  resetPoint?: string | null;
  openPayoffs: string[];
}>): VolumePlanDocument {
  const mergedVolumes = generatedVolumes.map((volume, index) => {
    const existing = document.volumes[index];
    return {
      id: existing?.id,
      novelId: document.novelId,
      sortOrder: index + 1,
      title: volume.title,
      summary: volume.summary ?? null,
      openingHook: volume.openingHook,
      mainPromise: volume.mainPromise,
      primaryPressureSource: volume.primaryPressureSource,
      coreSellingPoint: volume.coreSellingPoint,
      escalationMode: volume.escalationMode,
      protagonistChange: volume.protagonistChange,
      midVolumeRisk: volume.midVolumeRisk,
      climax: volume.climax,
      payoffType: volume.payoffType,
      nextVolumeHook: volume.nextVolumeHook,
      resetPoint: volume.resetPoint ?? null,
      openPayoffs: volume.openPayoffs,
      status: existing?.status ?? "active",
      sourceVersionId: existing?.sourceVersionId ?? null,
      chapters: existing?.chapters ?? [],
      createdAt: existing?.createdAt ?? new Date(0).toISOString(),
      updatedAt: existing?.updatedAt ?? new Date(0).toISOString(),
    };
  });

  return buildVolumeWorkspaceDocument({
    novelId: document.novelId,
    volumes: mergedVolumes,
    strategyPlan: document.strategyPlan,
    critiqueReport: document.critiqueReport,
    beatSheets: [],
    rebalanceDecisions: [],
    source: "volume",
    activeVersionId: document.activeVersionId,
  });
}

export function mergeBeatSheet(
  document: VolumePlanDocument,
  targetVolume: VolumePlan,
  beats: VolumeBeatSheet["beats"],
): VolumePlanDocument {
  const nextBeatSheets = [
    ...document.beatSheets.filter((sheet) => sheet.volumeId !== targetVolume.id),
    {
      volumeId: targetVolume.id,
      volumeSortOrder: targetVolume.sortOrder,
      status: "generated" as const,
      beats,
    },
  ].sort((left, right) => left.volumeSortOrder - right.volumeSortOrder);

  return buildVolumeWorkspaceDocument({
    novelId: document.novelId,
    volumes: document.volumes,
    strategyPlan: document.strategyPlan,
    critiqueReport: document.critiqueReport,
    beatSheets: nextBeatSheets,
    rebalanceDecisions: document.rebalanceDecisions,
    source: "volume",
    activeVersionId: document.activeVersionId,
  });
}

export function mergeRebalance(
  document: VolumePlanDocument,
  anchorVolumeId: string,
  decisions: VolumeRebalanceDecision[],
): VolumePlanDocument {
  const nextDecisions = [
    ...document.rebalanceDecisions.filter((decision) => decision.anchorVolumeId !== anchorVolumeId),
    ...decisions,
  ];
  return buildVolumeWorkspaceDocument({
    novelId: document.novelId,
    volumes: document.volumes,
    strategyPlan: document.strategyPlan,
    critiqueReport: document.critiqueReport,
    beatSheets: document.beatSheets,
    rebalanceDecisions: nextDecisions,
    source: "volume",
    activeVersionId: document.activeVersionId,
  });
}

// ---------------------------------------------------------------------------
// Chapter list merge helpers (extracted from volumeGenerationHelpers)
// ---------------------------------------------------------------------------

function buildExistingBeatChapterGroups(params: {
  volume: VolumePlan;
  beatSheet: VolumeBeatSheet;
}): {
  groups: Map<string, VolumeChapterPlan[]>;
  unmatched: VolumeChapterPlan[];
} {
  const groups = new Map<string, VolumeChapterPlan[]>(
    params.beatSheet.beats.map((beat) => [beat.key, []]),
  );
  const unmatched: VolumeChapterPlan[] = [];
  for (const chapter of params.volume.chapters.slice().sort((left, right) => left.chapterOrder - right.chapterOrder)) {
    const beatKey = resolveVolumeChapterBeatKey({
      chapter,
      volume: params.volume,
      beatSheet: params.beatSheet,
    });
    if (!beatKey || !groups.has(beatKey)) {
      unmatched.push(chapter);
      continue;
    }
    groups.get(beatKey)?.push(chapter);
  }
  return { groups, unmatched };
}

function cloneExistingChapterWithBeatKey(chapter: VolumeChapterPlan, beatKey: string | null): VolumeChapterPlan {
  return {
    ...chapter,
    beatKey,
  };
}

export function mergeChapterList(
  document: VolumePlanDocument,
  targetVolumeId: string,
  targetBeatSheet: VolumeBeatSheet,
  generatedBlocks: GeneratedVolumeChapterBlock[],
  options: {
    generationMode?: VolumeChapterListGenerationMode;
    targetBeatKey?: string;
    resumeFromBeatKey?: string | null;
    markAsPartial?: boolean;
  } = {},
): VolumePlanDocument {
  const mergedVolumes = document.volumes.map((volume) => {
    if (volume.id !== targetVolumeId) {
      return volume;
    }

    const { groups: existingGroups, unmatched } = buildExistingBeatChapterGroups({
      volume,
      beatSheet: targetBeatSheet,
    });
    const generatedBlocksByBeatKey = new Map(
      generatedBlocks.map((block) => [block.beatKey, block]),
    );
    const generationMode = options.generationMode ?? "full_volume";
    const resumeBeatKey = options.resumeFromBeatKey?.trim() || null;
    const resumeBeatIndex = resumeBeatKey
      ? targetBeatSheet.beats.findIndex((beat) => beat.key === resumeBeatKey)
      : -1;
    const nextChapters: VolumeChapterPlan[] = [];

    for (const [beatIndex, beat] of targetBeatSheet.beats.entries()) {
      const existingBeatChapters = existingGroups.get(beat.key) ?? [];
      const generatedBlock = generatedBlocksByBeatKey.get(beat.key);

      if (!generatedBlock) {
        const shouldPreserveExistingBeat = generationMode === "single_beat"
          || (generationMode === "full_volume" && resumeBeatIndex >= 0 && beatIndex < resumeBeatIndex);
        if (shouldPreserveExistingBeat) {
          nextChapters.push(
            ...existingBeatChapters.map((chapter) => cloneExistingChapterWithBeatKey(chapter, beat.key)),
          );
        }
        continue;
      }

      for (const [chapterIndex, chapter] of generatedBlock.chapters.entries()) {
        const existingChapter = existingBeatChapters[chapterIndex];
        nextChapters.push({
          id: existingChapter?.id,
          volumeId: volume.id,
          chapterOrder: nextChapters.length + 1,
          beatKey: beat.key,
          title: chapter.title,
          summary: chapter.summary,
          purpose: existingChapter?.purpose ?? null,
          exclusiveEvent: existingChapter?.exclusiveEvent ?? null,
          endingState: existingChapter?.endingState ?? null,
          nextChapterEntryState: existingChapter?.nextChapterEntryState ?? null,
          conflictLevel: existingChapter?.conflictLevel ?? null,
          revealLevel: existingChapter?.revealLevel ?? null,
          targetWordCount: existingChapter?.targetWordCount ?? null,
          mustAvoid: existingChapter?.mustAvoid ?? null,
          taskSheet: existingChapter?.taskSheet ?? null,
          sceneCards: existingChapter?.sceneCards ?? null,
          payoffRefs: existingChapter?.payoffRefs ?? [],
          createdAt: existingChapter?.createdAt ?? new Date(0).toISOString(),
          updatedAt: existingChapter?.updatedAt ?? new Date(0).toISOString(),
        });
      }
    }

    if (generationMode === "single_beat") {
      const preservedUnmatched = unmatched
        .filter((chapter) => {
          const normalizedTargetBeatKey = options.targetBeatKey?.trim();
          if (!normalizedTargetBeatKey) {
            return true;
          }
          return resolveVolumeChapterBeatKey({
            chapter,
            volume,
            beatSheet: targetBeatSheet,
          }) !== normalizedTargetBeatKey;
        })
        .map((chapter) => cloneExistingChapterWithBeatKey(chapter, chapter.beatKey ?? null));
      nextChapters.push(...preservedUnmatched);
    }

    return withVolumeChapterListPartialStatus({
      ...volume,
      chapters: nextChapters.map((chapter, chapterIndex) => ({
        ...chapter,
        chapterOrder: chapterIndex + 1,
      })),
    }, options.markAsPartial === true);
  });

  return buildVolumeWorkspaceDocument({
    novelId: document.novelId,
    volumes: mergedVolumes,
    strategyPlan: document.strategyPlan,
    critiqueReport: document.critiqueReport,
    beatSheets: document.beatSheets,
    rebalanceDecisions: document.rebalanceDecisions,
    source: "volume",
    activeVersionId: document.activeVersionId,
  });
}

// ---------------------------------------------------------------------------
// Chapter detail merge
// ---------------------------------------------------------------------------

export function mergeChapterDetail(params: {
  document: VolumePlanDocument;
  targetVolumeId: string;
  targetChapterId: string;
  detailMode: ChapterDetailMode;
  generatedDetail: Record<string, unknown>;
}): VolumePlanDocument {
  const { document, targetVolumeId, targetChapterId, detailMode, generatedDetail } = params;
  const mergedVolumes = document.volumes.map((volume) => {
    if (volume.id !== targetVolumeId) {
      return volume;
    }
    return {
      ...volume,
      chapters: volume.chapters.map((chapter) => {
        if (chapter.id !== targetChapterId) {
          return chapter;
        }
        if (detailMode === "purpose") {
          return {
            ...chapter,
            purpose: typeof generatedDetail.purpose === "string" ? generatedDetail.purpose : chapter.purpose,
          };
        }
        if (detailMode === "boundary") {
          return {
            ...chapter,
            exclusiveEvent: typeof generatedDetail.exclusiveEvent === "string" ? generatedDetail.exclusiveEvent : chapter.exclusiveEvent,
            endingState: typeof generatedDetail.endingState === "string" ? generatedDetail.endingState : chapter.endingState,
            nextChapterEntryState: typeof generatedDetail.nextChapterEntryState === "string"
              ? generatedDetail.nextChapterEntryState
              : chapter.nextChapterEntryState,
            conflictLevel: typeof generatedDetail.conflictLevel === "number" ? generatedDetail.conflictLevel : chapter.conflictLevel,
            revealLevel: typeof generatedDetail.revealLevel === "number" ? generatedDetail.revealLevel : chapter.revealLevel,
            targetWordCount: typeof generatedDetail.targetWordCount === "number" ? generatedDetail.targetWordCount : chapter.targetWordCount,
            mustAvoid: typeof generatedDetail.mustAvoid === "string" ? generatedDetail.mustAvoid : chapter.mustAvoid,
            payoffRefs: Array.isArray(generatedDetail.payoffRefs)
              ? generatedDetail.payoffRefs.filter((item): item is string => typeof item === "string")
              : chapter.payoffRefs,
          };
        }
        return {
          ...chapter,
          purpose: typeof generatedDetail.purpose === "string" ? generatedDetail.purpose : chapter.purpose,
          exclusiveEvent: typeof generatedDetail.exclusiveEvent === "string" ? generatedDetail.exclusiveEvent : chapter.exclusiveEvent,
          endingState: typeof generatedDetail.endingState === "string" ? generatedDetail.endingState : chapter.endingState,
          nextChapterEntryState: typeof generatedDetail.nextChapterEntryState === "string"
            ? generatedDetail.nextChapterEntryState
            : chapter.nextChapterEntryState,
          conflictLevel: typeof generatedDetail.conflictLevel === "number" ? generatedDetail.conflictLevel : chapter.conflictLevel,
          revealLevel: typeof generatedDetail.revealLevel === "number" ? generatedDetail.revealLevel : chapter.revealLevel,
          targetWordCount: typeof generatedDetail.targetWordCount === "number" ? generatedDetail.targetWordCount : chapter.targetWordCount,
          mustAvoid: typeof generatedDetail.mustAvoid === "string" ? generatedDetail.mustAvoid : chapter.mustAvoid,
          payoffRefs: Array.isArray(generatedDetail.payoffRefs)
            ? generatedDetail.payoffRefs.filter((item): item is string => typeof item === "string")
            : chapter.payoffRefs,
          taskSheet: typeof generatedDetail.taskSheet === "string" ? generatedDetail.taskSheet : chapter.taskSheet,
          sceneCards: typeof generatedDetail.sceneCards === "string" ? generatedDetail.sceneCards : chapter.sceneCards,
        };
      }),
    };
  });

  return buildVolumeWorkspaceDocument({
    novelId: document.novelId,
    volumes: mergedVolumes,
    strategyPlan: document.strategyPlan,
    critiqueReport: document.critiqueReport,
    beatSheets: document.beatSheets,
    rebalanceDecisions: document.rebalanceDecisions,
    source: "volume",
    activeVersionId: document.activeVersionId,
  });
}
