/**
 * NovelPromptMaterialUtils.ts
 *
 * Utility functions extracted from NovelPromptMaterialExporter.ts.
 * Shared helpers for block construction, text formatting, and token limiting.
 */

import { estimateTextTokens } from "../core/contextBudget";
import { listNovelMaterialGroupDefinitions } from "./materialGroups";
import type {
  NovelMaterialBlock,
  NovelMaterialImportance,
  NovelMaterialSourceType,
} from "./types";

// ---------------------------------------------------------------------------
// Text formatting
// ---------------------------------------------------------------------------

function compactLines(lines: Array<string | null | undefined | false>): string {
  return lines
    .filter((line): line is string => typeof line === "string" && line.trim().length > 0)
    .join("\n");
}

function formatDate(value: Date | string | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return value instanceof Date ? value.toISOString() : value;
}

function truncateText(value: string | null | undefined, maxChars: number): string {
  const text = value?.trim() ?? "";
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxChars - 20)).trimEnd()}\n...[已裁剪]`;
}

function jsonArrayPreview(value: string | null | undefined, fallback = "无"): string {
  if (!value?.trim()) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => `- ${String(item)}`).join("\n") || fallback;
    }
    if (parsed && typeof parsed === "object") {
      return JSON.stringify(parsed, null, 2);
    }
  } catch {
    return value;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Block factory
// ---------------------------------------------------------------------------

function block(input: {
  group: string;
  title: string;
  content: string;
  required: boolean;
  importance: NovelMaterialImportance;
  sourceType: NovelMaterialSourceType;
  sourceId?: string;
  updatedAt?: Date | string | null;
}): NovelMaterialBlock | null {
  const content = input.content.trim();
  if (!content) {
    return null;
  }
  return {
    id: `${input.group}:${input.sourceId ?? "main"}`,
    group: input.group,
    title: input.title,
    content,
    required: input.required,
    importance: input.importance,
    source: {
      type: input.sourceType,
      id: input.sourceId,
      updatedAt: formatDate(input.updatedAt),
    },
    estimatedTokens: estimateTextTokens(content),
  };
}

function dedupe(input: string[]): string[] {
  return [...new Set(input.filter((item) => item.trim().length > 0))];
}

// ---------------------------------------------------------------------------
// Group sorting
// ---------------------------------------------------------------------------

const DEFAULT_MATERIAL_GROUPS = listNovelMaterialGroupDefinitions().map((definition) => definition.group);

function sortRequestedGroups(groups?: string[]): string[] {
  const requested = groups?.map((group) => group.trim()).filter(Boolean);
  if (!requested || requested.length === 0) {
    return DEFAULT_MATERIAL_GROUPS;
  }
  return dedupe(requested);
}

// ---------------------------------------------------------------------------
// Token limiting
// ---------------------------------------------------------------------------

function applyTokenLimit(input: {
  blocks: NovelMaterialBlock[];
  maxTokens: number;
  warnings: string[];
}): NovelMaterialBlock[] {
  const maxTokens = Math.max(0, input.maxTokens);
  const total = input.blocks.reduce((sum, item) => sum + item.estimatedTokens, 0);
  if (maxTokens === 0 || total <= maxTokens) {
    return input.blocks;
  }

  let remaining = maxTokens;
  const limited: NovelMaterialBlock[] = [];
  for (const item of input.blocks) {
    if (remaining <= 0) {
      input.warnings.push(`${item.title} 未进入导出结果：超过本次资料预算。`);
      continue;
    }
    if (item.estimatedTokens <= remaining) {
      limited.push(item);
      remaining -= item.estimatedTokens;
      continue;
    }
    // estimateTextTokens 改为 1 字符 = 1 token，因此 allowedChars 直接等于 remaining
    const allowedChars = Math.max(60, remaining);
    const content = truncateText(item.content, allowedChars);
    input.warnings.push(`${item.title} 已裁剪：超过本次资料预算。`);
    limited.push({
      ...item,
      content,
      estimatedTokens: estimateTextTokens(content),
    });
    remaining = 0;
  }
  return limited;
}

export {
  compactLines,
  formatDate,
  truncateText,
  jsonArrayPreview,
  block,
  dedupe,
  sortRequestedGroups,
  applyTokenLimit,
};

export const DEFAULT_RECENT_CHAPTER_LIMIT = 3;
export const DEFAULT_MAX_TOKENS = 12000;
