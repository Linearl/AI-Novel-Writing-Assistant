/**
 * chapterContext.ts — Prompt context and contract schemas for chapter generation.
 *
 * Split from chapterRuntime.ts (REQ-7020) to keep each file under 700 lines.
 * Imports shared enums from chapterCore and style/length schemas from chapterStyle.
 */
import { z } from "zod";
import { chapterScenePlanSchema, lengthBudgetContractSchema } from "./chapterLengthControl";
import {
  canonicalStateSnapshotSchema,
  chapterStateGoalSchema,
  chapterPayoffDirectiveSchema,
  generationNextActionSchema,
} from "./canonicalState";
import { characterResourceContextSchema } from "./characterResource";
import { storyWorldSliceSchema } from "./storyWorldSlice";
import { timelineContextForChapterSchema } from "./timeline";
import {
  auditSeveritySchema,
  auditModeSchema,
  storyPlanRoleSchema,
  dynamicCharacterRiskLevelSchema,
  runtimeCharacterSchema,
  runtimePayoffLedgerItemSchema,
  runtimePayoffLedgerSummarySchema,
  runtimeChapterSchema,
  runtimePlanSchema,
  runtimeStateSnapshotSchema,
  runtimeOpenConflictSchema,
  runtimeCreativeDecisionSchema,
  runtimeAuditIssueSchema,
  runtimeContinuationSchema,
} from "./chapterCore";
import {
  runtimeStyleContractSchema,
  runtimeStyleContextSchema,
} from "./chapterStyle";

// ---------------------------------------------------------------------------
// Prompt budget & context gating
// ---------------------------------------------------------------------------

export const promptBudgetProfileSchema = z.object({
  promptId: z.string(),
  maxTokensBudget: z.number().int().positive(),
  preferredGroups: z.array(z.string()).default([]),
  dropOrder: z.array(z.string()).default([]),
});

export const contextGatingDecisionSchema = z.object({
  blockId: z.string(),
  tier: z.enum(["hard_required", "situational", "optional"]),
  included: z.boolean(),
  reason: z.string().optional(),
});

export const chapterChangeFlagsSchema = z.object({
  introducedPayoff: z.boolean().default(false),
  payoffResolutionSignal: z.boolean().default(false),
  relationshipShiftSignal: z.boolean().default(false),
  majorStateShiftSignal: z.boolean().default(false),
});

export const tokenBudgetPolicySchema = z.object({
  chapterBudgetProfile: z.string().default("balanced"),
  stageTokenCap: z.record(z.string(), z.number().int().positive()).default({}),
  retryCap: z.record(z.string(), z.number().int().nonnegative()).default({}),
  auditMode: auditModeSchema.default("light"),
});

// ---------------------------------------------------------------------------
// Book / macro / volume context
// ---------------------------------------------------------------------------

export const bookContractContextSchema = z.object({
  title: z.string(),
  genre: z.string(),
  targetAudience: z.string(),
  sellingPoint: z.string(),
  first30ChapterPromise: z.string(),
  narrativePov: z.string(),
  pacePreference: z.string(),
  emotionIntensity: z.string(),
  toneGuardrails: z.array(z.string()).default([]),
  hardConstraints: z.array(z.string()).default([]),
});

export const macroConstraintContextSchema = z.object({
  sellingPoint: z.string(),
  coreConflict: z.string(),
  mainHook: z.string(),
  progressionLoop: z.string(),
  growthPath: z.string(),
  endingFlavor: z.string(),
  hardConstraints: z.array(z.string()).default([]),
});

export const volumeKeyMilestoneGuardSchema = z.object({
  targetChapterRange: z.string(),
  event: z.string(),
  status: z.enum(["not_yet", "in_progress", "done"]).default("not_yet"),
  note: z.string(),
});

export const volumeWindowContextSchema = z.object({
  volumeId: z.string().nullable().optional(),
  sortOrder: z.number().int().nullable().optional(),
  title: z.string(),
  missionSummary: z.string(),
  adjacentSummary: z.string(),
  pendingPayoffs: z.array(z.string()).default([]),
  softFutureSummary: z.string(),
  keyMilestoneGuards: z.array(volumeKeyMilestoneGuardSchema).default([]),
});

// ---------------------------------------------------------------------------
// Chapter mission, boundary & obligation contracts
// ---------------------------------------------------------------------------

