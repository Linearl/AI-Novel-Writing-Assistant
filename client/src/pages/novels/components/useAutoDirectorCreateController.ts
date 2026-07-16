import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import type { DirectorCorrectionPreset, UnifiedTaskDetail } from "@ai-novel/shared";
import {
  extractDirectorTaskSeedPayloadFromMeta,
  DIRECTOR_RUN_MODES,
  type DirectorCandidate,
  type DirectorCandidateBatch,
  type DirectorIdeaInspiration,
  type DirectorRunMode,
  type DirectorWorldSetupMode,
} from "@ai-novel/shared";
import { useLLMStore } from "@/store/llmStore";
import { toast } from "@/components/ui/toast";
import { queryKeys } from "@/api/queryKeys";
import {
  patchNovelBasicForm,
  type NovelBasicFormState,
} from "../novelBasicInfo.shared";
import {
  createDefaultDirectorAutoExecutionDraftState,
  normalizeDirectorAutoExecutionDraftState,
} from "./directorAutoExecutionPlan.shared";
import {
  buildInitialIdea,
  DEFAULT_VISIBLE_RUN_MODE,
} from "./NovelAutoDirectorDialog.shared";
import { useDirectorAutoApprovalDraft } from "./useDirectorAutoApprovalDraft";
import {
  applyDirectorCandidateTitleOption,
  toggleDirectorCorrectionPreset,
} from "./directorCandidateSelectionHandlers";

import { useDirectorTaskQuery } from "./useDirectorTaskQuery";
import { useDirectorWorkflowMutations } from "./useDirectorWorkflowMutations";
import { useNovelAutoDirectorCandidateMutations } from "./useNovelAutoDirectorCandidateMutations";

// ---------------------------------------------------------------------------
// Step types
// ---------------------------------------------------------------------------

export type AutoDirectorCreateStepKey = "idea" | "basic" | "world_style" | "model_run" | "candidates";

export interface AutoDirectorCreateStepDef {
  key: AutoDirectorCreateStepKey;
  order: number;
  label: string;
}

export const CREATE_STEPS: AutoDirectorCreateStepDef[] = [
  { key: "idea", order: 0, label: "起始想法" },
  { key: "basic", order: 1, label: "导演起始设置" },
  { key: "world_style", order: 2, label: "世界与写法" },
  { key: "model_run", order: 3, label: "模型与运行方式" },
  { key: "candidates", order: 4, label: "方向候选" },
];

// ---------------------------------------------------------------------------
// Controller input (matches NovelAutoDirectorDialogProps)
// ---------------------------------------------------------------------------

export interface UseAutoDirectorCreateControllerInput {
  basicForm: NovelBasicFormState;
  genreOptions: Array<{ id: string; path: string; label: string }>;
  worldOptions: Array<{ id: string; name: string }>;
  workflowTaskId?: string;
  restoredTask?: UnifiedTaskDetail | null;
  initialOpen?: boolean;
  initialIdea?: string;
  onWorkflowTaskChange?: (workflowTaskId: string) => void;
  onBasicFormChange?: (patch: Partial<NovelBasicFormState>) => void;
  onInitialIdeaConsumed?: () => void;
  onConfirmed: (input: {
    novelId: string;
    workflowTaskId?: string;
    resumeTarget?: {
      stage?: "basic" | "story_macro" | "character" | "outline" | "structured" | "chapter" | "pipeline";
      chapterId?: string | null;
      volumeId?: string | null;
    } | null;
  }) => void;
}

// ---------------------------------------------------------------------------
// Controller return type
// ---------------------------------------------------------------------------

