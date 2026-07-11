import { prisma } from "../../../db/prisma";
import { NovelCoreService } from "../NovelCoreService";
import { NovelWorldSliceService } from "../storyWorldSlice/NovelWorldSliceService";
import { NovelWorldInstanceService } from "../worldContext/NovelWorldInstanceService";
import { NovelWorldLibrarySaveService } from "../worldContext/NovelWorldLibrarySaveService";
import { NovelWorldManualService } from "../worldContext/NovelWorldManualService";
import { CharacterPreparationService } from "../characterPrep/CharacterPreparationService";
import { CharacterDynamicsService } from "../dynamics/CharacterDynamicsService";
import { CharacterVisibleProfileService } from "../characterProfile/CharacterVisibleProfileService";
import {
  buildManualChapterControlPolicy,
  registerChapterExecutionStageRunner,
} from "../production/ChapterExecutionStageRunner";
import { buildManualProductionControlPolicy } from "../production/ChapterExecutionStageRunner";
import { registerChapterPreparationStageRunner } from "../production/ChapterPreparationStageRunner";
import { novelProductionOrchestrator } from "../production/NovelProductionOrchestrator";
import { registerQualityRepairStageRunner } from "../production/QualityRepairStageRunner";
import { ChapterRuntimeCoordinator } from "../runtime/ChapterRuntimeCoordinator";
import { NovelVolumeService } from "../volume/NovelVolumeService";
import { NovelChapterEditorService } from "../chapterEditor/NovelChapterEditorService";
import { ChapterEditorWorkspaceService } from "../chapterEditor/ChapterEditorWorkspaceService";
import type { NovelApplicationServices } from "./NovelApplicationContracts";
import type { NovelSnapshotListItem } from "@ai-novel/shared";

function toNovelSnapshotListItem(snapshot: {
  id: string;
  novelId: string;
  label: string | null;
  triggerType: string;
  createdAt: Date;
}): NovelSnapshotListItem {
  return {
    id: snapshot.id,
    novelId: snapshot.novelId,
    label: snapshot.label,
    triggerType: snapshot.triggerType as NovelSnapshotListItem["triggerType"],
    createdAt: snapshot.createdAt.toISOString(),
  };
}

/**
 * Coordination facade for cross-service novel operations.
 *
 * Pure-delegation methods (single-service, single-line) have been removed.
 * Callers should inject the specific sub-service directly:
 * - NovelCoreService (CRUD, audit, pipeline, review, generation)
 * - NovelVolumeService (volume CRUD, versioning, sync)
 * - NovelWorldSliceService / NovelWorldInstanceService / NovelWorldManualService / NovelWorldLibrarySaveService (world context)
 * - CharacterPreparationService (cast options, supplemental characters)
 * - CharacterDynamicsService (dynamics overview, candidates)
 * - CharacterVisibleProfileService (visible profile generation/apply)
 * - NovelChapterEditorService / ChapterEditorWorkspaceService (chapter editing)
 * - CharacterExitService (setCharacterExitStatus)
 *
 * @see REQ-7034 for the full migration plan.
 */
export class DefaultNovelApplicationServices implements NovelApplicationServices {
  // --- Service instances (shared with callers via getSharedNovelServices) ---
  readonly core = new NovelCoreService();
  readonly worldSliceService = new NovelWorldSliceService();
  readonly novelWorldInstanceService = new NovelWorldInstanceService();
  readonly novelWorldManualService = new NovelWorldManualService(this.novelWorldInstanceService);
  readonly novelWorldLibrarySaveService = new NovelWorldLibrarySaveService(this.novelWorldInstanceService);
  readonly characterPreparationService = new CharacterPreparationService();
  readonly characterDynamicsService = new CharacterDynamicsService();
  readonly characterVisibleProfileService = new CharacterVisibleProfileService();
  readonly volumeService = new NovelVolumeService();
  readonly chapterEditorWorkspaceService = new ChapterEditorWorkspaceService();
  readonly chapterEditorService = new NovelChapterEditorService();
  readonly chapterRuntimeCoordinator = new ChapterRuntimeCoordinator();
  readonly qualityRepairCoordinator = new ChapterRuntimeCoordinator({
    reviewChapterAfterRepair: (novelId, chapterId, options) => this.core.reviewChapter(novelId, chapterId, options),
    resolveAuditIssues: (novelId, issueIds) => this.core.resolveAuditIssues(novelId, issueIds),
  });

