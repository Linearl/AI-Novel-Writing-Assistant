import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import type { DirectorCorrectionPreset, UnifiedTaskDetail } from "@ai-novel/shared";
import {
  extractDirectorTaskSeedPayloadFromMeta,
  DIRECTOR_RUN_MODES,
  type DirectorCandidateBatch,
  type DirectorIdeaInspiration,
  type DirectorRunMode,
  type DirectorWorldSetupMode,
} from "@ai-novel/shared";
import { useLLMStore } from "@/store/llmStore";
import { Button } from "@/components/ui/button";
import {
  AppDialogContent,
  Dialog,
} from "@/components/ui/dialog";
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
  RUN_MODE_OPTIONS,
} from "./NovelAutoDirectorDialog.shared";
import NovelAutoDirectorCandidateSelectionContent from "./NovelAutoDirectorCandidateSelectionContent";
import NovelAutoDirectorCandidateDialog from "./NovelAutoDirectorCandidateDialog";
import {
  NovelAutoDirectorDialogDescription,
  NovelAutoDirectorDialogTitle,
} from "./NovelAutoDirectorDialogHeader";
import NovelAutoDirectorProgressPanel from "./NovelAutoDirectorProgressPanel";
import { useDirectorAutoApprovalDraft } from "./useDirectorAutoApprovalDraft";
import {
  applyDirectorCandidateTitleOption,
  toggleDirectorCorrectionPreset,
} from "./directorCandidateSelectionHandlers";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";
import { useNovelAutoDirectorCandidateMutations } from "./useNovelAutoDirectorCandidateMutations";
import { useDirectorWorkflowMutations } from "./useDirectorWorkflowMutations";
import { useDirectorTaskQuery } from "./useDirectorTaskQuery";

