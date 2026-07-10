import type {
  DirectorArtifactRef,
  DirectorArtifactTargetType,
  DirectorChapterExecutionProgressSummary,
  DirectorEvent,
  DirectorRuntimeSnapshot,
  DirectorStepBlocker,
  DirectorTaskFactSummary,
  DirectorWorkspaceAnalysis,
} from "./index";
import type { DirectorRuntimeProjection } from "./projection";

export type DirectorWorkerDerivedState =
  | "idle"
  | "queued_waiting_worker"
  | "leased_starting"
  | "running_step"
  | "waiting_gate"
  | "auto_recovering"
  | "cancelled"
  | "failed_recoverable"
  | "failed_hard"
  | "succeeded";

export type DirectorWorkerNextAction =
  | "none"
  | "wait_for_worker"
  | "wait_for_lease_start"
  | "continue_running"
  | "recover_stale_command"
  | "requires_user_action";

export interface DirectorWorkerHealthSummary {
  derivedState: DirectorWorkerDerivedState;
  message?: string | null;
  queuedCommandCount: number;
  leasedCommandCount: number;
  runningCommandCount: number;
  staleCommandCount: number;
  oldestQueuedAt?: string | null;
  oldestQueuedWaitMs?: number | null;
  currentCommandId?: string | null;
  currentCommandType?: DirectorRunCommandType | string | null;
  currentWorkerId?: string | null;
  currentSlotId?: string | null;
  currentExecutionId?: string | null;
  currentExecutionStatus?: string | null;
  currentLeaseExpiresAt?: string | null;
  blockedReason?: string | null;
  lastErrorMessage?: string | null;
  nextAction?: DirectorWorkerNextAction;
  lastCommandAt?: string | null;
}

export interface DirectorTaskShell {
  id: string;
  novelId?: string | null;
  status: string;
  currentStage?: string | null;
  currentItemKey?: string | null;
  currentItemLabel?: string | null;
  progress?: number | null;
  checkpointType?: string | null;
  checkpointSummary?: string | null;
  lastError?: string | null;
  pendingManualRecovery?: boolean | null;
  cancelRequestedAt?: string | null;
}

export type DirectorDisplayStageKey =
  | "project_setup"
  | "story_planning"
  | "character_setup"
  | "volume_strategy"
  | "structured_outline"
  | "chapter_execution"
  | "quality_repair";

export type DirectorDisplayMode =
  | "idle"
  | "running"
  | "waiting"
  | "needs_recovery"
  | "failed"
  | "completed";

export type DirectorDisplayStepStatus =
  | "pending"
  | "running"
  | "completed"
  | "attention";

export interface DirectorDisplayStep {
  key: DirectorDisplayStageKey;
  label: string;
  status: DirectorDisplayStepStatus;
  isCurrent: boolean;
}

export interface DirectorDisplayState {
  stageKey: DirectorDisplayStageKey;
  stageLabel: string;
  stepIndex: number;
  totalSteps: number;
  mode: DirectorDisplayMode;
  headline: string;
  description: string;
  currentAction: string;
  checkpointLabel: string;
  progressPercent: number;
  nextActionLabel?: string | null;
  currentFactStepId?: string | null;
  currentFactStepLabel?: string | null;
  currentFactDescription?: string | null;
  requiresUserAction: boolean;
  isLiveRunning: boolean;
  needsRecovery: boolean;
  steps: DirectorDisplayStep[];
  pipelineMode?: "batch" | "pipeline";
  pipelineState?: {
    refinementProgress: { total: number; completed: number; currentChapterId?: string | null };
    writingProgress: { total: number; completed: number; currentChapterId?: string | null };
    blockedChapterId?: string | null;
    blockingReason?: "quality_review" | "manual_approval" | null;
  } | null;
}

export type DirectorDashboardMode =
  | "idle"
  | "queued"
  | "running"
  | "waiting_user"
  | "recovering"
  | "failed"
  | "completed";

export type DirectorDashboardProgressSource =
  | "task_live"
  | "worker_live"
  | "chapter_facts"
  | "checkpoint"
  | "runtime_projection"
  | "fallback";

export type DirectorDashboardActionType =
  | "confirm_and_continue"
  | "background_continue"
  | "open_task_center"
  | "resume_from_checkpoint"
  | "retry";

export interface DirectorDashboardAction {
  type: DirectorDashboardActionType;
  label: string;
  emphasis: "primary" | "secondary" | "destructive";
}

export interface DirectorDashboardDiagnostic {
  code: string;
  label: string;
  detail?: string | null;
  level: "info" | "warning" | "danger";
  source: "task" | "projection" | "facts" | "worker" | "artifact";
}

