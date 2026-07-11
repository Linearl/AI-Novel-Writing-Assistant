import type {
  DirectorArtifactStatus,
  DirectorArtifactTargetType,
  DirectorArtifactType,
  DirectorEvent,
  DirectorLlmUsageRecordSummary,
  DirectorLlmUsageSummary,
  DirectorPolicyMode,
  DirectorPromptUsageSummary,
  DirectorStepUsageSummary,
  DirectorUsageAttributionStatus,
} from "./index.js";
import type { DirectorCircuitBreakerState } from "../novelDirector.js";
import type { DirectorDashboardView, DirectorWorkerHealthSummary } from "./worker.js";
import type { DirectorRuntimeProjection } from "./projection.js";
import type { DirectorRunCommandType } from "./worker.js";

export type DirectorBookAutomationStatus =
  | "idle"
  | "queued"
  | "running"
  | "waiting_approval"
  | "waiting_recovery"
  | "blocked"
  | "failed"
  | "cancelled"
  | "completed";

export type DirectorBookAutomationDisplayState =
  | "processing"
  | "needs_confirmation"
  | "paused"
  | "needs_attention"
  | "completed"
  | "idle";

export type DirectorBookAutomationActionType =
  | "open_novel"
  | "open_details"
  | "continue"
  | "auto_execute_range"
  | "confirm_candidate"
  | "open_chapter"
  | "open_quality_repair"
  | "retry"
  | "cancel";

export interface DirectorBookAutomationActionTarget {
  novelId?: string | null;
  taskId?: string | null;
  chapterId?: string | null;
  tab?: "basic" | "story_macro" | "outline" | "structured" | "chapter" | "pipeline" | "character" | "history" | null;
  href?: string | null;
}

export interface DirectorBookAutomationAction {
  type: DirectorBookAutomationActionType;
  label: string;
  target: DirectorBookAutomationActionTarget;
  commandPayload?: {
    taskId?: string | null;
    continuationMode?: "resume" | "auto_execute_range" | null;
  } | null;
  emphasis?: "primary" | "secondary" | "destructive";
}

export interface DirectorBookAutomationFocusNovel {
  id: string;
  title: string;
  href: string;
}

export type DirectorBookAutomationTimelineItemType =
  | "task"
  | "command"
  | "step"
  | "event"
  | "approval"
  | "usage";

export interface DirectorBookAutomationTimelineItem {
  id: string;
  type: DirectorBookAutomationTimelineItemType;
  title: string;
  detail?: string | null;
  status?: string | null;
  taskId?: string | null;
  runId?: string | null;
  nodeKey?: string | null;
  commandType?: DirectorRunCommandType | string | null;
  artifactType?: DirectorArtifactType | string | null;
  severity?: DirectorEvent["severity"];
  durationMs?: number | null;
  usage?: DirectorLlmUsageSummary | null;
  attributionStatus?: DirectorUsageAttributionStatus | string | null;
  occurredAt: string;
}

export interface DirectorBookAutomationTaskSummary {
  id: string;
  title: string;
  status: string;
  progress: number;
  currentStage?: string | null;
  currentItemKey?: string | null;
  currentItemLabel?: string | null;
  checkpointType?: string | null;
  checkpointSummary?: string | null;
  pendingManualRecovery: boolean;
  lastError?: string | null;
  updatedAt: string;
}

export interface DirectorBookAutomationArtifactSummary {
  activeCount: number;
  staleCount: number;
  protectedUserContentCount: number;
  repairTicketCount: number;
  dependencyCount?: number;
  affectedChapterCount?: number;
  affectedChapterIds?: string[];
  byType?: DirectorBookAutomationArtifactTypeSummary[];
  recentArtifacts?: DirectorBookAutomationRecentArtifact[];
  recentStaleArtifacts?: DirectorBookAutomationRecentArtifact[];
  recentRepairArtifacts?: DirectorBookAutomationRecentArtifact[];
  recentVersionedArtifacts?: DirectorBookAutomationRecentArtifact[];
}

export interface DirectorBookAutomationArtifactTypeSummary {
  artifactType: DirectorArtifactType | string;
  totalCount: number;
  activeCount: number;
  staleCount: number;
  protectedUserContentCount: number;
  dependencyCount: number;
  latestUpdatedAt?: string | null;
}

export interface DirectorBookAutomationRecentArtifact {
  id: string;
  artifactType: DirectorArtifactType | string;
  targetType: DirectorArtifactTargetType | string;
  targetId?: string | null;
  status: DirectorArtifactStatus | string;
  source?: string | null;
  version?: number | null;
  protectedUserContent?: boolean | null;
  dependencyCount: number;
  contentHash?: string | null;
  updatedAt?: string | null;
}

export interface DirectorBookAutomationProjection {
  novelId: string;
  focusNovel: DirectorBookAutomationFocusNovel;
  latestTask?: DirectorBookAutomationTaskSummary | null;
  latestRunId?: string | null;
  status: DirectorBookAutomationStatus;
  displayState: DirectorBookAutomationDisplayState;
  runMode?: string | null;
  policyMode?: DirectorPolicyMode | null;
  headline: string;
  userHeadline: string;
  detail?: string | null;
  userReason?: string | null;
  currentStage?: string | null;
  currentLabel?: string | null;
  requiresUserAction: boolean;
  blockedReason?: string | null;
  nextActionLabel?: string | null;
  primaryAction?: DirectorBookAutomationAction | null;
  secondaryActions?: DirectorBookAutomationAction[];
  automationSummary?: string | null;
  progressSummary?: string | null;
  artifactSummary: DirectorBookAutomationArtifactSummary;
  usageSummary?: DirectorLlmUsageSummary | null;
  recentUsage?: DirectorLlmUsageRecordSummary[];
  stepUsage?: DirectorStepUsageSummary[];
  promptUsage?: DirectorPromptUsageSummary[];
  circuitBreaker?: DirectorCircuitBreakerState | null;
  workerHealth?: DirectorWorkerHealthSummary | null;
  activeCommandCount: number;
  pendingCommandCount: number;
  autoApprovalRecordCount: number;
  latestEventAt?: string | null;
  updatedAt: string;
  dashboardView?: DirectorDashboardView | null;
  runtimeProjection?: DirectorRuntimeProjection | null;
  timeline: DirectorBookAutomationTimelineItem[];
}

export interface DirectorBookAutomationProjectionResponse {
  projection: DirectorBookAutomationProjection;
}
