import { AppError } from "../../../middleware/errorHandler";
import type { DirectorTakeoverRequest, DirectorTakeoverResponse } from "@ai-novel/shared";
import { isFullBookAutopilotRunMode } from "@ai-novel/shared";
import {
  buildDirectorWorkflowSeedPayload,
  applyDirectorRunModeContract,
} from "./runtime/novelDirectorHelpers";
import {
  buildDirectorTakeoverInput,
  isTakeoverStructuredOutlineReadyForValidation,
} from "./runtime/novelDirectorTakeover";
import { loadDirectorTakeoverState } from "./runtime/novelDirectorTakeoverRuntime";
import { startDirectorTakeoverExecution } from "./runtime/novelDirectorTakeoverExecution";
import {
  resetDirectorTakeoverCurrentStep,
  resetDirectorTakeoverDownstreamState,
} from "./runtime/novelDirectorTakeoverReset";
import { cancelContinueExistingReplacedRuns } from "./runtime/novelDirectorTakeoverContinue";
import {
  validateAutoDirectorTakeoverRequest,
} from "./runtime/autoDirectorValidationService";
import { assertHighMemoryDirectorStartAllowed } from "./runtime/autoDirectorMemorySafety";
import type { DirectorRuntimeService } from "./runtime/DirectorRuntimeService";
import type { NovelDirectorPipelineRuntime } from "./novelDirectorPipelineRuntime";
import type { NovelDirectorAutoExecutionRuntime } from "./automation/novelDirectorAutoExecutionRuntime";
import type { NovelDirectorRuntimeOrchestrator } from "./runtime/novelDirectorRuntimeOrchestrator";
import type { NovelWorkflowService } from "../workflow/NovelWorkflowService";
import type { NovelVolumeService } from "../volume/NovelVolumeService";
import type { StoryMacroPlanService } from "../storyMacro/StoryMacroPlanService";
import type { NovelContextService } from "../NovelContextService";

export interface TakeoverHandlerDeps {
  workflowService: NovelWorkflowService;
  storyMacroService: StoryMacroPlanService;
  volumeService: NovelVolumeService;
  novelService: {
    replanNovel: (...args: unknown[]) => Promise<unknown>;
    updateNovel: (...args: unknown[]) => Promise<unknown>;
    createNovelSnapshot: (...args: unknown[]) => Promise<{ id: string; label: string | null }>;
    cancelPipelineJob: (...args: unknown[]) => Promise<unknown>;
  };
  directorRuntime: DirectorRuntimeService;
  directorPipelineRuntime: NovelDirectorPipelineRuntime;
  autoExecutionRuntime: NovelDirectorAutoExecutionRuntime;
  directorRuntimeOrchestrator: NovelDirectorRuntimeOrchestrator;
  novelContextService: NovelContextService;
  getDirectorAssetSnapshot: (novelId: string) => Promise<{
    characterCount: number;
    chapterCount: number;
    plannedChapterCount: number | null;
    volumeCount: number;
    hasVolumeStrategyPlan: boolean;
    firstVolumeId: string | null;
    firstVolumeChapterCount: number;
    volumeChapterRanges: Array<{ volumeOrder: number; startOrder: number; endOrder: number }>;
    structuredOutlineChapterOrders: number[];
  }>;
  enrichDirectorStyleContext: <T extends { styleProfileId?: string; styleTone?: string; styleIntentSummary?: unknown }>(input: T) => Promise<T>;
  ensurePrimaryNovelStyleBinding: (novelId: string, styleProfileId: string | null | undefined) => Promise<void>;
  scheduleBackgroundRun: (taskId: string, runner: () => Promise<void>) => void;
}

