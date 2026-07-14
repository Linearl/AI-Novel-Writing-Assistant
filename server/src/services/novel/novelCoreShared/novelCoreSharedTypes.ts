/**
 * Types, interfaces, and constants for novel core operations.
 *
 * Extracted from the original novelCoreShared.ts to reduce file size
 * and improve module cohesion. The facade index.ts re-exports everything.
 */
import type { BookAnalysisSectionKey } from "@ai-novel/shared";
import type { LLMProvider } from "@ai-novel/shared";
import type { QualityScore, ReviewIssue } from "@ai-novel/shared";
import type { NovelControlPolicy } from "@ai-novel/shared";

// ─── Input Types ────────────────────────────────────────────────────────────

export interface PaginationInput {
  page: number;
  limit: number;
}

export interface CreateNovelInput {
  title: string;
  description?: string;
  targetAudience?: string;
  bookSellingPoint?: string;
  competingFeel?: string;
  first30ChapterPromise?: string;
  commercialTags?: string[];
  genreId?: string;
  primaryStoryModeId?: string;
  secondaryStoryModeId?: string;
  worldId?: string;
  writingMode?: "original" | "continuation";
  projectMode?: "ai_led" | "co_pilot" | "draft_mode" | "auto_pipeline";
  narrativePov?: "first_person" | "third_person" | "mixed";
  pacePreference?: "slow" | "balanced" | "fast";
  styleTone?: string;
  emotionIntensity?: "low" | "medium" | "high";
  aiFreedom?: "low" | "medium" | "high";
  postGenerationStyleReviewEnabled?: boolean;
  defaultChapterLength?: number;
  estimatedChapterCount?: number;
  projectStatus?: "not_started" | "in_progress" | "completed" | "rework" | "blocked";
  storylineStatus?: "not_started" | "in_progress" | "completed" | "rework" | "blocked";
  outlineStatus?: "not_started" | "in_progress" | "completed" | "rework" | "blocked";
  resourceReadyScore?: number;
  sourceNovelId?: string | null;
  sourceKnowledgeDocumentId?: string | null;
  continuationBookAnalysisId?: string | null;
  continuationBookAnalysisSections?: BookAnalysisSectionKey[] | null;
  outline?: string;
}

export interface UpdateNovelInput {
  title?: string;
  description?: string;
  targetAudience?: string | null;
  bookSellingPoint?: string | null;
  competingFeel?: string | null;
  first30ChapterPromise?: string | null;
  commercialTags?: string[] | null;
  status?: "draft" | "published";
  writingMode?: "original" | "continuation";
  projectMode?: "ai_led" | "co_pilot" | "draft_mode" | "auto_pipeline" | null;
  narrativePov?: "first_person" | "third_person" | "mixed" | null;
  pacePreference?: "slow" | "balanced" | "fast" | null;
  styleTone?: string | null;
  emotionIntensity?: "low" | "medium" | "high" | null;
  aiFreedom?: "low" | "medium" | "high" | null;
  postGenerationStyleReviewEnabled?: boolean;
  defaultChapterLength?: number | null;
  estimatedChapterCount?: number | null;
  projectStatus?: "not_started" | "in_progress" | "completed" | "rework" | "blocked" | null;
  storylineStatus?: "not_started" | "in_progress" | "completed" | "rework" | "blocked" | null;
  outlineStatus?: "not_started" | "in_progress" | "completed" | "rework" | "blocked" | null;
  resourceReadyScore?: number | null;
  sourceNovelId?: string | null;
  sourceKnowledgeDocumentId?: string | null;
  continuationBookAnalysisId?: string | null;
  continuationBookAnalysisSections?: BookAnalysisSectionKey[] | null;
  genreId?: string | null;
  primaryStoryModeId?: string | null;
  secondaryStoryModeId?: string | null;
  worldId?: string | null;
  outline?: string | null;
  structuredOutline?: string | null;
  payoffExpiryThreshold?: number | null;
}

export interface ChapterInput {
  title: string;
  order: number;
  content?: string;
  expectation?: string;
  chapterStatus?: "unplanned" | "pending_generation" | "generating" | "pending_review" | "needs_repair" | "completed";
  tensionLevel?: "low" | "medium" | "high" | "climax" | null;
  targetWordCount?: number | null;
  conflictLevel?: number | null;
  revealLevel?: number | null;
  mustAvoid?: string | null;
  taskSheet?: string | null;
  sceneCards?: string | null;
  repairHistory?: string | null;
  qualityScore?: number | null;
  continuityScore?: number | null;
  characterScore?: number | null;
  pacingScore?: number | null;
  riskFlags?: string | null;
}

