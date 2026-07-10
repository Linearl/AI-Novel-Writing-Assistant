import { buildStyleIntentSummary } from "@ai-novel/shared";
import { AppError } from "../../../middleware/errorHandler";
import {
  runWithLlmUsageTracking,
  type LlmUsageTrackingContext,
} from "../../../llm/usageTracking";
import type {
  DirectorPolicyMode,
  DirectorRuntimeProjection,
  DirectorRuntimePolicySnapshot,
  DirectorRuntimeSnapshot,
  DirectorManualEditImpact,
  DirectorWorkspaceAnalysis,
} from "@ai-novel/shared";
import type {
  DirectorContinuationMode,
  DirectorCandidatePatchRequest,
  DirectorCandidatePatchResponse,
  DirectorCandidateTitleRefineRequest,
  DirectorCandidateTitleRefineResponse,
  DirectorCandidatesRequest,
  DirectorCandidatesResponse,
  DirectorConfirmApiResponse,
  DirectorConfirmRequest,
  DirectorLLMOptions,
  DirectorRefineResponse,
  DirectorRefinementRequest,
  DirectorTakeoverReadinessResponse,
  DirectorTakeoverRequest,
  DirectorTakeoverResponse,
} from "@ai-novel/shared";
import { BookContractService } from "../BookContractService";
import { CharacterPreparationService } from "../characterPrep/CharacterPreparationService";
import { CharacterDynamicsService } from "../dynamics/CharacterDynamicsService";
import { NovelContextService } from "../NovelContextService";
import {
  applyDirectorRunModeContract,
  buildDirectorWorkflowSeedPayload,
} from "./runtime/novelDirectorHelpers";
import { getSharedNovelServices } from "../application/sharedNovelServices";
import { StoryMacroPlanService } from "../storyMacro/StoryMacroPlanService";
import { NovelVolumeService } from "../volume/NovelVolumeService";
import { NovelWorkflowService } from "../workflow/NovelWorkflowService";
import { NovelDirectorCandidateStageService } from "./phases/novelDirectorCandidateStage";
import { NovelDirectorAutoExecutionRuntime } from "./automation/novelDirectorAutoExecutionRuntime";
import { StyleBindingService } from "../../styleEngine/StyleBindingService";
import { StyleProfileService } from "../../styleEngine/StyleProfileService";
import {
  assertHighMemoryDirectorStartAllowed,
  releaseHighMemoryDirectorReservations,
} from "./runtime/autoDirectorMemorySafety";
import {
  normalizeDirectorAutoApprovalConfig,
  shouldAutoApproveDirectorApprovalPoint,
} from "@ai-novel/shared";
import { recordAutoDirectorAutoApprovalFromTask } from "../../task/autoDirectorFollowUps/autoDirectorAutoApprovalAudit";
import { flattenPreparedOutlineChapters } from "./recovery/novelDirectorStructuredOutlineRecovery";
import { DirectorRuntimeService } from "./runtime/DirectorRuntimeService";
import { DirectorEventProjectionService } from "./runtime/DirectorEventProjectionService";
import { directorStateProposalResolutionService } from "./runtime/DirectorStateProposalResolutionService";
import {
  isDirectorRuntimeGateError,
  NovelDirectorRuntimeOrchestrator,
} from "./runtime/novelDirectorRuntimeOrchestrator";
import { NovelDirectorCandidateRuntime } from "./runtime/novelDirectorCandidateRuntime";
import { NovelDirectorPipelineRuntime } from "./novelDirectorPipelineRuntime";
import { NovelDirectorConfirmRuntime } from "./runtime/novelDirectorConfirmRuntime";
import { NovelDirectorChapterTitleRepairRuntime } from "./phases/novelDirectorChapterTitleRepairRuntime";
import { NovelDirectorContinueRuntime } from "./runtime/novelDirectorContinueRuntime";
import { prisma } from "../../../db/prisma";
import { loadPersistentDirectorRuntimeProjection } from "./projections/novelDirectorRuntimeProjection";
import { logger } from "../../logging/LoggerService";
import {
  loadDirectorTakeoverState,
} from "./runtime/novelDirectorTakeoverRuntime";
import {
  buildDirectorTakeoverReadiness,
} from "./runtime/novelDirectorTakeover";
import { executeStartTakeover } from "./novelDirectorTakeoverHandler";

