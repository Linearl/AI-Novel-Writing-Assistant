/**
 * World Structure — facade module.
 *
 * All implementation has been extracted to:
 *   - worldStructureConstants.ts   (WORLD_STRUCTURE_SCHEMA_VERSION)
 *   - worldStructureSource.ts      (WorldStructureSource type)
 *   - worldStructureHelpers.ts     (utility functions)
 *   - worldStructureNormalization.ts (normalizers, empty factories)
 *   - worldStructureLegacy.ts      (legacy seed/text builders, buildWorldStructureFromLegacySource)
 *
 * This file re-exports every public symbol for backward compatibility
 * so that existing `import ... from "./worldStructure"` paths still work.
 */

export { WORLD_STRUCTURE_SCHEMA_VERSION } from "./worldStructureConstants";

export type { WorldStructureSource } from "./worldStructureSource";

export {
  safeParseJSON,
  normalizeText,
  normalizeStringArray,
  normalizeRecord,
  slugify,
  makeId,
  parseListText,
  parseLegacyJSON,
  parseLegacyArray,
  parseLegacyObject,
  parseAxiomStrings,
  normalizeMapCoordinate,
  normalizeRiskLevel,
  normalizeGeographyDirection,
  dedupeById,
  dedupeByName,
  formatRuleText,
  buildRuleFromText,
  buildStructuredRulesFromAxiomTexts,
} from "./worldStructureHelpers";

export {
  createEmptyWorldProfile,
  createEmptyWorldRules,
  createEmptyWorldRelations,
  createEmptyWorldStructure,
  createEmptyWorldBindingSupport,
  normalizeWorldBindingSupport,
  normalizeWorldStructuredData,
  normalizeFaction,
  normalizeForce,
  normalizeLocation,
  normalizeForceRelation,
  normalizeLocationControl,
  normalizeLocationConnection,
  normalizeLocationClusters,
} from "./worldStructureNormalization";

export {
  buildWorldStructureFromLegacySource,
  buildWorldStructureSeedFromSource,
  buildWorldBindingSupport,
  applyStructuredWorldToLegacyFields,
  buildWorldStructureOverview,
  buildFactionLegacyText,
  buildBackgroundLegacyText,
  buildPowerLegacyText,
  buildCultureLegacyText,
  buildHistoryLegacyText,
  buildEconomyLegacyText,
  buildPoliticsLegacyText,
  buildGeographyLegacyText,
  buildConflictLegacyText,
} from "./worldStructureLegacy";

import { safeParseJSON } from "./worldStructureHelpers";
import {
  normalizeWorldBindingSupport,
  normalizeWorldStructuredData,
} from "./worldStructureNormalization";
import type { WorldStructuredData } from "@ai-novel/shared/types/world";
import type { WorldBindingSupport } from "@ai-novel/shared/types/world";

/**
 * Parse the raw JSON strings stored in Prisma into structured data.
 * Kept in this facade because it composes normalizer + helpers from
 * multiple sub-modules and is the single top-level entry point.
 */
export function parseWorldStructurePayload(
  structureJson: string | null | undefined,
  bindingSupportJson: string | null | undefined,
): {
  structure: WorldStructuredData;
  bindingSupport: WorldBindingSupport;
  hasStructuredData: boolean;
} {
  const hasStructuredData = Boolean(structureJson?.trim());
  const structure = normalizeWorldStructuredData(safeParseJSON(structureJson, null));
  const bindingSupport = normalizeWorldBindingSupport(safeParseJSON(bindingSupportJson, null));
  return { structure, bindingSupport, hasStructuredData };
}