export interface AutoDirectorCreateController {
  activeStep: AutoDirectorCreateStepKey;
  setActiveStep: (step: AutoDirectorCreateStepKey) => void;
  completedSteps: Set<AutoDirectorCreateStepKey>;
  markStepCompleted: (step: AutoDirectorCreateStepKey) => void;
  skipToCandidates: () => void;
  showStepBar: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  dialogMode: "candidate_selection" | "execution_progress" | "execution_failed";
  idea: string;
  setIdea: (idea: string) => void;
  directorBasicForm: NovelBasicFormState;
  batches: DirectorCandidateBatch[];
  runMode: DirectorRunMode;
  setRunMode: (mode: DirectorRunMode) => void;
  worldSetupMode: DirectorWorldSetupMode;
  setWorldSetupMode: (mode: DirectorWorldSetupMode) => void;
  autoExecutionDraft: ReturnType<typeof createDefaultDirectorAutoExecutionDraftState>;
  setAutoExecutionDraft: (updater: (prev: ReturnType<typeof createDefaultDirectorAutoExecutionDraftState>) => ReturnType<typeof createDefaultDirectorAutoExecutionDraftState>) => void;
  autoApprovalDraft: ReturnType<typeof useDirectorAutoApprovalDraft>;
  selectedStyleProfileId: string;
  setSelectedStyleProfileId: (id: string) => void;
  styleProfiles: Array<{ id: string; name: string }>;
  directorTask: UnifiedTaskDetail | null;
  hasActiveDirectorTask: boolean;
  triggerLabel: string;
  isBlockingExecutionView: boolean;
  workflowTaskId: string;
  ideaInspirations: DirectorIdeaInspiration[];
  isGeneratingIdeaInspirations: boolean;
  generateIdeaInspirations: () => void;
  generateMutation: { isPending: boolean; mutate: () => void };
  patchCandidateMutation: { isPending: boolean; mutate: (payload: { batchId: string; candidate: DirectorCandidate; feedback: string }) => void };
  refineTitleMutation: { isPending: boolean; mutate: (payload: { batchId: string; candidate: DirectorCandidate; feedback: string }) => void };
  selectedPresets: DirectorCorrectionPreset[];
  feedback: string;
  setFeedback: (feedback: string) => void;
  togglePreset: (preset: DirectorCorrectionPreset) => void;
  applyCandidateTitleOption: (batchId: string, candidateId: string, option: { title: string }) => void;
  candidatePatchFeedbacks: Record<string, string>;
  setCandidatePatchFeedback: (candidateId: string, value: string) => void;
  titlePatchFeedbacks: Record<string, string>;
  setTitlePatchFeedback: (candidateId: string, value: string) => void;
  confirmMutation: { isPending: boolean; mutate: (payload: { candidate: DirectorCandidate; workflowTaskId?: string }) => void };
  continueMutation: { isPending: boolean; mutate: () => void };
  retryMutation: { isPending: boolean; mutate: (resume: boolean) => void };
  handleConfirmCandidate: (candidate: DirectorCandidate) => Promise<void>;
  handleGenerate: () => void;
  handleQuickGenerate: () => void;
  handleBackToSettings: () => void;
  handleBackgroundContinue: () => void;
  handleOpenTaskCenter: () => void;
  handleDialogOpenChange: (next: boolean) => void;
  preventCloseWhileBlocking: (event: Event) => void;
  resetDialogState: () => void;
  canGenerate: boolean;
  candidateDialogOpen: boolean;
  setCandidateDialogOpen: (open: boolean) => void;
  executionError: string;
  pendingTitleHint: string;
}

// ---------------------------------------------------------------------------
// Controller hook
// ---------------------------------------------------------------------------