function isWorkflowTaskCancelledError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    error instanceof AppError
    && error.statusCode === 409
    && error.message === "WORKFLOW_TASK_CANCELLED"
  )
    || message === "WORKFLOW_TASK_CANCELLED"
    || message.includes("当前自动导演任务已取消")
    || message.includes("This operation was aborted");
}

export class NovelDirectorService {
  private readonly novelContextService = new NovelContextService();
  private readonly characterPreparationService = new CharacterPreparationService();
  private readonly storyMacroService = new StoryMacroPlanService();
  private readonly bookContractService = new BookContractService();
  private readonly novelService = getSharedNovelServices();
  private readonly characterDynamicsService = new CharacterDynamicsService();
  private readonly volumeService = new NovelVolumeService();
  private readonly workflowService = new NovelWorkflowService();
  private readonly directorRuntime = new DirectorRuntimeService();
  private readonly directorEventProjectionService = new DirectorEventProjectionService();
  private readonly styleProfileService = new StyleProfileService();
  private readonly styleBindingService = new StyleBindingService();
  private readonly candidateStageService = new NovelDirectorCandidateStageService(this.workflowService);
  private readonly autoExecutionRuntime = new NovelDirectorAutoExecutionRuntime({
    novelContextService: this.novelContextService,
    novelService: this.novelService,
    volumeWorkspaceService: this.volumeService,
    workflowService: this.workflowService,
    buildDirectorSeedPayload: (input, novelId, extra) => buildDirectorWorkflowSeedPayload(input, novelId, extra),
    shouldAutoContinueQualityRepair: async ({ request, qualityRepairRisk }) => (
      qualityRepairRisk.autoContinuable
      && shouldAutoApproveDirectorApprovalPoint(
        normalizeDirectorAutoApprovalConfig(request.autoApproval),
        "low_risk_quality_repair_continue",
      )
    ),
    recordAutoApproval: async ({ taskId, checkpointType, checkpointSummary }) => {
      await recordAutoDirectorAutoApprovalFromTask({
        taskId,
        checkpointType,
        checkpointSummary,
      });
    },
    replanNovel: (novelId, input) => this.novelService.replanNovel(novelId, input),
    resolveStateProposals: (input) => directorStateProposalResolutionService.resolvePendingProposals(input),
  });
  private readonly directorRuntimeOrchestrator = new NovelDirectorRuntimeOrchestrator({
    directorRuntime: this.directorRuntime,
    workflowService: this.workflowService,
    autoExecutionRuntime: this.autoExecutionRuntime,
  });
  private readonly candidateRuntime = new NovelDirectorCandidateRuntime({
    workflowService: this.workflowService,
    candidateStageService: this.candidateStageService,
    directorRuntime: this.directorRuntime,
    runtimeOrchestrator: this.directorRuntimeOrchestrator,
    scheduleBackgroundRun: (taskId, runner) => this.scheduleBackgroundRun(taskId, runner),
    withWorkflowTaskUsage: (workflowTaskId, runner) => this.withWorkflowTaskUsage(workflowTaskId, runner),
  });
  private readonly directorPipelineRuntime = new NovelDirectorPipelineRuntime({
    workflowService: this.workflowService,
    novelContextService: this.novelContextService,
    characterDynamicsService: this.characterDynamicsService,
    characterPreparationService: this.characterPreparationService,
    storyMacroService: this.storyMacroService,
    bookContractService: this.bookContractService,
    volumeService: this.volumeService,
    runtimeOrchestrator: this.directorRuntimeOrchestrator,
    buildDirectorSeedPayload: (directorInput, novelId, extra) => buildDirectorWorkflowSeedPayload(directorInput, novelId, extra),
    assertHighMemoryStartAllowed: (payload) => this.assertHighMemoryDirectorStartAllowed(payload),
  });
  private readonly confirmRuntime = new NovelDirectorConfirmRuntime({
    workflowService: this.workflowService,
    novelContextService: this.novelContextService,
    directorRuntime: this.directorRuntime,
    runtimeOrchestrator: this.directorRuntimeOrchestrator,
    pipelineRuntime: this.directorPipelineRuntime,
    buildDirectorSeedPayload: (directorInput, novelId, extra) => buildDirectorWorkflowSeedPayload(directorInput, novelId, extra),
    enrichDirectorStyleContext: (directorInput) => this.enrichDirectorStyleContext(directorInput),
    ensurePrimaryNovelStyleBinding: (novelId, styleProfileId) => this.ensurePrimaryNovelStyleBinding(novelId, styleProfileId),
    withWorkflowTaskUsage: (workflowTaskId, runner) => this.withWorkflowTaskUsage(workflowTaskId, runner),
    scheduleBackgroundRun: (taskId, runner) => this.scheduleBackgroundRun(taskId, runner),
  });
  private readonly chapterTitleRepairRuntime = new NovelDirectorChapterTitleRepairRuntime({
    workflowService: this.workflowService,
    volumeService: this.volumeService,
    buildDirectorSeedPayload: (directorInput, novelId, extra) => buildDirectorWorkflowSeedPayload(directorInput, novelId, extra),
    assertHighMemoryStartAllowed: (payload) => this.assertHighMemoryDirectorStartAllowed(payload),
    scheduleBackgroundRun: (taskId, runner) => this.scheduleBackgroundRun(taskId, runner),
  });
  private readonly continueRuntime = new NovelDirectorContinueRuntime({
    workflowService: this.workflowService,
    novelContextService: this.novelContextService,
    storyMacroService: this.storyMacroService,
    volumeService: this.volumeService,
    directorRuntime: this.directorRuntime,
    runtimeOrchestrator: this.directorRuntimeOrchestrator,
    candidateRuntime: this.candidateRuntime,
    autoExecutionRuntime: this.autoExecutionRuntime,
    pipelineRuntime: this.directorPipelineRuntime,
    continueCandidateStageTask: (taskId, payload) => this.continueCandidateStageTask(taskId, payload),
    resolveAssetFirstRecovery: (payload) => this.resolveAssetFirstRecovery(payload),
    runDirectorPipeline: (payload) => this.runDirectorPipeline(payload),
    buildDirectorSeedPayload: (directorInput, novelId, extra) => buildDirectorWorkflowSeedPayload(directorInput, novelId, extra),
    getDirectorAssetSnapshot: (novelId) => this.getDirectorAssetSnapshot(novelId),
    assertHighMemoryStartAllowed: (payload) => this.assertHighMemoryDirectorStartAllowed(payload),
    scheduleBackgroundRun: (taskId, runner) => this.scheduleBackgroundRun(taskId, runner),
  });

