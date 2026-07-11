import type {
  DirectorArtifactType,
  DirectorEvent,
  DirectorEventType,
  DirectorLlmUsageRecordSummary,
  DirectorLlmUsageSummary,
  DirectorNextAction,
  DirectorPolicyMode,
  DirectorPromptUsageSummary,
  DirectorRuntimeSnapshot,
  DirectorStepUsageSummary,
} from "./index.js";
import type { DirectorWorkerHealthSummary } from "./worker.js";
import type { DirectorCircuitBreakerState, DirectorQualityLoopBudgetNextAction } from "../novelDirector.js";

export type DirectorRuntimeProjectionStatus =
  | "idle"
  | "running"
  | "waiting_approval"
  | "blocked"
  | "failed"
  | "completed";

export interface DirectorRuntimeProjectionEvent {
  eventId: string;
  type: DirectorEventType;
  summary: string;
  nodeKey?: string | null;
  artifactType?: DirectorArtifactType | null;
  severity?: DirectorEvent["severity"];
  occurredAt: string;
  usage?: DirectorLlmUsageSummary | null;
}

export type DirectorAutopilotRecoveryDecision =
  | "continue"
  | "auto_repair_chapter"
  | "auto_rewrite_chapter"
  | "auto_replan_window"
  | "auto_resume_from_checkpoint"
  | "defer_and_continue"
  | "requires_manual_recovery";

export interface DirectorRuntimeProgressBreakdown {
  planningProgress: number;
  chapterProgress: number;
  qualityProgress: number;
  activeJobProgress: number;
  planningPercent: number;
  chapterExecutionPercent: number;
  qualityRepairPercent: number;
  totalPercent: number;
  completedSteps: number;
  totalSteps: number;
  draftedChapters: number;
  continuableChapters: number;
  totalChapters: number;
  pendingRepairChapters: number;
  explanation: string;
}

export interface DirectorRuntimeVisibleRiskBadge {
  label: string;
  level: "info" | "warning" | "danger";
  source?: "status" | "artifact" | "event" | "policy";
}

export interface DirectorRuntimeQualityDebtSummary {
  deferredChapterCount: number;
  deferredChapterOrders: number[];
  latestReason?: string | null;
}

export interface DirectorRuntimeQualityBudgetSummary {
  currentChapterId?: string | null;
  currentChapterOrder?: number | null;
  latestSignatureKey?: string | null;
  latestIssueSignature?: string | null;
  latestReason?: string | null;
  patchRepairUsed: number;
  chapterRewriteUsed: number;
  windowReplanUsed: number;
  deferredCount: number;
  nextAction: DirectorQualityLoopBudgetNextAction;
  nextActionLabel: string;
  explanation: string;
}

export interface DirectorOutlineFactSummary {
  beatSheetReady: boolean;
  chapterListReady: boolean;
  chapterDetailReady: boolean;
  plannedChapterCount: number;
  selectedChapterCount: number;
  completedDetailSteps: number;
  totalDetailSteps: number;
  syncedChapterCount: number;
}

export interface DirectorChapterExecutionFactSummary {
  totalChapters: number;
  draftedChapterCount: number;
  reviewedChapterCount: number;
  approvedChapterCount: number;
  committedChapterCount: number;
  completedChapters: number;
  needsRepairChapters: number;
  ratio: number;
  expectedChapterCount?: number | null;
}

export interface DirectorRepairFactSummary {
  draftedChapterCount: number;
  reviewedChapterCount: number;
  committedChapterCount: number;
  needsRepairChapters: number;
  payoffArtifactCount: number;
  characterResourceArtifactCount: number;
}

export interface DirectorTaskFactSummaryStep {
  stepId: string;
  label: string;
  stage: string;
  completed: boolean;
  completenessRatio: number;
  evidence?: Record<string, unknown>;
  nextAction?: string | null;
}

export interface DirectorTaskFactSummary {
  allStepsCompleted: boolean;
  completedStepCount: number;
  totalStepCount: number;
  currentFactStepId?: string | null;
  currentFactStepLabel?: string | null;
  currentFactEvidence?: Record<string, unknown> | null;
  hasNovelProject: boolean;
  hasStoryMacro: boolean;
  hasBookContract: boolean;
  characterCount: number;
  hasVolumeStrategy: boolean;
  volumeCount: number;
  outlineFacts: DirectorOutlineFactSummary;
  chapterExecutionFacts: DirectorChapterExecutionFactSummary;
  repairFacts: DirectorRepairFactSummary;
  steps: DirectorTaskFactSummaryStep[];
}

