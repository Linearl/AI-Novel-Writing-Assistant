/**
 * chapterCore.ts — Base enums and core runtime data schemas.
 *
 * Split from chapterRuntime.ts (REQ-7020) to keep each file under 700 lines.
 * Other chapterRuntime sub-modules import shared enums/types from here.
 */
import { z } from "zod";
import type { LLMProvider } from "./llm.js";
import { characterResourceContextSchema } from "./characterResource.js";

// ---------------------------------------------------------------------------
// Internal enum schemas (not individually type-exported; consumed via parent
// object schemas in this module and by sibling modules via barrel re-export).
// ---------------------------------------------------------------------------

export const llmProviderSchema = z.custom<LLMProvider>((value) => typeof value === "string" && value.trim().length > 0);
export const auditTypeSchema = z.enum(["continuity", "character", "plot", "mode_fit", "vocabulary"]);
export const auditSeveritySchema = z.enum(["low", "medium", "high", "critical"]);
export const auditIssueStatusSchema = z.enum(["open", "resolved", "ignored"]);
export const chapterGenerationStateSchema = z.enum(["planned", "drafted", "reviewed", "repaired", "approved", "published"]);
export const storyPlanRoleSchema = z.enum(["setup", "progress", "pressure", "turn", "payoff", "cooldown"]);
export const payoffLedgerScopeTypeSchema = z.enum(["book", "volume", "chapter"]);
export const payoffLedgerStatusSchema = z.enum(["setup", "hinted", "pending_payoff", "paid_off", "failed", "overdue"]);
export const payoffLedgerNormalizedStatusSchema = z.enum(["planted", "active", "resolved", "expired"]);
export const styleBindingTargetTypeSchema = z.enum(["novel", "chapter", "task"]);
export const styleDetectionRuleTypeSchema = z.enum(["style", "character", "forbidden", "risk", "encourage"]);
export const antiAiSeveritySchema = z.enum(["low", "medium", "high"]);
export const styleContractSectionKeySchema = z.enum(["narrative", "character", "language", "rhythm", "antiAi", "selfCheck"]);
export const styleContractMaturitySchema = z.enum(["structured", "summary_only"]);
export const styleContractIssueCategorySchema = z.enum(["style_expression", "story_structure"]);
export const styleContractViolationSourceSchema = z.enum(["global_anti_ai", "style_anti_ai", "style_contract"]);
export const characterCandidateStatusSchema = z.enum(["pending", "confirmed", "merged", "rejected"]);
export const dynamicCharacterRiskLevelSchema = z.enum(["none", "info", "warn", "high"]);
export const auditModeSchema = z.enum(["light", "full", "repair_only"]);
export const contextBlockTierSchema = z.enum(["hard_required", "situational", "optional"]);

// ---------------------------------------------------------------------------
// Core runtime data schemas
// ---------------------------------------------------------------------------

export const chapterRuntimeRequestSchema = z.object({
  provider: llmProviderSchema.optional(),
  model: z.string().trim().optional(),
  temperature: z.number().min(0).max(2).optional(),
  previousChaptersSummary: z.array(z.string()).optional(),
  taskStyleProfileId: z.string().trim().optional(),
});

export const runtimeChapterSchema = z.object({
  id: z.string(),
  title: z.string(),
  order: z.number().int(),
  content: z.string().nullable().optional(),
  expectation: z.string().nullable().optional(),
  targetWordCount: z.number().int().nullable().optional(),
  conflictLevel: z.number().int().nullable().optional(),
  revealLevel: z.number().int().nullable().optional(),
  mustAvoid: z.string().nullable().optional(),
  taskSheet: z.string().nullable().optional(),
  sceneCards: z.string().nullable().optional(),
  hook: z.string().nullable().optional(),
  supportingContextText: z.string().default(""),
});

export const runtimePlanSceneSchema = z.object({
  id: z.string(),
  sortOrder: z.number().int(),
  title: z.string(),
  objective: z.string().nullable().optional(),
  conflict: z.string().nullable().optional(),
  reveal: z.string().nullable().optional(),
  emotionBeat: z.string().nullable().optional(),
});

