import type {
  StorylineDiff,
  StorylineVersion,
  VolumeImpactResult,
  VolumePlanDocument,
  VolumePlanDiff,
  VolumePlanVersion,
  VolumePlanVersionSummary,
  VolumeSyncPreview,
} from "@ai-novel/shared/types/novel";
import type { Prisma } from "@prisma/client";
import { novelEventBus } from "../../../events";
import type { VolumeUpdateReason } from "../../../events";
import { logMemoryUsage } from "../../../runtime/memoryTelemetry";
import { payoffLedgerSyncService } from "../../payoff/PayoffLedgerSyncService";
import { StoryMacroPlanService } from "../storyMacro/StoryMacroPlanService";
import { StyleBindingService } from "../../styleEngine/StyleBindingService";
import { ChapterExecutionContractService } from "./ChapterExecutionContractService";
import {
  hasPayoffLedgerRelevantPlanChanges,
  hasPayoffLedgerSourceSignals,
} from "./volumePlanUtils";
import { generateVolumePlanDocument } from "./volumeGenerationOrchestrator";
import { VolumeChapterSyncService } from "./VolumeChapterSyncService";
import { getLegacyVolumeSource } from "./legacyVolumeSource";
import {
  type VolumeDraftInput,
  type VolumeGenerateOptions,
  type VolumeImpactInput,
  type VolumeSyncInput,
} from "./volumeModels";
import {
  buildVolumeWorkspaceDocument,
  mergeVolumeWorkspaceInput,
  serializeVolumeWorkspaceDocument,
} from "./volumeWorkspaceDocument";
import {
  ensureVolumeWorkspaceDocument,
  getActiveVersionRow,
  getLatestVersionRow,
  persistActiveVolumeWorkspace,
  runVolumeWorkspaceTransaction,
} from "./volumeWorkspacePersistence";
import {
  resolveVolumeGenerationTelemetryItemKey,
  resolveVolumeGenerationTelemetryStage,
  type VolumeMemoryTelemetry,
  withHighMemoryVolumeGenerationGuard,
} from "./volumeGenerationTelemetry";
import {
  listVolumeVersions as listVolumeVersionsFn,
  getVolumeVersion as getVolumeVersionFn,
  createVolumeDraft as createVolumeDraftFn,
  activateVolumeVersion as activateVolumeVersionFn,
  freezeVolumeVersion as freezeVolumeVersionFn,
  getVolumeDiff as getVolumeDiffFn,
  analyzeVolumeImpact as analyzeVolumeImpactFn,
  listStorylineVersionsCompatFn,
  createStorylineDraftCompatFn,
  activateStorylineVersionCompatFn,
  freezeStorylineVersionCompatFn,
  getStorylineDiffCompatFn,
  analyzeStorylineImpactCompatFn,
  type VersionServiceDeps,
} from "./NovelVolumeVersionService";
import {
  hydrateCanonicalChapterFields,
  mirrorChapterIntoDocument,
} from "./novelVolumeChapterMirror";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractVolumeWorkspaceUpdateInput(input: unknown): {
  workspaceInput: unknown;
  syncToChapterExecution: boolean;
} {
  if (!isRecord(input)) {
    return {
      workspaceInput: input,
      syncToChapterExecution: false,
    };
  }
  const { syncToChapterExecution, ...workspaceInput } = input;
  return {
    workspaceInput,
    syncToChapterExecution: syncToChapterExecution === true,
  };
}

export class NovelVolumeService {
  private readonly storyMacroPlanService = new StoryMacroPlanService();
  private readonly styleBindingService = new StyleBindingService();

  /** Builds the dependency bag consumed by extracted version helpers. */
  private get versionDeps(): VersionServiceDeps {
    return {
      ensureVolumeWorkspace: (novelId) => this.ensureVolumeWorkspace(novelId),
      ensureActiveVersionRecord: (tx, novelId, document, diffSummary) =>
        this.ensureActiveVersionRecord(tx, novelId, document, diffSummary),
      persistWorkspaceDocument: (novelId, document, options) =>
        this.persistWorkspaceDocument(novelId, document, options),
      emitVolumeUpdated: (novelId, reason) => this.emitVolumeUpdated(novelId, reason),
      syncPayoffLedger: (novelId) => this.syncPayoffLedger(novelId),
    };
  }