export interface CharacterInput {
  name: string;
  role: string;
  gender?: "male" | "female" | "other" | "unknown";
  castRole?: string;
  tier?: "lead" | "major" | "named" | "extra";
  storyFunction?: string;
  relationToProtagonist?: string;
  personality?: string;
  background?: string;
  development?: string;
  identityLabel?: string;
  factionLabel?: string;
  stanceLabel?: string;
  powerLevel?: string;
  realm?: string;
  currentLocation?: string;
  availability?: string;
  prohibitions?: string[];
  outerGoal?: string;
  innerNeed?: string;
  fear?: string;
  wound?: string;
  misbelief?: string;
  secret?: string;
  moralLine?: string;
  firstImpression?: string;
  appearance?: string;
  physique?: string;
  attireStyle?: string;
  signatureDetail?: string;
  voiceTexture?: string;
  presenceImpression?: string;
  arcStart?: string;
  arcMidpoint?: string;
  arcClimax?: string;
  arcEnd?: string;
  currentState?: string;
  currentGoal?: string;
  baseCharacterId?: string;
}

// ─── LLM Options ────────────────────────────────────────────────────────────

export interface LLMGenerateOptions {
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface OutlineGenerateOptions extends LLMGenerateOptions {
  initialPrompt?: string;
}

export interface StructuredOutlineGenerateOptions extends LLMGenerateOptions {
  totalChapters?: number;
}

export interface ChapterGenerateOptions extends LLMGenerateOptions {
  previousChaptersSummary?: string[];
}

export interface GenerateBeatOptions extends LLMGenerateOptions {
  targetChapters?: number;
}

export interface TitleGenerateOptions extends LLMGenerateOptions {
  count?: number;
}

export interface PipelineRunOptions extends LLMGenerateOptions {
  startOrder: number;
  endOrder: number;
  controlPolicy?: NovelControlPolicy;
  workflowTaskId?: string;
  taskStyleProfileId?: string;
  maxRetries?: number;
  runMode?: "fast" | "polish";
  autoReview?: boolean;
  autoRepair?: boolean;
  skipCompleted?: boolean;
  qualityThreshold?: number;
  repairMode?: "detect_only" | "light_repair" | "heavy_repair" | "continuity_only" | "character_only" | "ending_only";
  artifactSyncMode?: ArtifactSyncMode;
  pipelineMode?: "batch" | "pipeline";
}

// ─── Pipeline Types ──────────────────────────────────────────────────────────

export type PipelineBackgroundSyncKind = "artifact_delta" | "character_dynamics" | "state_snapshot" | "payoff_ledger" | "character_resources" | "canonical_state";
export type ArtifactSyncMode = "adaptive" | "deferred" | "strict";

export type PipelineBackgroundSyncStatus = "running" | "failed";

export interface PipelineBackgroundSyncActivity {
  kind: PipelineBackgroundSyncKind;
  status: PipelineBackgroundSyncStatus;
  chapterId: string;
  chapterOrder?: number;
  chapterTitle?: string;
  updatedAt: string;
  error?: string | null;
}

export interface PipelineBackgroundSyncState {
  activities?: PipelineBackgroundSyncActivity[];
}

export interface PipelinePayload extends LLMGenerateOptions {
  controlPolicy?: NovelControlPolicy;
  workflowTaskId?: string;
  taskStyleProfileId?: string;
  maxRetries?: number;
  runMode?: "fast" | "polish";
  autoReview?: boolean;
  autoRepair?: boolean;
  skipCompleted?: boolean;
  qualityThreshold?: number;
  repairMode?: "detect_only" | "light_repair" | "heavy_repair" | "continuity_only" | "character_only" | "ending_only";
  artifactSyncMode?: ArtifactSyncMode;
  qualityAlertDetails?: string[];
  replanAlertDetails?: string[];
  recoverableRepairDetails?: string[];
  backgroundSync?: PipelineBackgroundSyncState;
  pipelineMode?: "batch" | "pipeline";
  pipelineState?: {
    refinementProgress: { total: number; completed: number; currentChapterId?: string | null };
    writingProgress: { total: number; completed: number; currentChapterId?: string | null };
    blockedChapterId?: string | null;
    blockingReason?: "quality_review" | "manual_approval" | null;
  } | null;
}

// ─── Other Input Types ───────────────────────────────────────────────────────

export interface StorylineDraftInput {
  content: string;
  diffSummary?: string;
  baseVersion?: number;
}

export interface StorylineImpactInput {
  versionId?: string;
  content?: string;
}

export interface ReviewOptions extends LLMGenerateOptions {
  content?: string;
  /** REQ-2022: 关联自动执行 taskId，用于 debug buffer 采集 */
  directorDebugTaskId?: string;
}

export interface RepairOptions extends LLMGenerateOptions {
  reviewIssues?: ReviewIssue[];
  auditIssueIds?: string[];
  userInstruction?: string;
  repairMode?: "detect_only" | "light_repair" | "heavy_repair" | "continuity_only" | "character_only" | "ending_only";
  /** REQ-2022: 关联自动执行 taskId，用于 debug buffer 采集 */
  directorDebugTaskId?: string;
}

export interface HookGenerateOptions extends LLMGenerateOptions {
  chapterId?: string;
}

export interface CharacterTimelineSyncOptions {
  startOrder?: number;
  endOrder?: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const QUALITY_THRESHOLD = { coherence: 80, repetition: 75, engagement: 75 } as const;

export const DEFAULT_ESTIMATED_CHAPTER_COUNT = 80;

export type BeatStatus = "planned" | "completed" | "skipped";
