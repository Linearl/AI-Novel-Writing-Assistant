import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useEffect, useMemo } from "react";
import { useMutation, useQuery, type QueryClient } from "@tanstack/react-query";
import { buildStyleIntentSummary } from "@ai-novel/shared";
import type { UnifiedTaskDetail } from "@ai-novel/shared";
import {
  extractDirectorTaskSeedPayloadFromMeta,
  mergeDirectorCandidateBatches,
  type DirectorCandidateBatch,
  type DirectorIdeaInspiration,
  type DirectorRunMode,
  type DirectorWorldSetupMode,
} from "@ai-novel/shared";
import { generateDirectorIdeaInspirations } from "@/api/novelDirector";
import { queryKeys } from "@/api/queryKeys";
import { getStyleProfiles } from "@/api/styleEngine";
import { getTaskDetail } from "@/api/tasks";
import { toast } from "@/components/ui/toast";
import { isChapterTitleDiversitySummary } from "@/lib/directorTaskNotice";
import type { NovelBasicFormState } from "../novelBasicInfo.shared";
import { buildAutoDirectorRequestPayload, type AutoDirectorRequestLlmOptions } from "./NovelAutoDirectorDialog.shared";
import type { DirectorDialogMode } from "./NovelAutoDirectorDialogHeader";
import { ACTIVE_DIRECTOR_TASK_STATUSES, DIRECTOR_CANDIDATE_SETUP_STEP_KEYS } from "./NovelAutoDirectorDialog.constants";

export interface UseDirectorTaskQueryInput {
  // State values
  open: boolean;
  workflowTaskId: string;
  idea: string;
  batches: DirectorCandidateBatch[];
  dialogMode: DirectorDialogMode;
  directorBasicForm: NovelBasicFormState;
  genreOptions: Array<{ id: string; path: string; label: string }>;
  worldOptions: Array<{ id: string; name: string }>;
  selectedStyleProfileId: string;
  runMode: DirectorRunMode;
  worldSetupMode: DirectorWorldSetupMode;
  executionRequested: boolean;
  llm: AutoDirectorRequestLlmOptions;
  restoredTask?: UnifiedTaskDetail | null;

  // Setters
  setIdea: Dispatch<SetStateAction<string>>;
  setBatches: Dispatch<SetStateAction<DirectorCandidateBatch[]>>;
  setDialogMode: Dispatch<SetStateAction<DirectorDialogMode>>;
  setExecutionError: Dispatch<SetStateAction<string>>;
  setExecutionRequested: Dispatch<SetStateAction<boolean>>;
  setIdeaInspirations: Dispatch<SetStateAction<DirectorIdeaInspiration[]>>;
  setWorkflowTaskId: Dispatch<SetStateAction<string>>;

  // For onConfirmed
  resetDialogState: () => void;
  onConfirmed: (input: {
    novelId: string;
    workflowTaskId?: string;
    resumeTarget?: {
      stage?: "basic" | "story_macro" | "character" | "outline" | "structured" | "chapter" | "pipeline";
      chapterId?: string | null;
      volumeId?: string | null;
    } | null;
  }) => void;
  confirmedTaskHandledRef: MutableRefObject<string | null>;

  // Query client
  queryClient: QueryClient;
}

