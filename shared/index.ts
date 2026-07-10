// Shared types barrel — all types re-exported from shared/types/
// Consumers should use: import { X } from "@ai-novel/shared"
// Deep imports via "@ai-novel/shared/types/X" are deprecated.

// Note: chapterRuntime.ts is itself a barrel that re-exports from
// chapterCore, chapterStyle, chapterContext, generationPackage.

export * from "./types/agent";
export * from "./types/api";
export * from "./types/autoDirectorApproval";
export * from "./types/autoDirectorFollowUp";
export * from "./types/autoDirectorValidation";
export * from "./types/bookAnalysis";
export * from "./types/canonicalState";
export * from "./types/chapterCreativeContract";
export * from "./types/chapterLengthControl";
export * from "./types/chapterPatchRepair";
export * from "./types/chapterQualityLoop";
export * from "./types/chapterRuntime";
export * from "./types/chapterTaskSheetQuality";
export * from "./types/characterArc";
export * from "./types/characterDynamics";
export * from "./types/characterResource";
export * from "./types/characterSync";
export * from "./types/creativeHub";
export * from "./types/directorRuntime";
export * from "./types/directorWorkflowStepCatalog";
export * from "./types/directorWorkflowStepCatalogData";
export * from "./types/feedback";
export * from "./types/image";
export * from "./types/knowledge";
export * from "./types/llm";
export * from "./types/novel";
export * from "./types/novelCharacter";
export * from "./types/novelDirector";
export * from "./types/novelExport";
export * from "./types/novelFraming";
export * from "./types/novelQuickPreview";
export * from "./types/novelResourceRecommendation";
export * from "./types/novelRisk";
export * from "./types/novelWorld";
export * from "./types/novelWorkflow";
export * from "./types/pagination";
export * from "./types/payoffLedger";
export * from "./types/replanWindowDecision";
export * from "./types/settingConsistency";
export * from "./types/stateProposalResolution";
export * from "./types/storyMacro";
export * from "./types/storyMode";
export * from "./types/storyWorldSlice";
export * from "./types/styleEngine";
export * from "./types/task";
export * from "./types/timeline";
export * from "./types/title";
export * from "./types/volumePlanning";
export * from "./types/world";
export * from "./types/worldWizard";
export * from "./types/writingFormula";

export { compactText, truncateText } from "./utils/text";
