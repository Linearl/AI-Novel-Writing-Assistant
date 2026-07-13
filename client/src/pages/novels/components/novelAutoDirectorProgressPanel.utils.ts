import type {
  NovelWorkflowMilestoneType,
  DirectorDisplayStepStatus,
  DirectorDashboardMode,
  UnifiedTaskDetail,
} from "@ai-novel/shared";
import {
  DIRECTOR_CANDIDATE_SETUP_STEPS,
  extractDirectorTaskSeedPayloadFromMeta,
} from "@ai-novel/shared";
import type { AITakeoverMode } from "@/components/workflow/AITakeoverContainer";
import type {
  DirectorStepDefinition,
  DirectorStepVisualStatus,
} from "./novelAutoDirectorProgressPanel.types";
import type { DirectorExecutionViewMode } from "./novelAutoDirectorProgressPanel.types";

export const DIRECTOR_EXECUTION_STEPS: DirectorStepDefinition[] = [
  { key: "novel_create", label: "创建项目" },
  { key: "book_contract", label: "Book Contract + 故事宏观规划" },
  { key: "character_setup", label: "角色准备" },
  { key: "volume_strategy", label: "卷战略 + 卷骨架" },
  { key: "beat_sheet", label: "第 1 卷节奏板 + 章节列表" },
  { key: "chapter_detail_bundle", label: "章节批量细化" },
];

export const DIRECTOR_CANDIDATE_SETUP_STEP_KEYS = new Set<string>(
  DIRECTOR_CANDIDATE_SETUP_STEPS.map((step) => step.key),
);

export const AUTO_DIRECTOR_PLACEHOLDER_TITLES = new Set([
  "AI 自动导演小说",
  "小说流程任务",
]);

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "暂无";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "暂无";
  }
  return date.toLocaleString();
}

export function formatTokenCount(value: number | null | undefined): string {
  return new Intl.NumberFormat("zh-CN").format(Math.max(0, Math.round(value ?? 0)));
}

export function resolveAutoExecutionScopeLabel(task: UnifiedTaskDetail | null): string {
  const seedPayload = extractDirectorTaskSeedPayloadFromMeta(task?.meta) as {
    autoExecution?: {
      scopeLabel?: string | null;
      totalChapterCount?: number | null;
    } | null;
  } | null;
  const scopeLabel = seedPayload?.autoExecution?.scopeLabel?.trim();
  if (scopeLabel) {
    return scopeLabel;
  }
  const fallbackCount = Math.max(1, Math.round(seedPayload?.autoExecution?.totalChapterCount ?? 10));
  return `前 ${fallbackCount} 章`;
}

export function resolveDirectorStyleSeed(task: UnifiedTaskDetail | null): {
  title: string;
  summaryLines: string[];
} | null {
  const seedPayload = extractDirectorTaskSeedPayloadFromMeta(task?.meta);
  const styleIntentSummary = seedPayload?.styleIntentSummary;
  if (styleIntentSummary?.headline?.trim()) {
    return {
      title: styleIntentSummary.styleProfileName?.trim() || styleIntentSummary.headline.trim(),
      summaryLines: styleIntentSummary.stageSummaryLines ?? [],
    };
  }
  const fallbackTone = typeof (seedPayload as { styleTone?: unknown } | null)?.styleTone === "string"
    ? (((seedPayload as { styleTone?: string }).styleTone ?? "").trim())
    : "";
  if (!fallbackTone) {
    return null;
  }
  return {
    title: fallbackTone,
    summaryLines: [`文风关键词：${fallbackTone}`],
  };
}

export function formatCheckpoint(
  checkpoint: NovelWorkflowMilestoneType | null | undefined,
  task: UnifiedTaskDetail | null,
): string {
  if (checkpoint === "rewrite_snapshot_created") {
    return "重写前备份已创建";
  }
  if (checkpoint === "candidate_selection_required") {
    return "等待确认书级方向";
  }
  if (checkpoint === "book_contract_ready") {
    return "Book Contract 已就绪";
  }
  if (checkpoint === "character_setup_required") {
    return "角色准备待审核";
  }
  if (checkpoint === "volume_strategy_ready") {
    return "卷战略已就绪";
  }
  if (checkpoint === "chapter_batch_ready") {
    return `${resolveAutoExecutionScopeLabel(task)}自动执行已暂停`;
  }
  if (checkpoint === "replan_required") {
    return "需要重规划";
  }
  if (checkpoint === "workflow_completed") {
    return "主流程完成";
  }
  return "暂无";
}

