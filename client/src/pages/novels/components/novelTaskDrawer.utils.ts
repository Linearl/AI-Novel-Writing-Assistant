import type {
  NovelWorkflowMilestoneType,
} from "@ai-novel/shared";
import type { TaskStatus } from "@ai-novel/shared";
import type { CharacterResourceProposalSummary } from "@ai-novel/shared";
import type { AutoDirectorAction } from "@ai-novel/shared";
import type { NovelTaskDrawerState } from "./NovelEditView.types";

export type DrawerTask = NonNullable<NovelTaskDrawerState["task"]>;

export function formatStatus(status: TaskStatus): string {
  if (status === "queued") {
    return "排队中";
  }
  if (status === "running") {
    return "运行中";
  }
  if (status === "waiting_approval") {
    return "等待审核";
  }
  if (status === "succeeded") {
    return "已完成";
  }
  if (status === "failed") {
    return "失败";
  }
  return "已取消";
}

export function formatTaskStatus(task: DrawerTask): string {
  if (task.pendingManualRecovery) {
    return "待恢复";
  }
  return formatStatus(task.status);
}

export function toStatusVariant(status: TaskStatus): "default" | "outline" | "secondary" | "destructive" {
  if (status === "running") {
    return "default";
  }
  if (status === "failed") {
    return "destructive";
  }
  if (status === "queued" || status === "waiting_approval") {
    return "secondary";
  }
  return "outline";
}

export function toTaskStatusVariant(task: DrawerTask): "default" | "outline" | "secondary" | "destructive" {
  if (task.pendingManualRecovery) {
    return "secondary";
  }
  return toStatusVariant(task.status);
}

export function formatCheckpoint(checkpoint: NovelWorkflowMilestoneType | null | undefined, scopeLabel?: string | null): string {
  const resolvedScopeLabel = scopeLabel?.trim() || "前 10 章";
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
    return "卷战略 / 卷骨架待审核";
  }
  if (checkpoint === "chapter_batch_ready") {
    return `${resolvedScopeLabel}自动执行已暂停`;
  }
  if (checkpoint === "workflow_completed") {
    return "主流程完成";
  }
  return "暂无";
}

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

export function formatStepStatus(status: "idle" | "running" | "succeeded" | "failed" | "cancelled"): string {
  if (status === "running") {
    return "进行中";
  }
  if (status === "succeeded") {
    return "已完成";
  }
  if (status === "failed") {
    return "失败";
  }
  if (status === "cancelled") {
    return "已取消";
  }
  return "待处理";
}

export function formatRiskLevel(riskLevel: CharacterResourceProposalSummary["riskLevel"]): string {
  if (riskLevel === "high") {
    return "高风险";
  }
  if (riskLevel === "medium") {
    return "需判断";
  }
  return "低风险";
}

export function formatProposalSource(proposal: CharacterResourceProposalSummary): string {
  return proposal.sourceType === "chapter_background_sync" ? "自动同步发现" : "手动复查发现";
}

export function followUpActionVariant(action: AutoDirectorAction): "default" | "outline" {
  return action.kind === "mutation" && action.riskLevel !== "high" ? "default" : "outline";
}

export function formatFollowUpPriority(priority: "P0" | "P1" | "P2"): string {
  if (priority === "P0") {
    return "P0 立即处理";
  }
  if (priority === "P1") {
    return "P1 尽快处理";
  }
  return "P2 稍后处理";
}

export function readProposalPayloadText(
  proposal: CharacterResourceProposalSummary,
  key: string,
): string {
  const value = proposal.payload[key];
  return typeof value === "string" ? value.trim() : "";
}
