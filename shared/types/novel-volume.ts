import { z } from "zod";
import type { BookAnalysisSectionKey } from "./bookAnalysis.js";
import type { BookContract } from "./novelWorkflow.js";
import type { NovelWorkflowCheckpoint } from "./novelWorkflow.js";
import type { NovelStoryMode } from "./storyMode.js";
import type { TaskStatus, TaskTokenUsageSummary } from "./task.js";
import type { TensionLevel } from "./novel.js";
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

export type VolumePlanVersionStatus = "draft" | "active" | "frozen";

export type VolumeGenerationScope =
  | "strategy"
  | "strategy_critique"
  | "skeleton"
  | "beat_sheet"
  | "chapter_list"
  | "chapter_detail"
  | "rebalance";

export type VolumeGenerationScopeInput = VolumeGenerationScope | "book" | "volume";

export type VolumeChapterListGenerationMode = "full_volume" | "single_beat";

export interface VolumeChapterPlan {
  id: string;
  volumeId: string;
  chapterId?: string | null;
  chapterOrder: number;
  beatKey?: string | null;
  title: string;
  summary: string;
  purpose?: string | null;
  tensionLevel?: TensionLevel | null;
  exclusiveEvent?: string | null;
  endingState?: string | null;
  nextChapterEntryState?: string | null;
  conflictLevel?: number | null;
  revealLevel?: number | null;
  targetWordCount?: number | null;
  mustAvoid?: string | null;
  taskSheet?: string | null;
  sceneCards?: string | null;
  styleContract?: string | null;
  payoffRefs: string[];
  createdAt: string;
  updatedAt: string;
}

export type VolumeStrategyPlanningMode = "hard" | "soft";

export type VolumeUncertaintyLevel = "low" | "medium" | "high";

export type VolumeBeatSheetStatus = "not_started" | "generated" | "revised";

export type VolumeCritiqueRiskLevel = "low" | "medium" | "high";

export type VolumeRebalanceSeverity = "low" | "medium" | "high";

export type VolumeRebalanceDirection =
  | "pull_forward"
  | "push_back"
  | "tighten_current"
  | "expand_adjacent"
  | "hold";

export type VolumeUncertaintyTargetType = "book" | "volume" | "beat_sheet" | "chapter_list";

export interface VolumeCountRange {
  min: number;
  max: number;
}

export interface VolumeChapterTargetRange {
  min: number;
  ideal: number;
  max: number;
}

export interface VolumeCountGuidance {
  chapterBudget: number;
  targetChapterRange: VolumeChapterTargetRange;
  allowedVolumeCountRange: VolumeCountRange;
  recommendedVolumeCount: number;
  systemRecommendedVolumeCount: number;
  hardPlannedVolumeRange: VolumeCountRange;
  userPreferredVolumeCount?: number | null;
  respectedExistingVolumeCount?: number | null;
}

export interface VolumeStrategyVolume {
  sortOrder: number;
  planningMode: VolumeStrategyPlanningMode;
  roleLabel: string;
  coreReward: string;
  escalationFocus: string;
  uncertaintyLevel: VolumeUncertaintyLevel;
}

export interface VolumeUncertaintyMarker {
  targetType: VolumeUncertaintyTargetType;
  targetRef: string;
  level: VolumeUncertaintyLevel;
  reason: string;
}

export interface VolumeStrategyPlan {
  recommendedVolumeCount: number;
  hardPlannedVolumeCount: number;
  readerRewardLadder: string;
  escalationLadder: string;
  midpointShift: string;
  notes: string;
  volumes: VolumeStrategyVolume[];
  uncertainties: VolumeUncertaintyMarker[];
  reasoningTraceJson?: string | null;
}

export interface VolumeBeat {
  key: string;
  label: string;
  summary: string;
  chapterSpanHint: string;
  mustDeliver: string[];
  tensionLevel?: TensionLevel;
}

