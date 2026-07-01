import { z } from "zod";
import {
  toolCountSchema,
  toolNullableTextSchema,
  toolRequiredIdSchema,
  toolSummarySchema,
} from "./toolSchemaPrimitives";

// ─── audit_payoff_health ─────────────────────────────────────────────────

export const payoffStatusCountSchema = z.object({
  status: z.string().describe("PayoffLedgerStatus 枚举值"),
  count: toolCountSchema,
  riskLevel: z.enum(["low", "medium", "high"]).describe("风险等级：overdue/failed 为 high"),
});

export const overduePayoffItemSchema = z.object({
  id: z.string(),
  ledgerKey: z.string(),
  title: z.string(),
  summary: z.string(),
  currentStatus: z.string(),
  targetStartChapterOrder: z.number().int().nullable(),
  targetEndChapterOrder: z.number().int().nullable(),
  lastTouchedChapterOrder: z.number().int().nullable(),
  statusReason: toolNullableTextSchema,
});

export const auditPayoffHealthInputSchema = z.object({
  novelId: toolRequiredIdSchema,
});

export const auditPayoffHealthOutputSchema = z.object({
  novelId: z.string(),
  totalItems: toolCountSchema,
  statusCounts: z.array(payoffStatusCountSchema),
  overdueItems: z.array(overduePayoffItemSchema),
  failedItems: z.array(overduePayoffItemSchema),
  healthScore: z.number().min(0).max(1).describe("健康分：1=全部已收束，0=全部逾期/失败"),
  summary: toolSummarySchema,
});

// ─── audit_volume_theme_coverage ─────────────────────────────────────────

export const volumeThemeCoverageItemSchema = z.object({
  volumeId: z.string(),
  volumeSortOrder: z.number().int(),
  volumeTitle: z.string(),
  mainPromise: toolNullableTextSchema,
  chapterCount: toolCountSchema,
  chaptersWithPurpose: toolCountSchema,
  coverageRatio: z.number().min(0).max(1).describe("chaptersWithPurpose / chapterCount"),
  uncoveredChapterOrders: z.array(z.number().int()).describe("缺少 purpose 的章节序号列表"),
});

export const auditVolumeThemeCoverageInputSchema = z.object({
  novelId: toolRequiredIdSchema,
});

export const auditVolumeThemeCoverageOutputSchema = z.object({
  novelId: z.string(),
  volumeCount: toolCountSchema,
  volumes: z.array(volumeThemeCoverageItemSchema),
  overallCoverageRatio: z.number().min(0).max(1),
  summary: toolSummarySchema,
});

// ─── get_theme_hierarchy ─────────────────────────────────────────────────

export const chapterThemeItemSchema = z.object({
  volumeChapterPlanId: z.string(),
  chapterOrder: z.number().int(),
  title: z.string(),
  purpose: toolNullableTextSchema,
  summary: z.string(),
});

export const volumeThemeItemSchema = z.object({
  volumeId: z.string(),
  sortOrder: z.number().int(),
  title: z.string(),
  mainPromise: toolNullableTextSchema,
  summary: toolNullableTextSchema,
  chapters: z.array(chapterThemeItemSchema),
});

export const getThemeHierarchyInputSchema = z.object({
  novelId: toolRequiredIdSchema,
});

export const getThemeHierarchyOutputSchema = z.object({
  novelId: z.string(),
  bible: z.object({
    exists: z.boolean(),
    mainPromise: toolNullableTextSchema,
    coreSetting: toolNullableTextSchema,
    characterArcs: toolNullableTextSchema,
  }),
  volumes: z.array(volumeThemeItemSchema),
  totalVolumeCount: toolCountSchema,
  totalChapterPlanCount: toolCountSchema,
  summary: toolSummarySchema,
});