export function isCandidateSetupFlow(task: UnifiedTaskDetail | null): boolean {
  return DIRECTOR_CANDIDATE_SETUP_STEP_KEYS.has(task?.currentItemKey ?? "");
}

export function resolveDirectorExecutionStepIndex(task: UnifiedTaskDetail | null): number {
  const itemKey = task?.currentItemKey ?? "";
  const chapterExecutionKeys = new Set([
    "chapter_execution",
    "chapter_execution_node",
    "chapter.draft.write",
    "chapter.write",
  ]);
  const qualityRepairKeys = new Set([
    "reviewing",
    "repairing",
    "quality_repair",
    "chapter_quality_review_node",
    "chapter.quality.review",
    "chapter_state_commit_node",
    "chapter.state.commit",
  ]);
  if (qualityRepairKeys.has(itemKey)) {
    return 5;
  }
  if (
    (task?.status === "running" && task?.checkpointType === "chapter_batch_ready")
    || itemKey === "chapter_detail_bundle"
    || chapterExecutionKeys.has(itemKey)
  ) {
    return 5;
  }
  if (itemKey === "beat_sheet" || itemKey === "chapter_list" || itemKey === "chapter_sync") {
    return 4;
  }
  if (
    task?.checkpointType === "character_setup_required"
    || itemKey === "character_setup"
    || itemKey === "character_cast_apply"
  ) {
    return 2;
  }
  if (
    task?.checkpointType === "volume_strategy_ready"
    || itemKey === "volume_strategy"
    || itemKey === "volume_skeleton"
  ) {
    return 3;
  }
  if (
    task?.checkpointType === "book_contract_ready"
    || itemKey === "book_contract"
    || itemKey === "story_macro"
    || itemKey === "constraint_engine"
  ) {
    return 1;
  }
  return 0;
}

export function resolveCandidateSetupStepIndex(task: UnifiedTaskDetail | null): number {
  const itemKey = task?.currentItemKey ?? "";
  const foundIndex = DIRECTOR_CANDIDATE_SETUP_STEPS.findIndex((step) => step.key === itemKey);
  return foundIndex >= 0 ? foundIndex : 0;
}

export function resolveDirectorStepStatuses(
  task: UnifiedTaskDetail | null,
  mode: DirectorExecutionViewMode,
  steps: ReadonlyArray<DirectorStepDefinition>,
): DirectorStepVisualStatus[] {
  if (task?.checkpointType === "chapter_batch_ready" || task?.status === "succeeded") {
    return steps.map(() => "completed");
  }

  const currentIndex = isCandidateSetupFlow(task)
    ? resolveCandidateSetupStepIndex(task)
    : resolveDirectorExecutionStepIndex(task);
  return steps.map((_, index) => {
    if (index < currentIndex) {
      return "completed";
    }
    if (index === currentIndex) {
      return mode === "execution_failed" || task?.pendingManualRecovery ? "failed" : "running";
    }
    return "pending";
  });
}

export function stepClasses(status: DirectorStepVisualStatus): string {
  if (status === "completed") {
    return "border-emerald-500/40 bg-emerald-500/10";
  }
  if (status === "running") {
    return "border-sky-400/60 bg-sky-50";
  }
  if (status === "failed") {
    return "border-destructive/40 bg-destructive/5";
  }
  return "border-border/70 bg-background";
}

export function stepBadgeClasses(status: DirectorStepVisualStatus): string {
  if (status === "completed") {
    return "bg-success text-white";
  }
  if (status === "running") {
    return "bg-sky-600 text-white";
  }
  if (status === "failed") {
    return "bg-destructive text-destructive-foreground";
  }
  return "bg-muted text-muted-foreground";
}

export function stepStatusLabel(status: DirectorStepVisualStatus): string {
  if (status === "completed") {
    return "已完成";
  }
  if (status === "running") {
    return "进行中";
  }
  if (status === "failed") {
    return "需处理";
  }
  return "待推进";
}

export function mapDisplayStepStatus(status: DirectorDisplayStepStatus | null | undefined): DirectorStepVisualStatus {
  if (status === "completed") {
    return "completed";
  }
  if (status === "running") {
    return "running";
  }
  if (status === "attention") {
    return "failed";
  }
  return "pending";
}

export function mapDashboardModeToContainerMode(mode: DirectorDashboardMode | null | undefined): AITakeoverMode {
  switch (mode) {
    case "failed":
      return "failed";
    case "recovering":
      return "action_required";
    case "waiting_user":
      return "waiting";
    case "idle":
      return "loading";
    case "queued":
    case "completed":
    case "running":
    default:
      return "running";
  }
}