  constructor() {
    registerChapterExecutionStageRunner({
      getCore: () => this.core,
      getCoordinator: () => this.chapterRuntimeCoordinator,
    });
    registerChapterPreparationStageRunner({
      getCore: () => this.core,
    });
    registerQualityRepairStageRunner({
      getCore: () => this.core,
      getCoordinator: () => this.qualityRepairCoordinator,
    });
  }

  // ================================================================
  //  Coordination methods — kept in facade for cross-service logic
  // ================================================================

  async getNovelById(id: string) {
    const novel = await this.core.getNovelById(id);
    if (!novel) {
      return null;
    }
    // volumes 通过独立端点 /novels/:id/volumes 按需加载，
    // 不再合并到 novel detail 响应中（减少 75KB payload）
    return novel;
  }

  // ================================================================
  //  Pure-delegation methods — route files use Pick<> to access these
  // ================================================================

  // Novel CRUD (delegate to core)
  listNovels = (...args: any[]) => (this.core as any).listNovels(...args);
  createNovel = (...args: any[]) => (this.core as any).createNovel(...args);
  updateNovel = (...args: any[]) => (this.core as any).updateNovel(...args);
  deleteNovel = (...args: any[]) => (this.core as any).deleteNovel(...args);

  // Chapter management (delegate to core)
  listChapters = (novelId: string) => this.core.listChapters(novelId);
  createChapter = (novelId: string, input: any) => this.core.createChapter(novelId, input);
  updateChapter = (novelId: string, chapterId: string, input: any) => this.core.updateChapter(novelId, chapterId, input);
  deleteChapter = (novelId: string, chapterId: string) => this.core.deleteChapter(novelId, chapterId);
  softDeleteChapter = (novelId: string, chapterId: string) => this.core.softDeleteChapter(novelId, chapterId);
  restoreChapter = (novelId: string, chapterId: string) => this.core.restoreChapter(novelId, chapterId);
  toggleChapterLock = (novelId: string, chapterId: string, locked: boolean) => this.core.toggleChapterLock(novelId, chapterId, locked);
  ensureChapterExecutionContract = (...args: any[]) => (this.core as any).ensureChapterExecutionContract?.(...args);
  getChapterEditorWorkspace = (novelId: string, chapterId: string) => this.chapterEditorWorkspaceService.getWorkspace(novelId, chapterId);
  previewChapterRewrite = (...args: any[]) => (this.chapterEditorService as any).previewChapterRewrite?.(...args);
  previewChapterAiRevision = (...args: any[]) => (this.chapterEditorService as any).previewChapterAiRevision?.(...args);

  // Chapter review/audit (delegate to core)
  reviewChapter = (novelId: string, chapterId: string, options?: any) => this.core.reviewChapter(novelId, chapterId, options);
  auditChapter = (novelId: string, chapterId: string, scope?: any, options?: any) => this.core.auditChapter(novelId, chapterId, scope, options);
  listChapterAuditReports = (novelId: string, chapterId: string) => this.core.listChapterAuditReports(novelId, chapterId);
  resolveAuditIssues = (novelId: string, issueIds: string[]) => this.core.resolveAuditIssues(novelId, issueIds);
  getQualityReport = (novelId: string) => this.core.getQualityReport(novelId);

  // World slice (delegate to world services)
  getNovelWorld = (...args: any[]) => (this.novelWorldInstanceService as any).getNovelWorldView?.(...args) ?? (this.worldSliceService as any).getNovelWorld?.(...args);
  getNovelWorldSyncDiff = (...args: any[]) => (this.novelWorldInstanceService as any).getNovelWorldSyncDiff?.(...args) ?? (this.worldSliceService as any).getNovelWorldSyncDiff?.(...args);
  importNovelWorldFromLibrary = (...args: any[]) => (this.novelWorldLibrarySaveService as any).importFromLibrary?.(...args) ?? (this.worldSliceService as any).importNovelWorldFromLibrary?.(...args);
  createManualNovelWorld = (...args: any[]) => (this.novelWorldManualService as any).createManualNovelWorld?.(...args) ?? (this.worldSliceService as any).createManualNovelWorld?.(...args);
  generateNovelWorldFromTheme = (...args: any[]) => (this.worldSliceService as any).generateNovelWorldFromTheme?.(...args);
  saveNovelWorldToLibrary = (...args: any[]) => (this.novelWorldLibrarySaveService as any).saveToLibrary?.(...args) ?? (this.worldSliceService as any).saveNovelWorldToLibrary?.(...args);
  syncNovelWorldWithLibrary = (...args: any[]) => (this.novelWorldLibrarySaveService as any).syncWithLibrary?.(...args) ?? (this.worldSliceService as any).syncNovelWorldWithLibrary?.(...args);
  deleteNovelWorld = (...args: any[]) => (this.novelWorldInstanceService as any).deleteNovelWorld?.(...args) ?? (this.worldSliceService as any).deleteNovelWorld?.(...args);
  getWorldSlice = (...args: any[]) => (this.worldSliceService as any).getWorldSlice?.(...args);
  refreshWorldSlice = (...args: any[]) => (this.worldSliceService as any).refreshWorldSlice?.(...args);
  updateWorldSliceOverrides = (...args: any[]) => (this.worldSliceService as any).updateWorldSliceOverrides?.(...args);

