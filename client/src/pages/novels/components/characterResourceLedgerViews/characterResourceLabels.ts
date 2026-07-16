import type { CharacterResourceLedgerItem } from "@ai-novel/shared";

export function getResourceStatusLabel(status: CharacterResourceLedgerItem["status"]): string {
  const labels: Record<CharacterResourceLedgerItem["status"], string> = {
    available: "可用",
    hidden: "隐藏",
    borrowed: "借用",
    transferred: "转交",
    lost: "丢失",
    consumed: "已消耗",
    damaged: "受损",
    destroyed: "毁坏",
    stale: "淡出",
  };
  return labels[status] ?? status;
}

export function getResourceFunctionLabel(value: CharacterResourceLedgerItem["narrativeFunction"]): string {
  const labels: Record<CharacterResourceLedgerItem["narrativeFunction"], string> = {
    tool: "工具",
    clue: "线索",
    weapon: "武器",
    proof: "证据",
    key: "钥匙",
    cost: "代价",
    promise: "伏笔",
    hidden_card: "底牌",
    constraint: "限制",
  };
  return labels[value] ?? value;
}

export function getResourceTypeLabel(value: CharacterResourceLedgerItem["resourceType"]): string {
  const labels: Record<CharacterResourceLedgerItem["resourceType"], string> = {
    physical_item: "实物",
    clue: "线索物",
    credential: "凭证",
    ability_resource: "能力",
    relationship_token: "关系信物",
    consumable: "消耗品",
    hidden_card: "底牌",
    world_resource: "世界资源",
  };
  return labels[value] ?? value;
}

export function getRiskLevelVariant(riskSignals: CharacterResourceLedgerItem["riskSignals"]): "success" | "info" | "warning" | "error" {
  if (riskSignals.some((s) => s.severity === "critical")) return "error";
  if (riskSignals.some((s) => s.severity === "high")) return "warning";
  if (riskSignals.some((s) => s.severity === "medium")) return "info";
  return "success";
}

export function getRiskLevelLabel(riskSignals: CharacterResourceLedgerItem["riskSignals"]): string {
  const variant = getRiskLevelVariant(riskSignals);
  const labels: Record<string, string> = {
    error: "高风险",
    warning: "中风险",
    info: "低风险",
    success: "无风险",
  };
  return labels[variant];
}

export function isBlockedStatus(status: CharacterResourceLedgerItem["status"]): boolean {
  return status === "lost" || status === "consumed" || status === "destroyed" || status === "damaged";
}

export function getOwnerTypeLabel(value: CharacterResourceLedgerItem["ownerType"]): string {
  const labels: Record<CharacterResourceLedgerItem["ownerType"], string> = {
    character: "角色",
    organization: "组织",
    location: "地点",
    world: "世界",
    unknown: "未知",
  };
  return labels[value] ?? value;
}
