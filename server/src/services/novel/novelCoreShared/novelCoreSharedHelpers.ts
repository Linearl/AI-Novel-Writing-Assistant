/**
 * Helper and utility functions for novel core operations.
 *
 * Includes normalization, scoring, logging, text extraction, and content analysis.
 */
import type { BookAnalysisSectionKey } from "@ai-novel/shared";
import type { QualityScore } from "@ai-novel/shared";
import { parseCommercialTagsJson } from "@ai-novel/shared";
import { normalizeStoryModeOutput } from "../../storyMode/storyModeProfile";
import { logger } from "../../logging/LoggerService";
import type { BeatStatus, LLMGenerateOptions } from "./novelCoreSharedTypes";
import { QUALITY_THRESHOLD } from "./novelCoreSharedTypes";
import {
  parseBookFramingJson,
  parseContinuationBookAnalysisSections,
} from "./novelCoreSharedSerialization";

// ─── normalizeNovelOutput ────────────────────────────────────────────────────

export function normalizeNovelOutput<T extends {
  continuationBookAnalysisSections?: string | null;
  commercialTagsJson?: string | null;
  bookFramingJson?: string | null;
  setupProgressJson?: string | null;
  continuationSetupJson?: string | null;
  bookContract?: {
    id: string;
    novelId: string;
    readingPromise: string;
    protagonistFantasy: string;
    coreSellingPoint: string;
    chapter3Payoff: string;
    chapter10Payoff: string;
    chapter30Payoff: string;
    escalationLadder: string;
    relationshipMainline: string;
    absoluteRedLinesJson: string;
    createdAt: Date | string;
    updatedAt: Date | string;
  } | null;
  primaryStoryMode?: {
    id: string;
    name: string;
    description?: string | null;
    template?: string | null;
    parentId?: string | null;
    profileJson?: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
  } | null;
  secondaryStoryMode?: {
    id: string;
    name: string;
    description?: string | null;
    template?: string | null;
    parentId?: string | null;
    profileJson?: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
  } | null;
}>(
  novel: T,
): Omit<T, "continuationBookAnalysisSections" | "commercialTagsJson" | "bookFramingJson" | "setupProgressJson" | "continuationSetupJson"> & {
  continuationBookAnalysisSections: BookAnalysisSectionKey[] | null;
  commercialTags: string[];
  bookSellingPoint: string | null;
  competingFeel: string | null;
  first30ChapterPromise: string | null;
  projectStatus: string | null;
  storylineStatus: string | null;
  outlineStatus: string | null;
  resourceReadyScore: number | null;
  sourceKnowledgeDocumentId: string | null;
  continuationBookAnalysisId: string | null;
} {
  const {
    continuationBookAnalysisSections,
    commercialTagsJson,
    bookFramingJson,
    setupProgressJson,
    continuationSetupJson,
    ...rest
  } = novel;

  const bookFraming = parseBookFramingJson(bookFramingJson);
  const setupProgress = (() => { try { return setupProgressJson ? JSON.parse(setupProgressJson) as Record<string, unknown> : {}; } catch { return {}; } })() as { projectStatus?: string | null; storylineStatus?: string | null; outlineStatus?: string | null; resourceReadyScore?: number | null };
  const continuationSetup = (() => { try { return continuationSetupJson ? JSON.parse(continuationSetupJson) as Record<string, unknown> : {}; } catch { return {}; } })() as { sourceKnowledgeDocumentId?: string | null; continuationBookAnalysisId?: string | null; continuationBookAnalysisSections?: unknown };

  return {
    ...rest,
    continuationBookAnalysisSections: parseContinuationBookAnalysisSections(continuationBookAnalysisSections ?? continuationSetup.continuationBookAnalysisSections as string | null | undefined),
    commercialTags: parseCommercialTagsJson(commercialTagsJson),
    bookSellingPoint: bookFraming.bookSellingPoint ?? null,
    competingFeel: bookFraming.competingFeel ?? null,
    first30ChapterPromise: bookFraming.first30ChapterPromise ?? null,
    projectStatus: setupProgress.projectStatus ?? null,
    storylineStatus: setupProgress.storylineStatus ?? null,
    outlineStatus: setupProgress.outlineStatus ?? null,
    resourceReadyScore: setupProgress.resourceReadyScore ?? null,
    sourceKnowledgeDocumentId: continuationSetup.sourceKnowledgeDocumentId ?? null,
    continuationBookAnalysisId: continuationSetup.continuationBookAnalysisId ?? null,
    ...(rest.bookContract !== undefined
      ? {
        bookContract: rest.bookContract
          ? (() => {
            const {
              absoluteRedLinesJson,
              createdAt,
              updatedAt,
              ...bookContractRest
            } = rest.bookContract;
            return {
              ...bookContractRest,
              absoluteRedLines: (() => {
              try {
                const parsed = JSON.parse(absoluteRedLinesJson) as unknown;
                return Array.isArray(parsed)
                  ? parsed.filter((item): item is string => typeof item === "string")
                  : [];
              } catch {
                return [];
              }
              })(),
              createdAt: new Date(createdAt).toISOString(),
              updatedAt: new Date(updatedAt).toISOString(),
            };
          })()
          : null,
      }
      : {}),
    ...(rest.primaryStoryMode !== undefined
      ? {
          primaryStoryMode: rest.primaryStoryMode ? normalizeStoryModeOutput(rest.primaryStoryMode) : null,
        }
      : {}),
    ...(rest.secondaryStoryMode !== undefined
      ? {
          secondaryStoryMode: rest.secondaryStoryMode ? normalizeStoryModeOutput(rest.secondaryStoryMode) : null,
        }
      : {}),
  };
}

