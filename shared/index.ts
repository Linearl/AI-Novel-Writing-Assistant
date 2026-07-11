// Shared types barrel — all types re-exported from shared/types/
// Consumers should use: import { X } from "@ai-novel/shared"
// Deep imports via "@ai-novel/shared/types/X" are deprecated.

// Note: chapterRuntime.ts is itself a barrel that re-exports from
// chapterCore, chapterStyle, chapterContext, generationPackage.

export * from "./types/agent.js";
export * from "./types/api.js";
export * from "./types/autoDirectorApproval.js";
export * from "./types/autoDirectorFollowUp.js";
export * from "./types/autoDirectorValidation.js";
export * from "./types/bookAnalysis.js";
export * from "./types/canonicalState.js";
export * from "./types/chapterCreativeContract.js";
export * from "./types/chapterLengthControl.js";
export * from "./types/chapterPatchRepair.js";
export * from "./types/chapterQualityLoop.js";
export * from "./types/chapterRuntime.js";
export * from "./types/chapterTaskSheetQuality.js";
export * from "./types/characterArc.js";
export * from "./types/characterDynamics.js";
export * from "./types/characterResource.js";
export * from "./types/characterSync.js";
export * from "./types/creativeHub.js";
export * from "./types/directorRuntime/index.js";
export * from "./types/directorWorkflowStepCatalog.js";
export * from "./types/directorWorkflowStepCatalogData.js";
export * from "./types/feedback.js";
export * from "./types/image.js";
export * from "./types/knowledge.js";
export * from "./types/llm.js";
export * from "./types/novel.js";
export * from "./types/novelCharacter.js";
export * from "./types/novelDirector.js";
export * from "./types/novelExport.js";
export * from "./types/novelFraming.js";
export * from "./types/novelQuickPreview.js";
export * from "./types/novelResourceRecommendation.js";
export * from "./types/novelRisk.js";
export * from "./types/novelWorld.js";
export * from "./types/novelWorkflow.js";
export * from "./types/pagination.js";
export * from "./types/payoffLedger.js";
export * from "./types/replanWindowDecision.js";
export * from "./types/settingConsistency.js";
export * from "./types/stateProposalResolution.js";
export * from "./types/storyMacro.js";
export * from "./types/storyMode.js";
export * from "./types/storyWorldSlice.js";
export * from "./types/styleEngine.js";
export * from "./types/task.js";
export * from "./types/timeline.js";
export * from "./types/title.js";
export * from "./types/volumePlanning.js";
export * from "./types/world.js";
export * from "./types/worldWizard.js";
export * from "./types/writingFormula.js";

export { compactText, truncateText } from "./utils/text.js";
