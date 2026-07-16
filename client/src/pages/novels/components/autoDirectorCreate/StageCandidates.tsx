import type { AutoDirectorCreateController } from "../useAutoDirectorCreateController";
import type { DirectorCandidate } from "@ai-novel/shared";
import NovelAutoDirectorCandidateBatches from "../NovelAutoDirectorCandidateBatches";
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
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">步骤 5：方向候选</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            AI 正在生成方向候选方案，请稍候...
          </p>
        </div>
        <div className="rounded-lg border bg-muted/20 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {generateMutation.isPending ? "正在生成中..." : "还没有方案，请点击下方按钮生成。"}
          </p>
          {!generateMutation.isPending ? (
            <Button type="button" size="sm" className="mt-3" onClick={handleGenerateNext}>
              重新生成方向
            </Button>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-3 border-t pt-4">
          <Button type="button" variant="outline" size="sm" onClick={handleBackToSettings}>
            回改设置
          </Button>
          <span />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">步骤 5：方向候选</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          选择一套你喜欢的整本书方向，或对某一套方案提出修改意见让 AI 重新生成。
        </p>
      </div>

      <NovelAutoDirectorCandidateBatches
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
        onConfirmCandidate={(candidate: DirectorCandidate) => void handleConfirmCandidate(candidate)}
        onGenerateNext={handleGenerateNext}
      />

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