export interface VolumeBeatSheet {
  volumeId: string;
  volumeSortOrder: number;
  status: VolumeBeatSheetStatus;
  beats: VolumeBeat[];
}

export interface VolumeCritiqueIssue {
  targetRef: string;
  severity: VolumeCritiqueRiskLevel;
  title: string;
  detail: string;
}

export interface VolumeCritiqueReport {
  overallRisk: VolumeCritiqueRiskLevel;
  summary: string;
  issues: VolumeCritiqueIssue[];
  recommendedActions: string[];
}

export interface VolumePlanningReadiness {
  canGenerateStrategy: boolean;
  canGenerateSkeleton: boolean;
  canGenerateBeatSheet: boolean;
  canGenerateChapterList: boolean;
  blockingReasons: string[];
}

export interface VolumeRebalanceDecision {
  anchorVolumeId: string;
  affectedVolumeId: string;
  direction: VolumeRebalanceDirection;
  severity: VolumeRebalanceSeverity;
  summary: string;
  actions: string[];
}

export interface VolumePlan {
  id: string;
  novelId: string;
  sortOrder: number;
  title: string;
  summary?: string | null;
  openingHook?: string | null;
  mainPromise?: string | null;
  primaryPressureSource?: string | null;
  coreSellingPoint?: string | null;
  escalationMode?: string | null;
  protagonistChange?: string | null;
  midVolumeRisk?: string | null;
  climax?: string | null;
  payoffType?: string | null;
  nextVolumeHook?: string | null;
  resetPoint?: string | null;
  openPayoffs: string[];
  status: string;
  sourceVersionId?: string | null;
  chapters: VolumeChapterPlan[];
  targetChapterCount?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface VolumePlanVersionSummary {
  id: string;
  novelId: string;
  version: number;
  status: VolumePlanVersionStatus;
  diffSummary?: string | null;
  strategyReasoningTraceJson?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VolumePlanVersion extends VolumePlanVersionSummary {
  contentJson: string;
}

export interface VolumePlanDocument {
  novelId: string;
  workspaceVersion: "v2";
  volumes: VolumePlan[];
  strategyPlan: VolumeStrategyPlan | null;
  critiqueReport: VolumeCritiqueReport | null;
  beatSheets: VolumeBeatSheet[];
  rebalanceDecisions: VolumeRebalanceDecision[];
  readiness: VolumePlanningReadiness;
  derivedOutline: string;
  derivedStructuredOutline: string;
  source: "volume" | "legacy" | "empty";
  activeVersionId: string | null;
}

export interface VolumePlanDiffVolume {
  sortOrder: number;
  title: string;
  changedFields: string[];
  chapterOrders: number[];
}

export interface VolumePlanDiff {
  id: string;
  novelId: string;
  version: number;
  status: VolumePlanVersionStatus;
  diffSummary?: string | null;
  changedLines: number;
  changedVolumeCount: number;
  changedChapterCount: number;
  changedVolumes: VolumePlanDiffVolume[];
  affectedChapterOrders: number[];
}

export interface VolumeImpactResult {
  novelId: string;
  sourceVersion: number | null;
  changedLines: number;
  affectedVolumeCount: number;
  affectedChapterCount: number;
  affectedVolumes: VolumePlanDiffVolume[];
  requiresChapterSync: boolean;
  requiresCharacterReview: boolean;
  recommendedActions: string[];
}

export interface VolumeSyncPreviewItem {
  action: "create" | "update" | "keep" | "delete" | "delete_candidate" | "move";
  volumeTitle: string;
  chapterOrder: number;
  nextTitle: string;
  previousTitle?: string | null;
  hasContent: boolean;
  changedFields: string[];
}

export interface VolumeSyncPreview {
  createCount: number;
  updateCount: number;
  keepCount: number;
  moveCount: number;
  deleteCount: number;
  deleteCandidateCount: number;
  affectedGeneratedCount: number;
  clearContentCount: number;
  affectedVolumeCount: number;
  items: VolumeSyncPreviewItem[];
}