  // ---------------------------------------------------------------------------
  // Chapter hydration & mirroring (delegated to novelVolumeChapterMirror)
  // ---------------------------------------------------------------------------

  async mirrorChapterIntoWorkspace(
    novelId: string,
    chapter: {
      id?: string | null;
      order: number;
      title: string;
      expectation?: string | null;
      targetWordCount?: number | null;
      conflictLevel?: number | null;
      revealLevel?: number | null;
      mustAvoid?: string | null;
      taskSheet?: string | null;
      sceneCards?: string | null;
    },
  ): Promise<void> {
    const document = await this.ensureVolumeWorkspace(novelId);
    const nextDocument = mirrorChapterIntoDocument(document, chapter);
    if (!nextDocument) {
      return;
    }
    await this.persistWorkspaceDocument(novelId, nextDocument, {
      emitEvent: false,
      syncPayoffLedger: false,
    });
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private emitVolumeUpdated(novelId: string, reason: VolumeUpdateReason): void {
    void novelEventBus.emit({
      type: "volume:updated",
      payload: { novelId, reason },
    }).catch(() => {});
  }

  private syncPayoffLedger(novelId: string): void {
    void payoffLedgerSyncService.syncLedger(novelId).catch(() => null);
  }

  private async persistWorkspaceDocument(
    novelId: string,
    document: VolumePlanDocument,
    options: {
      emitEvent?: boolean;
      syncPayoffLedger?: boolean;
      volumeUpdateReason?: VolumeUpdateReason;
      memoryTelemetry?: VolumeMemoryTelemetry;
    } = {},
  ): Promise<VolumePlanDocument> {
    logMemoryUsage({
      event: "before_write",
      component: "persistWorkspaceDocument",
      novelId,
      taskId: options.memoryTelemetry?.taskId,
      stage: options.memoryTelemetry?.stage ?? "volume_workspace",
      itemKey: options.memoryTelemetry?.itemKey,
      scope: options.memoryTelemetry?.scope,
      entrypoint: options.memoryTelemetry?.entrypoint,
      volumeId: options.memoryTelemetry?.volumeId,
      chapterId: options.memoryTelemetry?.chapterId,
      volumeCount: document.volumes.length,
      chapterCount: document.volumes.reduce((sum, volume) => sum + volume.chapters.length, 0),
      beatSheetCount: document.beatSheets.length,
    });
    const persistedDocument = await runVolumeWorkspaceTransaction(async (tx) => {
      const { versionId } = await this.ensureActiveVersionRecord(tx, novelId, document);
      const nextDocument = {
        ...document,
        activeVersionId: versionId,
        source: "volume" as const,
      };
      await persistActiveVolumeWorkspace(tx, novelId, nextDocument, versionId);
      return nextDocument;
    });
    logMemoryUsage({
      event: "after_write",
      component: "persistWorkspaceDocument",
      novelId,
      taskId: options.memoryTelemetry?.taskId,
      stage: options.memoryTelemetry?.stage ?? "volume_workspace",
      itemKey: options.memoryTelemetry?.itemKey,
      scope: options.memoryTelemetry?.scope,
      entrypoint: options.memoryTelemetry?.entrypoint,
      volumeId: options.memoryTelemetry?.volumeId,
      chapterId: options.memoryTelemetry?.chapterId,
      volumeCount: persistedDocument.volumes.length,
      chapterCount: persistedDocument.volumes.reduce((sum, volume) => sum + volume.chapters.length, 0),
      beatSheetCount: persistedDocument.beatSheets.length,
    });

    if (options.emitEvent !== false) {
      this.emitVolumeUpdated(novelId, options.volumeUpdateReason ?? "workspace_updated");
    }
    if (options.syncPayoffLedger !== false) {
      this.syncPayoffLedger(novelId);
    }
    return persistedDocument;
  }

  private async ensureVolumeWorkspace(novelId: string): Promise<VolumePlanDocument> {
    const document = await ensureVolumeWorkspaceDocument({
      novelId,
      getLegacySource: () => getLegacyVolumeSource(novelId),
    });
    const hydrated = await hydrateCanonicalChapterFields(novelId, document);
    if (!hydrated.changed) {
      return hydrated.document;
    }
    return this.persistWorkspaceDocument(novelId, hydrated.document, {
      emitEvent: false,
      syncPayoffLedger: false,
      volumeUpdateReason: "chapter_sync",
    });
  }

  private findVolumeChapterMatch(
    workspace: VolumePlanDocument,
    chapter: { order: number; title: string },
  ): { volumeId: string; volumeChapterId: string } {
    for (const volume of workspace.volumes) {
      const matchedChapter = volume.chapters.find((item) => item.chapterOrder === chapter.order)
        ?? volume.chapters.find((item) => item.title.trim() === chapter.title.trim());
      if (matchedChapter) {
        return {
          volumeId: volume.id,
          volumeChapterId: matchedChapter.id,
        };
      }
    }
    throw new Error("当前章节未映射到卷规划章节，无法生成执行合同。");
  }

  private async ensureActiveVersionRecord(
    tx: Prisma.TransactionClient,
    novelId: string,
    document: VolumePlanDocument,
    diffSummary?: string,
  ): Promise<{ versionId: string; version: number }> {
    const activeVersion = await getActiveVersionRow(novelId, tx);
    if (activeVersion) {
      const persistedDocument = {
        ...document,
        activeVersionId: activeVersion.id,
        source: "volume" as const,
      };
      const updated = await tx.volumePlanVersion.update({
        where: { id: activeVersion.id },
        data: {
          contentJson: serializeVolumeWorkspaceDocument(persistedDocument),
          diffSummary: diffSummary ?? activeVersion.diffSummary,
        },
      });
      return { versionId: updated.id, version: updated.version };
    }

    const latestVersion = await getLatestVersionRow(novelId, tx);
    const created = await tx.volumePlanVersion.create({
      data: {
        novelId,
        version: (latestVersion?.version ?? 0) + 1,
        status: "active",
        contentJson: "{}",
        diffSummary: diffSummary ?? "同步当前卷工作区。",
      },
    });
    const persistedDocument = {
      ...document,
      activeVersionId: created.id,
      source: "volume" as const,
    };
    await tx.volumePlanVersion.update({
      where: { id: created.id },
      data: {
        contentJson: serializeVolumeWorkspaceDocument(persistedDocument),
      },
    });
    return { versionId: created.id, version: created.version };
  }

  // ---------------------------------------------------------------------------
  // Public CRUD
  // ---------------------------------------------------------------------------

  async getVolumes(novelId: string): Promise<VolumePlanDocument> {
    return this.ensureVolumeWorkspace(novelId);
  }

  async updateVolumes(novelId: string, input: unknown): Promise<VolumePlanDocument> {
    const { workspaceInput, syncToChapterExecution } = extractVolumeWorkspaceUpdateInput(input);
    return this.updateVolumesWithOptions(novelId, workspaceInput, {
      syncToChapterExecution,
    });
  }

  async updateVolumesWithOptions(
    novelId: string,
    input: unknown,
    options: {
      volumeUpdateReason?: VolumeUpdateReason;
      syncPayoffLedger?: boolean;
      syncToChapterExecution?: boolean;
      emitEvent?: boolean;
      memoryTelemetry?: VolumeMemoryTelemetry;
    } = {},
  ): Promise<VolumePlanDocument> {
    const currentDocument = await this.ensureVolumeWorkspace(novelId);
    const mergedDocument = mergeVolumeWorkspaceInput(novelId, currentDocument, input);
    const persistedDocument = await this.persistWorkspaceDocument(novelId, mergedDocument, {
      volumeUpdateReason: options.volumeUpdateReason,
      emitEvent: options.emitEvent,
      syncPayoffLedger: options.syncPayoffLedger
        ?? hasPayoffLedgerRelevantPlanChanges(currentDocument.volumes, mergedDocument.volumes),
      memoryTelemetry: options.memoryTelemetry,
    });
    if (options.syncToChapterExecution) {
      try {
        await this.syncVolumeChaptersWithOptions(novelId, {
          volumes: persistedDocument.volumes,
          preserveContent: true,
          applyDeletes: false,
        }, {
          emitEvent: false,
          syncPayoffLedger: false,
        });
        return this.ensureVolumeWorkspace(novelId);
      } catch (error) {
        const message = error instanceof Error ? error.message : "未知错误";
        throw new Error(`当前卷工作区已保存，但章节执行连接失败：${message}`);
      }
    }
    return persistedDocument;
  }

  // ---------------------------------------------------------------------------
  // Version operations — delegated to extracted module
  // ---------------------------------------------------------------------------

  async listVolumeVersions(novelId: string): Promise<VolumePlanVersionSummary[]> {
    return listVolumeVersionsFn(novelId, this.versionDeps);
  }

  async getVolumeVersion(novelId: string, versionId: string): Promise<VolumePlanVersion> {
    return getVolumeVersionFn(novelId, versionId, this.versionDeps);
  }

  async createVolumeDraft(novelId: string, input: VolumeDraftInput): Promise<VolumePlanVersion> {
    return createVolumeDraftFn(novelId, input, this.versionDeps);
  }

  async activateVolumeVersion(novelId: string, versionId: string): Promise<VolumePlanVersion> {
    return activateVolumeVersionFn(novelId, versionId, this.versionDeps);
  }

  async freezeVolumeVersion(novelId: string, versionId: string): Promise<VolumePlanVersion> {
    return freezeVolumeVersionFn(novelId, versionId);
  }

  async getVolumeDiff(novelId: string, versionId: string, compareVersion?: number): Promise<VolumePlanDiff> {
    return getVolumeDiffFn(novelId, versionId, compareVersion, this.versionDeps);
  }

  async analyzeVolumeImpact(novelId: string, input: VolumeImpactInput): Promise<VolumeImpactResult> {
    return analyzeVolumeImpactFn(novelId, input, this.versionDeps);
  }

  // ---------------------------------------------------------------------------
  // Sync
  // ---------------------------------------------------------------------------

  async syncVolumeChapters(novelId: string, input: VolumeSyncInput): Promise<VolumeSyncPreview> {
    return this.syncVolumeChaptersWithOptions(novelId, input);
  }

  async syncVolumeChaptersWithOptions(
    novelId: string,
    input: VolumeSyncInput,
    options: {
      emitEvent?: boolean;
      syncPayoffLedger?: boolean;
      volumeUpdateReason?: VolumeUpdateReason;
    } = {},
  ): Promise<VolumeSyncPreview> {
    return new VolumeChapterSyncService({
      ensureVolumeWorkspace: (targetNovelId) => this.ensureVolumeWorkspace(targetNovelId),
      ensureActiveVersionRecord: (tx, targetNovelId, document, diffSummary) => (
        this.ensureActiveVersionRecord(tx, targetNovelId, document, diffSummary)
      ),
      emitVolumeUpdated: (targetNovelId, reason) => this.emitVolumeUpdated(targetNovelId, reason),
      syncPayoffLedger: (targetNovelId) => this.syncPayoffLedger(targetNovelId),
    }).syncVolumeChaptersWithOptions(novelId, input, options);
  }

  // ---------------------------------------------------------------------------
  // Chapter execution contract
  // ---------------------------------------------------------------------------

  async ensureChapterExecutionContract(
    novelId: string,
    chapterId: string,
    options: Pick<
      VolumeGenerateOptions,
      "provider" | "model" | "temperature" | "guidance" | "chapterTaskSheetQualityMode" | "entrypoint" | "taskId" | "signal"
    > & {
      taskStyleProfileId?: string;
    } = {},
  ) {
    return new ChapterExecutionContractService({
      storyMacroPlanService: this.storyMacroPlanService,
      styleBindingService: this.styleBindingService,
      ensureVolumeWorkspace: (targetNovelId) => this.ensureVolumeWorkspace(targetNovelId),
      findVolumeChapterMatch: (workspace, chapter) => this.findVolumeChapterMatch(workspace, chapter),
      ensureActiveVersionRecord: (tx, targetNovelId, document, diffSummary) => (
        this.ensureActiveVersionRecord(tx, targetNovelId, document, diffSummary)
      ),
      emitVolumeUpdated: (targetNovelId, reason) => this.emitVolumeUpdated(targetNovelId, reason),
    }).ensureChapterExecutionContract(novelId, chapterId, options);
  }

  // ---------------------------------------------------------------------------
  // Generation
  // ---------------------------------------------------------------------------

  async migrateLegacyVolumes(novelId: string): Promise<VolumePlanDocument> {
    const workspace = await this.ensureVolumeWorkspace(novelId);
    this.emitVolumeUpdated(novelId, "legacy_migration");
    if (workspace.source === "legacy" && hasPayoffLedgerSourceSignals(workspace.volumes)) {
      this.syncPayoffLedger(novelId);
    }
    return workspace;
  }

  async generateVolumes(novelId: string, options: VolumeGenerateOptions = {}): Promise<VolumePlanDocument> {
    return withHighMemoryVolumeGenerationGuard(novelId, options, async () => {
      const persistedWorkspace = await this.ensureVolumeWorkspace(novelId);
      const workspace = options.draftWorkspace
        ? mergeVolumeWorkspaceInput(novelId, persistedWorkspace, options.draftWorkspace)
        : options.draftVolumes
          ? mergeVolumeWorkspaceInput(novelId, persistedWorkspace, { volumes: options.draftVolumes })
          : persistedWorkspace;
      logMemoryUsage({
        event: "before_generate",
        component: "generateVolumes",
        novelId,
        taskId: options.taskId,
        stage: resolveVolumeGenerationTelemetryStage(options),
        itemKey: resolveVolumeGenerationTelemetryItemKey(options),
        scope: options.scope ?? "strategy",
        entrypoint: options.entrypoint,
        volumeId: options.targetVolumeId,
        chapterId: options.targetChapterId,
        volumeCount: workspace.volumes.length,
        chapterCount: workspace.volumes.reduce((sum, volume) => sum + volume.chapters.length, 0),
        beatSheetCount: workspace.beatSheets.length,
      });
      const generatedDocument = await generateVolumePlanDocument({
        novelId,
        workspace,
        options: {
          ...options,
          onIntermediateDocument: (
            options.onIntermediateDocument
            || options.scope === "chapter_list"
            || options.scope === "volume"
          )
            ? async (event) => {
              const shouldPersistIntermediate = event.isFinal !== false || options.persistIntermediateDocuments === true;
              const persistedDocument = shouldPersistIntermediate
                ? await this.persistWorkspaceDocument(novelId, event.document, {
                  emitEvent: false,
                  syncPayoffLedger: false,
                  memoryTelemetry: {
                    taskId: options.taskId,
                    stage: resolveVolumeGenerationTelemetryStage(options),
                    itemKey: event.scope === "chapter_detail" ? "chapter_detail_bundle" : event.scope,
                    scope: event.scope,
                    entrypoint: options.entrypoint,
                    volumeId: event.targetVolumeId ?? options.targetVolumeId,
                    chapterId: options.targetChapterId,
                  },
                })
                : event.document;
              await options.onIntermediateDocument?.({
                ...event,
                document: persistedDocument,
              });
            }
            : undefined,
        },
        storyMacroPlanService: this.storyMacroPlanService,
      });
      logMemoryUsage({
        event: "before_return",
        component: "generateVolumes",
        novelId,
        taskId: options.taskId,
        stage: resolveVolumeGenerationTelemetryStage(options),
        itemKey: resolveVolumeGenerationTelemetryItemKey(options),
        scope: options.scope ?? "strategy",
        entrypoint: options.entrypoint,
        volumeId: options.targetVolumeId,
        chapterId: options.targetChapterId,
        volumeCount: generatedDocument.volumes.length,
        chapterCount: generatedDocument.volumes.reduce((sum, volume) => sum + volume.chapters.length, 0),
        beatSheetCount: generatedDocument.beatSheets.length,
      });
      return generatedDocument;
    });
  }

  // ---------------------------------------------------------------------------
  // Storyline compat — delegated to extracted module
  // ---------------------------------------------------------------------------

  async listStorylineVersionsCompat(novelId: string): Promise<StorylineVersion[]> {
    return listStorylineVersionsCompatFn(novelId, this.versionDeps);
  }

  async createStorylineDraftCompat(novelId: string, input: { content: string; diffSummary?: string; baseVersion?: number }) {
    return createStorylineDraftCompatFn(novelId, input, this.versionDeps);
  }

  async activateStorylineVersionCompat(novelId: string, versionId: string): Promise<StorylineVersion> {
    return activateStorylineVersionCompatFn(novelId, versionId, this.versionDeps);
  }

  async freezeStorylineVersionCompat(novelId: string, versionId: string): Promise<StorylineVersion> {
    return freezeStorylineVersionCompatFn(novelId, versionId, this.versionDeps);
  }

  async getStorylineDiffCompat(novelId: string, versionId: string, compareVersion?: number): Promise<StorylineDiff> {
    return getStorylineDiffCompatFn(novelId, versionId, compareVersion, this.versionDeps);
  }

  async analyzeStorylineImpactCompat(novelId: string, input: { content?: string; versionId?: string }) {
    return analyzeStorylineImpactCompatFn(novelId, input, this.versionDeps);
  }
}