  constructor(_options?: Record<string, never>) {}

  private async assertHighMemoryDirectorStartAllowed(input: {
    taskId: string;
    novelId: string;
    stage: "structured_outline";
    itemKey: "beat_sheet" | "chapter_list" | "chapter_detail_bundle" | "chapter_sync";
    volumeId?: string | null;
    chapterId?: string | null;
    scope?: string | null;
    batchAlreadyStartedCount?: number;
  }): Promise<void> {
    await assertHighMemoryDirectorStartAllowed(this.workflowService, input);
  }

  private scheduleBackgroundRun(taskId: string, runner: () => Promise<void>) {
    setImmediate(() => {
      void this.runScheduledBackgroundRun(taskId, runner);
    });
  }

  private async runScheduledBackgroundRun(taskId: string, runner: () => Promise<void>): Promise<void> {
    try {
      await runWithLlmUsageTracking(
        await this.buildDirectorUsageContext(taskId),
        runner,
      );
    } catch (error) {
      if (isWorkflowTaskCancelledError(error) || isDirectorRuntimeGateError(error)) {
        return;
      }
      const message = error instanceof Error ? error.message : "自动导演后台任务执行失败。";
      await this.workflowService.markTaskFailed(taskId, message);
      logger.error(`[director.background] task failed taskId=${taskId}`, error);
    } finally {
      await releaseHighMemoryDirectorReservations(taskId);
    }
  }

  private withWorkflowTaskUsage<T>(workflowTaskId: string | null | undefined, runner: () => Promise<T>): Promise<T> {
    const normalizedTaskId = workflowTaskId?.trim();
    if (!normalizedTaskId) {
      return runner();
    }
    return this.buildDirectorUsageContext(normalizedTaskId)
      .then((context) => runWithLlmUsageTracking(context, runner));
  }

