import { z } from "zod";
import type { BookAnalysisSectionKey } from "./bookAnalysis.js";
import type { BookContract } from "./novelWorkflow.js";
import type { NovelWorkflowCheckpoint } from "./novelWorkflow.js";
import type { NovelStoryMode } from "./storyMode.js";
import type { TaskStatus, TaskTokenUsageSummary } from "./task.js";
import type { ArtifactSyncMode } from "./novel.js";
export type {
  BaseCharacter,
  Character,
  CharacterCastApplyResult,
  CharacterHardFacts,
  CharacterCastOption,
  CharacterCastOptionClearResult,
  CharacterCastOptionDeleteResult,
  CharacterGender,
  CharacterCastOptionMember,
  CharacterCastOptionRelation,
  CharacterCastRole,
  CharacterCastQualityAssessment,
  CharacterCastQualityIssue,
  CharacterCastQualityIssueCode,
  CharacterVisibleProfileApplyResult,
  CharacterVisibleProfileBatchResult,
  CharacterVisibleProfileField,
  CharacterVisibleProfileFields,
  CharacterVisibleProfileSuggestion,
  CharacterRelation,
  CharacterTimeline,
  CharacterWorldFocusHints,
  SupplementalCharacterApplyResult,
  SupplementalCharacterCandidate,
  SupplementalCharacterGenerateInput,
  SupplementalCharacterGenerationMode,
  SupplementalCharacterGenerationResult,
  SupplementalCharacterRelation,
  SupplementalCharacterTargetCastRole,
} from "./novelCharacter.js";
export type {
  NovelStoryMode,
  StoryModeConflictCeiling,
  StoryModeProfile,
} from "./storyMode.js";
export type {
  ChapterSceneCard,
  ChapterScenePlan,
  LengthBudgetContract,
} from "./chapterLengthControl.js";

export type PipelineRunMode = "fast" | "polish";

export type PipelineRepairMode =
  | "detect_only"
  | "light_repair"
  | "heavy_repair"
  | "continuity_only"
  | "character_only"
  | "ending_only";

export type PipelineJobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface PipelineJob {
  id: string;
  novelId: string;
  startOrder: number;
  endOrder: number;
  runMode?: PipelineRunMode | null;
  autoReview?: boolean | null;
  autoRepair?: boolean | null;
  skipCompleted?: boolean | null;
  qualityThreshold?: number | null;
  repairMode?: PipelineRepairMode | null;
  artifactSyncMode?: ArtifactSyncMode | null;
  status: PipelineJobStatus;
  progress: number;
  completedCount: number;
  totalCount: number;
  retryCount: number;
  maxRetries: number;
  heartbeatAt?: string | null;
  currentStage?: string | null;
  currentItemKey?: string | null;
  currentItemLabel?: string | null;
  cancelRequestedAt?: string | null;
  displayStatus?: string | null;
  noticeCode?: string | null;
  noticeSummary?: string | null;
  qualityAlertDetails?: string[];
  error?: string | null;
  lastErrorType?: string | null;
  payload?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

