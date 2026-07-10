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
  // Coordination methods (original 17)
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

  // Chapter management (used by route files)
  listChapters: (...args: any[]) => Promise<any>;
  createChapter: (...args: any[]) => Promise<any>;
  updateChapter: (...args: any[]) => Promise<any>;
  deleteChapter: (...args: any[]) => Promise<any>;
  softDeleteChapter: (...args: any[]) => Promise<any>;
  restoreChapter: (...args: any[]) => Promise<any>;
  ensureChapterExecutionContract: (...args: any[]) => Promise<any>;
  toggleChapterLock: (...args: any[]) => Promise<any>;
  getChapterEditorWorkspace: (...args: any[]) => Promise<any>;
  previewChapterRewrite: (...args: any[]) => Promise<any>;
  previewChapterAiRevision: (...args: any[]) => Promise<any>;

  // Chapter review/audit (used by route files)
  reviewChapter: (...args: any[]) => Promise<any>;
  auditChapter: (...args: any[]) => Promise<any>;
  listChapterAuditReports: (...args: any[]) => Promise<any>;
  resolveAuditIssues: (...args: any[]) => Promise<any>;
  getQualityReport: (...args: any[]) => Promise<any>;

  // World slice (used by route files)
  getNovelWorld: (...args: any[]) => Promise<any>;
  getNovelWorldSyncDiff: (...args: any[]) => Promise<any>;
  importNovelWorldFromLibrary: (...args: any[]) => Promise<any>;
  createManualNovelWorld: (...args: any[]) => Promise<any>;
  generateNovelWorldFromTheme: (...args: any[]) => Promise<any>;
  saveNovelWorldToLibrary: (...args: any[]) => Promise<any>;
  syncNovelWorldWithLibrary: (...args: any[]) => Promise<any>;
  deleteNovelWorld: (...args: any[]) => Promise<any>;
  getWorldSlice: (...args: any[]) => Promise<any>;
  refreshWorldSlice: (...args: any[]) => Promise<any>;
  updateWorldSliceOverrides: (...args: any[]) => Promise<any>;
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
  "reviewChapter",
  "auditChapter",
  "listChapterAuditReports",
  "resolveAuditIssues",
  "getQualityReport",
  "getNovelWorld",
  "getNovelWorldSyncDiff",
  "importNovelWorldFromLibrary",
  "createManualNovelWorld",
  "generateNovelWorldFromTheme",
  "saveNovelWorldToLibrary",
  "syncNovelWorldWithLibrary",
  "deleteNovelWorld",
  "getWorldSlice",
  "refreshWorldSlice",
  "updateWorldSliceOverrides",
  "restoreChapter",
  "ensureChapterExecutionContract",
  "toggleChapterLock",
  "listChapters",
  "createChapter",
  "updateChapter",
  "deleteChapter",
  "softDeleteChapter",
  "getChapterEditorWorkspace",
  "previewChapterRewrite",
  "previewChapterAiRevision",
] as const;