export type ChapterExecutionProgressStage =
  | "execution_contract_ready"
  | "context_package_ready"
  | "draft_started"
  | "draft_saved"
  | "audit_completed"
  | "repair_completed_or_not_needed"
  | "runtime_package_saved"
  | "chapter_artifacts_synced"
  | "chapter_state_committed"
  | "reviewable_or_approved";

export interface DirectorChapterExecutionProgressItem {
  chapterId: string;
  chapterOrder: number;
  status: string;
  currentStage: ChapterExecutionProgressStage;
  completedStages: ChapterExecutionProgressStage[];
  missingStages: ChapterExecutionProgressStage[];
  recoverable: boolean;
  nextAction: string;
}

export interface DirectorChapterExecutionProgressSummary {
  totalChapters: number;
  draftedChapterCount: number;
  approvedChapterCount: number;
  completedChapters: number;
  needsRepairChapters: number;
  activeChapterId?: string | null;
  activeChapterOrder?: number | null;
  currentChapterId?: string | null;
  currentChapterOrder?: number | null;
  currentStage?: ChapterExecutionProgressStage | null;
  recoverableRange?: {
    startOrder: number | null;
    endOrder: number | null;
  };
  ratio: number;
  chapters?: DirectorChapterExecutionProgressItem[];
}

export interface DirectorRuntimeProjection {
  runId: string;
  novelId?: string | null;
  status: DirectorRuntimeProjectionStatus;
  runtimeId?: string | null;
  runtimeStatus?: string | null;
  currentAction?: string | null;
  waitingReason?: string | null;
  activeExecution?: {
    executionId: string;
    stepType: string;
    resourceClass?: string | null;
    workerId?: string | null;
    slotId?: string | null;
    status: string;
    startedAt?: string | null;
    leaseExpiresAt?: string | null;
  } | null;
  resourceClass?: string | null;
  checkpointSummary?: string | null;
  nextAutomaticAction?: string | null;
  workerHealth?: DirectorWorkerHealthSummary | null;
  currentNodeKey?: string | null;
  currentLabel?: string | null;
  currentFactStepId?: string | null;
  currentFactStepLabel?: string | null;
  currentFactEvidence?: Record<string, unknown> | null;
  factSummary?: DirectorTaskFactSummary | null;
  headline?: string | null;
  detail?: string | null;
  lastEventSummary?: string | null;
  requiresUserAction: boolean;
  blockedReason?: string | null;
  blockingReason?: string | null;
  nextActionLabel?: string | null;
  recommendedAction?: DirectorNextAction | null;
  recoveryDecision?: DirectorAutopilotRecoveryDecision;
  isAutopilotRecoverable?: boolean;
  scopeSummary?: string | null;
  progressSummary?: string | null;
  progressBreakdown?: DirectorRuntimeProgressBreakdown;
  chapterExecutionProgress?: DirectorChapterExecutionProgressSummary | null;
  visibleRiskBadges?: DirectorRuntimeVisibleRiskBadge[];
  rootCauseCode?: "none" | "draft_generation_failed" | "draft_obligation_unmet" | "draft_repair_exhausted" | "replan_required" | null;
  blockingObligations?: Array<{
    kind: "must_hit_now" | "must_preserve" | "payoff_touch" | "character_appearance" | "goal_change" | "forbidden_crossing";
    summary: string;
    evidence?: string | null;
  }>;
  qualityDebtSummary?: DirectorRuntimeQualityDebtSummary | null;
  qualityBudgetSummary?: DirectorRuntimeQualityBudgetSummary | null;
  policyMode: DirectorPolicyMode;
  updatedAt: string;
  recentEvents: DirectorRuntimeProjectionEvent[];
  usageSummary?: DirectorLlmUsageSummary | null;
  recentUsage?: DirectorLlmUsageRecordSummary[];
  stepUsage?: DirectorStepUsageSummary[];
  promptUsage?: DirectorPromptUsageSummary[];
  circuitBreaker?: DirectorCircuitBreakerState | null;
  missingArtifactTypes?: DirectorArtifactType[];
}

export interface DirectorRuntimeEventHistoryResponse {
  events: DirectorRuntimeProjectionEvent[];
  totalCount: number;
  limit: number;
}

export interface DirectorRuntimeSnapshotResponse {
  snapshot: DirectorRuntimeSnapshot | null;
  projection?: DirectorRuntimeProjection | null;
}