export function useAutoDirectorCreateController(input: UseAutoDirectorCreateControllerInput): AutoDirectorCreateController {
  const {
    basicForm,
    genreOptions,
    worldOptions,
    workflowTaskId: workflowTaskIdProp,
    restoredTask,
    initialOpen = false,
    initialIdea,
    onWorkflowTaskChange,
    onBasicFormChange,
    onInitialIdeaConsumed,
    onConfirmed,
  } = input;

  const navigate = useNavigate();
  const llm = useLLMStore();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Raw state
  // ---------------------------------------------------------------------------

  const [open, setOpen] = useState(false);
  const [idea, setIdea] = useState("");
  const [feedback, setFeedback] = useState("");
  const [selectedPresets, setSelectedPresets] = useState<DirectorCorrectionPreset[]>([]);
  const [batches, setBatches] = useState<DirectorCandidateBatch[]>([]);
  const [workflowTaskId, setWorkflowTaskId] = useState(workflowTaskIdProp ?? "");
  const [dialogMode, setDialogMode] = useState<"candidate_selection" | "execution_progress" | "execution_failed">("candidate_selection");
  const [candidateDialogOpen, setCandidateDialogOpen] = useState(false);
  const [executionRequested, setExecutionRequested] = useState(false);
  const [pendingTitleHint, setPendingTitleHint] = useState("");
  const [executionError, setExecutionError] = useState("");
  const [runMode, setRunMode] = useState<DirectorRunMode>(DEFAULT_VISIBLE_RUN_MODE);
  const [worldSetupMode, setWorldSetupMode] = useState<DirectorWorldSetupMode>("auto_generate");
  const [autoExecutionDraft, setAutoExecutionDraft] = useState(() => createDefaultDirectorAutoExecutionDraftState());
  const [selectedStyleProfileId, setSelectedStyleProfileId] = useState("");
  const [ideaInspirations, setIdeaInspirations] = useState<DirectorIdeaInspiration[]>([]);
  const [candidatePatchFeedbacks, setCandidatePatchFeedbacks] = useState<Record<string, string>>({});
  const [titlePatchFeedbacks, setTitlePatchFeedbacks] = useState<Record<string, string>>({});

  const [activeStep, setActiveStep] = useState<AutoDirectorCreateStepKey>("idea");
  const [completedSteps, setCompletedSteps] = useState<Set<AutoDirectorCreateStepKey>>(new Set());

  const markStepCompleted = useCallback((step: AutoDirectorCreateStepKey) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(step);
      return next;
    });
  }, []);

  const confirmSubmitLockedRef = useRef(false);
  const confirmedTaskHandledRef = useRef<string | null>(null);
  const autoApprovalDraft = useDirectorAutoApprovalDraft(open);
  const { applySnapshot: applyAutoApprovalSnapshot } = autoApprovalDraft;

  // ---------------------------------------------------------------------------
  // resetDialogState
  // ---------------------------------------------------------------------------

  const resetDialogState = useCallback(() => {
    setOpen(false);
    setIdea("");
    setFeedback("");
    setSelectedPresets([]);
    setBatches([]);
    setWorkflowTaskId("");
    setDialogMode("candidate_selection");
    setCandidateDialogOpen(false);
    setExecutionRequested(false);
    setPendingTitleHint("");
    setExecutionError("");
    setRunMode(DEFAULT_VISIBLE_RUN_MODE);
    setAutoExecutionDraft(createDefaultDirectorAutoExecutionDraftState());
    autoApprovalDraft.reset();
    setSelectedStyleProfileId("");
    setIdeaInspirations([]);
    setCandidatePatchFeedbacks({});
    setTitlePatchFeedbacks({});
    setActiveStep("idea");
    setCompletedSteps(new Set());
  }, [autoApprovalDraft]);

  // ---------------------------------------------------------------------------
  // Prop sync effects
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!workflowTaskIdProp || workflowTaskIdProp === workflowTaskId) return;
    setWorkflowTaskId(workflowTaskIdProp);
  }, [workflowTaskId, workflowTaskIdProp]);

  useEffect(() => {
    if (!initialOpen) return;
    setOpen(true);
  }, [initialOpen]);

  useEffect(() => {
    if (!restoredTask) return;
    const seedPayload = extractDirectorTaskSeedPayloadFromMeta(restoredTask.meta);
    if (restoredTask.id && restoredTask.id !== workflowTaskId) {
      setWorkflowTaskId(restoredTask.id);
    }
    if (seedPayload?.idea?.trim()) setIdea(seedPayload.idea);
    if (Array.isArray(seedPayload?.batches) && seedPayload.batches.length > 0) {
      setBatches(seedPayload.batches);
    }
    if (typeof seedPayload?.runMode === "string" && (DIRECTOR_RUN_MODES as readonly string[]).includes(seedPayload.runMode)) {
      setRunMode(seedPayload.runMode === "stage_review" ? DEFAULT_VISIBLE_RUN_MODE : seedPayload.runMode);
    }
    if (seedPayload?.autoExecutionPlan) {
      setAutoExecutionDraft(normalizeDirectorAutoExecutionDraftState(seedPayload.autoExecutionPlan));
    }
    if (seedPayload?.autoApproval) applyAutoApprovalSnapshot(seedPayload.autoApproval);
    if (typeof seedPayload?.styleProfileId === "string") setSelectedStyleProfileId(seedPayload.styleProfileId);
    if (seedPayload?.worldSetupMode === "skip") setWorldSetupMode("skip");
    else if (!seedPayload?.worldId) setWorldSetupMode("auto_generate");
    if (initialOpen) setOpen(true);
  }, [applyAutoApprovalSnapshot, initialOpen, restoredTask, workflowTaskId]);

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const directorBasicForm = useMemo(
    () => patchNovelBasicForm(basicForm, { writingMode: "original", projectMode: "ai_led" }),
    [basicForm],
  );

  useEffect(() => {
    if (!open || idea.trim()) return;
    if (initialIdea?.trim()) {
      setIdea(initialIdea.trim());
      onInitialIdeaConsumed?.();
      return;
    }
    setIdea(buildInitialIdea(directorBasicForm));
  }, [directorBasicForm, idea, initialIdea, onInitialIdeaConsumed, open]);

  // ---------------------------------------------------------------------------
  // T1-T3: Delegate to existing 3 hooks
  // ---------------------------------------------------------------------------

  const taskQuery = useDirectorTaskQuery({
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
  });

  const workflowMutations = useDirectorWorkflowMutations({
    workflowTaskId,
    batches,
    selectedPresets,
    feedback,
    runMode,
    worldSetupMode,
    selectedStyleProfileId,
    selectedStyleSummary: taskQuery.selectedStyleSummary,
    idea,
    directorBasicForm,
    autoExecutionDraft,
    latestBatch: taskQuery.latestBatch,
    directorTask: taskQuery.directorTask,
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
  });

  const candidateMutations = useNovelAutoDirectorCandidateMutations({
    batches,
    selectedPresets,
    feedback,
    workflowTaskId,
    ensureWorkflowTask: workflowMutations.ensureWorkflowTask,
    buildRequestPayload: workflowMutations.buildCandidateRequestPayload,
    applyUpdatedBatch: workflowMutations.applyUpdatedBatch,
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
  });

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const canGenerate = idea.trim().length > 0 && !candidateMutations.generateMutation.isPending;

  const togglePreset = useCallback((preset: DirectorCorrectionPreset) => {
    setSelectedPresets((prev) => toggleDirectorCorrectionPreset(prev, preset));
  }, []);

  const applyTitleOpt = useCallback((batchId: string, candidateId: string, option: { title: string }) => {
    setBatches((prev) => applyDirectorCandidateTitleOption(prev, batchId, candidateId, option));
  }, []);

  const setPatchFb = useCallback((candidateId: string, value: string) => {
    setCandidatePatchFeedbacks((prev) => ({ ...prev, [candidateId]: value }));
  }, []);

  const setTitleFb = useCallback((candidateId: string, value: string) => {
    setTitlePatchFeedbacks((prev) => ({ ...prev, [candidateId]: value }));
  }, []);

  // ---------------------------------------------------------------------------
  // Wizard actions
  // ---------------------------------------------------------------------------

  const handleGenerate = useCallback(() => {
    setCompletedSteps(new Set<AutoDirectorCreateStepKey>(["idea", "basic", "world_style", "model_run"]));
    setActiveStep("candidates");
    candidateMutations.generateMutation.mutate();
  }, [candidateMutations.generateMutation]);

  const handleQuickGenerate = useCallback(() => {
    setCompletedSteps(new Set<AutoDirectorCreateStepKey>(["idea", "basic", "world_style", "model_run"]));
    setActiveStep("candidates");
    candidateMutations.generateMutation.mutate();
  }, [candidateMutations.generateMutation]);

  const handleBackToSettings = useCallback(() => {
    setActiveStep("model_run");
  }, []);

  // T17: Resume auto-jump to candidates
  useEffect(() => {
    if (!open) return;
    if (batches.length > 0 || (taskQuery.directorTask && workflowTaskId)) {
      setCompletedSteps(new Set<AutoDirectorCreateStepKey>(["idea", "basic", "world_style", "model_run"]));
      setActiveStep("candidates");
    }
  }, [open, batches.length, taskQuery.directorTask, workflowTaskId]);

  // T19: QuickPreview backfill
  useEffect(() => {
    if (!open || !initialIdea?.trim() || !idea.trim()) return;
    if (idea.trim() === initialIdea?.trim()) {
      setCompletedSteps((prev) => {
        if (prev.has("idea")) return prev;
        const next = new Set(prev);
        next.add("idea");
        return next;
      });
    }
  }, [open, idea, initialIdea]);

  // ---------------------------------------------------------------------------
  // Dialog handlers
  // ---------------------------------------------------------------------------

  const handleBackgroundContinue = useCallback(() => {
    setOpen(false);
    toast.success("导演任务会继续在后台运行，可在 AI 驾驶舱查看进度。");
  }, []);

  const handleOpenTaskCenter = useCallback(() => {
    setOpen(false);
    navigate(workflowTaskId ? `/tasks?kind=novel_workflow&id=${workflowTaskId}` : "/tasks");
  }, [navigate, workflowTaskId]);

  const handleDialogOpenChange = useCallback((next: boolean) => {
    if (next) {
      if (workflowTaskId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.tasks.detail("novel_workflow", workflowTaskId),
        });
      }
      setOpen(true);
      return;
    }
    if (!taskQuery.isBlockingExecutionView) {
      setOpen(false);
      setActiveStep("idea");
      setCompletedSteps(new Set());
    }
  }, [taskQuery.isBlockingExecutionView, queryClient, workflowTaskId]);

  const preventCloseWhileBlocking = useCallback((event: Event) => {
    if (taskQuery.isBlockingExecutionView) event.preventDefault();
  }, [taskQuery.isBlockingExecutionView]);

  // T18: step bar visibility — hidden when has active task
  const hasActive = taskQuery.hasActiveDirectorTask;
  const showStepBar = !hasActive && dialogMode === "candidate_selection"
    && (activeStep !== "idea" || completedSteps.size > 0);

  return {
    activeStep,
    setActiveStep,
    completedSteps,
    markStepCompleted,
    skipToCandidates: handleQuickGenerate,
    showStepBar,
    open,
    setOpen,
    dialogMode,
    idea,
    setIdea,
    directorBasicForm,
    batches,
    runMode,
    setRunMode,
    worldSetupMode,
    setWorldSetupMode,
    autoExecutionDraft,
    setAutoExecutionDraft,
    autoApprovalDraft,
    selectedStyleProfileId,
    setSelectedStyleProfileId,
    styleProfiles: taskQuery.styleProfiles,
    directorTask: taskQuery.directorTask,
    hasActiveDirectorTask: taskQuery.hasActiveDirectorTask,
    triggerLabel: taskQuery.triggerLabel,
    isBlockingExecutionView: taskQuery.isBlockingExecutionView,
    workflowTaskId,
    ideaInspirations,
    isGeneratingIdeaInspirations: taskQuery.ideaInspirationMutation.isPending,
    generateIdeaInspirations: () => taskQuery.ideaInspirationMutation.mutate(),
    generateMutation: candidateMutations.generateMutation,
    patchCandidateMutation: candidateMutations.patchCandidateMutation,
    refineTitleMutation: candidateMutations.refineTitleMutation,
    selectedPresets,
    feedback,
    setFeedback,
    togglePreset,
    applyCandidateTitleOption: applyTitleOpt,
    candidatePatchFeedbacks,
    setCandidatePatchFeedback: setPatchFb,
    titlePatchFeedbacks,
    setTitlePatchFeedback: setTitleFb,
    confirmMutation: workflowMutations.confirmMutation,
    continueMutation: workflowMutations.continueMutation,
    retryMutation: workflowMutations.retryMutation,
    handleConfirmCandidate: workflowMutations.handleConfirmCandidate,
    handleGenerate,
    handleQuickGenerate,
    handleBackToSettings,
    handleBackgroundContinue,
    handleOpenTaskCenter,
    handleDialogOpenChange,
    preventCloseWhileBlocking,
    resetDialogState,
    canGenerate,
    candidateDialogOpen,
    setCandidateDialogOpen,
    executionError,
    pendingTitleHint,
  };
}
