import { z } from "zod";
import type { BookAnalysisSectionKey } from "./bookAnalysis.js";
import type { BookContract } from "./novelWorkflow.js";
import type { NovelWorkflowCheckpoint } from "./novelWorkflow.js";
import type { NovelStoryMode } from "./storyMode.js";
import type { TaskStatus, TaskTokenUsageSummary } from "./task.js";
import type { ChapterRole, ChapterPlanScene } from "./novel-chapter.js";
import type { VolumePlan } from "./novel-volume.js";
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

export type NovelStatus = "draft" | "published";

export type NovelWritingMode = "original" | "continuation";

export type ProjectMode = "ai_led" | "co_pilot" | "draft_mode" | "auto_pipeline";

export type NarrativePov = "first_person" | "third_person" | "mixed";

export type PacePreference = "slow" | "balanced" | "fast";

export type EmotionIntensity = "low" | "medium" | "high";

export type AIFreedom = "low" | "medium" | "high";

export type ProjectProgressStatus = "not_started" | "in_progress" | "completed" | "rework" | "blocked";

export const novelStatusSchema = z.enum(["draft", "published"]);

export const novelWritingModeSchema = z.enum(["original", "continuation"]);

export const projectModeSchema = z.enum(["ai_led", "co_pilot", "draft_mode", "auto_pipeline"]);

export const narrativePovSchema = z.enum(["first_person", "third_person", "mixed"]);

export const pacePreferenceSchema = z.enum(["slow", "balanced", "fast"]);

export const emotionIntensitySchema = z.enum(["low", "medium", "high"]);

export const aiFreedomSchema = z.enum(["low", "medium", "high"]);

export const projectProgressStatusSchema = z.enum(["not_started", "in_progress", "completed", "rework", "blocked"]);

export const chapterRoleSchema = z.enum(["normal", "transition", "climax", "turning_point"]);

export const tensionLevelSchema = z.enum(["low", "medium", "high", "climax"]);

export const chapterStatusSchema = z.enum(["unplanned", "pending_generation", "generating", "pending_review", "needs_repair", "completed"]);

export const storyPlanLevelSchema = z.enum(["book", "arc", "chapter"]);

export const volumeGenerationScopeSchema = z.enum(["strategy", "strategy_critique", "skeleton", "beat_sheet", "chapter_list", "chapter_detail", "rebalance"]);

export const volumeGenerationScopeInputSchema = z.enum(["strategy", "strategy_critique", "skeleton", "beat_sheet", "chapter_list", "chapter_detail", "rebalance", "book", "volume"]);

export const storylineVersionStatusSchema = z.enum(["draft", "active", "frozen"]);

export const volumePlanVersionStatusSchema = z.enum(["draft", "active", "frozen"]);

export const pipelineRunModeSchema = z.enum(["fast", "polish"]);

export const artifactSyncModeSchema = z.enum(["adaptive", "deferred", "strict"]);

export const pipelineRepairModeSchema = z.enum(["detect_only", "light_repair", "heavy_repair", "continuity_only", "character_only", "ending_only"]);

export type StorylineVersionStatus = "draft" | "active" | "frozen";

export type StoryPlanLevel = "book" | "arc" | "chapter";

export type StoryPlanRole = "setup" | "progress" | "pressure" | "turn" | "payoff" | "cooldown";

export type TensionLevel = "low" | "medium" | "high" | "climax";

export const TENSION_LEVEL_LABELS: Record<TensionLevel, string> = {
  low: "低张力",
  medium: "中张力",
  high: "高张力",
  climax: "高潮",
};

export const CHAPTER_ROLE_LABELS: Record<ChapterRole, string> = {
  normal: "普通章",
  transition: "过渡章",
  climax: "高潮章",
  turning_point: "转折章",
};

export interface WordCountTarget {
  min: number;
  max: number;
  role: ChapterRole;
}

export interface WaterContentAnalysis {
  score: number;
  flagged: boolean;
  analyzedAt?: string;
}

export type ArtifactSyncMode = "adaptive" | "deferred" | "strict";