export interface DirectorDashboardSourceTrace {
  taskStatus?: string | null;
  projectionStatus?: string | null;
  commandStatus?: string | null;
  activeStepStatus?: string | null;
  checkpointType?: string | null;
  progressSource: DirectorDashboardProgressSource;
}

export interface DirectorDashboardView {
  mode: DirectorDashboardMode;
  statusLabel: string;
  headline: string;
  description: string;
  currentAction: string | null;
  progressPercent: number;
  progressSource: DirectorDashboardProgressSource;
  requiresUserAction: boolean;
  userActionReason?: string | null;
  primaryAction?: DirectorDashboardAction | null;
  secondaryActions: DirectorDashboardAction[];
  stageKey: DirectorDisplayStageKey;
  stageLabel: string;
  stepIndex: number;
  totalSteps: number;
  steps: DirectorDisplayStep[];
  diagnostics: DirectorDashboardDiagnostic[];
  sourceTrace: DirectorDashboardSourceTrace;
}

export interface DirectorTaskSnapshot {
  task: DirectorTaskShell;
  run: {
    id: string;
    novelId?: string | null;
    entrypoint?: string | null;
  } | null;
  activeStep: {
    idempotencyKey: string;
    nodeKey: string;
    label: string;
    status: string;
  } | null;
  latestCommand: {
    id: string;
    commandType: string;
    status: string;
  } | null;
  runtime: DirectorRuntimeSnapshot | null;
  projection: DirectorRuntimeProjection | null;
  recentEvents: DirectorEvent[];
  artifacts: DirectorArtifactRef[];
  currentFactStepId?: string | null;
  currentFactStepLabel?: string | null;
  currentFactEvidence?: Record<string, unknown> | null;
  factSummary?: DirectorTaskFactSummary | null;
  chapterProgress?: DirectorChapterExecutionProgressSummary | null;
  displayState: DirectorDisplayState;
  dashboardView: DirectorDashboardView;
  nextActions: string[];
}

export interface DirectorTaskSnapshotResponse {
  snapshot: DirectorTaskSnapshot | null;
}

export interface DirectorTaskFactInspectionStep {
  stepId: string;
  label: string;
  stage: string;
  targetType: DirectorArtifactTargetType;
  ready: boolean;
  completed: boolean;
  completenessRatio: number;
  nextAction?: string | null;
  resumeFrom?: string | null;
  blockers: DirectorStepBlocker[];
  evidence?: Record<string, unknown>;
  producedArtifacts?: DirectorArtifactRef[];
  progress?: {
    status: string;
    ratio: number;
    label: string;
    nextAction?: string | null;
    evidence?: Record<string, unknown>;
  } | null;
  inspectError?: string | null;
  isCurrentFactStep?: boolean;
  isActiveRuntimeStep?: boolean;
}

export interface DirectorTaskFactInspection {
  taskId: string;
  novelId?: string | null;
  currentFactStepId?: string | null;
  currentFactStepLabel?: string | null;
  currentFactEvidence?: Record<string, unknown> | null;
  factSummary?: DirectorTaskFactSummary | null;
  steps: DirectorTaskFactInspectionStep[];
}

export interface DirectorTaskFactInspectionResponse {
  inspection: DirectorTaskFactInspection | null;
}

export const DIRECTOR_RUN_COMMAND_TYPES = [
  "generate_candidates",
  "refine_candidates",
  "patch_candidate",
  "refine_titles",
  "confirm_candidate",
  "continue",
  "resume_from_checkpoint",
  "retry",
  "takeover",
  "approve_gate",
  "policy_update",
  "workspace_analysis",
  "manual_edit_impact",
  "repair_chapter_titles",
  "cancel",
] as const;

export type DirectorRunCommandType = typeof DIRECTOR_RUN_COMMAND_TYPES[number];

export const DIRECTOR_RUN_COMMAND_STATUSES = [
  "queued",
  "leased",
  "running",
  "succeeded",
  "failed",
  "cancelled",
  "stale",
] as const;

export type DirectorRunCommandStatus = typeof DIRECTOR_RUN_COMMAND_STATUSES[number];

export interface DirectorCommandAcceptedResponse {
  commandId: string;
  taskId: string;
  novelId?: string | null;
  commandType: DirectorRunCommandType;
  status: DirectorRunCommandStatus;
  leaseExpiresAt?: string | null;
  runtimeId?: string | null;
  runtimeStatus?: string | null;
  projectionUrl?: string | null;
}

export interface DirectorCommandResultResponse<T = unknown> {
  commandId: string;
  taskId: string;
  commandType: DirectorRunCommandType | string;
  status: DirectorRunCommandStatus | string;
  result?: T | null;
  errorMessage?: string | null;
}

export interface DirectorWorkspaceAnalysisResponse {
  analysis: DirectorWorkspaceAnalysis;
}