interface NovelAutoDirectorDialogProps {
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

export default function NovelAutoDirectorDialog({
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
}: NovelAutoDirectorDialogProps) {
  const navigate = useNavigate();
  const llm = useLLMStore();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // State
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

  const confirmSubmitLockedRef = useRef(false);
  const confirmedTaskHandledRef = useRef<string | null>(null);
  const autoApprovalDraft = useDirectorAutoApprovalDraft(open);
  const { applySnapshot: applyAutoApprovalSnapshot } = autoApprovalDraft;

  // ---------------------------------------------------------------------------
  // resetDialogState (defined early — used by useDirectorTaskQuery)
  // ---------------------------------------------------------------------------

  const resetDialogState = () => {
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
  };

  // ---------------------------------------------------------------------------
  // Prop sync effects
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!workflowTaskIdProp || workflowTaskIdProp === workflowTaskId) {
      return;
    }
    setWorkflowTaskId(workflowTaskIdProp);
  }, [workflowTaskId, workflowTaskIdProp]);

  useEffect(() => {
    if (!initialOpen) {
      return;
    }
    setOpen(true);
  }, [initialOpen]);

  useEffect(() => {
    if (!restoredTask) {
      return;
    }
    const seedPayload = extractDirectorTaskSeedPayloadFromMeta(restoredTask.meta);
    if (restoredTask.id && restoredTask.id !== workflowTaskId) {
      setWorkflowTaskId(restoredTask.id);
    }
    if (seedPayload?.idea?.trim()) {
      setIdea(seedPayload.idea);
    }
    if (Array.isArray(seedPayload?.batches) && seedPayload.batches.length > 0) {
      setBatches(seedPayload.batches);
    }
    if (typeof seedPayload?.runMode === "string" && (DIRECTOR_RUN_MODES as readonly string[]).includes(seedPayload.runMode)) {
      setRunMode(seedPayload.runMode === "stage_review" ? DEFAULT_VISIBLE_RUN_MODE : seedPayload.runMode);
    }
    if (seedPayload?.autoExecutionPlan) {
      setAutoExecutionDraft(normalizeDirectorAutoExecutionDraftState(seedPayload.autoExecutionPlan));
    }
    if (seedPayload?.autoApproval) {
      applyAutoApprovalSnapshot(seedPayload.autoApproval);
    }
    if (typeof seedPayload?.styleProfileId === "string") {
      setSelectedStyleProfileId(seedPayload.styleProfileId);
    }
    if (seedPayload?.worldSetupMode === "skip") {
      setWorldSetupMode("skip");
    } else if (!seedPayload?.worldId) {
      setWorldSetupMode("auto_generate");
    }
    if (initialOpen) {
      setOpen(true);
    }
  }, [applyAutoApprovalSnapshot, initialOpen, restoredTask, workflowTaskId]);

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const directorBasicForm = useMemo(
    () => patchNovelBasicForm(basicForm, {
      writingMode: "original",
      projectMode: "ai_led",
    }),
    [basicForm],
  );

  // Idea seeding on open
  useEffect(() => {
    if (!open || idea.trim()) {
      return;
    }
    if (initialIdea?.trim()) {
      setIdea(initialIdea.trim());
      onInitialIdeaConsumed?.();
      return;
    }
    setIdea(buildInitialIdea(directorBasicForm));
  }, [directorBasicForm, idea, initialIdea, onInitialIdeaConsumed, open]);

  // ---------------------------------------------------------------------------
  // Read-side queries & derived state (useDirectorTaskQuery)
  // ---------------------------------------------------------------------------

  const {
    styleProfiles,
    selectedStyleSummary,
    ideaInspirationMutation,
    directorTask,
    latestBatch,
    hasActiveDirectorTask,
    triggerLabel,
    isBlockingExecutionView,
  } = useDirectorTaskQuery({
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

  // ---------------------------------------------------------------------------
  // Write-side mutations (useDirectorWorkflowMutations)
  // ---------------------------------------------------------------------------

  const {
    ensureWorkflowTask,
    applyUpdatedBatch,
    buildCandidateRequestPayload,
    confirmMutation,
    continueMutation,
    retryMutation,
    handleConfirmCandidate,
  } = useDirectorWorkflowMutations({
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
  });

  // Candidate mutations (generate / patch / refine)
  const {
    generateMutation,
    patchCandidateMutation,
    refineTitleMutation,
  } = useNovelAutoDirectorCandidateMutations({
    batches,
    selectedPresets,
    feedback,
    workflowTaskId,
    ensureWorkflowTask,
    buildRequestPayload: buildCandidateRequestPayload,
    applyUpdatedBatch,
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

  const canGenerate = idea.trim().length > 0 && !generateMutation.isPending;

  // ---------------------------------------------------------------------------
  // Small utilities
  // ---------------------------------------------------------------------------

  const togglePreset = (preset: DirectorCorrectionPreset) => {
    setSelectedPresets((prev) => toggleDirectorCorrectionPreset(prev, preset));
  };

  const applyCandidateTitleOption = (batchId: string, candidateId: string, option: { title: string }) => {
    setBatches((prev) => applyDirectorCandidateTitleOption(prev, batchId, candidateId, option));
  };

  // ---------------------------------------------------------------------------
  // Dialog handlers
  // ---------------------------------------------------------------------------

  const handleBackgroundContinue = () => {
    setOpen(false);
    toast.success("导演任务会继续在后台运行，可在 AI 驾驶舱查看进度。");
  };

  const handleOpenTaskCenter = () => {
    setOpen(false);
    navigate(workflowTaskId ? `/tasks?kind=novel_workflow&id=${workflowTaskId}` : "/tasks");
  };

  const handleDialogOpenChange = (next: boolean) => {
    if (next) {
      if (workflowTaskId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.tasks.detail("novel_workflow", workflowTaskId),
        });
      }
      setOpen(true);
      return;
    }
    if (!isBlockingExecutionView) setOpen(false);
  };

  const preventCloseWhileBlocking = (event: Event) => {
    if (isBlockingExecutionView) event.preventDefault();
  };

  // ---------------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------------

  return (
    <>
      <div className="flex items-center justify-end">
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          {triggerLabel}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <AppDialogContent
          className={`${AUTO_DIRECTOR_MOBILE_CLASSES.dialogContent} ${dialogMode === "candidate_selection" ? "lg:max-w-6xl" : "lg:max-w-4xl"}`}
          title={NovelAutoDirectorDialogTitle({ mode: dialogMode })}
          description={NovelAutoDirectorDialogDescription({ mode: dialogMode })}
          bodyClassName={AUTO_DIRECTOR_MOBILE_CLASSES.dialogBody}
          onEscapeKeyDown={preventCloseWhileBlocking}
          onPointerDownOutside={preventCloseWhileBlocking}
          onInteractOutside={preventCloseWhileBlocking}
        >
            {dialogMode === "candidate_selection" ? (
              <NovelAutoDirectorCandidateSelectionContent
                basicForm={directorBasicForm}
                genreOptions={genreOptions}
                worldOptions={worldOptions}
                idea={idea}
                onIdeaChange={setIdea}
                ideaInspirations={ideaInspirations}
                isGeneratingIdeaInspirations={ideaInspirationMutation.isPending}
                onGenerateIdeaInspirations={() => ideaInspirationMutation.mutate()}
                runMode={runMode}
                runModeOptions={RUN_MODE_OPTIONS}
                onRunModeChange={setRunMode}
                worldSetupMode={worldSetupMode}
                onWorldSetupModeChange={setWorldSetupMode}
                autoExecutionDraft={autoExecutionDraft}
                maxChapterCount={directorBasicForm.estimatedChapterCount}
                onAutoExecutionDraftChange={(patch) => setAutoExecutionDraft((prev) => ({ ...prev, ...patch }))}
                autoApprovalEnabled={autoApprovalDraft.enabled}
                autoApprovalCodes={autoApprovalDraft.codes}
                autoApprovalGroups={autoApprovalDraft.groups}
                autoApprovalPoints={autoApprovalDraft.points}
                onAutoApprovalEnabledChange={autoApprovalDraft.setEnabled}
                onAutoApprovalCodesChange={autoApprovalDraft.setCodes}
                styleProfileOptions={styleProfiles.map((profile) => ({ id: profile.id, name: profile.name }))}
                selectedStyleProfileId={selectedStyleProfileId}
                selectedStyleSummary={selectedStyleSummary}
                onStyleProfileChange={setSelectedStyleProfileId}
                onBasicFormChange={onBasicFormChange}
                canGenerate={canGenerate}
                isGenerating={generateMutation.isPending}
                batchCount={batches.length}
                onGenerate={() => generateMutation.mutate()}
                onReviewCandidates={() => setCandidateDialogOpen(true)}
              />
            ) : (
              <NovelAutoDirectorProgressPanel
                mode={dialogMode}
                task={directorTask}
                taskId={workflowTaskId}
                titleHint={pendingTitleHint}
                fallbackError={executionError}
                onBackgroundContinue={handleBackgroundContinue}
                onConfirmAndContinue={() => continueMutation.mutate()}
                isConfirmingAndContinuing={continueMutation.isPending}
                onOpenTaskCenter={handleOpenTaskCenter}
                onRetry={() => retryMutation.mutate(false)}
                onRetryWithResume={() => retryMutation.mutate(true)}
                retryPending={retryMutation.isPending}
              />
          )}
        </AppDialogContent>
      </Dialog>
      <NovelAutoDirectorCandidateDialog
        open={open && dialogMode === "candidate_selection" && candidateDialogOpen}
        onOpenChange={setCandidateDialogOpen}
        batches={batches}
        selectedPresets={selectedPresets}
        feedback={feedback}
        onFeedbackChange={setFeedback}
        onTogglePreset={togglePreset}
        candidatePatchFeedbacks={candidatePatchFeedbacks}
        onCandidatePatchFeedbackChange={(candidateId, value) => setCandidatePatchFeedbacks((prev) => ({
          ...prev,
          [candidateId]: value,
        }))}
        titlePatchFeedbacks={titlePatchFeedbacks}
        onTitlePatchFeedbackChange={(candidateId, value) => setTitlePatchFeedbacks((prev) => ({
          ...prev,
          [candidateId]: value,
        }))}
        isGenerating={generateMutation.isPending}
        isPatchingCandidate={patchCandidateMutation.isPending}
        isRefiningTitle={refineTitleMutation.isPending}
        isConfirming={confirmMutation.isPending}
        onApplyCandidateTitleOption={applyCandidateTitleOption}
        onPatchCandidate={(batchId, candidate, nextFeedback) => patchCandidateMutation.mutate({
          batchId,
          candidate,
          feedback: nextFeedback,
        })}
        onRefineTitle={(batchId, candidate, nextFeedback) => refineTitleMutation.mutate({
          batchId,
          candidate,
          feedback: nextFeedback,
        })}
        onConfirmCandidate={handleConfirmCandidate}
        onGenerateNext={() => generateMutation.mutate()}
      />
    </>
  );
}
