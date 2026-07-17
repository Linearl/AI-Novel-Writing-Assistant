import type {
  AIFreedom,
  EmotionIntensity,
  NarrativePov,
  Novel,
  PacePreference,
  PipelineJobStatus,
  ProjectMode,
  ProjectProgressStatus,
  StoryPlanLevel,
} from "./novel.js";
import type { LLMProvider } from "./llm.js";
import type { ArtifactSyncMode } from "./novel.js";
import type { BookAnalysisSectionKey } from "./bookAnalysis.js";
import type { NovelWorkflowResumeTarget, NovelWorkflowStage } from "./novelWorkflow.js";
import type { StoryMacroPlan } from "./storyMacro.js";
import type { BookContract, BookContractDraft } from "./novelWorkflow.js";
import type { TitleFactorySuggestion } from "./title.js";
import type { StyleIntentSummary } from "./styleEngine.js";
import type { DirectorAutoApprovalConfig } from "./autoDirectorApproval.js";

export interface DirectorTakeoverPipelineJobSnapshot {
  id: string;
  status: PipelineJobStatus;
  currentStage?: string | null;
  currentItemLabel?: string | null;
  completedCount: number;
  totalCount: number;
  startOrder: number;
  endOrder: number;
}