export function useDirectorTaskQuery({
  open,
  workflowTaskId,
  idea,
  batches,
  dialogMode,
  directorBasicForm,
  genreOptions,
  worldOptions,
  selectedStyleProfileId,
  runMode,
  worldSetupMode,
  executionRequested,
  llm,
  restoredTask,
  setIdea,
  setBatches,
  setDialogMode,
  setExecutionError,
  setExecutionRequested,
  setIdeaInspirations,
  setWorkflowTaskId,
  resetDialogState,
  onConfirmed,
  confirmedTaskHandledRef,
  queryClient,
}: UseDirectorTaskQueryInput) {
  // ---------------------------------------------------------------------------
  // Style profiles
  // ---------------------------------------------------------------------------

  const styleProfilesQuery = useQuery({
    queryKey: queryKeys.styleEngine.profiles,
    queryFn: getStyleProfiles,
    enabled: open,
  });
  const styleProfiles = styleProfilesQuery.data?.data ?? [];

  const selectedStyleProfile = useMemo(
    () => styleProfiles.find((item) => item.id === selectedStyleProfileId) ?? null,
    [selectedStyleProfileId, styleProfiles],
  );

  const selectedStyleSummary = useMemo(
    () => buildStyleIntentSummary({
      styleProfile: selectedStyleProfile,
      styleTone: directorBasicForm.styleTone,
    }),
    [directorBasicForm.styleTone, selectedStyleProfile],
  );

  // ---------------------------------------------------------------------------
  // Idea inspirations
  // ---------------------------------------------------------------------------

  const ideaInspirationMutation = useMutation({
    mutationFn: async () => {
      const genre = genreOptions.find((item) => item.id === directorBasicForm.genreId);
      const world = worldOptions.find((item) => item.id === directorBasicForm.worldId);
      return generateDirectorIdeaInspirations({
        ...buildAutoDirectorRequestPayload(directorBasicForm, idea || directorBasicForm.description, llm, runMode, undefined, {
          styleProfileId: selectedStyleProfileId,
          worldSetupMode,
        }),
        currentIdea: idea.trim() || undefined,
        genreLabel: genre?.path || genre?.label,
        worldName: world?.name,
      });
    },
    onSuccess: (response) => {
      setIdeaInspirations(response.data?.ideas ?? []);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "生成起始想法失败，请稍后重试。");
    },
  });

  // ---------------------------------------------------------------------------
  // Director task polling
  // ---------------------------------------------------------------------------

  const directorTaskQuery = useQuery({
    queryKey: queryKeys.tasks.detail("novel_workflow", workflowTaskId || "none"),
    queryFn: () => getTaskDetail("novel_workflow", workflowTaskId),
    enabled: Boolean(workflowTaskId),
    retry: false,
    refetchInterval: (query) => {
      const task = query.state.data?.data;
      return open && task && ACTIVE_DIRECTOR_TASK_STATUSES.has(task.status) ? 2000 : false;
    },
  });

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const latestBatch = batches.at(-1) ?? null;

  const directorTask = useMemo(() => {
    const loadedTask = directorTaskQuery.data?.data ?? null;
    if (loadedTask) {
      return loadedTask;
    }
    return restoredTask?.id === workflowTaskId ? restoredTask : null;
  }, [directorTaskQuery.data?.data, restoredTask, workflowTaskId]);

  // Batch seeding from restored/completed task metadata
  useEffect(() => {
    const seededBatches = extractDirectorTaskSeedPayloadFromMeta(directorTask?.meta)?.batches;
    if (!Array.isArray(seededBatches) || seededBatches.length === 0) {
      return;
    }
    setBatches((prev) => mergeDirectorCandidateBatches(prev, seededBatches));
  }, [directorTask, setBatches]);

  const candidateSetupInProgress = Boolean(
    directorTask
    && ACTIVE_DIRECTOR_TASK_STATUSES.has(directorTask.status)
    && DIRECTOR_CANDIDATE_SETUP_STEP_KEYS.has(directorTask.currentItemKey ?? ""),
  );

  const hasActiveDirectorTask = Boolean(directorTask && ACTIVE_DIRECTOR_TASK_STATUSES.has(directorTask.status));
  const triggerLabel = hasActiveDirectorTask ? "查看导演进度" : "AI 自动导演创建";
  const isBlockingExecutionView = dialogMode === "execution_progress" && hasActiveDirectorTask && !candidateSetupInProgress;

  // ---------------------------------------------------------------------------
  // Task status -> dialogMode effect
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!directorTask) {
      return;
    }
    const hasChapterTitleWarning = isChapterTitleDiversitySummary(
      directorTask.failureSummary ?? directorTask.lastError ?? null,
    );
    if (directorTask.checkpointType === "candidate_selection_required" && !executionRequested) {
      setDialogMode("candidate_selection");
      setExecutionError("");
      return;
    }
    if (directorTask.status === "failed" || directorTask.status === "cancelled") {
      if (hasChapterTitleWarning) {
        setDialogMode("execution_progress");
        setExecutionError("");
        return;
      }
      setDialogMode("execution_failed");
      setExecutionError(directorTask.lastError ?? "");
      return;
    }
    if (ACTIVE_DIRECTOR_TASK_STATUSES.has(directorTask.status)) {
      setDialogMode("execution_progress");
      if (directorTask.checkpointType !== "candidate_selection_required") {
        setExecutionRequested(false);
      }
    }
  }, [directorTask, executionRequested, setDialogMode, setExecutionError, setExecutionRequested]);

  // ---------------------------------------------------------------------------
  // onConfirmed effect
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const resumeTarget = directorTask?.resumeTarget ?? null;
    const confirmedNovelId = resumeTarget?.novelId?.trim() || "";
    if (!executionRequested || !directorTask || !confirmedNovelId) {
      return;
    }
    if (workflowTaskId && directorTask.id !== workflowTaskId) {
      return;
    }
    if (confirmedTaskHandledRef.current === directorTask.id) {
      return;
    }
    confirmedTaskHandledRef.current = directorTask.id;
    setExecutionRequested(false);
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.novels.all }),
      queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    ]);
    toast.success("自动导演创建小说项目，并继续推进规划。");
    resetDialogState();
    onConfirmed({
      novelId: confirmedNovelId,
      workflowTaskId: directorTask.id,
      resumeTarget,
    });
  }, [
    directorTask,
    executionRequested,
    onConfirmed,
    queryClient,
    resetDialogState,
    workflowTaskId,
    confirmedTaskHandledRef,
    setExecutionRequested,
  ]);

  return {
    styleProfiles,
    selectedStyleProfile,
    selectedStyleSummary,
    ideaInspirationMutation,
    directorTask,
    latestBatch,
    candidateSetupInProgress,
    hasActiveDirectorTask,
    triggerLabel,
    isBlockingExecutionView,
  };
}
