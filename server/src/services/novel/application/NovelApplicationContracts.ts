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
  listNovelSnapshots: (novelId: string) => Promise<any[]>;
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

  // Novel CRUD (delegate to core)
  listNovels: (...args: any[]) => Promise<any>;
  createNovel: (...args: any[]) => Promise<any>;
  updateNovel: (...args: any[]) => Promise<any>;
  deleteNovel: (...args: any[]) => Promise<any>;

  // Planning & state (delegate to core)
  getNovelState: (...args: any[]) => Promise<any>;
  getLatestStateSnapshot: (...args: any[]) => Promise<any>;
  getPayoffLedger: (novelId: string, chapterOrder?: number) => Promise<any>;
  getChapterStateSnapshot: (...args: any[]) => Promise<any>;
  rebuildNovelState: (...args: any[]) => Promise<any>;
  generateBookPlan: (...args: any[]) => Promise<any>;
  generateArcPlan: (...args: any[]) => Promise<any>;
  generateChapterPlan: (...args: any[]) => Promise<any>;
  getChapterPlan: (...args: any[]) => Promise<any>;
  replanNovel: (...args: any[]) => Promise<any>;

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

  // Volume workspace (delegate to volumeService)
  getVolumes: (...args: any[]) => Promise<any>;
  listVolumeVersions: (...args: any[]) => Promise<any>;
  updateVolumes: (...args: any[]) => Promise<any>;
  generateVolumes: (...args: any[]) => Promise<any>;
  createVolumeDraft: (...args: any[]) => Promise<any>;
  activateVolumeVersion: (...args: any[]) => Promise<any>;
  freezeVolumeVersion: (...args: any[]) => Promise<any>;
  getVolumeVersion: (...args: any[]) => Promise<any>;
  getVolumeDiff: (...args: any[]) => Promise<any>;
  analyzeVolumeImpact: (...args: any[]) => Promise<any>;
  syncVolumeChapters: (...args: any[]) => Promise<any>;
  migrateLegacyVolumes: (...args: any[]) => Promise<any>;

  // Character timeline (delegate to core)
  listCharacterTimeline: (...args: any[]) => Promise<any>;

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

  // Missing methods (added to fix "is not a function" errors)
  analyzeStorylineImpact: (...args: any[]) => Promise<any>;
  applyCharacterCastOption: (...args: any[]) => Promise<any>;
  applySupplementalCharacter: (...args: any[]) => Promise<any>;
  checkCharacterAgainstWorld: (...args: any[]) => Promise<any>;
  clearCharacterCastOptions: (...args: any[]) => Promise<any>;
  confirmCharacterCandidate: (...args: any[]) => Promise<any>;
  createBeatStream: (...args: any[]) => Promise<any>;
  createBibleStream: (...args: any[]) => Promise<any>;
  createOutlineStream: (...args: any[]) => Promise<any>;
  deleteCharacterCastOption: (...args: any[]) => Promise<any>;
  evolveCharacter: (...args: any[]) => Promise<any>;
  generateBatchCharacterVisibleProfiles: (...args: any[]) => Promise<any>;
  generateChapterHook: (...args: any[]) => Promise<any>;
  generateCharacterCastOptions: (...args: any[]) => Promise<any>;
  generateCharacterVisibleProfile: (...args: any[]) => Promise<any>;
  generateSupplementalCharacters: (...args: any[]) => Promise<any>;
  generateTitles: (...args: any[]) => Promise<any>;
  getCharacterDynamicsOverview: (...args: any[]) => Promise<any>;
  getNovelStructuredOutline: (...args: any[]) => Promise<any>;
  getPipelineJob: (...args: any[]) => Promise<any>;
  importCharactersFromOutline: (...args: any[]) => Promise<any>;
  listCharacterCandidates: (...args: any[]) => Promise<any>;
  listCharacterCastOptions: (...args: any[]) => Promise<any>;
  listCharacterRelations: (...args: any[]) => Promise<any>;
  listCharacters: (...args: any[]) => Promise<any>;
  mergeCharacterCandidate: (...args: any[]) => Promise<any>;
  rebuildCharacterDynamics: (...args: any[]) => Promise<any>;
  refineSupplementalCharacter: (...args: any[]) => Promise<any>;
  syncAllCharacterTimeline: (...args: any[]) => Promise<any>;
  syncCharacterTimeline: (...args: any[]) => Promise<any>;
}

export const novelApplicationServiceMethodNames = [
  "getNovelById",
  "createCharacter",
  "updateCharacter",
  "deleteCharacter",
  "listNovelSnapshots",
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
  "listNovels",
  "createNovel",
  "updateNovel",
  "deleteNovel",
  "getNovelState",
  "getLatestStateSnapshot",
  "getPayoffLedger",
  "getChapterStateSnapshot",
  "rebuildNovelState",
  "generateBookPlan",
  "generateArcPlan",
  "generateChapterPlan",
  "getChapterPlan",
  "replanNovel",
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
  "getVolumes",
  "listVolumeVersions",
  "updateVolumes",
  "generateVolumes",
  "createVolumeDraft",
  "activateVolumeVersion",
  "freezeVolumeVersion",
  "getVolumeVersion",
  "getVolumeDiff",
  "analyzeVolumeImpact",
  "syncVolumeChapters",
  "migrateLegacyVolumes",
  "listCharacterTimeline",
  "analyzeStorylineImpact",
  "applyCharacterCastOption",
  "applySupplementalCharacter",
  "checkCharacterAgainstWorld",
  "clearCharacterCastOptions",
  "confirmCharacterCandidate",
  "createBeatStream",
  "createBibleStream",
  "createOutlineStream",
  "deleteCharacterCastOption",
  "evolveCharacter",
  "generateBatchCharacterVisibleProfiles",
  "generateChapterHook",
  "generateCharacterCastOptions",
  "generateCharacterVisibleProfile",
  "generateSupplementalCharacters",
  "generateTitles",
  "getCharacterDynamicsOverview",
  "getNovelStructuredOutline",
  "getPipelineJob",
  "importCharactersFromOutline",
  "listCharacterCandidates",
  "listCharacterCastOptions",
  "listCharacterRelations",
  "listCharacters",
  "mergeCharacterCandidate",
  "rebuildCharacterDynamics",
  "refineSupplementalCharacter",
  "syncAllCharacterTimeline",
  "syncCharacterTimeline",
] as const;
