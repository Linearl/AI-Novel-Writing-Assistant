/**
 * chapterStyle.ts — Style contract and length-control schemas.
 *
 * Split from chapterRuntime.ts (REQ-7020) to keep each file under 700 lines.
 * Imports shared enums from chapterCore.
 */
import { z } from "zod";
import {
  styleContractSectionKeySchema,
  styleContractMaturitySchema,
  styleBindingTargetTypeSchema,
  styleDetectionRuleTypeSchema,
  antiAiSeveritySchema,
  styleContractIssueCategorySchema,
  styleContractViolationSourceSchema,
} from "./chapterCore.js";

// ---------------------------------------------------------------------------
// Style contract schemas
// ---------------------------------------------------------------------------

export const runtimeStyleRuleBlockSchema = z.record(z.string(), z.unknown());

export const runtimeStyleContractSectionSchema = z.object({
  key: styleContractSectionKeySchema,
  title: z.string(),
  summary: z.string().nullable().optional(),
  lines: z.array(z.string()).default([]),
  text: z.string(),
  hasContent: z.boolean(),
});

export const runtimeStyleContractSchema = z.object({
  narrative: runtimeStyleContractSectionSchema,
  character: runtimeStyleContractSectionSchema,
  language: runtimeStyleContractSectionSchema,
  rhythm: runtimeStyleContractSectionSchema,
  antiAi: runtimeStyleContractSectionSchema,
  selfCheck: runtimeStyleContractSectionSchema,
  meta: z.object({
    effectiveStyleProfileId: z.string().nullable().optional(),
    taskStyleProfileId: z.string().nullable().optional(),
    activeSourceTargets: z.array(styleBindingTargetTypeSchema).default([]),
    activeSourceLabels: z.array(z.string()).default([]),
    writerIncludedSections: z.array(styleContractSectionKeySchema).default([]),
    plannerIncludedSections: z.array(styleContractSectionKeySchema).default([]),
    droppedSections: z.array(styleContractSectionKeySchema).default([]),
    maturity: styleContractMaturitySchema,
    usesGlobalAntiAiBaseline: z.boolean(),
    globalAntiAiRuleIds: z.array(z.string()).default([]),
    styleAntiAiRuleIds: z.array(z.string()).default([]),
  }),
});

export const runtimeCompiledStylePromptBlocksSchema = z.object({
  context: z.string(),
  style: z.string(),
  character: z.string(),
  antiAi: z.string(),
  output: z.string(),
  selfCheck: z.string(),
  contract: runtimeStyleContractSchema,
  mergedRules: z.object({
    narrativeRules: runtimeStyleRuleBlockSchema,
    characterRules: runtimeStyleRuleBlockSchema,
    languageRules: runtimeStyleRuleBlockSchema,
    rhythmRules: runtimeStyleRuleBlockSchema,
  }),
  appliedRuleIds: z.array(z.string()),
});

export const runtimeStyleProfileSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
});

export const runtimeStyleBindingSchema = z.object({
  id: z.string(),
  styleProfileId: z.string(),
  targetType: styleBindingTargetTypeSchema,
  targetId: z.string(),
  priority: z.number().int(),
  weight: z.number(),
  enabled: z.boolean(),
  styleProfile: runtimeStyleProfileSummarySchema.optional(),
});

export const runtimeStyleContextSchema = z.object({
  matchedBindings: z.array(runtimeStyleBindingSchema),
  compiledBlocks: runtimeCompiledStylePromptBlocksSchema.nullable(),
  effectiveStyleProfileId: z.string().nullable().optional(),
  taskStyleProfileId: z.string().nullable().optional(),
  activeSourceTargets: z.array(styleBindingTargetTypeSchema).default([]),
  activeSourceLabels: z.array(z.string()).default([]),
  maturity: styleContractMaturitySchema.optional(),
  usesGlobalAntiAiBaseline: z.boolean().optional(),
  globalAntiAiRuleIds: z.array(z.string()).default([]),
  styleAntiAiRuleIds: z.array(z.string()).default([]),
  sanitizedGenerationProfile: z.object({
    writingGuidance: z.array(z.string()).default([]),
    forbiddenEntities: z.array(z.string()).default([]),
    sourceProfileNames: z.array(z.string()).default([]),
    sanitizedAt: z.string(),
    strategy: z.enum(["deterministic", "llm"]),
  }).nullable().optional(),
});

// ---------------------------------------------------------------------------
// Style detection & review
// ---------------------------------------------------------------------------

