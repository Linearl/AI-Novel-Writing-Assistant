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
import type { DirectorCandidateBatch, DirectorRunMode, DirectorAutoExecutionPlan, DirectorTaskNotice } from "./novelDirector.js";

export interface DirectorTaskSeedPayloadSnapshot {
  idea?: string;
  batches?: DirectorCandidateBatch[];
  directorCommandResults?: Record<string, unknown>;
  worldId?: string | null;
  worldSetupMode?: "auto_generate" | "skip" | null;
  runMode?: DirectorRunMode;
  autoExecutionPlan?: DirectorAutoExecutionPlan;
  autoApproval?: DirectorAutoApprovalConfig | null;
  styleProfileId?: string | null;
  styleIntentSummary?: StyleIntentSummary | null;
  postGenerationStyleReviewEnabled?: boolean | null;
  taskNotice?: DirectorTaskNotice | null;
}

export interface DirectorTakeoverCheckpointSnapshot {
  checkpointType: "chapter_batch_ready" | "replan_required" | null;
  checkpointSummary?: string | null;
  chapterId?: string | null;
  chapterOrder?: number | null;
  volumeId?: string | null;
}

export interface DirectorTakeoverExecutableRangeSnapshot {
  startOrder: number;
  endOrder: number;
  totalChapterCount: number;
  nextChapterId?: string | null;
  nextChapterOrder?: number | null;
}