  // Planning & state (delegate to core)
  getNovelState = (...args: any[]) => (this.core as any).getNovelState?.(...args);
  getLatestStateSnapshot = (...args: any[]) => (this.core as any).getLatestStateSnapshot?.(...args);
  getChapterStateSnapshot = (...args: any[]) => (this.core as any).getChapterStateSnapshot?.(...args);
  rebuildNovelState = (...args: any[]) => (this.core as any).rebuildNovelState?.(...args);
  generateBookPlan = (...args: any[]) => (this.core as any).generateBookPlan?.(...args);
  generateArcPlan = (...args: any[]) => (this.core as any).generateArcPlan?.(...args);
  generateChapterPlan = (...args: any[]) => (this.core as any).generateChapterPlan?.(...args);
  getChapterPlan = (...args: any[]) => (this.core as any).getChapterPlan?.(...args);
  replanNovel = (...args: any[]) => (this.core as any).replanNovel?.(...args);

  async createCharacter(...args: Parameters<NovelCoreService["createCharacter"]>) {
    const [novelId] = args;
    const created = await this.core.createCharacter(...args);
    await this.characterDynamicsService.rebuildDynamics(novelId, { sourceType: "rebuild_projection" }).catch(() => null);
    return created;
  }

  async updateCharacter(...args: Parameters<NovelCoreService["updateCharacter"]>) {
    const [novelId] = args;
    const updated = await this.core.updateCharacter(...args);
    await this.characterDynamicsService.rebuildDynamics(novelId, { sourceType: "rebuild_projection" }).catch(() => null);
    return updated;
  }

  async deleteCharacter(...args: Parameters<NovelCoreService["deleteCharacter"]>) {
    const [novelId] = args;
    await this.core.deleteCharacter(...args);
    await this.characterDynamicsService.rebuildDynamics(novelId, { sourceType: "rebuild_projection" }).catch(() => null);
  }

  async createNovelSnapshot(novelId: string, triggerType: "manual" | "auto_milestone" | "before_pipeline", label?: string) {
    const snapshot = await this.core.createNovelSnapshot(novelId, triggerType, label);
    const volumeWorkspace = await this.volumeService.getVolumes(novelId).catch(() => null);
    if (!volumeWorkspace) {
      return toNovelSnapshotListItem(snapshot);
    }
    const payload = JSON.parse(snapshot.snapshotData) as Record<string, unknown>;
    const updatedSnapshot = await prisma.novelSnapshot.update({
      where: { id: snapshot.id },
      data: {
        snapshotData: JSON.stringify({
          ...payload,
          volumes: volumeWorkspace.volumes,
          activeVolumeVersionId: volumeWorkspace.activeVersionId,
        }),
      },
    });
    return toNovelSnapshotListItem(updatedSnapshot);
  }

  async restoreFromSnapshot(novelId: string, snapshotId: string) {
    const snapshot = await prisma.novelSnapshot.findFirst({
      where: { id: snapshotId, novelId },
    });
    if (!snapshot) {
      throw new Error("Snapshot not found.");
    }
    const data = JSON.parse(snapshot.snapshotData) as {
      outline?: string | null;
      structuredOutline?: string | null;
      chapters?: Array<{ id: string; title?: string; order?: number; content?: string | null }>;
      volumes?: unknown;
    };
    await this.createNovelSnapshot(novelId, "manual", `before-restore-${snapshotId.slice(0, 8)}`);
    await prisma.novel.update({
      where: { id: novelId },
      data: {
        outline: data.outline ?? undefined,
        structuredOutline: data.structuredOutline ?? undefined,
      },
    });
    if (Array.isArray(data.chapters) && data.chapters.length > 0) {
      for (const chapter of data.chapters) {
        if (!chapter.id) {
          continue;
        }
        await prisma.chapter.updateMany({
          where: { id: chapter.id, novelId },
          data: {
            ...(chapter.title != null ? { title: chapter.title } : {}),
            ...(chapter.order != null ? { order: chapter.order } : {}),
            ...(chapter.content != null ? { content: chapter.content } : {}),
          },
        });
      }
    }
    if (Array.isArray(data.volumes) && data.volumes.length > 0) {
      await this.volumeService.updateVolumes(novelId, { volumes: data.volumes });
    } else {
      await this.volumeService.migrateLegacyVolumes(novelId);
    }
    return this.getNovelById(novelId);
  }

