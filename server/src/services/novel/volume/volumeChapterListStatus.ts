import type {
  VolumePlan,
  VolumePlanDocument,
} from "@ai-novel/shared/types/novel";
import { buildVolumeWorkspaceDocument } from "./volumeWorkspaceDocument";

export const VOLUME_CHAPTER_LIST_PARTIAL_STATUS_PREFIX = "chapter_list_partial";

export function isVolumeChapterListPartiallyPersisted(volume: Pick<VolumePlan, "status">): boolean {
  const normalizedStatus = volume.status?.trim() ?? "";
  return normalizedStatus === VOLUME_CHAPTER_LIST_PARTIAL_STATUS_PREFIX
    || normalizedStatus.startsWith(`${VOLUME_CHAPTER_LIST_PARTIAL_STATUS_PREFIX}:`);
}

export function resolveOriginalVolumeStatus(status: string): string {
  const normalizedStatus = status.trim();
  const prefixedStatus = `${VOLUME_CHAPTER_LIST_PARTIAL_STATUS_PREFIX}:`;
  if (normalizedStatus.startsWith(prefixedStatus)) {
    return normalizedStatus.slice(prefixedStatus.length).trim() || "active";
  }
  if (normalizedStatus === VOLUME_CHAPTER_LIST_PARTIAL_STATUS_PREFIX) {
    return "active";
  }
  return normalizedStatus || "active";
}

export function withVolumeChapterListPartialStatus(volume: VolumePlan, markAsPartial: boolean): VolumePlan {
  if (markAsPartial) {
    return {
      ...volume,
      status: isVolumeChapterListPartiallyPersisted(volume)
        ? volume.status
        : `${VOLUME_CHAPTER_LIST_PARTIAL_STATUS_PREFIX}:${resolveOriginalVolumeStatus(volume.status)}`,
    };
  }
  return {
    ...volume,
    status: resolveOriginalVolumeStatus(volume.status),
  };
}

export function setVolumeChapterListPartialStatus(
  document: VolumePlanDocument,
  targetVolumeId: string,
  markAsPartial: boolean,
): VolumePlanDocument {
  return buildVolumeWorkspaceDocument({
    novelId: document.novelId,
    volumes: document.volumes.map((volume) => (
      volume.id === targetVolumeId ? withVolumeChapterListPartialStatus(volume, markAsPartial) : volume
    )),
    strategyPlan: document.strategyPlan,
    critiqueReport: document.critiqueReport,
    beatSheets: document.beatSheets,
    rebalanceDecisions: document.rebalanceDecisions,
    source: "volume",
    activeVersionId: document.activeVersionId,
  });
}
