import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  AppDialogContent,
  Dialog,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { queryKeys } from "@/api/queryKeys";
import type { NovelBasicFormState } from "../novelBasicInfo.shared";
import type { UnifiedTaskDetail } from "@ai-novel/shared";
import DirectorCreateStepBar from "./autoDirectorCreate/DirectorCreateStepBar";
import StageIdea from "./autoDirectorCreate/StageIdea";
import StageBasicSetup from "./autoDirectorCreate/StageBasicSetup";
import StageWorldStyle from "./autoDirectorCreate/StageWorldStyle";
import StageModelRun from "./autoDirectorCreate/StageModelRun";
import StageCandidates from "./autoDirectorCreate/StageCandidates";
import { useAutoDirectorCreateController, CREATE_STEPS } from "./useAutoDirectorCreateController";
import NovelAutoDirectorCandidateSelectionContent from "./NovelAutoDirectorCandidateSelectionContent";
import NovelAutoDirectorCandidateDialog from "./NovelAutoDirectorCandidateDialog";
import {
  NovelAutoDirectorDialogDescription,
  NovelAutoDirectorDialogTitle,
} from "./NovelAutoDirectorDialogHeader";
import NovelAutoDirectorProgressPanel from "./NovelAutoDirectorProgressPanel";
import { RUN_MODE_OPTIONS } from "./NovelAutoDirectorDialog.shared";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";

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
  const queryClient = useQueryClient();

  const controller = useAutoDirectorCreateController({
    basicForm,
    genreOptions,
    worldOptions,
    workflowTaskId: workflowTaskIdProp,
    restoredTask,
    initialOpen,
    initialIdea,
    onWorkflowTaskChange,
    onBasicFormChange,
    onInitialIdeaConsumed,
    onConfirmed,
  });

  const {
    open,
    dialogMode,
    activeStep,
    completedSteps,
    setOpen,
    triggerLabel,
    hasActiveDirectorTask,
    isBlockingExecutionView,
    idea,
    setIdea,
    ideaInspirations,
    isGeneratingIdeaInspirations,
    generateIdeaInspirations,
    runMode,
    setRunMode,
    worldSetupMode,
    setWorldSetupMode,
    autoExecutionDraft,
    setAutoExecutionDraft,
    autoApprovalDraft,
    selectedStyleProfileId,
    setSelectedStyleProfileId,
    styleProfiles,
    directorTask,
    workflowTaskId,
    batches,
    generateMutation,
    patchCandidateMutation,
    refineTitleMutation,
    confirmMutation,
    continueMutation,
    retryMutation,
    selectedPresets,
    feedback,
    setFeedback,
    togglePreset,
    applyCandidateTitleOption,
    candidatePatchFeedbacks,
    setCandidatePatchFeedback,
    titlePatchFeedbacks,
    setTitlePatchFeedback,
    handleConfirmCandidate,
    handleBackgroundContinue,
    handleOpenTaskCenter,
    handleDialogOpenChange,
    preventCloseWhileBlocking,
    handleGenerate,
    handleBackToSettings,
    canGenerate,
    candidateDialogOpen,
    setCandidateDialogOpen,
    executionError,
    pendingTitleHint,
  } = controller;

  // ---------------------------------------------------------------------------
  // Wizard visibility
  // ---------------------------------------------------------------------------

  // Show wizard UI when user has committed beyond step 1 (has completed steps)
  const inWizardMode = completedSteps.size > 0;
  // Step bar visible except: first-time entry (step idea, no completed steps)
  // T18: hide step bar when there's an active director task
  const showStepBar = !hasActiveDirectorTask
    && dialogMode === "candidate_selection"
    && (activeStep !== "idea" || completedSteps.size > 0);

  // Fast path: existing setup panel
  const showFastPath = dialogMode === "candidate_selection" && !inWizardMode;
  // Wizard: stage-based UI
  const showWizard = dialogMode === "candidate_selection" && inWizardMode;
  // Execution: progress panel
  const showProgress = dialogMode === "execution_progress" || dialogMode === "execution_failed";

  // ---------------------------------------------------------------------------
  // Fast path wrappers
  // ---------------------------------------------------------------------------

  const handleGenerateFast = () => controller.handleQuickGenerate();
  const handleReviewCandidates = () => setCandidateDialogOpen(true);

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
          className={`${AUTO_DIRECTOR_MOBILE_CLASSES.dialogContent} ${dialogMode === "candidate_selection" && !inWizardMode ? "lg:max-w-6xl" : "lg:max-w-4xl"}`}
          title={NovelAutoDirectorDialogTitle({ mode: dialogMode })}
          description={NovelAutoDirectorDialogDescription({ mode: dialogMode })}
          bodyClassName={AUTO_DIRECTOR_MOBILE_CLASSES.dialogBody}
          onEscapeKeyDown={preventCloseWhileBlocking}
          onPointerDownOutside={preventCloseWhileBlocking}
          onInteractOutside={preventCloseWhileBlocking}
        >
          {/* Step bar (only in wizard + candidate_selection mode, no active task) */}
          {showStepBar ? (
            <DirectorCreateStepBar
              steps={CREATE_STEPS}
              activeStep={activeStep}
              completedSteps={completedSteps}
              onStepClick={(step) => {
                if (completedSteps.has(step) || step === activeStep) {
                  controller.setActiveStep(step);
                }
              }}
            />
          ) : null}

          {/* Fast Path: existing setup panel (first-time entry) */}
          {showFastPath ? (
            <NovelAutoDirectorCandidateSelectionContent
              basicForm={controller.directorBasicForm}
              genreOptions={genreOptions}
              worldOptions={worldOptions}
              idea={idea}
              onIdeaChange={setIdea}
              ideaInspirations={ideaInspirations}
              isGeneratingIdeaInspirations={isGeneratingIdeaInspirations}
              onGenerateIdeaInspirations={generateIdeaInspirations}
              runMode={runMode}
              runModeOptions={RUN_MODE_OPTIONS}
              onRunModeChange={setRunMode}
              worldSetupMode={worldSetupMode}
              onWorldSetupModeChange={setWorldSetupMode}
              autoExecutionDraft={autoExecutionDraft}
              maxChapterCount={controller.directorBasicForm.estimatedChapterCount}
              onAutoExecutionDraftChange={(patch) => setAutoExecutionDraft((prev) => ({ ...prev, ...patch } as typeof prev))}
              autoApprovalEnabled={autoApprovalDraft.enabled}
              autoApprovalCodes={autoApprovalDraft.codes}
              autoApprovalGroups={autoApprovalDraft.groups}
              autoApprovalPoints={autoApprovalDraft.points}
              onAutoApprovalEnabledChange={autoApprovalDraft.setEnabled}
              onAutoApprovalCodesChange={autoApprovalDraft.setCodes}
              styleProfileOptions={styleProfiles.map((profile) => ({ id: profile.id, name: profile.name }))}
              selectedStyleProfileId={selectedStyleProfileId}
              selectedStyleSummary={null /* fast path doesn't need this in controller yet */}
              onStyleProfileChange={setSelectedStyleProfileId}
              onBasicFormChange={onBasicFormChange}
              canGenerate={canGenerate}
              isGenerating={generateMutation.isPending}
              batchCount={batches.length}
              onGenerate={handleGenerateFast}
              onReviewCandidates={batches.length > 0 ? handleReviewCandidates : undefined}
            />
          ) : null}

          {/* Wizard Mode: stage-based UI */}
          {showWizard ? (
            <>
              {activeStep === "idea" ? (
                <StageIdea controller={controller} />
              ) : null}
              {activeStep === "basic" ? (
                <StageBasicSetup controller={controller} genreOptions={genreOptions} worldOptions={worldOptions} />
              ) : null}
              {activeStep === "world_style" ? (
                <StageWorldStyle controller={controller} worldOptions={worldOptions} onBasicFormChange={onBasicFormChange} />
              ) : null}
              {activeStep === "model_run" ? (
                <StageModelRun controller={controller} onBasicFormChange={onBasicFormChange} />
              ) : null}
              {activeStep === "candidates" ? (
                <StageCandidates
                  controller={{
                    ...controller,
                    handleBackToSettings,
                    handleGenerateNext: handleGenerate,
                  }}
                />
              ) : null}
            </>
          ) : null}

          {/* Progress / Failed */}
          {showProgress ? (
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
          ) : null}
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
        onCandidatePatchFeedbackChange={setCandidatePatchFeedback}
        titlePatchFeedbacks={titlePatchFeedbacks}
        onTitlePatchFeedbackChange={setTitlePatchFeedback}
        isGenerating={generateMutation.isPending}
        isPatchingCandidate={patchCandidateMutation.isPending}
        isRefiningTitle={refineTitleMutation.isPending}
        isConfirming={confirmMutation.isPending}
        onApplyCandidateTitleOption={applyCandidateTitleOption}
        onPatchCandidate={(batchId, candidate, nextFeedback) =>
          patchCandidateMutation.mutate({ batchId, candidate, feedback: nextFeedback })}
        onRefineTitle={(batchId, candidate, nextFeedback) =>
          refineTitleMutation.mutate({ batchId, candidate, feedback: nextFeedback })}
        onConfirmCandidate={handleConfirmCandidate}
        onGenerateNext={() => generateMutation.mutate()}
      />
    </>
  );
}
