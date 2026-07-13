import type { OpenConflict } from "@ai-novel/shared";

export function compactText(value: string | null | undefined, fallback = "无"): string {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

export function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw?.trim()) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function normalizeConflict(row: {
  id: string;
  novelId: string;
  chapterId: string | null;
  sourceSnapshotId: string | null;
  sourceIssueId: string | null;
  sourceType: string;
  conflictType: string;
  conflictKey: string;
  title: string;
  summary: string;
  severity: string;
  status: string;
  evidenceJson: string | null;
  resolutionHint: string | null;
  lastSeenChapterOrder: number | null;
  createdAt: Date;
  updatedAt: Date;
}): OpenConflict {
  return {
    id: row.id,
    novelId: row.novelId,
    chapterId: row.chapterId,
    sourceSnapshotId: row.sourceSnapshotId,
    sourceIssueId: row.sourceIssueId,
    sourceType: row.sourceType,
    conflictType: row.conflictType,
    conflictKey: row.conflictKey,
    title: row.title,
    summary: row.summary,
    severity: row.severity,
    status: row.status,
    evidenceJson: row.evidenceJson,
    resolutionHint: row.resolutionHint,
    lastSeenChapterOrder: row.lastSeenChapterOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function formatMajorPayoffs(rawPlanJson: string | null | undefined): string {
  const parsed = safeParseJson<{ major_payoffs?: unknown }>(rawPlanJson, {});
  const majorPayoffs = Array.isArray(parsed.major_payoffs)
    ? parsed.major_payoffs.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
  return majorPayoffs.length > 0
    ? majorPayoffs.map((item, index) => `${index + 1}. ${item}`).join("\n")
    : "无";
}
