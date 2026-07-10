import type {
  DirectorAutopilotRecoveryDecision,
  DirectorChapterExecutionProgressSummary,
  DirectorRuntimeProjection,
  DirectorRuntimeSnapshot,
  DirectorTaskFactSummary,
  DirectorRuntimeVisibleRiskBadge,
  DirectorWorkspaceInventory,
} from "@ai-novel/shared";
import { classifyChapterQualityLoopRisk } from "@ai-novel/shared";
import {
  timestampOf,
  latestStep,
  latestEvent,
  statusFromStep,
  resolveBlockedReason,
  formatNextAction,
  buildHeadline,
  buildDetail,
  buildScopeSummary,
  buildProgressSummary,
  buildProgressBreakdown,
  buildQualityDebtSummary,
  buildQualityBudgetSummary,
  readLatestQualityLoopAssessment,
} from "./DirectorEventProjectionHelpers";

const PLANNING_ARTIFACT_TYPES = [
  "book_contract",
  "story_macro",
  "character_cast",
  "volume_strategy",
  "chapter_task_sheet",
] as const;

function buildRecoveryDecision(input: {
  status: import("@ai-novel/shared/types/directorRuntime").DirectorRuntimeProjectionStatus;
  inventory: DirectorWorkspaceInventory | null | undefined;
  blockedReason: string | null;
  qualityDebtCount?: number;
}): DirectorAutopilotRecoveryDecision {
  const protectedCount = input.inventory?.protectedUserContentArtifacts.length ?? 0;
  if (protectedCount > 0 && (input.status === "waiting_approval" || input.status === "blocked" || input.status === "failed")) {
    return "requires_manual_recovery";
  }
  if (input.status === "failed") {
    return "requires_manual_recovery";
  }
  if ((input.inventory?.pendingRepairChapterCount ?? 0) > 0) {
    return "auto_repair_chapter";
  }
  const missingArtifacts = input.inventory?.missingArtifactTypes ?? [];
  if (missingArtifacts.some((type) => (PLANNING_ARTIFACT_TYPES as readonly string[]).includes(type))) {
    return "auto_replan_window";
  }
  if ((input.qualityDebtCount ?? 0) > 0) {
    return "defer_and_continue";
  }
  if (input.status === "waiting_approval" || input.status === "blocked") {
    return input.blockedReason ? "auto_resume_from_checkpoint" : "continue";
  }
  return "continue";
}

function isAutomaticPolicy(snapshot: DirectorRuntimeSnapshot): boolean {
  return snapshot.policy.mode === "auto_safe_scope";
}

function buildVisibleRiskBadges(input: {
  status: import("@ai-novel/shared/types/directorRuntime").DirectorRuntimeProjectionStatus;
  blockedReason: string | null;
  inventory: DirectorWorkspaceInventory | null | undefined;
  events: import("@ai-novel/shared/types/directorRuntime").DirectorEvent[];
}): DirectorRuntimeVisibleRiskBadge[] {
  const badges: DirectorRuntimeVisibleRiskBadge[] = [];
  const push = (badge: DirectorRuntimeVisibleRiskBadge) => {
    if (!badges.some((item) => item.label === badge.label)) {
      badges.push(badge);
    }
  };
  if (input.status === "failed") {
    push({ label: "执行失败", level: "danger", source: "status" });
  } else if (input.status === "blocked" || input.status === "waiting_approval") {
    push({ label: input.blockedReason ? "等待处理" : "等待确认", level: "warning", source: "status" });
  }
  const inventory = input.inventory;
  if (inventory) {
    if (inventory.protectedUserContentArtifacts.length > 0) {
      push({ label: "受保护正文", level: "danger", source: "artifact" });
    }
    if (inventory.pendingRepairChapterCount > 0) {
      push({ label: `${inventory.pendingRepairChapterCount} 章待修复`, level: "warning", source: "artifact" });
    }
    if (inventory.staleArtifacts.length > 0) {
      push({ label: `${inventory.staleArtifacts.length} 项需复核`, level: "warning", source: "artifact" });
    }
    if (inventory.missingArtifactTypes.length > 0) {
      push({ label: "缺少规划资源", level: "warning", source: "artifact" });
    }
  }
  for (const event of input.events) {
    if (event.type === "quality_issue_found" || event.type === "quality_loop_assessed") {
      const qualityLoopRisk = event.type === "quality_loop_assessed"
        ? classifyChapterQualityLoopRisk((event.metadata?.assessment as unknown) ?? null)
        : "blocking";
      if (qualityLoopRisk === "non_blocking_quality_debt") {
        push({ label: "已暂存质量债", level: "info", source: "event" });
      } else if (qualityLoopRisk === "blocking") {
        push({ label: "质量阻塞", level: event.severity === "high" ? "danger" : "warning", source: "event" });
      } else if (event.type === "quality_issue_found") {
        push({ label: "质量风险", level: event.severity === "high" ? "danger" : "warning", source: "event" });
      }
    }
    if (event.type === "replan_run_created") {
      push({ label: "已进入重规划", level: "info", source: "event" });
    }
    if (event.type === "circuit_breaker_opened") {
      push({ label: "连续失败保护", level: "danger", source: "event" });
    }
  }
  for (const event of input.events) {
    if (event.type === "continue_with_risk") {
      push({ label: "已暂存质量债", level: "info", source: "event" });
    }
  }
  return badges.slice(0, 6);
}

