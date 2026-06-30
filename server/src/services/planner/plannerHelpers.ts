const plannerStoryModeSelect = {
  id: true,
  name: true,
  description: true,
  template: true,
  parentId: true,
  profileJson: true,
  createdAt: true,
  updatedAt: true,
} as const;

function compactText(value: string | null | undefined, fallback = ""): string {
  return String(value ?? "").replace(/\s+/g, " ").trim() || fallback;
}

function takeUnique(items: Array<string | null | undefined>, limit = items.length): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const normalized = compactText(item);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
    if (result.length >= limit) {
      break;
    }
  }
  return result;
}

function buildPlannerStateDrivenDirective(input: {
  nextAction: string;
  pendingReviewProposalCount: number;
  openAuditIssueCount: number;
}): string {
  return [
    `recommended_next_action=${input.nextAction}`,
    `pending_state_review=${input.pendingReviewProposalCount}`,
    `open_audit_issues=${input.openAuditIssueCount}`,
  ].join("\n");
}

function buildPlannerStateGoalText(input: {
  summary: string | null;
  targetConflicts: string[];
  targetRelationships: string[];
  targetPayoffs: string[];
  protectedSecrets: string[];
  recentTimeline: string[];
}): string {
  return [
    `章节状态目标：${compactText(input.summary, "无")}`,
    `应推进冲突：${takeUnique(input.targetConflicts, 4).join("；") || "无"}`,
    `应推进关系：${takeUnique(input.targetRelationships, 4).join("；") || "无"}`,
    `应触碰 payoff：${takeUnique(input.targetPayoffs, 4).join("；") || "无"}`,
    `禁止提前泄露：${takeUnique(input.protectedSecrets, 4).join("；") || "无"}`,
    `最近关键事件：${takeUnique(input.recentTimeline, 3).join("；") || "无"}`,
  ].join("\n");
}

export {
  plannerStoryModeSelect,
  compactText,
  takeUnique,
  buildPlannerStateDrivenDirective,
  buildPlannerStateGoalText,
};

export { normalizePlannerOutput } from "./plannerOutputNormalization";