  private async buildDirectorUsageContext(taskId: string): Promise<LlmUsageTrackingContext> {
    const normalizedTaskId = taskId.trim();
    const task = normalizedTaskId
      ? await prisma.novelWorkflowTask.findUnique({
        where: { id: normalizedTaskId },
        select: {
          novelId: true,
          directorRun: {
            select: { id: true },
          },
        },
      }).catch(() => null)
      : null;
    return {
      workflowTaskId: normalizedTaskId || null,
      directorTelemetry: true,
      novelId: task?.novelId ?? null,
      directorRunId: task?.directorRun?.id ?? (normalizedTaskId || null),
    };
  }

  private async enrichDirectorStyleContext<T extends { styleProfileId?: string; styleTone?: string; styleIntentSummary?: unknown }>(
    input: T,
  ): Promise<T> {
    const styleProfileId = input.styleProfileId?.trim() || undefined;
    let styleProfile = null;
    if (styleProfileId) {
      styleProfile = await this.styleProfileService.getProfileById(styleProfileId);
      if (!styleProfile) {
        throw new Error("所选写法资产不存在。");
      }
    }

    const styleIntentSummary = buildStyleIntentSummary({
      styleProfile,
      styleTone: input.styleTone,
    });
    return {
      ...input,
      styleProfileId,
      styleIntentSummary: styleIntentSummary ?? undefined,
    };
  }

  private async ensurePrimaryNovelStyleBinding(novelId: string, styleProfileId: string | null | undefined): Promise<void> {
    const normalizedProfileId = styleProfileId?.trim();
    if (!normalizedProfileId) {
      return;
    }
    const existingBindings = await this.styleBindingService.listBindings({
      targetType: "novel",
      targetId: novelId,
    });
    if (existingBindings.some((binding) => binding.styleProfileId === normalizedProfileId)) {
      return;
    }
    const nextPriority = Math.max(1, ...existingBindings.map((binding) => binding.priority)) + 1;
    await this.styleBindingService.createBinding({
      styleProfileId: normalizedProfileId,
      targetType: "novel",
      targetId: novelId,
      priority: nextPriority,
      weight: 1,
      enabled: true,
    });
  }

  private async getDirectorAssetSnapshot(novelId: string) {
    const [characters, chapters, workspace, novel] = await Promise.all([
      this.novelContextService.listCharacters(novelId),
      this.novelContextService.listChapters(novelId),
      this.volumeService.getVolumes(novelId).catch(() => null),
      prisma.novel.findUnique({
        where: { id: novelId },
        select: { estimatedChapterCount: true },
      }),
    ]);
    const firstVolume = workspace?.volumes[0] ?? null;
    const preparedOutlineChapters = workspace ? flattenPreparedOutlineChapters(workspace) : [];
    const volumeChapterRangeMax = Math.max(
      0,
      ...(workspace?.volumes ?? []).flatMap((volume) => (
        volume.chapters
          .map((chapter) => chapter.chapterOrder)
          .filter((order) => Number.isFinite(order))
      )),
    );
    const structuredOutlineMax = Math.max(
      0,
      ...preparedOutlineChapters
        .map((chapter) => chapter.chapterOrder)
        .filter((order) => Number.isFinite(order)),
    );
    const plannedChapterCount = Math.max(
      novel?.estimatedChapterCount ?? 0,
      volumeChapterRangeMax,
      structuredOutlineMax,
      chapters.length,
    ) || null;
    return {
      characterCount: characters.length,
      chapterCount: chapters.length,
      plannedChapterCount,
      volumeCount: workspace?.volumes.length ?? 0,
      hasVolumeStrategyPlan: Boolean(workspace?.strategyPlan),
      firstVolumeId: firstVolume?.id ?? null,
      firstVolumeChapterCount: firstVolume?.chapters.length ?? 0,
      volumeChapterRanges: (workspace?.volumes ?? []).map((volume) => {
        const orders = volume.chapters
          .map((chapter) => chapter.chapterOrder)
          .filter((order) => Number.isFinite(order))
          .sort((left, right) => left - right);
        return orders.length > 0
          ? {
            volumeOrder: volume.sortOrder,
            startOrder: orders[0],
            endOrder: orders[orders.length - 1],
          }
          : null;
      }).filter((range): range is { volumeOrder: number; startOrder: number; endOrder: number } => Boolean(range)),
      structuredOutlineChapterOrders: preparedOutlineChapters.map((chapter) => chapter.chapterOrder),
    };
  }