export async function executeStartTakeover(
  input: DirectorTakeoverRequest,
  options: { workflowTaskId?: string | null },
  deps: TakeoverHandlerDeps,
): Promise<DirectorTakeoverResponse> {
  const commandTaskId = options.workflowTaskId?.trim() || null;
  const takeoverState = await loadDirectorTakeoverState({
    novelId: input.novelId,
    autoExecutionPlan: input.autoExecutionPlan,
    getStoryMacroPlan: (targetNovelId) => deps.storyMacroService.getPlan(targetNovelId),
    getDirectorAssetSnapshot: (targetNovelId) => deps.getDirectorAssetSnapshot(targetNovelId),
    getVolumeWorkspace: (targetNovelId) => deps.volumeService.getVolumes(targetNovelId),
    findActiveAutoDirectorTask: async (targetNovelId) => {
      if (!commandTaskId) {
        return deps.workflowService.findActiveTaskByNovelAndLane(targetNovelId, "auto_director");
      }
      const rows = await deps.workflowService.listVisibleTasksByNovelAndLane(targetNovelId, "auto_director");
      return rows.find((row) => row.id !== commandTaskId && ["queued", "running", "waiting_approval"].includes(row.status)) ?? null;
    },
    findLatestAutoDirectorTask: async (targetNovelId) => {
      if (!commandTaskId) {
        return deps.workflowService.findLatestVisibleTaskByNovelId(targetNovelId, "auto_director");
      }
      const rows = await deps.workflowService.listVisibleTasksByNovelAndLane(targetNovelId, "auto_director");
      return rows.find((row) => row.id !== commandTaskId) ?? null;
    },
  });
  const takeoverStrategy = input.strategy ?? (input.startPhase ? "restart_current_step" : "continue_existing");
  if (takeoverState.hasActiveTask && takeoverStrategy !== "continue_existing") {
    throw new Error("当前已有自动导演任务在运行或等待审核，请先继续或取消当前任务。");
  }
  const takeoverValidation = validateAutoDirectorTakeoverRequest({
    source: "takeover",
    request: input,
    assets: {
      hasProjectSetup: true,
      hasStoryMacroPlan: takeoverState.snapshot.hasStoryMacroPlan,
      hasBookContract: takeoverState.snapshot.hasBookContract,
      characterCount: takeoverState.snapshot.characterCount,
      volumeCount: takeoverState.snapshot.volumeCount,
      hasVolumeStrategyPlan: takeoverState.snapshot.hasVolumeStrategyPlan,
      hasStructuredOutline: isTakeoverStructuredOutlineReadyForValidation(takeoverState.snapshot),
      plannedChapterCount: takeoverState.snapshot.plannedChapterCount,
      totalChapterCount: takeoverState.snapshot.chapterCount,
      volumeChapterRanges: takeoverState.snapshot.volumeChapterRanges,
      structuredOutlineChapterOrders: takeoverState.snapshot.structuredOutlineChapterOrders,
    },
  });
  if (!takeoverValidation.allowed) {
    throw new AppError(takeoverValidation.blockingReasons.join("；") || "当前接管请求需要先重新校验。", 409);
  }

  const takeoverDirectorInput = buildDirectorTakeoverInput({
    novel: takeoverState.novel,
    storyMacroPlan: takeoverState.storyMacroPlan,
    bookContract: takeoverState.bookContract,
    runMode: input.runMode,
  });
  const directorInput = applyDirectorRunModeContract(await deps.enrichDirectorStyleContext({
    ...takeoverDirectorInput,
    styleProfileId: input.styleProfileId ?? takeoverDirectorInput.styleProfileId,
    postGenerationStyleReviewEnabled: input.postGenerationStyleReviewEnabled ?? takeoverDirectorInput.postGenerationStyleReviewEnabled,
    autoExecutionPlan: input.autoExecutionPlan,
    autoApproval: input.autoApproval,
    provider: input.provider ?? takeoverDirectorInput.provider,
    model: input.model?.trim() || takeoverDirectorInput.model,
    temperature: typeof input.temperature === "number" ? input.temperature : takeoverDirectorInput.temperature,
  }));
  const isFullBookAutopilot = isFullBookAutopilotRunMode(directorInput.runMode);
  if (typeof input.postGenerationStyleReviewEnabled === "boolean") {
    await deps.novelService.updateNovel(input.novelId, {
      postGenerationStyleReviewEnabled: input.postGenerationStyleReviewEnabled,
    });
  }
  await deps.ensurePrimaryNovelStyleBinding(input.novelId, directorInput.styleProfileId);
  const takeoverWorkspaceAnalysis = await deps.directorRuntime.analyzeWorkspace({
    novelId: input.novelId,
  });
  const response = await startDirectorTakeoverExecution({
    request: input,
    takeoverState,
    directorInput,
    workflowService: deps.workflowService,
    autoExecutionRuntime: {
      prepareRequestedAutoExecution: (payload) => deps.autoExecutionRuntime.prepareRequestedAutoExecution(payload),
      runFromReady: (payload) => deps.directorRuntimeOrchestrator.runChapterExecutionNode(payload),
    },
    buildDirectorSeedPayload: (request, novelId, extra) => buildDirectorWorkflowSeedPayload(request, novelId, extra),
    scheduleBackgroundRun: (taskId, runner) => deps.scheduleBackgroundRun(taskId, async () => {
      await deps.directorRuntime.initializeRun({
        taskId,
        novelId: input.novelId,
        entrypoint: "takeover",
        policyMode: isFullBookAutopilot ? "auto_safe_scope" : "run_until_gate",
        summary: "AI 自动导演接管已并入统一运行时。",
      });
      await deps.directorRuntime.recordWorkspaceAnalysis({
        taskId,
        analysis: takeoverWorkspaceAnalysis,
      });
      await runner();
    }),
    runDirectorPipeline: (payload) => deps.directorPipelineRuntime.runPipeline(payload),
    assertHighMemoryStartAllowed: (payload) => assertHighMemoryDirectorStartAllowed(deps.workflowService, payload),
    createRewriteSnapshot: async ({ novelId, label }) => {
      const snapshot = await deps.novelService.createNovelSnapshot(novelId, "before_pipeline", label);
      return {
        snapshotId: snapshot.id,
        label: snapshot.label ?? label,
        restoreEntry: "version_history",
      };
    },
    recordRewriteSnapshotMilestone: ({ taskId, summary }) => deps.workflowService.recordRewriteSnapshotMilestone(taskId, {
      summary,
    }),
    workflowTaskId: commandTaskId,
    prepareRestartStep: async ({ plan, takeoverState: currentTakeoverState, directorInput: di }) => {
      await resetDirectorTakeoverCurrentStep({
        novelId: input.novelId,
        plan,
        autoExecutionPlan: di.autoExecutionPlan,
        takeoverState: currentTakeoverState,
        deps: {
          getVolumeWorkspace: (targetNovelId) => deps.volumeService.getVolumes(targetNovelId),
          updateVolumeWorkspace: (targetNovelId, payload) => deps.volumeService.updateVolumes(targetNovelId, payload),
          cancelPipelineJob: (jobId) => deps.novelService.cancelPipelineJob(jobId),
        },
      });
    },
    resetDownstreamState: async ({ plan, takeoverState: currentTakeoverState, directorInput: di }) => {
      await resetDirectorTakeoverDownstreamState({
        novelId: input.novelId,
        plan,
        autoExecutionPlan: di.autoExecutionPlan,
        takeoverState: currentTakeoverState,
        deps: {
          getVolumeWorkspace: (targetNovelId) => deps.volumeService.getVolumes(targetNovelId),
          updateVolumeWorkspace: (targetNovelId, payload) => deps.volumeService.updateVolumes(targetNovelId, payload),
          cancelPipelineJob: (jobId) => deps.novelService.cancelPipelineJob(jobId),
        },
      });
    },
    cancelReplacedRuns: async ({ replacementTaskId, directorInput: di, takeoverState: currentTakeoverState }) => {
      await cancelContinueExistingReplacedRuns({
        novelId: input.novelId,
        replacementTaskId,
        autoExecutionPlan: di.autoExecutionPlan,
        resolvedRange: currentTakeoverState.executableRange,
        getVolumeWorkspace: (targetNovelId) => deps.volumeService.getVolumes(targetNovelId),
        cancelPipelineJob: (jobId) => deps.novelService.cancelPipelineJob(jobId),
      });
    },
  });
  await deps.directorRuntime.initializeRun({
    taskId: response.workflowTaskId,
    novelId: input.novelId,
    entrypoint: "takeover",
    policyMode: "run_until_gate",
    summary: "AI 自动导演接管已并入统一运行时。",
  });
  await deps.directorRuntime.recordWorkspaceAnalysis({
    taskId: response.workflowTaskId,
    analysis: takeoverWorkspaceAnalysis,
  });
  return response;
}
