/**
 * Takeover 模块统一入口。
 *
 * 职责：聚合接管子系统所有公共 API，外部消费方由此单一入口导入。
 * 内部按功能拆分为 takeover-read / takeover-write / takeover-validate，
 * 但对外保持扁平 re-export。
 */

// ── State loading & readiness ───────────────────────────────────────────────
export {
  loadDirectorTakeoverState,
  resolveDirectorRunningStateForPhase,
} from "./novelDirectorTakeoverRuntime";

export {
  buildDirectorTakeoverReadiness,
  assertDirectorTakeoverPhaseAvailable,
  buildEntryStepStatus,
  buildEntryReason,
  buildPreviewOrFallback,
  resolveRecommendedTakeoverPhaseForInput,
  DIRECTOR_TAKEOVER_STAGE_META,
  TAKEOVER_ENTRY_META,
} from "./novelDirectorTakeoverReadiness";

// ── State reset ────────────────────────────────────────────────────────────
export {
  resolveDirectorTakeoverAutoExecutionResetRange,
  resetDirectorTakeoverCurrentStep,
  resetDirectorTakeoverDownstreamState,
} from "./novelDirectorTakeoverReset";

// ── Execution ──────────────────────────────────────────────────────────────
export { startDirectorTakeoverExecution } from "./novelDirectorTakeoverExecution";
export { getDirectorTakeoverNodeAdapter } from "./novelDirectorTakeoverNodeAdapters";

// ── Continue / cancellation ────────────────────────────────────────────────
export {
  buildContinueExistingDownstreamReset,
  buildRestartCurrentStepDownstreamReset,
  cancelContinueExistingReplacedRuns,
} from "./novelDirectorTakeoverContinue";

// ── Core decision logic (novelDirectorTakeover.ts) ─────────────────────────
export {
  buildDirectorTakeoverInput,
  resolveDirectorTakeoverPlan,
  buildTakeoverBookSpec,
  isTakeoverStructuredOutlineReadyForValidation,
} from "./novelDirectorTakeover";

export type {
  DirectorTakeoverDecisionInput,
  DirectorTakeoverResolvedPlan,
} from "./novelDirectorTakeover";

// ── Pure helpers (novelDirectorTakeoverHelpers.ts) ─────────────────────────
export {
  hasMeaningfulSeedMaterial,
  splitToneKeywords,
  buildTakeoverIdea,
  buildTakeoverCandidate,
  isStoryMacroReady,
  isCharacterReady,
  isOutlineReady,
  isStructuredReady,
  isStructuredSyncPending,
  hasAnyStructuredAsset,
  hasExecutableRange,
  isRepairingPipelineJob,
  hasPendingRepairContext,
  phaseToEntryStep,
  entryStepToLegacyStartPhase,
  entryStepToWorkflowStage,
  buildSkipSteps,
  resolveExecutionContinuationStep,
  resolveContinueTargetStep,
  buildPhasePlan,
  buildAutoExecutionPlan,
} from "./novelDirectorTakeoverHelpers";

export type {
  DirectorTakeoverNovelContext,
  DirectorTakeoverAssetSnapshot,
} from "./novelDirectorTakeoverHelpers";