  async continueTask(taskId: string, input?: {
    continuationMode?: DirectorContinuationMode;
    batchAlreadyStartedCount?: number;
    forceResume?: boolean;
  }): Promise<void> {
    return this.continueRuntime.continueTask(taskId, input);
  }

  async executeContinueTask(taskId: string, input?: {
    continuationMode?: DirectorContinuationMode;
    batchAlreadyStartedCount?: number;
    forceResume?: boolean;
  }): Promise<void> {
    return this.continueRuntime.continueTask(taskId, input);
  }

  async continueCandidateStageTask(
    taskId: string,
    input: Parameters<NovelDirectorCandidateRuntime["continueTask"]>[1],
  ): Promise<boolean> {
    return this.candidateRuntime.continueTask(taskId, input);
  }

  async resolveAssetFirstRecovery(
    input: Parameters<NovelDirectorContinueRuntime["resolveAssetFirstRecovery"]>[0],
  ): ReturnType<NovelDirectorContinueRuntime["resolveAssetFirstRecovery"]> {
    return this.continueRuntime.resolveAssetFirstRecoveryFromAvailableAssets(input);
  }

  async runDirectorPipeline(
    input: Parameters<NovelDirectorPipelineRuntime["runPipeline"]>[0],
  ): ReturnType<NovelDirectorPipelineRuntime["runPipeline"]> {
    return this.directorPipelineRuntime.runPipeline(input);
  }

  async repairChapterTitles(taskId: string, input?: {
    volumeId?: string | null;
  }): Promise<void> {
    return this.chapterTitleRepairRuntime.repairChapterTitles(taskId, input);
  }

  async executeChapterTitleRepair(taskId: string, input?: {
    volumeId?: string | null;
  }): Promise<void> {
    return this.chapterTitleRepairRuntime.repairChapterTitles(taskId, input);
  }

  async getTakeoverReadiness(novelId: string): Promise<DirectorTakeoverReadinessResponse> {
    const takeoverState = await loadDirectorTakeoverState({
      novelId,
      getStoryMacroPlan: (targetNovelId) => this.storyMacroService.getPlan(targetNovelId),
      getDirectorAssetSnapshot: (targetNovelId) => this.getDirectorAssetSnapshot(targetNovelId),
      getVolumeWorkspace: (targetNovelId) => this.volumeService.getVolumes(targetNovelId),
      findActiveAutoDirectorTask: (targetNovelId) => this.workflowService.findActiveTaskByNovelAndLane(targetNovelId, "auto_director"),
      findLatestAutoDirectorTask: (targetNovelId) => this.workflowService.findLatestVisibleTaskByNovelId(targetNovelId, "auto_director"),
    });
    return buildDirectorTakeoverReadiness({
      novel: takeoverState.novel,
      snapshot: takeoverState.snapshot,
      hasActiveTask: takeoverState.hasActiveTask,
      activeTaskId: takeoverState.activeTaskId,
      activePipelineJob: takeoverState.activePipelineJob,
      latestCheckpoint: takeoverState.latestCheckpoint,
      executableRange: takeoverState.executableRange,
    });
  }

  async analyzeRuntimeWorkspace(novelId: string, input?: {
    workflowTaskId?: string | null;
    includeAiInterpretation?: boolean;
    llm?: DirectorLLMOptions;
  }): Promise<DirectorWorkspaceAnalysis> {
    return this.directorRuntime.analyzeWorkspace({
      novelId,
      workflowTaskId: input?.workflowTaskId,
      includeAiInterpretation: input?.includeAiInterpretation,
      llm: input?.llm,
    });
  }