export const chapterMissionContextSchema = z.object({
  chapterId: z.string(),
  chapterOrder: z.number().int(),
  title: z.string(),
  objective: z.string(),
  expectation: z.string(),
  taskSheet: z.string().nullable().optional(),
  targetWordCount: z.number().int().nullable().optional(),
  planRole: storyPlanRoleSchema.nullable().optional(),
  hookTarget: z.string(),
  mustAdvance: z.array(z.string()).default([]),
  mustPreserve: z.array(z.string()).default([]),
  riskNotes: z.array(z.string()).default([]),
});

export const chapterBoundaryContractSchema = z.object({
  exclusiveEvent: z.string().nullable().optional(),
  entryState: z.string().nullable().optional(),
  endingState: z.string().nullable().optional(),
  nextChapterEntryState: z.string().nullable().optional(),
  doNotCross: z.array(z.string()).default([]),
  protectedReveals: z.array(z.string()).default([]),
  allowedRevealLevel: z.number().int().nullable().optional(),
});

export const chapterExecutionObligationContractSchema = z.object({
  mustHitNow: z.array(z.string()).default([]),
  mustPreserve: z.array(z.string()).default([]),
  requiredPayoffTouches: z.array(z.string()).default([]),
  requiredCharacterAppearances: z.array(z.string()).default([]),
  requiredGoalChanges: z.array(z.string()).default([]),
  canDefer: z.array(z.string()).default([]),
  forbiddenCrossings: z.array(z.string()).default([]),
});

export const chapterExecutionObligationKindSchema = z.enum([
  "must_hit_now",
  "must_preserve",
  "payoff_touch",
  "character_appearance",
  "goal_change",
  "forbidden_crossing",
]);

export const chapterExecutionObligationCoverageStatusSchema = z.enum([
  "satisfied",
  "partial",
  "unmet",
]);

export const chapterExecutionMissingObligationSchema = z.object({
  kind: chapterExecutionObligationKindSchema,
  summary: z.string(),
  evidence: z.string().nullable().optional(),
});

export const chapterExecutionObligationCoverageSchema = z.object({
  status: chapterExecutionObligationCoverageStatusSchema,
  missing: z.array(chapterExecutionMissingObligationSchema).default([]),
  summary: z.string(),
});

export const chapterFailureClassificationCodeSchema = z.enum([
  "none",
  "draft_generation_failed",
  "draft_obligation_unmet",
  "draft_repair_exhausted",
  "replan_required",
]);

export const chapterFailureClassificationSchema = z.object({
  code: chapterFailureClassificationCodeSchema,
  summary: z.string(),
  decisionReason: z.string().nullable().optional(),
  blockingObligations: z.array(chapterExecutionMissingObligationSchema).default([]),
});

// ---------------------------------------------------------------------------
// Character behaviour / relation / candidate guards
// ---------------------------------------------------------------------------

export const chapterCharacterBehaviorGuideSchema = z.object({
  characterId: z.string(),
  name: z.string(),
  role: z.string(),
  castRole: z.string().nullable().optional(),
  volumeRoleLabel: z.string().nullable().optional(),
  volumeResponsibility: z.string().nullable().optional(),
  currentGoal: z.string().nullable().optional(),
  currentState: z.string().nullable().optional(),
  visibleProfileSummary: z.string().nullable().optional(),
  factionLabel: z.string().nullable().optional(),
  stanceLabel: z.string().nullable().optional(),
  relationStageLabels: z.array(z.string()).default([]),
  relationRiskNotes: z.array(z.string()).default([]),
  plannedChapterOrders: z.array(z.number().int()).default([]),
  absenceRisk: dynamicCharacterRiskLevelSchema,
  absenceSpan: z.number().int().nonnegative(),
  isCoreInVolume: z.boolean(),
  shouldPreferAppearance: z.boolean(),
});

export const chapterRelationStageGuideSchema = z.object({
  relationId: z.string().nullable().optional(),
  sourceCharacterId: z.string(),
  sourceCharacterName: z.string(),
  targetCharacterId: z.string(),
  targetCharacterName: z.string(),
  stageLabel: z.string(),
  stageSummary: z.string(),
  nextTurnPoint: z.string().nullable().optional(),
  isCurrent: z.boolean(),
});

export const chapterCandidateGuardSchema = z.object({
  id: z.string(),
  proposedName: z.string(),
  proposedRole: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  evidence: z.array(z.string()).default([]),
  sourceChapterOrder: z.number().int().nullable().optional(),
});

export const chapterCharacterHardFactSchema = z.object({
  characterId: z.string(),
  name: z.string(),
  role: z.string().nullable().optional(),
  identityLabel: z.string().nullable().optional(),
  factionLabel: z.string().nullable().optional(),
  stanceLabel: z.string().nullable().optional(),
  powerLevel: z.string().nullable().optional(),
  realm: z.string().nullable().optional(),
  currentLocation: z.string().nullable().optional(),
  availability: z.string().nullable().optional(),
  currentState: z.string().nullable().optional(),
  currentGoal: z.string().nullable().optional(),
  prohibitions: z.array(z.string()).default([]),
});

