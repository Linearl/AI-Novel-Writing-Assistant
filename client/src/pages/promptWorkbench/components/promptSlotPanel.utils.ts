import type { PromptSlotDef, PromptSlotOverrideEntry } from "@/api/promptWorkbench";

export type SlotKind = "replace" | "append" | "choice" | "toggle" | "token";

export const SLOT_KIND_LABELS: Record<string, string> = {
  replace: "改写",
  append: "追加约束",
  choice: "选项",
  toggle: "开关",
  token: "内联值",
};

export function getSlotDefault(def: PromptSlotDef): string | boolean {
  return def.default;
}

export function getEffectiveValue(
  def: PromptSlotDef,
  overrideEntry: PromptSlotOverrideEntry | undefined,
): string | boolean {
  if (overrideEntry !== undefined) return overrideEntry.value;
  return getSlotDefault(def);
}

export function isDefaultValue(def: PromptSlotDef, value: string | boolean): boolean {
  return value === getSlotDefault(def);
}

export function buildOverrideParamsKey(promptId: string, novelId: string): string {
  return JSON.stringify({ promptId, novelId: novelId || undefined });
}

export function buildReconcileParamsKey(promptId: string, scope: string, novelId: string): string {
  return JSON.stringify({ promptId, scope, novelId: novelId || undefined });
}