export const runtimePlanSchema = z.object({
  id: z.string(),
  chapterId: z.string().nullable().optional(),
  planRole: storyPlanRoleSchema.nullable().optional(),
  phaseLabel: z.string().nullable().optional(),
  title: z.string(),
  objective: z.string(),
  participants: z.array(z.string()),
  reveals: z.array(z.string()),
  riskNotes: z.array(z.string()),
  mustAdvance: z.array(z.string()).default([]),
  mustPreserve: z.array(z.string()).default([]),
  sourceIssueIds: z.array(z.string()).default([]),
  replannedFromPlanId: z.string().nullable().optional(),
  hookTarget: z.string().nullable().optional(),
  rawPlanJson: z.string().nullable().optional(),
  scenes: z.array(runtimePlanSceneSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const runtimeCharacterSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  personality: z.string().nullable().optional(),
  background: z.string().nullable().optional(),
  development: z.string().nullable().optional(),
  identityLabel: z.string().nullable().optional(),
  factionLabel: z.string().nullable().optional(),
  stanceLabel: z.string().nullable().optional(),
  powerLevel: z.string().nullable().optional(),
  realm: z.string().nullable().optional(),
  currentLocation: z.string().nullable().optional(),
  availability: z.string().nullable().optional(),
  prohibitions: z.array(z.string()).default([]),
  currentState: z.string().nullable().optional(),
  currentGoal: z.string().nullable().optional(),
  appearance: z.string().nullable().optional(),
  physique: z.string().nullable().optional(),
  attireStyle: z.string().nullable().optional(),
  signatureDetail: z.string().nullable().optional(),
  voiceTexture: z.string().nullable().optional(),
  presenceImpression: z.string().nullable().optional(),
});

export const runtimeCreativeDecisionSchema = z.object({
  id: z.string(),
  chapterId: z.string().nullable().optional(),
  category: z.string(),
  content: z.string(),
  importance: z.string(),
  expiresAt: z.number().int().nullable().optional(),
  sourceType: z.string().nullable().optional(),
  sourceRefId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const runtimeAuditIssueSchema = z.object({
  id: z.string(),
  reportId: z.string(),
  auditType: auditTypeSchema,
  severity: auditSeveritySchema,
  code: z.string(),
  description: z.string(),
  evidence: z.string(),
  fixSuggestion: z.string(),
  status: auditIssueStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const runtimeCharacterStateSchema = z.object({
  characterId: z.string(),
  currentGoal: z.string().nullable().optional(),
  emotion: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
});

export const runtimeRelationStateSchema = z.object({
  sourceCharacterId: z.string(),
  targetCharacterId: z.string(),
  summary: z.string().nullable().optional(),
});

export const runtimeInformationStateSchema = z.object({
  holderType: z.string(),
  holderRefId: z.string().nullable().optional(),
  fact: z.string(),
  status: z.string(),
  summary: z.string().nullable().optional(),
});

export const runtimeForeshadowStateSchema = z.object({
  title: z.string(),
  summary: z.string().nullable().optional(),
  status: z.string(),
  setupChapterId: z.string().nullable().optional(),
  payoffChapterId: z.string().nullable().optional(),
});

export const runtimeOpenConflictSchema = z.object({
  id: z.string(),
  novelId: z.string(),
  chapterId: z.string().nullable().optional(),
  sourceSnapshotId: z.string().nullable().optional(),
  sourceIssueId: z.string().nullable().optional(),
  sourceType: z.string(),
  conflictType: z.string(),
  conflictKey: z.string(),
  title: z.string(),
  summary: z.string(),
  severity: z.string(),
  status: z.string(),
  evidence: z.array(z.string()).default([]),
  affectedCharacterIds: z.array(z.string()).default([]),
  resolutionHint: z.string().nullable().optional(),
  lastSeenChapterOrder: z.number().int().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ---------------------------------------------------------------------------
// Payoff Ledger
// ---------------------------------------------------------------------------

export const runtimePayoffLedgerSourceRefSchema = z.object({
  kind: z.enum(["major_payoff", "volume_open_payoff", "chapter_payoff_ref", "foreshadow_state", "open_conflict", "audit_issue"]),
  refId: z.string().nullable().optional(),
  refLabel: z.string(),
  chapterId: z.string().nullable().optional(),
  chapterOrder: z.number().int().nullable().optional(),
  volumeId: z.string().nullable().optional(),
  volumeSortOrder: z.number().int().nullable().optional(),
});

export const runtimePayoffLedgerEvidenceSchema = z.object({
  summary: z.string(),
  chapterId: z.string().nullable().optional(),
  chapterOrder: z.number().int().nullable().optional(),
});

export const runtimePayoffLedgerRiskSignalSchema = z.object({
  code: z.string(),
  severity: auditSeveritySchema,
  summary: z.string(),
  stale: z.boolean().optional(),
});

export const runtimePayoffLedgerItemSchema = z.object({
  id: z.string(),
  novelId: z.string(),
  ledgerKey: z.string(),
  title: z.string(),
  summary: z.string(),
  scopeType: payoffLedgerScopeTypeSchema,
  currentStatus: payoffLedgerStatusSchema,
  normalizedStatus: payoffLedgerNormalizedStatusSchema.optional(),
  targetStartChapterOrder: z.number().int().nullable().optional(),
  targetEndChapterOrder: z.number().int().nullable().optional(),
  firstSeenChapterOrder: z.number().int().nullable().optional(),
  lastTouchedChapterOrder: z.number().int().nullable().optional(),
  lastTouchedChapterId: z.string().nullable().optional(),
  setupChapterId: z.string().nullable().optional(),
  payoffChapterId: z.string().nullable().optional(),
  lastSnapshotId: z.string().nullable().optional(),
  plantedAt: z.string().nullable().optional(),
  resolvedAt: z.string().nullable().optional(),
  chaptersElapsed: z.number().int().nonnegative().optional(),
  sourceRefs: z.array(runtimePayoffLedgerSourceRefSchema).default([]),
  evidence: z.array(runtimePayoffLedgerEvidenceSchema).default([]),
  riskSignals: z.array(runtimePayoffLedgerRiskSignalSchema).default([]),
  statusReason: z.string().nullable().optional(),
  confidence: z.number().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const runtimePayoffLedgerSummarySchema = z.object({
  totalCount: z.number().int().nonnegative(),
  pendingCount: z.number().int().nonnegative(),
  urgentCount: z.number().int().nonnegative(),
  overdueCount: z.number().int().nonnegative(),
  paidOffCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  updatedAt: z.string().nullable().optional(),
});

// ---------------------------------------------------------------------------
// State snapshot & continuation
// ---------------------------------------------------------------------------

export const runtimeStateSnapshotSchema = z.object({
  id: z.string(),
  novelId: z.string(),
  sourceChapterId: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  rawStateJson: z.string().nullable().optional(),
  characterStates: z.array(runtimeCharacterStateSchema),
  relationStates: z.array(runtimeRelationStateSchema),
  informationStates: z.array(runtimeInformationStateSchema),
  foreshadowStates: z.array(runtimeForeshadowStateSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const runtimeContinuationSchema = z.object({
  enabled: z.boolean(),
  sourceType: z.enum(["novel", "knowledge_document"]).nullable(),
  sourceId: z.string().nullable(),
  sourceTitle: z.string(),
  systemRule: z.string(),
  humanBlock: z.string(),
  antiCopyCorpus: z.array(z.string()).default([]),
});

export const runtimeQualityScoreSchema = z.object({
  coherence: z.number(),
  repetition: z.number(),
  pacing: z.number(),
  voice: z.number(),
  engagement: z.number(),
  overall: z.number(),
});

// ---------------------------------------------------------------------------
// Character dynamics (candidates, volume assignment, faction, relations, overview)
// ---------------------------------------------------------------------------

export const runtimeCharacterCandidateSchema = z.object({
  id: z.string(),
  novelId: z.string(),
  sourceChapterId: z.string().nullable().optional(),
  sourceChapterOrder: z.number().int().nullable().optional(),
  proposedName: z.string(),
  proposedRole: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  evidence: z.array(z.string()).default([]),
  matchedCharacterId: z.string().nullable().optional(),
  status: characterCandidateStatusSchema,
  confidence: z.number().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const runtimeCharacterVolumeAssignmentSchema = z.object({
  id: z.string(),
  novelId: z.string(),
  characterId: z.string(),
  volumeId: z.string(),
  volumeTitle: z.string().nullable().optional(),
  roleLabel: z.string().nullable().optional(),
  responsibility: z.string(),
  appearanceExpectation: z.string().nullable().optional(),
  plannedChapterOrders: z.array(z.number().int()),
  isCore: z.boolean(),
  absenceWarningThreshold: z.number().int(),
  absenceHighRiskThreshold: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const runtimeCharacterFactionTrackSchema = z.object({
  id: z.string(),
  novelId: z.string(),
  characterId: z.string(),
  volumeId: z.string().nullable().optional(),
  volumeTitle: z.string().nullable().optional(),
  chapterId: z.string().nullable().optional(),
  chapterOrder: z.number().int().nullable().optional(),
  factionLabel: z.string(),
  stanceLabel: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  sourceType: z.string(),
  confidence: z.number().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const runtimeCharacterRelationStageSchema = z.object({
  id: z.string(),
  novelId: z.string(),
  relationId: z.string().nullable().optional(),
  sourceCharacterId: z.string(),
  targetCharacterId: z.string(),
  sourceCharacterName: z.string().nullable().optional(),
  targetCharacterName: z.string().nullable().optional(),
  volumeId: z.string().nullable().optional(),
  volumeTitle: z.string().nullable().optional(),
  chapterId: z.string().nullable().optional(),
  chapterOrder: z.number().int().nullable().optional(),
  stageLabel: z.string(),
  stageSummary: z.string(),
  nextTurnPoint: z.string().nullable().optional(),
  sourceType: z.string(),
  confidence: z.number().nullable().optional(),
  isCurrent: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const runtimeDynamicCharacterOverviewItemSchema = z.object({
  characterId: z.string(),
  name: z.string(),
  role: z.string(),
  castRole: z.string().nullable().optional(),
  currentState: z.string().nullable().optional(),
  currentGoal: z.string().nullable().optional(),
  volumeRoleLabel: z.string().nullable().optional(),
  volumeResponsibility: z.string().nullable().optional(),
  isCoreInVolume: z.boolean(),
  plannedChapterOrders: z.array(z.number().int()),
  appearanceCount: z.number().int(),
  lastAppearanceChapterOrder: z.number().int().nullable().optional(),
  absenceSpan: z.number().int(),
  absenceRisk: dynamicCharacterRiskLevelSchema,
  factionLabel: z.string().nullable().optional(),
  stanceLabel: z.string().nullable().optional(),
});

export const runtimeDynamicCharacterCurrentVolumeSchema = z.object({
  id: z.string().nullable().optional(),
  title: z.string(),
  sortOrder: z.number().int().nullable().optional(),
  startChapterOrder: z.number().int().nullable().optional(),
  endChapterOrder: z.number().int().nullable().optional(),
  currentChapterOrder: z.number().int().nullable().optional(),
});

export const runtimeDynamicCharacterOverviewSchema = z.object({
  novelId: z.string(),
  currentVolume: runtimeDynamicCharacterCurrentVolumeSchema.nullable(),
  summary: z.string(),
  pendingCandidateCount: z.number().int(),
  characters: z.array(runtimeDynamicCharacterOverviewItemSchema),
  relations: z.array(runtimeCharacterRelationStageSchema),
  candidates: z.array(runtimeCharacterCandidateSchema),
  factionTracks: z.array(runtimeCharacterFactionTrackSchema),
  assignments: z.array(runtimeCharacterVolumeAssignmentSchema),
});

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

export type ChapterRuntimeRequest = z.infer<typeof chapterRuntimeRequestSchema>;
export type RuntimeChapter = z.infer<typeof runtimeChapterSchema>;
export type RuntimePlanScene = z.infer<typeof runtimePlanSceneSchema>;
export type RuntimePlan = z.infer<typeof runtimePlanSchema>;
export type RuntimeCharacter = z.infer<typeof runtimeCharacterSchema>;
export type RuntimeCreativeDecision = z.infer<typeof runtimeCreativeDecisionSchema>;
export type RuntimeAuditIssue = z.infer<typeof runtimeAuditIssueSchema>;
export type RuntimeStateSnapshot = z.infer<typeof runtimeStateSnapshotSchema>;
export type RuntimeOpenConflict = z.infer<typeof runtimeOpenConflictSchema>;
export type RuntimeContinuation = z.infer<typeof runtimeContinuationSchema>;
export type RuntimePayoffLedgerSourceRef = z.infer<typeof runtimePayoffLedgerSourceRefSchema>;
export type RuntimePayoffLedgerEvidence = z.infer<typeof runtimePayoffLedgerEvidenceSchema>;
export type RuntimePayoffLedgerRiskSignal = z.infer<typeof runtimePayoffLedgerRiskSignalSchema>;
export type RuntimePayoffLedgerItem = z.infer<typeof runtimePayoffLedgerItemSchema>;
export type RuntimePayoffLedgerSummary = z.infer<typeof runtimePayoffLedgerSummarySchema>;
export type RuntimeCharacterResourceContext = z.infer<typeof characterResourceContextSchema>;
export type RuntimeQualityScore = z.infer<typeof runtimeQualityScoreSchema>;
export type RuntimeCharacterCandidate = z.infer<typeof runtimeCharacterCandidateSchema>;
export type RuntimeCharacterVolumeAssignment = z.infer<typeof runtimeCharacterVolumeAssignmentSchema>;
export type RuntimeCharacterFactionTrack = z.infer<typeof runtimeCharacterFactionTrackSchema>;
export type RuntimeCharacterRelationStage = z.infer<typeof runtimeCharacterRelationStageSchema>;
export type RuntimeDynamicCharacterOverviewItem = z.infer<typeof runtimeDynamicCharacterOverviewItemSchema>;
export type RuntimeDynamicCharacterCurrentVolume = z.infer<typeof runtimeDynamicCharacterCurrentVolumeSchema>;
export type DynamicCharacterOverview = z.infer<typeof runtimeDynamicCharacterOverviewSchema>;