// ─── Pipeline Logging ────────────────────────────────────────────────────────

export function logPipelineInfo(message: string, meta?: Record<string, unknown>) {
  if (meta) {
    logger.info(`[pipeline] ${message}`, meta);
    return;
  }
  logger.info(`[pipeline] ${message}`);
}

export function logPipelineWarn(message: string, meta?: Record<string, unknown>) {
  if (meta) {
    logger.warn(`[pipeline] ${message}`, meta);
    return;
  }
  logger.warn(`[pipeline] ${message}`);
}

export function logPipelineError(message: string, meta?: Record<string, unknown>) {
  if (meta) {
    logger.error(`[pipeline] ${message}`, meta);
    return;
  }
  logger.error(`[pipeline] ${message}`);
}

// ─── Text Utilities ──────────────────────────────────────────────────────────

export function toText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content.map((item) => {
      if (typeof item === "string") {
        return item;
      }
      if (item && typeof item === "object" && "text" in item && typeof item.text === "string") {
        return item.text;
      }
      return "";
    }).join("");
  }
  return JSON.stringify(content ?? "");
}

function cleanJsonText(source: string): string {
  return source.replace(/```json|```/gi, "").trim();
}

export function extractJSONObject(source: string): string {
  const text = cleanJsonText(source);
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first < 0 || last < 0 || first >= last) {
    throw new Error("未检测到有效 JSON 对象");
  }
  return text.slice(first, last + 1);
}

export function extractJSONArray(source: string): string {
  const text = cleanJsonText(source);
  const first = text.indexOf("[");
  const last = text.lastIndexOf("]");
  if (first < 0 || last < 0 || first >= last) {
    throw new Error("未检测到有效 JSON 数组");
  }
  return text.slice(first, last + 1);
}

// ─── Quality Scoring ─────────────────────────────────────────────────────────

