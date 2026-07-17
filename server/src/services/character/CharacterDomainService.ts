/**
 * REQ-7083: Character Domain Service — unified entry point.
 *
 * Composes character sub-modules into a single facade.
 * Sub-modules are organized under services/character/ by domain:
 * - preparation/  (roster preparation / generation / quality)
 * - resource/     (extraction / validation / ledger)
 * - arc/          (arc service / hard facts)
 * - profile/      (visible profile)
 * - exit/         (exit inference)
 * - consistency/  (consistency detection / scoring)
 *
 * This file re-exports the public API of each sub-module for callers
 * that need the full character domain surface.
 */

// ── Preparation ──────────────────────────────────────────────────────
export {
  CharacterPreparationService,
} from "./preparation/CharacterPreparationService";

export type {
  CharacterCastApplyOptions,
} from "./preparation/characterCastApply";

export {
  assessCharacterCastBatch,
} from "./preparation/characterCastQuality";

// ── Resource ─────────────────────────────────────────────────────────
export {
  CharacterResourceLedgerService,
} from "./resource/CharacterResourceLedgerService";

export {
  CharacterResourceExtractionService,
} from "./resource/CharacterResourceExtractionService";

export {
  CharacterResourceValidationService,
} from "./resource/CharacterResourceValidationService";

// ── Arc ──────────────────────────────────────────────────────────────
export {
  CharacterArcService,
} from "./arc/CharacterArcService";

export {
  normalizeCharacterProhibitions,
  parseCharacterProhibitionsJson,
} from "./arc/characterHardFacts";

// ── Profile ──────────────────────────────────────────────────────────
export {
  CharacterVisibleProfileService,
} from "./profile/CharacterVisibleProfileService";

// ── Exit ─────────────────────────────────────────────────────────────
export {
  CharacterExitInferenceService,
} from "./exit/characterExitInferenceService";

// ── Consistency ──────────────────────────────────────────────────────
export {
  CharacterConsistencyService,
  characterConsistencyService,
} from "./consistency/CharacterConsistencyService";

// ── Base CRUD ────────────────────────────────────────────────────────
export {
  BaseCharacterService,
} from "./BaseCharacterService";

export {
  CharacterLibrarySyncService,
} from "./CharacterLibrarySyncService";
