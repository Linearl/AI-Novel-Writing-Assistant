import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useMutation, type QueryClient } from "@tanstack/react-query";
import {
  buildFullBookAutopilotExecutionPlan,
  type DirectorCandidate,
  type DirectorCandidateBatch,
  type DirectorAutoExecutionPlan,
  type DirectorCorrectionPreset,
  type DirectorRunMode,
  type DirectorWorldSetupMode,
  type UnifiedTaskDetail,
  type StyleIntentSummary,
  type DirectorAutoApprovalConfig,
} from "@ai-novel/shared";
import { bootstrapNovelWorkflow, continueNovelWorkflow } from "@/api/novelWorkflow";
import { confirmDirectorCandidate } from "@/api/novelDirector";
import { retryTask } from "@/api/tasks";
import { toast } from "@/components/ui/toast";
import { queryKeys } from "@/api/queryKeys";
import type { NovelBasicFormState } from "../novelBasicInfo.shared";
import type { DirectorAutoExecutionDraftState } from "./directorAutoExecutionPlan.shared";
import { buildDirectorAutoExecutionPlanFromDraft } from "./directorAutoExecutionPlan.shared";
import { buildAutoDirectorRequestPayload, type AutoDirectorRequestLlmOptions } from "./NovelAutoDirectorDialog.shared";
import type { DirectorDialogMode } from "./NovelAutoDirectorDialogHeader";

export interface UseDirectorWorkflowMutationsInput {
  // State values
  workflowTaskId: string;
  batches: DirectorCandidateBatch[];
  selectedPresets: DirectorCorrectionPreset[];
  feedback: string;
  runMode: DirectorRunMode;
  worldSetupMode: DirectorWorldSetupMode;
  selectedStyleProfileId: string;
  selectedStyleSummary: StyleIntentSummary | null;
  idea: string;
  directorBasicForm: NovelBasicFormState;
  autoExecutionDraft: DirectorAutoExecutionDraftState;
  latestBatch: DirectorCandidateBatch | null;
  directorTask: UnifiedTaskDetail | null;
  llm: AutoDirectorRequestLlmOptions;

  // Auto-approval draft
  autoApprovalDraft: {
    buildPayload: (runMode: DirectorRunMode) => DirectorAutoApprovalConfig;
  };

  // Refs
  confirmSubmitLockedRef: MutableRefObject<boolean>;

  // Callbacks
  onWorkflowTaskChange?: (workflowTaskId: string) => void;

  // Setters
  setWorkflowTaskId: Dispatch<SetStateAction<string>>;
  setBatches: Dispatch<SetStateAction<DirectorCandidateBatch[]>>;
  setFeedback: Dispatch<SetStateAction<string>>;
  setSelectedPresets: Dispatch<SetStateAction<DirectorCorrectionPreset[]>>;
  setCandidatePatchFeedbacks: Dispatch<SetStateAction<Record<string, string>>>;
  setTitlePatchFeedbacks: Dispatch<SetStateAction<Record<string, string>>>;
  setDialogMode: Dispatch<SetStateAction<DirectorDialogMode>>;
  setCandidateDialogOpen: Dispatch<SetStateAction<boolean>>;
  setExecutionRequested: Dispatch<SetStateAction<boolean>>;
  setExecutionError: Dispatch<SetStateAction<string>>;
  setPendingTitleHint: Dispatch<SetStateAction<string>>;
  setOpen: Dispatch<SetStateAction<boolean>>;

  // Query client
  queryClient: QueryClient;
}

function buildAutoExecutionPlan(
  runMode: DirectorRunMode,
  autoExecutionDraft: DirectorAutoExecutionDraftState,
  directorBasicForm: NovelBasicFormState,
): DirectorAutoExecutionPlan | undefined {
  if (runMode === "full_book_autopilot") {
    return buildFullBookAutopilotExecutionPlan(autoExecutionDraft.highRiskStrategy);
  }
  if (runMode === "auto_to_execution") {
    return buildDirectorAutoExecutionPlanFromDraft(autoExecutionDraft, {
      usage: "new_book",
      maxChapterCount: directorBasicForm.estimatedChapterCount,
    });
  }
  return undefined;
}