function clamp(score: number): number {
  if (!Number.isFinite(score)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

// ruleScore constants
const RULE_SCORE_COHERENCE_LONG_THRESHOLD = 1800;
const RULE_SCORE_COHERENCE_MID_THRESHOLD = 1200;
const RULE_SCORE_COHERENCE_LONG = 85;
const RULE_SCORE_COHERENCE_MID = 75;
const RULE_SCORE_COHERENCE_DEFAULT = 60;

const RULE_SCORE_PACING_UPPER_THRESHOLD = 3600;

const RULE_SCORE_VOICE_SENTENCE_THRESHOLD = 25;
const RULE_SCORE_VOICE_DEFAULT = 80;
const RULE_SCORE_VOICE_LOW = 68;

const RULE_SCORE_ENGAGEMENT_HIGH = 85;
const RULE_SCORE_ENGAGEMENT_DEFAULT = 72;

export function normalizeScore(value: Partial<QualityScore>): QualityScore {
  const coherence = clamp(value.coherence ?? 0);
  const repetition = clamp(value.repetition ?? 100);
  const pacing = clamp(value.pacing ?? 0);
  const voice = clamp(value.voice ?? 0);
  const engagement = clamp(value.engagement ?? 0);
  const overall = clamp(value.overall ?? (coherence + repetition + pacing + voice + engagement) / 5);
  return { coherence, repetition, pacing, voice, engagement, overall };
}

export function ruleScore(content: string): QualityScore {
  const text = content.replace(/\s+/g, " ").trim();
  const sentences = text.split(/[。！"?]/).map((item) => item.trim()).filter(Boolean);
  const unique = new Set(sentences);
  const repeatRatio = sentences.length > 0 ? 1 - unique.size / sentences.length : 0;
  const coherence = text.length >= RULE_SCORE_COHERENCE_LONG_THRESHOLD
    ? RULE_SCORE_COHERENCE_LONG
    : text.length >= RULE_SCORE_COHERENCE_MID_THRESHOLD
      ? RULE_SCORE_COHERENCE_MID
      : RULE_SCORE_COHERENCE_DEFAULT;
  const repetition = clamp(100 - repeatRatio * 100);
  const pacing = text.length >= RULE_SCORE_COHERENCE_LONG_THRESHOLD && text.length <= RULE_SCORE_PACING_UPPER_THRESHOLD ? 82 : 70;
  const voice = sentences.length >= RULE_SCORE_VOICE_SENTENCE_THRESHOLD ? RULE_SCORE_VOICE_DEFAULT : RULE_SCORE_VOICE_LOW;
  const engagement = /悬念|危机|冲突|转折/.test(text) ? RULE_SCORE_ENGAGEMENT_HIGH : RULE_SCORE_ENGAGEMENT_DEFAULT;
  const overall = clamp((coherence + repetition + pacing + voice + engagement) / 5);
  return { coherence, repetition, pacing, voice, engagement, overall };
}

export function isPass(score: QualityScore): boolean {
  return score.coherence >= QUALITY_THRESHOLD.coherence
    && score.repetition >= QUALITY_THRESHOLD.repetition
    && score.engagement >= QUALITY_THRESHOLD.engagement;
}

// ─── Content Analysis ────────────────────────────────────────────────────────

export function briefSummary(
  content: string,
  facts?: Array<{ category: "plot" | "character" | "world"; content: string }>,
): string {
  const text = content.replace(/\s+/g, " ").trim();
  if (!text) {
    return "";
  }

  const extractedFacts = (facts ?? extractFacts(content))
    .map((item) => ({ ...item, content: item.content.trim() }))
    .filter((item) => item.content.length > 0);

  const pickUnique = (items: string[], maxItems = 3): string[] => {
    const result: string[] = [];
    const seen = new Set<string>();
    for (const item of items) {
      if (seen.has(item)) {
        continue;
      }
      seen.add(item);
      result.push(item);
      if (result.length >= maxItems) {
        break;
      }
    }
    return result;
  };

  const plotEvents = pickUnique(extractedFacts.filter((item) => item.category === "plot").map((item) => item.content), 2);
  const characterStates = pickUnique(extractedFacts.filter((item) => item.category === "character").map((item) => item.content), 2);
  const worldFacts = pickUnique(extractedFacts.filter((item) => item.category === "world").map((item) => item.content), 1);

  const blocks: string[] = [];
  if (plotEvents.length > 0) {
    blocks.push(`Plot: ${plotEvents.join("")}`);
  }
  if (characterStates.length > 0) {
    blocks.push(`Character: ${characterStates.join("")}`);
  }
  if (worldFacts.length > 0) {
    blocks.push(`World: ${worldFacts.join("")}`);
  }
  if (blocks.length > 0) {
    return blocks.join("\n");
  }

  const sentences = text.split(/[。！"?]/).map((item) => item.trim()).filter(Boolean);
  if (sentences.length === 0) {
    return text.length <= 220 ? text : `${text.slice(0, 220)}...`;
  }
  const middle = sentences[Math.floor((sentences.length - 1) / 2)] ?? "";
  const tail = sentences[sentences.length - 1] ?? "";
  const fallback = [middle, tail].filter(Boolean).join("");
  if (fallback) {
    return `Plot: ${fallback}`;
  }
  return text.length <= 220 ? text : `${text.slice(0, 220)}...`;
}

export function extractFacts(content: string): Array<{ category: "plot" | "character" | "world"; content: string }> {
  const lines = content.split(/[\n。！"?]/).map((item) => item.trim()).filter((item) => item.length >= 8).slice(0, 6);
  return lines.map((line) => {
    if (/世界|地理|宗门|王朝|大陆|规则/.test(line)) {
      return { category: "world" as const, content: line };
    }
    if (/主角|反派|角色|他/.test(line)) {
      return { category: "character" as const, content: line };
    }
    return { category: "plot" as const, content: line };
  });
}

export function extractCharacterEventLines(content: string, characterName: string, limit = 3): string[] {
  if (!characterName.trim()) {
    return [];
  }
  return content
    .split(/[\n。！"?]/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 8 && item.includes(characterName))
    .slice(0, limit);
}

// ─── Beat & Value Normalization ──────────────────────────────────────────────

export function normalizeBeatStatus(value: unknown): BeatStatus {
  if (value === "completed" || value === "已完" || value === "finish" || value === "done") {
    return "completed";
  }
  if (value === "skipped" || value === "跳过") {
    return "skipped";
  }
  return "planned";
}

export function normalizeBeatOrder(value: unknown, fallback: number): number {
  const raw = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(raw)) {
    return fallback;
  }
  return Math.max(1, Math.floor(raw));
}

export function normalizeOptionalTextForCreate(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized || null;
}

export function normalizeOptionalTextForUpdate(value: string | null | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  const normalized = value.trim();
  return normalized || null;
}

// ─── Storyline Diff Utilities ────────────────────────────────────────────────

function normalizeStorylineLines(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function estimateChangedLines(previousContent: string, nextContent: string): number {
  const previous = normalizeStorylineLines(previousContent);
  const next = normalizeStorylineLines(nextContent);
  const maxLength = Math.max(previous.length, next.length);
  let changed = 0;
  for (let index = 0; index < maxLength; index += 1) {
    if ((previous[index] ?? "") !== (next[index] ?? "")) {
      changed += 1;
    }
  }
  return changed;
}

export function buildStorylineDiffSummary(previousContent: string, nextContent: string): string {
  const previous = normalizeStorylineLines(previousContent);
  const next = normalizeStorylineLines(nextContent);
  const changedLines = estimateChangedLines(previousContent, nextContent);
  const addedLines = Math.max(0, next.length - previous.length);
  const removedLines = Math.max(0, previous.length - next.length);
  return `changed=${changedLines}; added=${addedLines}; removed=${removedLines}`;
}

export function countCharacterMentions(content: string, names: string[]): number {
  const normalized = content.replace(/\s+/g, "");
  const uniqueNames = Array.from(new Set(names.filter((name) => name.trim().length > 0)));
  return uniqueNames.filter((name) => normalized.includes(name.replace(/\s+/g, ""))).length;
}

export function estimateAffectedChapterCount(content: string, chapterTotal: number, changedLines: number): number {
  const explicitMatches = content.match(/第?\s*\d+\s*章/g) ?? [];
  if (explicitMatches.length > 0) {
    return Math.min(chapterTotal, explicitMatches.length);
  }
  if (chapterTotal <= 0) {
    return 0;
  }
  const inferred = Math.max(1, Math.ceil(changedLines / 4));
  return Math.min(chapterTotal, inferred);
}