export interface NovelAutoDirectorTaskSummary {
  id: string;
  status: TaskStatus;
  pendingManualRecovery?: boolean;
  progress: number;
  currentStage?: string | null;
  currentItemLabel?: string | null;
  executionScopeLabel?: string | null;
  displayStatus?: string | null;
  blockingReason?: string | null;
  resumeAction?: string | null;
  lastHealthyStage?: string | null;
  checkpointType?: NovelWorkflowCheckpoint | null;
  checkpointSummary?: string | null;
  nextActionLabel?: string | null;
  updatedAt: string;
}

export type ModelRouteTaskType =
  | "planner"
  | "writer"
  | "review"
  | "light_review"
  | "critical_review"
  | "repair"
  | "replan"
  | "state_resolution"
  | "summary"
  | "fact_extraction"
  | "chat";

export interface Novel {
  id: string;
  title: string;
  description?: string | null;
  targetAudience?: string | null;
  bookSellingPoint?: string | null;
  competingFeel?: string | null;
  first30ChapterPromise?: string | null;
  commercialTags: string[];
  status: NovelStatus;
  writingMode: NovelWritingMode;
  projectMode?: ProjectMode | null;
  narrativePov?: NarrativePov | null;
  pacePreference?: PacePreference | null;
  styleTone?: string | null;
  emotionIntensity?: EmotionIntensity | null;
  aiFreedom?: AIFreedom | null;
  postGenerationStyleReviewEnabled: boolean;
  defaultChapterLength?: number | null;
  estimatedChapterCount?: number | null;
  projectStatus?: ProjectProgressStatus | null;
  storylineStatus?: ProjectProgressStatus | null;
  outlineStatus?: ProjectProgressStatus | null;
  resourceReadyScore?: number | null;
  sourceNovelId?: string | null;
  sourceKnowledgeDocumentId?: string | null;
  continuationBookAnalysisId?: string | null;
  continuationBookAnalysisSections?: BookAnalysisSectionKey[] | null;
  outline?: string | null;
  structuredOutline?: string | null;
  volumes?: VolumePlan[];
  volumeSource?: "volume" | "legacy" | "empty";
  activeVolumeVersionId?: string | null;
  bookContract?: BookContract | null;
  genreId?: string | null;
  primaryStoryModeId?: string | null;
  secondaryStoryModeId?: string | null;
  worldId?: string | null;
  baseWordCountMin: number;
  baseWordCountMax: number;
  waterContentThreshold: number;
  tokenUsage?: TaskTokenUsageSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface NovelGenre {
  id: string;
  name: string;
  description?: string | null;
  template?: string | null;
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TitleSuggestion {
  title: string;
  clickRate: number;
  style: "literary" | "conflict";
}

export interface StructuredOutlineVolume {
  volumeTitle: string;
  chapters: Array<{
    order: number;
    title: string;
    summary: string;
  }>;
}

export interface QualityScore {
  coherence: number;
  repetition: number;
  pacing: number;
  voice: number;
  engagement: number;
  overall: number;
}

export interface ReviewIssue {
  severity: "low" | "medium" | "high" | "critical";
  category: "coherence" | "repetition" | "pacing" | "voice" | "engagement" | "logic";
  evidence: string;
  fixSuggestion: string;
}

export const reviewIssueSchema = z.object({
  severity: z.enum(["low", "medium", "high", "critical"]),
  category: z.enum(["coherence", "repetition", "pacing", "voice", "engagement", "logic"]),
  evidence: z.string(),
  fixSuggestion: z.string(),
});

export interface CharacterState {
  id: string;
  snapshotId: string;
  characterId: string;
  currentGoal?: string | null;
  emotion?: string | null;
  stressLevel?: number | null;
  secretExposure?: string | null;
  knownFactsJson?: string | null;
  misbeliefsJson?: string | null;
  summary?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RelationState {
  id: string;
  snapshotId: string;
  sourceCharacterId: string;
  targetCharacterId: string;
  trustScore?: number | null;
  intimacyScore?: number | null;
  conflictScore?: number | null;
  dependencyScore?: number | null;
  summary?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InformationState {
  id: string;
  snapshotId: string;
  holderType: string;
  holderRefId?: string | null;
  fact: string;
  status: string;
  summary?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ForeshadowState {
  id: string;
  snapshotId: string;
  title: string;
  summary?: string | null;
  status: string;
  setupChapterId?: string | null;
  payoffChapterId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoryStateSnapshot {
  id: string;
  novelId: string;
  sourceChapterId?: string | null;
  summary?: string | null;
  rawStateJson?: string | null;
  characterStates: CharacterState[];
  relationStates: RelationState[];
  informationStates: InformationState[];
  foreshadowStates: ForeshadowState[];
  createdAt: string;
  updatedAt: string;
}

export interface OpenConflict {
  id: string;
  novelId: string;
  chapterId?: string | null;
  sourceSnapshotId?: string | null;
  sourceIssueId?: string | null;
  sourceType: string;
  conflictType: string;
  conflictKey: string;
  title: string;
  summary: string;
  severity: string;
  status: string;
  evidenceJson?: string | null;
  resolutionHint?: string | null;
  lastSeenChapterOrder?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface NovelBible {
  id: string;
  novelId: string;
  coreSetting?: string | null;
  forbiddenRules?: string | null;
  mainPromise?: string | null;
  characterArcs?: string | null;
  worldRules?: string | null;
  rawContent?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlotBeat {
  id: string;
  novelId: string;
  chapterOrder?: number | null;
  beatType: string;
  title: string;
  content: string;
  status: "planned" | "completed" | "skipped";
  metadata?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConsistencyFact {
  id: string;
  novelId: string;
  chapterId?: string | null;
  category: "world" | "character" | "timeline" | "plot" | "rule";
  content: string;
  source?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StorylineVersion {
  id: string;
  novelId: string;
  version: number;
  status: StorylineVersionStatus;
  content: string;
  diffSummary?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StorylineDiff {
  id: string;
  novelId: string;
  version: number;
  status: StorylineVersionStatus;
  diffSummary?: string | null;
  changedLines: number;
  affectedCharacters: number;
  affectedChapters: number;
}

export interface CreativeDecision {
  id: string;
  novelId: string;
  chapterId?: string | null;
  category: string;
  content: string;
  importance: string;
  expiresAt?: number | null;
  sourceType?: string | null;
  sourceRefId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NovelSnapshot {
  id: string;
  novelId: string;
  label?: string | null;
  snapshotData: string;
  triggerType: "manual" | "auto_milestone" | "before_pipeline";
  createdAt: string;
}

export type NovelSnapshotListItem = Omit<NovelSnapshot, "snapshotData">;

export interface StoryPlan {
  id: string;
  novelId: string;
  chapterId?: string | null;
  parentId?: string | null;
  sourceStateSnapshotId?: string | null;
  level: StoryPlanLevel;
  planRole?: StoryPlanRole | null;
  phaseLabel?: string | null;
  title: string;
  objective: string;
  participantsJson?: string | null;
  revealsJson?: string | null;
  riskNotesJson?: string | null;
  mustAdvanceJson?: string | null;
  mustPreserveJson?: string | null;
  replannedFromPlanId?: string | null;
  hookTarget?: string | null;
  status: string;
  externalRef?: string | null;
  rawPlanJson?: string | null;
  scenes: ChapterPlanScene[];
  createdAt: string;
  updatedAt: string;
}

export interface ReplanResult {
  primaryPlan: StoryPlan;
  generatedPlans: StoryPlan[];
  affectedChapterIds: string[];
  affectedChapterOrders: number[];
  anchorChapterOrder?: number | null;
  sourceIssueIds: string[];
  triggerType: string;
  reason: string;
  triggerReason?: string;
  windowReason?: string;
  whyTheseChapters?: string;
  windowSize: number;
  blockingLedgerKeys?: string[];
  run: {
    id: string;
    outputSummary?: string | null;
    createdAt: string;
  } | null;
}

export const volumeStrategyVolumeSchema = z.object({
  sortOrder: z.number().int(),
  planningMode: z.enum(["hard", "soft"]),
  roleLabel: z.string(),
  coreReward: z.string(),
  escalationFocus: z.string(),
  uncertaintyLevel: z.enum(["low", "medium", "high"]),
});

export const volumeUncertaintyMarkerSchema = z.object({
  targetType: z.enum(["book", "volume", "beat_sheet", "chapter_list"]),
  targetRef: z.string(),
  level: z.enum(["low", "medium", "high"]),
  reason: z.string(),
});

export const volumeStrategyPlanSchema = z.object({
  recommendedVolumeCount: z.number().int(),
  hardPlannedVolumeCount: z.number().int(),
  readerRewardLadder: z.string(),
  escalationLadder: z.string(),
  midpointShift: z.string(),
  notes: z.string(),
  volumes: z.array(volumeStrategyVolumeSchema),
  uncertainties: z.array(volumeUncertaintyMarkerSchema),
});

export const volumeBeatSchema = z.object({
  key: z.string(),
  label: z.string(),
  summary: z.string(),
  chapterSpanHint: z.string(),
  mustDeliver: z.array(z.string()),
  tensionLevel: tensionLevelSchema.optional(),
});

export const volumeBeatSheetSchema = z.object({
  volumeId: z.string(),
  volumeSortOrder: z.number().int(),
  status: z.enum(["not_started", "generated", "revised"]),
  beats: z.array(volumeBeatSchema),
});

export const volumeCritiqueIssueSchema = z.object({
  targetRef: z.string(),
  severity: z.enum(["low", "medium", "high"]),
  title: z.string(),
  detail: z.string(),
});

export const volumeCritiqueReportSchema = z.object({
  overallRisk: z.enum(["low", "medium", "high"]),
  summary: z.string(),
  issues: z.array(volumeCritiqueIssueSchema),
  recommendedActions: z.array(z.string()),
});

export const volumeRebalanceDecisionSchema = z.object({
  anchorVolumeId: z.string(),
  affectedVolumeId: z.string(),
  direction: z.enum(["pull_forward", "push_back", "tighten_current", "expand_adjacent", "hold"]),
  severity: z.enum(["low", "medium", "high"]),
  summary: z.string(),
  actions: z.array(z.string()),
});

export interface PaceCurveChapter {
  chapterOrder: number;
  title: string;
  conflictLevel: number | null;
  revealLevel: number | null;
  isWritten: boolean;
  chapterId: string | null;
  volumeId: string;
}

export interface PaceCurveVolume {
  volumeId: string;
  volumeTitle: string;
  sortOrder: number;
  chapters: PaceCurveChapter[];
}

export interface PaceCurveData {
  novelId: string;
  volumes: PaceCurveVolume[];
}

export interface ReplanRecommendation {
  recommended: boolean;
  action?: "continue_with_warning" | "local_patch_plan" | "stop_for_replan";
  reason: string;
  blockingIssueIds: string[];
  blockingLedgerKeys?: string[];
  affectedChapterOrders?: number[];
  anchorChapterOrder?: number | null;
  triggerReason?: string;
  windowReason?: string;
  whyTheseChapters?: string;
}

export interface ModelRouteConfig {
  taskType: ModelRouteTaskType;
  provider: string;
  model: string;
  temperature: number;
  maxTokens?: number | null;
  contextWindow?: number | null;
  requestProtocol?: ModelRouteRequestProtocol;
  structuredResponseFormat?: ModelRouteStructuredResponseFormat;
}

export const MODEL_ROUTE_REQUEST_PROTOCOLS = [
  "auto",
  "openai_compatible",
  "anthropic",
] as const;

export type ModelRouteRequestProtocol = typeof MODEL_ROUTE_REQUEST_PROTOCOLS[number];

export const MODEL_ROUTE_STRUCTURED_RESPONSE_FORMATS = [
  "auto",
  "json_schema",
  "json_object",
  "prompt_json",
] as const;

export type ModelRouteStructuredResponseFormat = typeof MODEL_ROUTE_STRUCTURED_RESPONSE_FORMATS[number];


export type * from "./novel-chapter.js";
export type * from "./novel-volume.js";
export type * from "./novel-pipeline.js";
export type * from "./novel-audit.js";
