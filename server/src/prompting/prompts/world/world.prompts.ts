/**
 * World prompts — facade module.
 *
 * All prompt definitions have been extracted to:
 *   - world.promptHelpers.ts       (utility functions)
 *   - world.prompts.core.ts        (reference, visualization, consistency, property options)
 *   - world.prompts.inspiration.ts (concept card, localization, deepening questions)
 *   - world.prompts.generation.ts  (layer gen, layer localize, import, backfill, theme, section, axiom)
 *
 * This file re-exports every prompt asset for backward compatibility
 * so that existing `import ... from "./world.prompts"` paths still work.
 */

export { buildReferenceModeLabel, sanitizeLooseWorldObject, normalizeWorldStructureSectionPayload } from "./world.promptHelpers";

export {
  worldReferenceInspirationPrompt,
  worldVisualizationPrompt,
  worldPropertyOptionsPrompt,
  worldConsistencyPrompt,
} from "./world.prompts.core";

export {
  worldInspirationConceptCardPrompt,
  worldInspirationConceptCardLocalizationPrompt,
  worldDeepeningQuestionsPrompt,
} from "./world.prompts.inspiration";

export {
  worldLayerGenerationPrompt,
  worldLayerLocalizationPrompt,
  worldImportExtractionPrompt,
  worldStructureBackfillPrompt,
  novelThemeWorldGenerationPrompt,
  worldStructureSectionPrompt,
  worldAxiomSuggestionPrompt,
  worldStructureModifyPrompt,
} from "./world.prompts.generation";