export function useDirectorWorkflowMutations({
  workflowTaskId,
  batches,
  selectedPresets,
  feedback,
  runMode,
  worldSetupMode,
  selectedStyleProfileId,
  selectedStyleSummary,
  idea,
  directorBasicForm,
  autoExecutionDraft,
  latestBatch,
  directorTask,
  llm,
  autoApprovalDraft,
  confirmSubmitLockedRef,
  onWorkflowTaskChange,
  setWorkflowTaskId,
  setBatches,
  setFeedback,
  setSelectedPresets,
  setCandidatePatchFeedbacks,
  setTitlePatchFeedbacks,
  setDialogMode,
  setCandidateDialogOpen,
  setExecutionRequested,
  setExecutionError,
  setPendingTitleHint,
  setOpen,
  queryClient,
}: UseDirectorWorkflowMutationsInput) {
  // ---------------------------------------------------------------------------
  // Pure helpers
  // ---------------------------------------------------------------------------

  const buildAutoExecutionPlanForRunMode = (): DirectorAutoExecutionPlan | undefined =>
    buildAutoExecutionPlan(runMode, autoExecutionDraft, directorBasicForm);

  const ensureWorkflowTask = async (): Promise<string> => {
    if (workflowTaskId) {
      return workflowTaskId;
    }
    const autoExecutionPlan = buildAutoExecutionPlanForRunMode();
    const response = await bootstrapNovelWorkflow({
      lane: "auto_director",
      title: directorBasicForm.title.trim() || undefined,
      seedPayload: {
        basicForm: directorBasicForm,
        idea,
        batches,
        runMode,
        worldSetupMode: directorBasicForm.worldId ? undefined : worldSetupMode,
        autoExecutionPlan,
        autoApproval: {
          ...autoApprovalDraft.buildPayload(runMode),
        },
        styleProfileId: selectedStyleProfileId || null,
        styleIntentSummary: selectedStyleSummary ?? null,
      },
    });
    const taskId = response.data?.id ?? "";
    if (taskId) {
      setWorkflowTaskId(taskId);
      onWorkflowTaskChange?.(taskId);
    }
    return taskId;
  };

  const applyUpdatedBatch = (batch: DirectorCandidateBatch, nextWorkflowTaskId?: string) => {
    setBatches((prev) => (
      prev.some((item) => item.id === batch.id)
        ? prev.map((item) => (item.id === batch.id ? batch : item))
        : [...prev, batch]
    ));
    if (nextWorkflowTaskId && nextWorkflowTaskId !== workflowTaskId) {
      setWorkflowTaskId(nextWorkflowTaskId);
      onWorkflowTaskChange?.(nextWorkflowTaskId);
    }
  };

  const buildCandidateRequestPayload = (currentWorkflowTaskId: string) =>
    buildAutoDirectorRequestPayload(
      directorBasicForm,
      idea,
      llm,
      runMode,
      currentWorkflowTaskId,
      { styleProfileId: selectedStyleProfileId, worldSetupMode },
    );

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const confirmMutation = useMutation({
    mutationFn: async (payload: { candidate: DirectorCandidate; workflowTaskId?: string }) => {
      const currentWorkflowTaskId = payload.workflowTaskId || await ensureWorkflowTask();
      const autoExecutionPlan = buildAutoExecutionPlanForRunMode();
      const response = await confirmDirectorCandidate({
        ...buildAutoDirectorRequestPayload(directorBasicForm, idea, llm, runMode, currentWorkflowTaskId, {
          styleProfileId: selectedStyleProfileId,
          worldSetupMode,
        }),
        batchId: latestBatch?.id,
        round: latestBatch?.round,
        candidate: payload.candidate,
        autoExecutionPlan,
        autoApproval: {
          ...autoApprovalDraft.buildPayload(runMode),
        },
      });
      return {
        command: response.data ?? null,
        workflowTaskId: response.data?.taskId ?? currentWorkflowTaskId,
      };
    },
    onSuccess: async ({ command, workflowTaskId: nextWorkflowTaskId }) => {
      if (!command) {
        setDialogMode("execution_failed");
        setExecutionError("确认方案失败，未返回导演命令。");
        toast.error("确认方案失败，未返回导演命令。");
        return;
      }
      if (nextWorkflowTaskId) {
        setWorkflowTaskId(nextWorkflowTaskId);
        onWorkflowTaskChange?.(nextWorkflowTaskId);
      }
      setDialogMode("execution_progress");
      setExecutionRequested(true);
      setExecutionError("");
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      if (nextWorkflowTaskId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.tasks.detail("novel_workflow", nextWorkflowTaskId),
        });
      }
      toast.success("系统收到书级方向，会创建小说项目并继续推进规划。");
    },
    onError: async (error, payload) => {
      setDialogMode("execution_failed");
      setExecutionError(error instanceof Error ? error.message : "导演任务执行失败。");
      setExecutionRequested(false);
      if (payload.workflowTaskId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.tasks.detail("novel_workflow", payload.workflowTaskId),
        });
      }
    },
    onSettled: () => {
      confirmSubmitLockedRef.current = false;
    },
  });

  const continueMutation = useMutation({
    mutationFn: async () => {
      const taskId = directorTask?.id || workflowTaskId;
      if (!taskId) {
        throw new Error("当前没有可继续的自动导演任务。");
      }
      return continueNovelWorkflow(taskId, { continuationMode: "resume" });
    },
    onSuccess: async (response) => {
      const nextWorkflowTaskId = response.data?.taskId ?? directorTask?.id ?? workflowTaskId;
      if (nextWorkflowTaskId && nextWorkflowTaskId !== workflowTaskId) {
        setWorkflowTaskId(nextWorkflowTaskId);
        onWorkflowTaskChange?.(nextWorkflowTaskId);
      }
      const invalidations = [
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      ];
      if (nextWorkflowTaskId) {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: queryKeys.tasks.detail("novel_workflow", nextWorkflowTaskId),
          }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.tasks.directorTaskSnapshot(nextWorkflowTaskId),
          }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.tasks.directorRuntime(nextWorkflowTaskId),
          }),
        );
      }
      await Promise.allSettled(invalidations);
      setDialogMode("execution_progress");
      setExecutionError("");
      toast.success("已确认，AI 会继续推进。");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "继续自动导演失败。");
    },
  });

  const retryMutation = useMutation({
    mutationFn: async (resume: boolean) => {
      const taskId = directorTask?.id || workflowTaskId;
      if (!taskId) {
        throw new Error("当前没有可重试的自动导演任务。");
      }
      return retryTask("novel_workflow", taskId, { resume });
    },
    onSuccess: async (response) => {
      const nextWorkflowTaskId = response.data?.id ?? directorTask?.id ?? workflowTaskId;
      if (nextWorkflowTaskId && nextWorkflowTaskId !== workflowTaskId) {
        setWorkflowTaskId(nextWorkflowTaskId);
        onWorkflowTaskChange?.(nextWorkflowTaskId);
      }
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        ...(nextWorkflowTaskId ? [
          queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail("novel_workflow", nextWorkflowTaskId) }),
          queryClient.invalidateQueries({ queryKey: queryKeys.tasks.directorTaskSnapshot(nextWorkflowTaskId) }),
          queryClient.invalidateQueries({ queryKey: queryKeys.tasks.directorRuntime(nextWorkflowTaskId) }),
        ] : []),
      ]);
      setDialogMode("execution_progress");
      setExecutionError("");
      toast.success("自动导演任务已重新启动。");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "重试自动导演失败。");
    },
  });

  // ---------------------------------------------------------------------------
  // Orchestration
  // ---------------------------------------------------------------------------

  const handleConfirmCandidate = async (candidate: DirectorCandidate) => {
    if (confirmSubmitLockedRef.current || confirmMutation.isPending) {
      return;
    }
    confirmSubmitLockedRef.current = true;
    try {
      const currentWorkflowTaskId = await ensureWorkflowTask();
      setPendingTitleHint(candidate.workingTitle);
      setCandidateDialogOpen(false);
      setDialogMode("execution_progress");
      setExecutionRequested(true);
      setExecutionError("");
      setOpen(true);
      if (currentWorkflowTaskId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.tasks.detail("novel_workflow", currentWorkflowTaskId),
        });
      }
      confirmMutation.mutate({
        candidate,
        workflowTaskId: currentWorkflowTaskId,
      });
    } catch (error) {
      confirmSubmitLockedRef.current = false;
      const message = error instanceof Error ? error.message : "创建导演主任务失败。";
      setDialogMode("candidate_selection");
      setExecutionRequested(false);
      setExecutionError(message);
      toast.error(message);
    }
  };

  return {
    ensureWorkflowTask,
    applyUpdatedBatch,
    buildCandidateRequestPayload,
    confirmMutation,
    continueMutation,
    retryMutation,
    handleConfirmCandidate,
  };
}