  async evaluateManualEditImpact(novelId: string, input?: {
    workflowTaskId?: string | null;
    chapterId?: string | null;
    includeAiInterpretation?: boolean;
    llm?: DirectorLLMOptions;
  }): Promise<DirectorManualEditImpact> {
    return this.directorRuntime.evaluateManualEditImpact({
      novelId,
      workflowTaskId: input?.workflowTaskId,
      chapterId: input?.chapterId,
      includeAiInterpretation: input?.includeAiInterpretation,
      llm: input?.llm,
    });
  }

  async getRuntimeSnapshot(taskId: string): Promise<DirectorRuntimeSnapshot | null> {
    return this.directorRuntime.getSnapshot(taskId);
  }

  buildRuntimeProjection(snapshot: DirectorRuntimeSnapshot | null): DirectorRuntimeProjection | null {
    return this.directorEventProjectionService.buildSnapshotProjection(snapshot);
  }

  async getRuntimeProjection(taskId: string): Promise<DirectorRuntimeProjection | null> {
    const persistentProjection = await loadPersistentDirectorRuntimeProjection(
      taskId,
      this.directorEventProjectionService,
    );
    if (persistentProjection) {
      return persistentProjection;
    }
    return this.buildRuntimeProjection(await this.getRuntimeSnapshot(taskId));
  }

  async updateRuntimePolicy(taskId: string, input: {
    mode: DirectorPolicyMode;
    patch?: Partial<Omit<DirectorRuntimePolicySnapshot, "mode" | "updatedAt">>;
  }): Promise<DirectorRuntimeSnapshot | null> {
    return this.directorRuntime.updatePolicy({
      taskId,
      mode: input.mode,
      patch: input.patch,
    });
  }

  async startTakeover(input: DirectorTakeoverRequest, options: {
    workflowTaskId?: string | null;
  } = {}): Promise<DirectorTakeoverResponse> {
    return executeStartTakeover(input, options, {
      workflowService: this.workflowService,
      storyMacroService: this.storyMacroService,
      volumeService: this.volumeService,
      novelService: this.novelService,
      directorRuntime: this.directorRuntime,
      directorPipelineRuntime: this.directorPipelineRuntime,
      autoExecutionRuntime: this.autoExecutionRuntime,
      directorRuntimeOrchestrator: this.directorRuntimeOrchestrator,
      novelContextService: this.novelContextService,
      getDirectorAssetSnapshot: (novelId) => this.getDirectorAssetSnapshot(novelId),
      enrichDirectorStyleContext: (dirInput) => this.enrichDirectorStyleContext(dirInput),
      ensurePrimaryNovelStyleBinding: (novelId, styleProfileId) => this.ensurePrimaryNovelStyleBinding(novelId, styleProfileId),
      scheduleBackgroundRun: (taskId, runner) => this.scheduleBackgroundRun(taskId, runner),
    });
  }

  async generateCandidates(input: DirectorCandidatesRequest): Promise<DirectorCandidatesResponse> {
    return this.candidateRuntime.runWithFailureHandling(
      input.workflowTaskId,
      async () => this.candidateStageService.generateCandidates(await this.enrichDirectorStyleContext(input)),
      "candidate_generation",
    );
  }

  async refineCandidates(input: DirectorRefinementRequest): Promise<DirectorRefineResponse> {
    return this.candidateRuntime.runWithFailureHandling(
      input.workflowTaskId,
      async () => this.candidateStageService.refineCandidates(await this.enrichDirectorStyleContext(input)),
      "candidate_refine",
    );
  }

  async patchCandidate(input: DirectorCandidatePatchRequest): Promise<DirectorCandidatePatchResponse> {
    return this.candidateRuntime.runWithFailureHandling(
      input.workflowTaskId,
      async () => this.candidateStageService.patchCandidate(await this.enrichDirectorStyleContext(input)),
      "candidate_patch",
    );
  }

  async refineCandidateTitleOptions(
    input: DirectorCandidateTitleRefineRequest,
  ): Promise<DirectorCandidateTitleRefineResponse> {
    return this.candidateRuntime.runWithFailureHandling(
      input.workflowTaskId,
      async () => this.candidateStageService.refineCandidateTitleOptions(await this.enrichDirectorStyleContext(input)),
      "candidate_title_refine",
    );
  }

  async confirmCandidate(input: DirectorConfirmRequest): Promise<DirectorConfirmApiResponse> {
    return this.confirmRuntime.confirmCandidate(input);
  }

}