/**
 * Director 内部状态投影服务。
 *
 * 职责：将 DirectorRuntimeSnapshot 转换为前端可消费的 DirectorRuntimeProjection，
 * 包含状态判定、进度计算、质量风险标签、恢复决策等。
 * 不用于跨模块广播——跨模块事件使用 {@link EventBus}。
 */
export class DirectorEventProjectionService {
  buildSnapshotProjection(
    snapshot: DirectorRuntimeSnapshot | null,
    options?: {
      chapterProgress?: DirectorChapterExecutionProgressSummary | null;
      factSummary?: DirectorTaskFactSummary | null;
      currentFactStep?: {
        stepId: string;
        stepLabel: string;
        evidence?: Record<string, unknown> | null;
        nextActionLabel?: string | null;
      } | null;
    },
  ): DirectorRuntimeProjection | null {
    if (!snapshot) {
      return null;
    }
    const step = latestStep(snapshot.steps);
    const event = latestEvent(snapshot.events);
    const status = statusFromStep(step, options?.factSummary ?? null);
    const requiresUserAction = status === "waiting_approval" || status === "blocked";
    const blockedReason = resolveBlockedReason(step, event);
    const inventory = snapshot.lastWorkspaceAnalysis?.inventory ?? null;
    const recommendation = snapshot.lastWorkspaceAnalysis?.recommendation
      ?? snapshot.lastWorkspaceAnalysis?.interpretation?.recommendedAction
      ?? null;
    const headline = buildHeadline({ status, step, event });
    const progressBreakdown = buildProgressBreakdown(
      snapshot,
      inventory,
      options?.chapterProgress ?? null,
      options?.factSummary ?? null,
    );
    const qualityDebtSummary = buildQualityDebtSummary(snapshot.events);
    const qualityBudgetSummary = buildQualityBudgetSummary(snapshot.events);
    const qualityRootCause = readLatestQualityLoopAssessment(snapshot.events);
    const recoveryDecision = buildRecoveryDecision({
      status,
      inventory,
      blockedReason,
      qualityDebtCount: qualityDebtSummary?.deferredChapterCount ?? 0,
    });
    const isAutopilotRecoverable = isAutomaticPolicy(snapshot)
      && recoveryDecision !== "requires_manual_recovery"
      && status !== "completed"
      && status !== "idle";
    const visibleRiskBadges = buildVisibleRiskBadges({
      status,
      blockedReason,
      inventory,
      events: snapshot.events,
    });
    const recentEvents = [...snapshot.events]
      .sort((left, right) => timestampOf(right.occurredAt) - timestampOf(left.occurredAt))
      .slice(0, 8)
      .map((item) => ({
        eventId: item.eventId,
        type: item.type,
        summary: item.summary,
        nodeKey: item.nodeKey,
        artifactType: item.artifactType,
        severity: item.severity,
        occurredAt: item.occurredAt,
      }));

    return {
      runId: snapshot.runId,
      novelId: snapshot.novelId,
      status,
      currentNodeKey: step?.nodeKey ?? event?.nodeKey ?? null,
      currentLabel: step?.label ?? event?.summary ?? null,
      currentFactStepId: options?.currentFactStep?.stepId ?? null,
      currentFactStepLabel: options?.currentFactStep?.stepLabel ?? null,
      currentFactEvidence: options?.currentFactStep?.evidence ?? null,
      factSummary: options?.factSummary ?? null,
      headline,
      detail: buildDetail({ status, step, event, blockedReason }),
      lastEventSummary: event?.summary ?? null,
      requiresUserAction,
      blockedReason,
      blockingReason: blockedReason,
      nextActionLabel: options?.currentFactStep?.nextActionLabel ?? formatNextAction(recommendation),
      recommendedAction: recommendation,
      recoveryDecision,
      isAutopilotRecoverable,
      scopeSummary: buildScopeSummary(inventory),
      progressSummary: buildProgressSummary(snapshot, inventory, options?.factSummary ?? null),
      progressBreakdown,
      chapterExecutionProgress: options?.chapterProgress ?? null,
      visibleRiskBadges,
      rootCauseCode: qualityRootCause.rootCauseCode,
      blockingObligations: qualityRootCause.blockingObligations,
      qualityDebtSummary,
      qualityBudgetSummary,
      missingArtifactTypes: inventory && inventory.missingArtifactTypes.length > 0
        ? inventory.missingArtifactTypes
        : undefined,
      policyMode: snapshot.policy.mode,
      updatedAt: snapshot.updatedAt,
      recentEvents,
    };
  }
}