export const styleDetectionViolationSchema = z.object({
  ruleId: z.string(),
  ruleName: z.string(),
  ruleType: styleDetectionRuleTypeSchema,
  severity: antiAiSeveritySchema,
  source: styleContractViolationSourceSchema,
  issueCategory: styleContractIssueCategorySchema,
  excerpt: z.string(),
  reason: z.string(),
  suggestion: z.string(),
  canAutoRewrite: z.boolean(),
});

export const styleDetectionReportSchema = z.object({
  riskScore: z.number().int(),
  summary: z.string(),
  violations: z.array(styleDetectionViolationSchema),
  canAutoRewrite: z.boolean(),
  appliedRuleIds: z.array(z.string()),
});

export const runtimeStyleReviewSchema = z.object({
  report: styleDetectionReportSchema.nullable(),
  autoRewritten: z.boolean(),
  originalContent: z.string().nullable().optional(),
});

// ---------------------------------------------------------------------------
// Length control schemas
// ---------------------------------------------------------------------------

export const runtimeSceneGenerationResultSchema = z.object({
  sceneKey: z.string(),
  sceneTitle: z.string(),
  sceneIndex: z.number().int().min(1),
  targetWordCount: z.number().int().positive(),
  beforeLength: z.number().int().nonnegative(),
  afterLength: z.number().int().nonnegative(),
  actualWordCount: z.number().int().nonnegative(),
  sceneStatus: z.string(),
});

export const runtimeSceneRoundResultSchema = z.object({
  roundIndex: z.number().int().min(1),
  suggestedWordCount: z.number().int().nonnegative().nullable().optional(),
  hardWordLimit: z.number().int().positive().nullable().optional(),
  actualWordCount: z.number().int().nonnegative(),
  isFinalRound: z.boolean(),
  closingPhase: z.boolean(),
  hardStopTriggered: z.boolean().default(false),
  trimmedAtSentenceBoundary: z.boolean().default(false),
  stopReason: z.string(),
});

export const runtimeSceneGenerationWithRoundsSchema = runtimeSceneGenerationResultSchema.extend({
  wordControlMode: z.enum(["prompt_only", "balanced"]).default("balanced"),
  roundCount: z.number().int().nonnegative().default(0),
  hardStopCount: z.number().int().nonnegative().default(0),
  closingPhaseTriggered: z.boolean().default(false),
  roundResults: z.array(runtimeSceneRoundResultSchema).default([]),
});

export const runtimeLengthControlSchema = z.object({
  targetWordCount: z.number().int().positive(),
  softMinWordCount: z.number().int().positive(),
  softMaxWordCount: z.number().int().positive(),
  hardMaxWordCount: z.number().int().positive(),
  finalWordCount: z.number().int().nonnegative(),
  variance: z.number(),
  wordControlMode: z.enum(["prompt_only", "balanced", "hybrid"]).default("hybrid"),
  plannedSceneCount: z.number().int().nonnegative(),
  generatedSceneCount: z.number().int().nonnegative(),
  sceneResults: z.array(runtimeSceneGenerationWithRoundsSchema).default([]),
  closingPhaseTriggered: z.boolean().default(false),
  hardStopsTriggered: z.number().int().nonnegative().default(0),
  lengthRepairPath: z.array(z.string()).default([]),
  overlengthRepairApplied: z.boolean(),
});

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

export type RuntimeStyleContractSection = z.infer<typeof runtimeStyleContractSectionSchema>;
export type RuntimeStyleContract = z.infer<typeof runtimeStyleContractSchema>;
export type RuntimeCompiledStylePromptBlocks = z.infer<typeof runtimeCompiledStylePromptBlocksSchema>;
export type RuntimeStyleBinding = z.infer<typeof runtimeStyleBindingSchema>;
export type RuntimeStyleContext = z.infer<typeof runtimeStyleContextSchema>;
export type RuntimeStyleDetectionViolation = z.infer<typeof styleDetectionViolationSchema>;
export type RuntimeStyleDetectionReport = z.infer<typeof styleDetectionReportSchema>;
export type RuntimeStyleReview = z.infer<typeof runtimeStyleReviewSchema>;
export type RuntimeSceneGenerationResult = z.infer<typeof runtimeSceneGenerationWithRoundsSchema>;
export type RuntimeSceneRoundResult = z.infer<typeof runtimeSceneRoundResultSchema>;
export type RuntimeLengthControl = z.infer<typeof runtimeLengthControlSchema>;
