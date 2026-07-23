/**
 * REQ-3022: Shared Core for StageCandidates — extracts the
 * NovelAutoDirectorCandidateBatches rendering pattern and empty-state display.
 *
 * Used by:
 * - autoDirector/StageCandidates.tsx (fullscreen layout)
 * - autoDirectorCreate/StageCandidates.tsx (compact/dialog layout)
 */
import type { ReactNode } from "react";
import type { DirectorCandidate, DirectorCandidateBatch, DirectorCorrectionPreset } from "@ai-novel/shared/types/novelDirector";
import type { TitleFactorySuggestion } from "@ai-novel/shared/types/title";
import NovelAutoDirectorCandidateBatches from "../../NovelAutoDirectorCandidateBatches";

// ── Batches props (passed straight through to NovelAutoDirectorCandidateBatches) ──

export interface StageCandidatesBatchesProps {
  batches: DirectorCandidateBatch[];
  selectedPresets: DirectorCorrectionPreset[];
  feedback: string;
  onFeedbackChange: (value: string) => void;
  onTogglePreset: (preset: DirectorCorrectionPreset) => void;
  candidatePatchFeedbacks: Record<string, string>;
  onCandidatePatchFeedbackChange: (candidateId: string, value: string) => void;
  titlePatchFeedbacks: Record<string, string>;
  onTitlePatchFeedbackChange: (candidateId: string, value: string) => void;
  isGenerating: boolean;
  isPatchingCandidate: boolean;
  isRefiningTitle: boolean;
  isConfirming: boolean;
  onApplyCandidateTitleOption: (batchId: string, candidateId: string, option: TitleFactorySuggestion) => void;
  onPatchCandidate: (batchId: string, candidate: DirectorCandidate, nextFeedback: string) => void;
  onRefineTitle: (batchId: string, candidate: DirectorCandidate, nextFeedback: string) => void;
  onConfirmCandidate: (candidate: DirectorCandidate) => void;
  onGenerateNext: () => void;
}

/**
 * Renders the NovelAutoDirectorCandidateBatches component with standardized
 * prop wiring. Both wrapper variants pass identical batches-related state.
 */
export function renderCandidateBatches(props: StageCandidatesBatchesProps): ReactNode {
  return (
    <NovelAutoDirectorCandidateBatches
      batches={props.batches}
      selectedPresets={props.selectedPresets}
      feedback={props.feedback}
      onFeedbackChange={props.onFeedbackChange}
      onTogglePreset={props.onTogglePreset}
      candidatePatchFeedbacks={props.candidatePatchFeedbacks}
      onCandidatePatchFeedbackChange={props.onCandidatePatchFeedbackChange}
      titlePatchFeedbacks={props.titlePatchFeedbacks}
      onTitlePatchFeedbackChange={props.onTitlePatchFeedbackChange}
      isGenerating={props.isGenerating}
      isPatchingCandidate={props.isPatchingCandidate}
      isRefiningTitle={props.isRefiningTitle}
      isConfirming={props.isConfirming}
      onApplyCandidateTitleOption={props.onApplyCandidateTitleOption}
      onPatchCandidate={props.onPatchCandidate}
      onRefineTitle={props.onRefineTitle}
      onConfirmCandidate={props.onConfirmCandidate}
      onGenerateNext={props.onGenerateNext}
    />
  );
}

// ── Empty state ─────────────────────────────────────────────────────

export interface StageCandidatesEmptyStateProps {
  isGenerating: boolean;
  onGenerateNext: () => void;
  /** Optional back-to-settings button rendered by the wrapper. */
  backButton?: ReactNode;
}

/**
 * Renders the empty/loading state shown when no candidate batches exist.
 */
export function renderCandidateEmptyState(props: StageCandidatesEmptyStateProps): ReactNode {
  const { isGenerating, onGenerateNext, backButton } = props;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">方向候选</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          AI 正在生成方向候选方案，请稍候...
        </p>
      </div>
      <div className="rounded-lg border bg-muted/20 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          {isGenerating ? "正在生成中..." : "还没有方案，请点击下方按钮生成。"}
        </p>
        {!isGenerating ? (
          <button type="button" className="mt-3 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90" onClick={onGenerateNext}>
            重新生成方向
          </button>
        ) : null}
      </div>
      {backButton ? (
        <div className="flex items-center justify-between gap-3 border-t pt-4">
          {backButton}
          <span />
        </div>
      ) : null}
    </div>
  );
}
