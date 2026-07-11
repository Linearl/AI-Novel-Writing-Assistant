/**
 * generationPackage.ts — Acceptance, audit report, and generation package schemas.
 *
 * Split from chapterRuntime.ts (REQ-7020) to keep each file under 700 lines.
 * Imports shared schemas from chapterCore, chapterStyle, and chapterContext.
 */
import { z } from "zod";
import { generationNextActionSchema } from "./canonicalState.js";
import { timelineCheckResultSchema } from "./timeline.js";
import {
  auditTypeSchema,
  runtimeAuditIssueSchema,
  chapterGenerationStateSchema,
  runtimeQualityScoreSchema,
} from "./chapterCore.js";
import {
  runtimeStyleReviewSchema,
  runtimeLengthControlSchema,
} from "./chapterStyle.js";
import {
  chapterExecutionObligationContractSchema,
  chapterExecutionObligationCoverageSchema,
  chapterFailureClassificationSchema,
  generationContextPackageSchema,
} from "./chapterContext.js";

// ---------------------------------------------------------------------------
// Acceptance schemas
// ---------------------------------------------------------------------------

export const chapterAcceptanceStatusSchema = z.enum(["accepted", "repairable", "needs_manual_review", "continue_with_risk"]);
export const chapterAcceptanceContinuePolicySchema = z.enum(["continue", "repair_once", "pause"]);
export const chapterAcceptanceRepairDirectiveSchema = z.object({
  mode: z.enum(["patch", "rewrite", "manual"]),
  target: z.enum(["continuity", "character", "plot", "ending", "voice"]),
  instruction: z.string(),
});
export const chapterAcceptanceRepairabilitySchema = z.enum([
  "none",
  "patchable_obligation_gap",
  "rewrite_needed",
  "plan_misalignment",
]);
export const chapterAcceptanceAssetSyncRecommendationSchema = z.object({
  priority: z.enum(["normal", "high"]),
  reason: z.string(),
  requiresFullPayoffReconcile: z.boolean(),
});

// ---------------------------------------------------------------------------
// Audit report
// ---------------------------------------------------------------------------

export const runtimeAuditReportSchema = z.object({
  id: z.string(),
  novelId: z.string(),
  chapterId: z.string(),
  auditType: auditTypeSchema,
  overallScore: z.number().nullable().optional(),
  summary: z.string().nullable().optional(),
  legacyScoreJson: z.string().nullable().optional(),
  issues: z.array(runtimeAuditIssueSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ---------------------------------------------------------------------------
// Chapter runtime package (top-level orchestration schema)
// ---------------------------------------------------------------------------

export const chapterRuntimePackageSchema = z.object({
  novelId: z.string(),
  chapterId: z.string(),
  context: generationContextPackageSchema,
  draft: z.object({
    content: z.string(),
    wordCount: z.number().int().nonnegative(),
    generationState: chapterGenerationStateSchema.optional(),
  }),
  audit: z.object({
    score: runtimeQualityScoreSchema,
    reports: z.array(runtimeAuditReportSchema),
    openIssues: z.array(runtimeAuditIssueSchema),
    hasBlockingIssues: z.boolean(),
  }),
  obligationContract: chapterExecutionObligationContractSchema.default({
    mustHitNow: [],
    mustPreserve: [],
    requiredPayoffTouches: [],
    requiredCharacterAppearances: [],
    requiredGoalChanges: [],
    canDefer: [],
    forbiddenCrossings: [],
  }),
  obligationCoverage: chapterExecutionObligationCoverageSchema.default({
    status: "satisfied",
    missing: [],
    summary: "旧运行记录未包含章节义务覆盖信息。",
  }),
  failureClassification: chapterFailureClassificationSchema.default({
    code: "none",
    summary: "旧运行记录未包含失败分类。",
    decisionReason: null,
    blockingObligations: [],
  }),
  replanRecommendation: z.object({
    recommended: z.boolean(),
    action: z.enum(["continue_with_warning", "local_patch_plan", "stop_for_replan"]).optional(),
    reason: z.string(),
    blockingIssueIds: z.array(z.string()),
    blockingLedgerKeys: z.array(z.string()).default([]),
    affectedChapterOrders: z.array(z.number().int()).default([]),
    anchorChapterOrder: z.number().int().nullable().optional(),
    triggerReason: z.string().optional(),
    windowReason: z.string().optional(),
    whyTheseChapters: z.string().optional(),
  }),
  lengthControl: runtimeLengthControlSchema.optional(),
  styleReview: runtimeStyleReviewSchema.optional(),
  timelineCheck: timelineCheckResultSchema.optional(),
  meta: z.object({
    provider: z.string().optional(),
    model: z.string().optional(),
    temperature: z.number().optional(),
    runId: z.string().optional(),
    generatedAt: z.string().optional(),
    nextAction: generationNextActionSchema.optional(),
    stateGoalSummary: z.string().optional(),
    pendingReviewProposalCount: z.number().int().nonnegative().optional(),
    acceptanceStatus: chapterAcceptanceStatusSchema.optional(),
    continuePolicy: chapterAcceptanceContinuePolicySchema.optional(),
    riskTags: z.array(z.string()).optional(),
    repairDirectives: z.array(chapterAcceptanceRepairDirectiveSchema).optional(),
    assetSyncRecommendation: chapterAcceptanceAssetSyncRecommendationSchema.optional(),
  }),
});

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

export type ChapterAcceptanceStatus = z.infer<typeof chapterAcceptanceStatusSchema>;
export type ChapterAcceptanceContinuePolicy = z.infer<typeof chapterAcceptanceContinuePolicySchema>;
export type ChapterAcceptanceRepairDirective = z.infer<typeof chapterAcceptanceRepairDirectiveSchema>;
export type ChapterAcceptanceRepairability = z.infer<typeof chapterAcceptanceRepairabilitySchema>;
export type ChapterAcceptanceAssetSyncRecommendation = z.infer<typeof chapterAcceptanceAssetSyncRecommendationSchema>;
export type RuntimeAuditReport = z.infer<typeof runtimeAuditReportSchema>;
export type ChapterRuntimePackage = z.infer<typeof chapterRuntimePackageSchema>;
