import type { NovelCoreService } from "../NovelCoreService";

type NovelDetailWithVolumeWorkspace = NonNullable<Awaited<ReturnType<NovelCoreService["getNovelById"]>>> & {
  volumes?: unknown;
  volumeSource?: unknown;
  activeVolumeVersionId?: string | null;
};

/**
 * Coordination-only interface for cross-service operations.
 * Pure-delegation methods have been removed.
 * Callers should inject the specific sub-service they need directly.
 * @see REQ-7034
 */
export interface NovelApplicationServices {
  getNovelById: (id: string) => Promise<NovelDetailWithVolumeWorkspace | null>;
  createCharacter: (...args: any[]) => Promise<any>;
  updateCharacter: (...args: any[]) => Promise<any>;
  deleteCharacter: (...args: any[]) => Promise<void>;
  createNovelSnapshot: (...args: any[]) => Promise<any>;
  restoreFromSnapshot: (novelId: string, snapshotId: string) => Promise<NovelDetailWithVolumeWorkspace | null>;
  createStructuredOutlineStream: (...args: any[]) => Promise<any>;
  createChapterStream: (...args: any[]) => Promise<any>;
  createRepairStream: (...args: any[]) => Promise<any>;
  startPipelineJob: (...args: any[]) => Promise<any>;
  listStorylineVersions: (...args: any[]) => Promise<any[]>;
  createStorylineDraft: (...args: any[]) => Promise<any>;
  activateStorylineVersion: (...args: any[]) => Promise<any>;
  freezeStorylineVersion: (...args: any[]) => Promise<any>;
  getStorylineDiff: (...args: any[]) => Promise<any>;
  applyCharacterVisibleProfile: (...args: any[]) => Promise<any>;
  applyBatchCharacterVisibleProfiles: (...args: any[]) => Promise<any>;
}

export const novelApplicationServiceMethodNames = [
  "getNovelById",
  "createCharacter",
  "updateCharacter",
  "deleteCharacter",
  "createNovelSnapshot",
  "restoreFromSnapshot",
  "createStructuredOutlineStream",
  "createChapterStream",
  "createRepairStream",
  "startPipelineJob",
  "listStorylineVersions",
  "createStorylineDraft",
  "activateStorylineVersion",
  "freezeStorylineVersion",
  "getStorylineDiff",
  "applyCharacterVisibleProfile",
  "applyBatchCharacterVisibleProfiles",
] as const satisfies readonly (keyof NovelApplicationServices)[];