// ---------------------------------------------------------------------------
// Write / Review / Repair context schemas
// ---------------------------------------------------------------------------

export const chapterWriteContextSchema = z.object({
  bookContract: bookContractContextSchema,
  macroConstraints: macroConstraintContextSchema.nullable(),
  volumeWindow: volumeWindowContextSchema.nullable(),
  narrativeProgressHint: z.string().nullable().optional(),
  chapterMission: chapterMissionContextSchema,
  nextAction: generationNextActionSchema.default("write_chapter"),
  chapterStateGoal: chapterStateGoalSchema.nullable().optional(),
  protectedSecrets: z.array(z.string()).default([]),
  payoffDirectives: z.array(chapterPayoffDirectiveSchema).default([]),
  obligationContract: chapterExecutionObligationContractSchema.default({
    mustHitNow: [],
    mustPreserve: [],
    requiredPayoffTouches: [],
    requiredCharacterAppearances: [],
    requiredGoalChanges: [],
    canDefer: [],
    forbiddenCrossings: [],
  }),
  chapterBoundary: chapterBoundaryContractSchema.nullable().optional(),
  lengthBudget: lengthBudgetContractSchema.nullable(),
  scenePlan: chapterScenePlanSchema.nullable().optional(),
  participants: z.array(runtimeCharacterSchema),
  characterHardFacts: z.array(chapterCharacterHardFactSchema).default([]),
  characterBehaviorGuides: z.array(chapterCharacterBehaviorGuideSchema).default([]),
  activeRelationStages: z.array(chapterRelationStageGuideSchema).default([]),
  pendingCandidateGuards: z.array(chapterCandidateGuardSchema).default([]),
  localStateSummary: z.string(),
  openConflictSummaries: z.array(z.string()).default([]),
  ledgerPendingItems: z.array(runtimePayoffLedgerItemSchema).default([]),
  ledgerUrgentItems: z.array(runtimePayoffLedgerItemSchema).default([]),
  ledgerOverdueItems: z.array(runtimePayoffLedgerItemSchema).default([]),
  ledgerSummary: runtimePayoffLedgerSummarySchema.nullable().optional(),
  timelineContext: timelineContextForChapterSchema.nullable().optional(),
  characterResourceContext: characterResourceContextSchema.nullable().optional(),
  recentChapterSummaries: z.array(z.string()).default([]),
  previousChapterTail: z.string().nullable().optional(),
  openingAntiRepeatHint: z.string(),
  styleContract: runtimeStyleContractSchema.nullable().optional(),
  styleConstraints: z.array(z.string()).default([]),
  continuationConstraints: z.array(z.string()).default([]),
  ragFacts: z.array(z.string()).default([]),
  completedMilestones: z.array(z.string()).default([]),
  recentScenePatterns: z.array(z.string()).default([]),
});

export const chapterReviewContextSchema = chapterWriteContextSchema.extend({
  structureObligations: z.array(z.string()).default([]),
  worldRules: z.array(z.string()).default([]),
  historicalIssues: z.array(z.string()).default([]),
});

export const chapterRepairIssueSchema = z.object({
  severity: auditSeveritySchema,
  category: z.string(),
  evidence: z.string(),
  fixSuggestion: z.string(),
});

export const chapterRepairContextSchema = z.object({
  writeContext: chapterWriteContextSchema,
  issues: z.array(chapterRepairIssueSchema).default([]),
  structureObligations: z.array(z.string()).default([]),
  worldRules: z.array(z.string()).default([]),
  historicalIssues: z.array(z.string()).default([]),
  allowedEditBoundaries: z.array(z.string()).default([]),
});

// ---------------------------------------------------------------------------
// Generation context package (top-level context assembled for each chapter)
// ---------------------------------------------------------------------------

