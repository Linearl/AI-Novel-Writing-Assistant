import { z } from "zod";
import type { BookAnalysisSectionKey } from "./bookAnalysis.js";
import type { BookContract } from "./novelWorkflow.js";
import type { NovelWorkflowCheckpoint } from "./novelWorkflow.js";
import type { NovelStoryMode } from "./storyMode.js";
import type { TaskStatus, TaskTokenUsageSummary } from "./task.js";
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

export type AuditType = "continuity" | "character" | "plot" | "mode_fit" | "vocabulary";

export type AuditIssueStatus = "open" | "resolved" | "ignored";

export interface AuditIssue {
  id: string;
  reportId: string;
  auditType: AuditType;
  severity: "low" | "medium" | "high" | "critical";
  code: string;
  description: string;
  evidence: string;
  fixSuggestion: string;
  status: AuditIssueStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AuditReport {
  id: string;
  novelId: string;
  chapterId: string;
  auditType: AuditType;
  overallScore?: number | null;
  summary?: string | null;
  legacyScoreJson?: string | null;
  issues: AuditIssue[];
  createdAt: string;
  updatedAt: string;
}

