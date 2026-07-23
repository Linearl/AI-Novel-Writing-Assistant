import type { AutoDirectorCreateController } from "../useAutoDirectorCreateController";
import type { DirectorCandidate } from "@ai-novel/shared";
import { renderCandidateBatches, renderCandidateEmptyState } from "./shared/StageCandidatesCore";
import { Button } from "@/components/ui/button";

interface StageCandidatesProps {
  controller: Omit<AutoDirectorCreateController,
    | "setActiveStep"
    | "markStepCompleted"
    | "handleGenerate"
    | "handleQuickGenerate"
    | "handleBackToSettings"
    | "resetDialogState"
    | "handleBackgroundContinue"
    | "handleOpenTaskCenter"
    | "handleDialogOpenChange"
    | "preventCloseWhileBlocking"
  > & {
    handleBackToSettings: () => void;
    handleGenerateNext: () => void;
  };
}

export default function StageCandidates({ controller }: StageCandidatesProps) {
  const {
    batches,
    selectedPresets,
    feedback,
    setFeedback,
    togglePreset,
    candidatePatchFeedbacks,
    setCandidatePatchFeedback,
    titlePatchFeedbacks,
    setTitlePatchFeedback,
    generateMutation,
    patchCandidateMutation,
    refineTitleMutation,
    confirmMutation,
    applyCandidateTitleOption,
    handleConfirmCandidate,
    handleGenerateNext,
    handleBackToSettings,
  } = controller;

  const hasBatches = batches.length > 0;

  if (!hasBatches) {
    return renderCandidateEmptyState({
      isGenerating: generateMutation.isPending,
      onGenerateNext: handleGenerateNext,
      backButton: (
        <Button type="button" variant="outline" size="sm" onClick={handleBackToSettings}>
          回改设置
        </Button>
      ),
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">步骤 5：方向候选</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          选择一套你喜欢的整本书方向，或对某一套方案提出修改意见让 AI 重新生成。
        </p>
      </div>

      {renderCandidateBatches({
        batches,
        selectedPresets,
        feedback,
        onFeedbackChange: setFeedback,
        onTogglePreset: togglePreset,
        candidatePatchFeedbacks,
        onCandidatePatchFeedbackChange: setCandidatePatchFeedback,
        titlePatchFeedbacks,
        onTitlePatchFeedbackChange: setTitlePatchFeedback,
        isGenerating: generateMutation.isPending,
        isPatchingCandidate: patchCandidateMutation.isPending,
        isRefiningTitle: refineTitleMutation.isPending,
        isConfirming: confirmMutation.isPending,
        onApplyCandidateTitleOption: applyCandidateTitleOption,
        onPatchCandidate: (batchId, candidate, nextFeedback) =>
          patchCandidateMutation.mutate({ batchId, candidate, feedback: nextFeedback }),
        onRefineTitle: (batchId, candidate, nextFeedback) =>
          refineTitleMutation.mutate({ batchId, candidate, feedback: nextFeedback }),
        onConfirmCandidate: (candidate: DirectorCandidate) => void handleConfirmCandidate(candidate),
        onGenerateNext: handleGenerateNext,
      })}

      <div className="flex items-center justify-between gap-3 border-t pt-4">
        <Button type="button" variant="outline" size="sm" onClick={handleBackToSettings}>
          回改设置
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleGenerateNext} disabled={generateMutation.isPending}>
          重新生成方向
        </Button>
      </div>
    </div>
  );
}