  async createStructuredOutlineStream(...args: Parameters<NovelCoreService["createStructuredOutlineStream"]>) {
    const [novelId] = args;
    await this.core.createNovelSnapshot(novelId, "manual", `before-structured-outline-${Date.now()}`);
    return this.core.createStructuredOutlineStream(...args);
  }

  async createChapterStream(...args: Parameters<NovelCoreService["createChapterStream"]>) {
    const [novelId, chapterId, options] = args;
    const result = await novelProductionOrchestrator.runStage({
      novelId,
      stage: "chapter_execution",
      policy: buildManualChapterControlPolicy(),
      trigger: "manual_generate_chapter",
      payload: {
        mode: "single_chapter_stream",
        chapterId,
        options,
        includeRuntimePackage: true,
      },
    });
    if (!result.payload) {
      throw new Error("Unified chapter execution did not return a stream payload.");
    }
    return result.payload as Awaited<ReturnType<ChapterRuntimeCoordinator["createChapterStream"]>>;
  }

  async createRepairStream(...args: Parameters<NovelCoreService["createRepairStream"]>) {
    const [novelId, chapterId, options] = args;
    const result = await novelProductionOrchestrator.runStage({
      novelId,
      stage: "quality_repair",
      policy: buildManualProductionControlPolicy(),
      trigger: "manual_repair_chapter",
      payload: {
        mode: "repair_chapter_stream",
        chapterId,
        options,
      },
    });
    if (!result.payload) {
      throw new Error("Unified quality repair stage did not return a repair stream payload.");
    }
    return result.payload as Awaited<ReturnType<ChapterRuntimeCoordinator["createRepairStream"]>>;
  }

  async startPipelineJob(...args: Parameters<NovelCoreService["startPipelineJob"]>) {
    const [novelId] = args;
    await this.createNovelSnapshot(novelId, "before_pipeline", `before-pipeline-${Date.now()}`);
    return this.core.startPipelineJob(...args);
  }

  async listStorylineVersions(...args: Parameters<NovelCoreService["listStorylineVersions"]>) {
    const rows = await this.volumeService.listStorylineVersionsCompat(...args);
    return rows.map((row) => ({
      ...row,
      diffSummary: row.diffSummary ?? null,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  async createStorylineDraft(...args: Parameters<NovelCoreService["createStorylineDraft"]>) {
    const row = await this.volumeService.createStorylineDraftCompat(...args);
    return {
      ...row,
      diffSummary: row.diffSummary ?? null,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  async activateStorylineVersion(...args: Parameters<NovelCoreService["activateStorylineVersion"]>) {
    const row = await this.volumeService.activateStorylineVersionCompat(...args);
    return {
      ...row,
      diffSummary: row.diffSummary ?? null,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  async freezeStorylineVersion(...args: Parameters<NovelCoreService["freezeStorylineVersion"]>) {
    const row = await this.volumeService.freezeStorylineVersionCompat(...args);
    return {
      ...row,
      diffSummary: row.diffSummary ?? null,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  async getStorylineDiff(...args: Parameters<NovelCoreService["getStorylineDiff"]>) {
    const diff = await this.volumeService.getStorylineDiffCompat(...args);
    return {
      ...diff,
      diffSummary: diff.diffSummary ?? "",
    };
  }

  async applyCharacterVisibleProfile(...args: Parameters<CharacterVisibleProfileService["applyCharacterVisibleProfile"]>) {
    const [novelId] = args;
    const result = await this.characterVisibleProfileService.applyCharacterVisibleProfile(...args);
    await this.characterDynamicsService.rebuildDynamics(novelId, { sourceType: "rebuild_projection" }).catch(() => null);
    return result;
  }

  async applyBatchCharacterVisibleProfiles(...args: Parameters<CharacterVisibleProfileService["applyBatchVisibleProfiles"]>) {
    const [novelId] = args;
    const result = await this.characterVisibleProfileService.applyBatchVisibleProfiles(...args);
    await this.characterDynamicsService.rebuildDynamics(novelId, { sourceType: "rebuild_projection" }).catch(() => null);
    return result;
  }
}

export function createNovelApplicationServices(): NovelApplicationServices {
  return new DefaultNovelApplicationServices();
}
