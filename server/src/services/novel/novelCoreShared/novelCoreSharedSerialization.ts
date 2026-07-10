/**
 * JSON column serialization/deserialization functions for novel core entities.
 *
 * Handles parsing and serializing bookFramingJson, setupProgressJson,
 * continuationSetupJson, and continuationBookAnalysisSections.
 */
import type { BookAnalysisSectionKey } from "@ai-novel/shared";
import type { BeatStatus } from "./novelCoreSharedTypes";

// ─── Continuation Book Analysis Sections ─────────────────────────────────────

const CONTINUATION_ANALYSIS_SECTION_KEYS: BookAnalysisSectionKey[] = [
  "overview",
  "plot_structure",
  "timeline",
  "character_system",
  "worldbuilding",
  "themes",
  "style_technique",
  "market_highlights",
];

const CONTINUATION_ANALYSIS_SECTION_KEY_SET = new Set<BookAnalysisSectionKey>(CONTINUATION_ANALYSIS_SECTION_KEYS);

export function parseContinuationBookAnalysisSections(raw: string | null | undefined): BookAnalysisSectionKey[] | null {
  if (!raw?.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }
    const keys = parsed
      .map((item) => (typeof item === "string" ? item : ""))
      .filter((item): item is BookAnalysisSectionKey => CONTINUATION_ANALYSIS_SECTION_KEY_SET.has(item as BookAnalysisSectionKey));
    if (keys.length === 0) {
      return null;
    }
    return Array.from(new Set(keys));
  } catch {
    return null;
  }
}

export function serializeContinuationBookAnalysisSections(
  value: BookAnalysisSectionKey[] | null | undefined,
): string | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }
  const normalized = value.filter((item) => CONTINUATION_ANALYSIS_SECTION_KEY_SET.has(item));
  if (normalized.length === 0) {
    return null;
  }
  return JSON.stringify(Array.from(new Set(normalized)));
}

// ─── Book Framing JSON ───────────────────────────────────────────────────────

/**
 * Parses `bookFramingJson` into individual book-framing properties.
 * Prisma `select` or `include` returns `bookFramingJson` as a raw JSON string;
 * downstream code still expects the legacy flat properties.
 */
export function parseBookFramingJson(
  bookFramingJson: string | null | undefined,
): { bookSellingPoint: string | null; competingFeel: string | null; first30ChapterPromise: string | null } {
  if (!bookFramingJson) {
    return { bookSellingPoint: null, competingFeel: null, first30ChapterPromise: null };
  }
  try {
    const parsed = JSON.parse(bookFramingJson) as Record<string, unknown>;
    return {
      bookSellingPoint: typeof parsed.bookSellingPoint === "string" ? parsed.bookSellingPoint : null,
      competingFeel: typeof parsed.competingFeel === "string" ? parsed.competingFeel : null,
      first30ChapterPromise: typeof parsed.first30ChapterPromise === "string" ? parsed.first30ChapterPromise : null,
    };
  } catch {
    return { bookSellingPoint: null, competingFeel: null, first30ChapterPromise: null };
  }
}

export function serializeBookFramingJson(input: {
  bookSellingPoint?: string | null;
  competingFeel?: string | null;
  first30ChapterPromise?: string | null;
}): string | null {
  return JSON.stringify({
    bookSellingPoint: input.bookSellingPoint ?? null,
    competingFeel: input.competingFeel ?? null,
    first30ChapterPromise: input.first30ChapterPromise ?? null,
  });
}

// ─── Setup Progress JSON ─────────────────────────────────────────────────────

export function serializeSetupProgressJson(input: {
  projectStatus?: string | null;
  storylineStatus?: string | null;
  outlineStatus?: string | null;
  resourceReadyScore?: number | null;
}): string | null {
  return JSON.stringify({
    projectStatus: input.projectStatus ?? null,
    storylineStatus: input.storylineStatus ?? null,
    outlineStatus: input.outlineStatus ?? null,
    resourceReadyScore: input.resourceReadyScore ?? null,
  });
}

// ─── Continuation Setup JSON ─────────────────────────────────────────────────

export function serializeContinuationSetupJson(input: {
  sourceKnowledgeDocumentId?: string | null;
  continuationBookAnalysisId?: string | null;
  continuationBookAnalysisSections?: BookAnalysisSectionKey[] | null;
}): string | null {
  return JSON.stringify({
    sourceKnowledgeDocumentId: input.sourceKnowledgeDocumentId ?? null,
    continuationBookAnalysisId: input.continuationBookAnalysisId ?? null,
    continuationBookAnalysisSections: input.continuationBookAnalysisSections ?? null,
  });
}
