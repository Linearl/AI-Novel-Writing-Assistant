/**
 * REQ-2038: Setting consistency check — shared types.
 *
 * Covers the structured output schema for LLM-based setting contradiction detection,
 * plus file-based storage shapes for reports and ignored records.
 */

import { z } from "zod";

/* ── Enums / literal unions ─────────────────────────────────────────── */

export const CONTRADICTION_SEVERITY_VALUES = ["critical", "warning", "info"] as const;
export type ContradictionSeverity = (typeof CONTRADICTION_SEVERITY_VALUES)[number];

export const CONTRADICTION_CATEGORY_VALUES = [
  "field_conflict",
  "timeline_conflict",
  "worldview_inconsistency",
] as const;
export type ContradictionCategory = (typeof CONTRADICTION_CATEGORY_VALUES)[number];

export const CONSISTENCY_OVERALL_SCORE_VALUES = ["pass", "warning", "fail"] as const;
export type ConsistencyOverallScore = (typeof CONSISTENCY_OVERALL_SCORE_VALUES)[number];

/* ── Zod schemas (for LLM structured output + API validation) ──────── */

export const contradictionSchema = z.object({
  id: z.string().min(1),
  severity: z.enum(CONTRADICTION_SEVERITY_VALUES),
  category: z.enum(CONTRADICTION_CATEGORY_VALUES),
  fieldA: z.string().min(1),
  valueA: z.string(),
  fieldB: z.string().min(1),
  valueB: z.string(),
  description: z.string(),
  suggestion: z.string(),
});
export type Contradiction = z.infer<typeof contradictionSchema>;

export const settingConsistencyReportSchema = z.object({
  novelId: z.string().min(1),
  checkedAt: z.string(),
  contradictions: z.array(contradictionSchema),
  overallScore: z.enum(CONSISTENCY_OVERALL_SCORE_VALUES),
  summary: z.string(),
});
export type SettingConsistencyReport = z.infer<typeof settingConsistencyReportSchema>;

export const ignoredContradictionSchema = z.object({
  id: z.string().min(1),
  ignoredAt: z.string(),
  reason: z.string().optional(),
});
export type IgnoredContradiction = z.infer<typeof ignoredContradictionSchema>;

/* ── API input schemas ─────────────────────────────────────────────── */

export const consistencyCheckBodySchema = z.object({
  /** World settings JSON to validate — caller assembles this from novel world data. */
  settings: z.record(z.string(), z.unknown()),
  provider: z.string().optional(),
  model: z.string().optional(),
});
export type ConsistencyCheckBody = z.infer<typeof consistencyCheckBodySchema>;

export const ignoreContradictionBodySchema = z.object({
  contradictionId: z.string().min(1),
  reason: z.string().max(500).optional(),
});
export type IgnoreContradictionBody = z.infer<typeof ignoreContradictionBodySchema>;
