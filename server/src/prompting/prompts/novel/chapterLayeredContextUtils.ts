/**
 * chapterLayeredContextUtils.ts
 *
 * Shared text utilities extracted from chapterLayeredContextHelpers.ts.
 * Pure text manipulation — no domain-specific dependencies.
 */

import { resolveLengthBudgetContract } from "@ai-novel/shared";
import type { GenerationContextPackage } from "@ai-novel/shared";

// ---------------------------------------------------------------------------
// Text utilities
// ---------------------------------------------------------------------------

export function compactText(value: string | null | undefined, fallback = ""): string {
  return value?.replace(/\s+/g, " ").trim() || fallback;
}

export function takeUnique(items: Array<string | null | undefined>, limit = items.length): string[] {
  const seen = new Set<string>();
  const results: string[] = [];
  for (const item of items) {
    const normalized = compactText(item);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    results.push(normalized);
    if (results.length >= limit) {
      break;
    }
  }
  return results;
}

export function splitLines(value: string | null | undefined, limit = 4): string[] {
  return takeUnique(
    (value ?? "")
      .split(/\r?\n+/g)
      .map((line) => line.replace(/^[-*\d.\s]+/, "").trim()),
    limit,
  );
}

export function toListBlock(title: string, values: string[], emptyLabel = "无"): string {
  if (values.length === 0) {
    return `${title}: ${emptyLabel}`;
  }
  return [title, ...values.map((value) => `- ${value}`)].join("\n");
}

// ---------------------------------------------------------------------------
// Word range / ledger
// ---------------------------------------------------------------------------

export function resolveTargetWordRange(targetWordCount: number | null | undefined): {
  targetWordCount: number | null;
  minWordCount: number | null;
  maxWordCount: number | null;
} {
  const budget = resolveLengthBudgetContract(targetWordCount);
  if (!budget) {
    return {
      targetWordCount: null,
      minWordCount: null,
      maxWordCount: null,
    };
  }
  return {
    targetWordCount: budget.targetWordCount,
    minWordCount: budget.softMinWordCount,
    maxWordCount: budget.softMaxWordCount,
  };
}

function formatLedgerWindow(start?: number | null, end?: number | null): string {
  if (typeof start === "number" && typeof end === "number") {
    return `目标窗口=${start}-${end}`;
  }
  if (typeof end === "number") {
    return `目标窗口截止第${end}章`;
  }
  if (typeof start === "number") {
    return `目标窗口起于第${start}章`;
  }
  return "";
}

export function buildLedgerItemLine(
  item: GenerationContextPackage["ledgerPendingItems"][number],
  label: string,
): string {
  return takeUnique([
    `${label}: ${item.title}`,
    item.summary,
    formatLedgerWindow(item.targetStartChapterOrder, item.targetEndChapterOrder),
    item.statusReason ?? "",
  ], 4).join(" | ");
}