export const generationContextPackageSchema = z.object({
  chapter: runtimeChapterSchema,
  plan: runtimePlanSchema.nullable(),
  canonicalState: canonicalStateSnapshotSchema.nullable().optional(),
  nextAction: generationNextActionSchema.default("write_chapter"),
  chapterStateGoal: chapterStateGoalSchema.nullable().optional(),
  protectedSecrets: z.array(z.string()).default([]),
  pendingReviewProposalCount: z.number().int().nonnegative().default(0),
  stateSnapshot: runtimeStateSnapshotSchema.nullable(),
  openConflicts: z.array(runtimeOpenConflictSchema),
  storyWorldSlice: storyWorldSliceSchema.nullable().optional(),
  characterRoster: z.array(runtimeCharacterSchema),
  characterHardFacts: z.array(chapterCharacterHardFactSchema).default([]),
  creativeDecisions: z.array(runtimeCreativeDecisionSchema),
  openAuditIssues: z.array(runtimeAuditIssueSchema),
  previousChaptersSummary: z.array(z.string()),
  previousChapterTail: z.string().nullable().optional(),
  openingHint: z.string(),
  continuation: runtimeContinuationSchema,
  styleContext: runtimeStyleContextSchema.nullable().optional(),
  characterDynamics: z.any().nullable().optional(),
  bookContract: bookContractContextSchema.nullable().optional(),
  macroConstraints: macroConstraintContextSchema.nullable().optional(),
  volumeWindow: volumeWindowContextSchema.nullable().optional(),
  narrativeProgressHint: z.string().nullable().optional(),
  ledgerPendingItems: z.array(runtimePayoffLedgerItemSchema).default([]),
  ledgerUrgentItems: z.array(runtimePayoffLedgerItemSchema).default([]),
  ledgerOverdueItems: z.array(runtimePayoffLedgerItemSchema).default([]),
  ledgerSummary: runtimePayoffLedgerSummarySchema.nullable().optional(),
  timelineContext: timelineContextForChapterSchema.nullable().optional(),
  characterResourceContext: characterResourceContextSchema.nullable().optional(),
  ragContext: z.string().default(""),
  chapterMission: chapterMissionContextSchema.nullable().optional(),
  chapterWriteContext: chapterWriteContextSchema.nullable().optional(),
  chapterReviewContext: chapterReviewContextSchema.nullable().optional(),
  chapterRepairContext: chapterRepairContextSchema.nullable().optional(),
  contextGatingDecisions: z.array(contextGatingDecisionSchema).default([]),
  chapterChangeFlags: chapterChangeFlagsSchema.optional(),
  tokenBudgetPolicy: tokenBudgetPolicySchema.optional(),
  promptBudgetProfiles: z.array(promptBudgetProfileSchema).default([]),
});

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

export type PromptBudgetProfile = z.infer<typeof promptBudgetProfileSchema>;
export type AuditMode = z.infer<typeof auditModeSchema>;
export type ContextBlockTier = z.infer<typeof contextGatingDecisionSchema>;
export type ContextGatingDecision = z.infer<typeof contextGatingDecisionSchema>;
export type ChapterChangeFlags = z.infer<typeof chapterChangeFlagsSchema>;
export type TokenBudgetPolicy = z.infer<typeof tokenBudgetPolicySchema>;
export type BookContractContext = z.infer<typeof bookContractContextSchema>;
export type MacroConstraintContext = z.infer<typeof macroConstraintContextSchema>;
export type VolumeWindowContext = z.infer<typeof volumeWindowContextSchema>;
export type ChapterMissionContext = z.infer<typeof chapterMissionContextSchema>;
export type ChapterBoundaryContract = z.infer<typeof chapterBoundaryContractSchema>;
export type ChapterExecutionObligationContract = z.infer<typeof chapterExecutionObligationContractSchema>;
export type ChapterExecutionObligationKind = z.infer<typeof chapterExecutionObligationKindSchema>;
export type ChapterExecutionMissingObligation = z.infer<typeof chapterExecutionMissingObligationSchema>;
export type ChapterExecutionObligationCoverage = z.infer<typeof chapterExecutionObligationCoverageSchema>;
export type ChapterFailureClassification = z.infer<typeof chapterFailureClassificationSchema>;
export type ChapterCharacterBehaviorGuide = z.infer<typeof chapterCharacterBehaviorGuideSchema>;
export type ChapterRelationStageGuide = z.infer<typeof chapterRelationStageGuideSchema>;
export type ChapterCandidateGuard = z.infer<typeof chapterCandidateGuardSchema>;
export type ChapterCharacterHardFact = z.infer<typeof chapterCharacterHardFactSchema>;
export type ChapterWriteContext = z.infer<typeof chapterWriteContextSchema>;
export type ChapterReviewContext = z.infer<typeof chapterReviewContextSchema>;
export type ChapterRepairIssue = z.infer<typeof chapterRepairIssueSchema>;
export type ChapterRepairContext = z.infer<typeof chapterRepairContextSchema>;
export type GenerationContextPackage = z.infer<typeof generationContextPackageSchema>;
