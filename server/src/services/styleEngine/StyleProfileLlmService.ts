import type { LLMProvider } from "@ai-novel/shared/types/llm";
import type {
  StyleExtractionDraft,
  StyleExtractionPreset,
  StyleProfile,
  StyleProfileFeature,
  StyleSourceType,
} from "@ai-novel/shared/types/styleEngine";
import { prisma } from "../../db/prisma";
import { runStructuredPrompt } from "../../prompting/core/promptRunner";
import {
  styleProfileAntiAiSelectionPrompt,
  styleProfileExtractionPrompt,
  styleProfileFromBookAnalysisPrompt,
  styleProfileFromBriefPrompt,
  styleProfileMetadataPrompt,
} from "../../prompting/prompts/style/style.prompts";
import { mapAntiAiRuleRow } from "./helpers";
import {
import { logger } from "../logging/LoggerService";
  buildAntiAiCatalogText,
  buildStyleAntiAiRiskDigest,
  buildStyleMetadataDigest,
  normalizeStyleAntiAiSelectionDraft,
  normalizeStyleMetadataDraft,
  type StyleCreationCoreDraft,
} from "./styleCreation";

// ---------------------------------------------------------------------------
// Interfaces, constants, helpers
// ---------------------------------------------------------------------------

export interface ManualProfileInput {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  applicableGenres?: string[];
  sourceType?: StyleSourceType;
  sourceRefId?: string;
  sourceContent?: string;
  extractedFeatures?: StyleProfileFeature[];
  extractionPresets?: StyleExtractionPreset[];
  extractionAntiAiRuleKeys?: string[];
  selectedExtractionPresetKey?: StyleExtractionPreset["key"] | null;
  analysisMarkdown?: string;
  narrativeRules?: Record<string, unknown>;
  characterRules?: Record<string, unknown>;
  languageRules?: Record<string, unknown>;
  rhythmRules?: Record<string, unknown>;
  antiAiRuleIds?: string[];
}

export interface LlmInput {
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface GeneratedStyleCorePayload {
  name?: string;
  description?: string | null;
  analysisMarkdown?: string | null;
  narrativeRules?: Record<string, unknown>;
  characterRules?: Record<string, unknown>;
  languageRules?: Record<string, unknown>;
  rhythmRules?: Record<string, unknown>;
}

export interface GeneratedStylePayload extends GeneratedStyleCorePayload {
  category?: string | null;
  tags?: string[];
  applicableGenres?: string[];
  antiAiRuleKeys?: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const AI_STYLE_BRIEF_SOURCE_PREFIX = "ai-style-brief:";
const STYLE_EXTRACTION_MAX_TOKENS = 4096;
const STYLE_METADATA_MAX_TOKENS = 600;
const STYLE_ANTI_AI_SELECTION_MAX_TOKENS = 500;
export const DEFAULT_EXTRACTION_PRESET_KEY: StyleExtractionPreset["key"] = "balanced";
export type TextExtractionSourceType = Extract<StyleSourceType, "from_text" | "from_knowledge_document">;

function formatRuntimeLogValue(value: unknown): string {
  if (value == null) {
    return "null";
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify(String(value));
  }
}

export function logStyleExtractionRuntimeEvent(event: string, payload: Record<string, unknown>): void {
  const parts = ["[style.extraction.runtime]", `event=${event}`];
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) {
      continue;
    }
    parts.push(`${key}=${formatRuntimeLogValue(value)}`);
  }
  logger.info(parts.join(" "));
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeRuleRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

export function countExtractionFeatures(value: unknown): number {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return 0;
  }
  const record = value as Record<string, unknown>;
  const candidates = [record.features, record.extractedFeatures, record.featurePool];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.length;
    }
  }
  return 0;
}

export function buildGeneratedCoreDraftSummary(input: {
  name: string;
  description?: string | null;
  analysisMarkdown?: string | null;
  narrativeRules?: Record<string, unknown>;
  characterRules?: Record<string, unknown>;
  languageRules?: Record<string, unknown>;
  rhythmRules?: Record<string, unknown>;
}): StyleCreationCoreDraft {
  return {
    name: input.name,
    description: input.description,
    analysisMarkdown: input.analysisMarkdown,
    ruleSet: {
      narrativeRules: input.narrativeRules ?? {},
      characterRules: input.characterRules ?? {},
      languageRules: input.languageRules ?? {},
      rhythmRules: input.rhythmRules ?? {},
    },
  };
}

// Callbacks & LLM Service class

export interface StyleProfileCallbacks {
  createManualProfile: (input: ManualProfileInput) => Promise<StyleProfile>;
  getProfileById: (id: string) => Promise<StyleProfile | null>;
}

export class StyleProfileLlmService {
  private readonly callbacks: StyleProfileCallbacks;

  constructor(callbacks: StyleProfileCallbacks) {
    this.callbacks = callbacks;
  }

  async generateStructuredStyle(
    promptInput: {
      analysisTitle: string;
      name: string;
      sourceText: string;
    },
    llmInput: LlmInput,
  ): Promise<GeneratedStyleCorePayload> {
    const result = await runStructuredPrompt({
      asset: styleProfileFromBookAnalysisPrompt,
      promptInput,
      options: {
        provider: llmInput.provider ?? "deepseek",
        model: llmInput.model,
        temperature: llmInput.temperature ?? 0.5,
        timeoutMs: llmInput.timeoutMs,
        signal: llmInput.signal,
      },
    });
    return this.normalizeGeneratedStyleCorePayload(result.output, promptInput.name);
  }

  async generateStructuredStyleFromBrief(
    promptInput: {
      brief: string;
      name?: string;
      category?: string;
    },
    llmInput: LlmInput,
  ): Promise<GeneratedStyleCorePayload> {
    const result = await runStructuredPrompt({
      asset: styleProfileFromBriefPrompt,
      promptInput,
      options: {
        provider: llmInput.provider ?? "deepseek",
        model: llmInput.model,
        temperature: llmInput.temperature ?? 0.6,
        timeoutMs: llmInput.timeoutMs,
        signal: llmInput.signal,
      },
    });
    return this.normalizeGeneratedStyleCorePayload(
      result.output,
      promptInput.name?.trim() || "AI 生成写法",
    );
  }

  async generateStructuredExtractionCore(input: {
    name: string;
    sourceText: string;
    category?: string;
  } & LlmInput): Promise<unknown> {
    logStyleExtractionRuntimeEvent("extract_start", {
      name: input.name,
      category: input.category ?? null,
      provider: input.provider ?? "deepseek",
      model: input.model ?? null,
      temperature: input.temperature ?? 0.5,
      maxTokens: STYLE_EXTRACTION_MAX_TOKENS,
      timeoutMs: input.timeoutMs ?? null,
      sourceTextChars: input.sourceText.length,
    });
    const initialStartedAt = Date.now();
    const initialResult = await runStructuredPrompt({
      asset: styleProfileExtractionPrompt,
      promptInput: {
        name: input.name,
        category: input.category,
        sourceText: input.sourceText,
      },
      options: {
        provider: input.provider ?? "deepseek",
        model: input.model,
        temperature: input.temperature ?? 0.5,
        maxTokens: STYLE_EXTRACTION_MAX_TOKENS,
        timeoutMs: input.timeoutMs,
        signal: input.signal,
      },
    });
    const initialFeatureCount = countExtractionFeatures(initialResult.output);
    const initialHasUsableFeatures = this.hasUsableExtractionFeatures(initialResult.output);
    logStyleExtractionRuntimeEvent("extract_initial_result", {
      name: input.name,
      latencyMs: Date.now() - initialStartedAt,
      featureCount: initialFeatureCount,
      hasUsableFeatures: initialHasUsableFeatures,
    });
    if (initialHasUsableFeatures) {
      return initialResult.output;
    }

    logStyleExtractionRuntimeEvent("extract_retry_for_features", {
      name: input.name,
      reason: "empty_or_unusable_features",
    });
    const retryStartedAt = Date.now();
    const retriedResult = await runStructuredPrompt({
      asset: styleProfileExtractionPrompt,
      promptInput: {
        name: input.name,
        category: input.category,
        sourceText: input.sourceText,
        retryForFeatures: true,
      },
      options: {
        provider: input.provider ?? "deepseek",
        model: input.model,
        temperature: input.temperature ?? 0.5,
        maxTokens: STYLE_EXTRACTION_MAX_TOKENS,
        timeoutMs: input.timeoutMs,
        signal: input.signal,
      },
    });
    logStyleExtractionRuntimeEvent("extract_retry_result", {
      name: input.name,
      latencyMs: Date.now() - retryStartedAt,
      featureCount: countExtractionFeatures(retriedResult.output),
      hasUsableFeatures: this.hasUsableExtractionFeatures(retriedResult.output),
    });
    return retriedResult.output;
  }

  async enrichExtractionDraft(
    coreDraft: StyleExtractionDraft,
    llmInput: {
      category?: string;
    } & LlmInput,
  ): Promise<StyleExtractionDraft> {
    const summaryInput: StyleCreationCoreDraft = {
      name: coreDraft.name,
      description: coreDraft.description,
      summary: coreDraft.summary,
      analysisMarkdown: coreDraft.analysisMarkdown,
      features: coreDraft.features,
    };
    const metadataStartedAt = Date.now();
    const antiAiStartedAt = Date.now();
    const [metadataResult, antiAiResult] = await Promise.allSettled([
      this.generateStyleMetadata({
        name: coreDraft.name,
        sourceType: "from_text",
        preferredCategory: llmInput.category ?? coreDraft.category ?? undefined,
        coreDraft: summaryInput,
        llmInput,
      }),
      this.selectAntiAiRuleKeys({
        name: coreDraft.name,
        summary: coreDraft.summary,
        coreDraft: summaryInput,
        llmInput,
      }),
    ]);

    const metadata = metadataResult.status === "fulfilled"
      ? metadataResult.value
      : normalizeStyleMetadataDraft({}, llmInput.category ?? coreDraft.category ?? null);
    if (metadataResult.status === "fulfilled") {
      logStyleExtractionRuntimeEvent("extract_metadata_result", {
        name: coreDraft.name,
        latencyMs: Date.now() - metadataStartedAt,
        category: metadata.category ?? null,
        tagsCount: metadata.tags.length,
        genreCount: metadata.applicableGenres.length,
      });
    } else {
      logger.warn("[style.profile.metadata] fallback_to_empty_metadata", {
        name: coreDraft.name,
        error: metadataResult.reason instanceof Error ? metadataResult.reason.message : String(metadataResult.reason),
      });
    }

    const antiAiRuleKeys = antiAiResult.status === "fulfilled"
      ? antiAiResult.value
      : [];
    if (antiAiResult.status === "fulfilled") {
      logStyleExtractionRuntimeEvent("extract_anti_ai_result", {
        name: coreDraft.name,
        latencyMs: Date.now() - antiAiStartedAt,
        antiAiRuleCount: antiAiRuleKeys.length,
      });
    } else {
      logger.warn("[style.profile.anti_ai] fallback_to_empty_selection", {
        name: coreDraft.name,
        error: antiAiResult.reason instanceof Error ? antiAiResult.reason.message : String(antiAiResult.reason),
      });
    }

    return {
      ...coreDraft,
      category: metadata.category ?? coreDraft.category ?? (llmInput.category?.trim() || null),
      tags: metadata.tags,
      applicableGenres: metadata.applicableGenres,
      antiAiRuleKeys,
    };
  }

  async enrichGeneratedStylePayload(input: {
    sourceType: "from_brief" | "from_book_analysis";
    preferredCategory?: string | null;
    llmInput: LlmInput;
    core: GeneratedStyleCorePayload;
    fallbackName: string;
  }): Promise<GeneratedStylePayload> {
    const name = input.core.name?.trim() || input.fallbackName;
    const summaryInput = buildGeneratedCoreDraftSummary({
      name,
      description: input.core.description,
      analysisMarkdown: input.core.analysisMarkdown,
      narrativeRules: input.core.narrativeRules,
      characterRules: input.core.characterRules,
      languageRules: input.core.languageRules,
      rhythmRules: input.core.rhythmRules,
    });
    const [metadataResult, antiAiResult] = await Promise.allSettled([
      this.generateStyleMetadata({
        name,
        sourceType: input.sourceType,
        preferredCategory: input.preferredCategory ?? undefined,
        coreDraft: summaryInput,
        llmInput: input.llmInput,
      }),
      this.selectAntiAiRuleKeys({
        name,
        summary: input.core.description ?? undefined,
        coreDraft: summaryInput,
        llmInput: input.llmInput,
      }),
    ]);

    if (metadataResult.status === "rejected") {
      logger.warn("[style.profile.metadata] fallback_to_empty_metadata", {
        name,
        error: metadataResult.reason instanceof Error ? metadataResult.reason.message : String(metadataResult.reason),
      });
    }
    if (antiAiResult.status === "rejected") {
      logger.warn("[style.profile.anti_ai] fallback_to_empty_selection", {
        name,
        error: antiAiResult.reason instanceof Error ? antiAiResult.reason.message : String(antiAiResult.reason),
      });
    }

    const metadata = metadataResult.status === "fulfilled"
      ? metadataResult.value
      : normalizeStyleMetadataDraft({}, input.preferredCategory ?? null);
    const antiAiRuleKeys = antiAiResult.status === "fulfilled" ? antiAiResult.value : [];

    return {
      ...input.core,
      name,
      category: metadata.category ?? input.preferredCategory ?? null,
      tags: metadata.tags,
      applicableGenres: metadata.applicableGenres,
      antiAiRuleKeys,
    };
  }

  async generateStyleMetadata(input: {
    name: string;
    sourceType: "from_text" | "from_brief" | "from_book_analysis";
    preferredCategory?: string;
    coreDraft: StyleCreationCoreDraft;
    llmInput: LlmInput;
  }) {
    const result = await runStructuredPrompt({
      asset: styleProfileMetadataPrompt,
      promptInput: {
        name: input.name,
        sourceType: input.sourceType,
        preferredCategory: input.preferredCategory,
        styleDigest: buildStyleMetadataDigest(input.coreDraft),
      },
      options: {
        provider: input.llmInput.provider ?? "deepseek",
        model: input.llmInput.model,
        temperature: 0.2,
        maxTokens: STYLE_METADATA_MAX_TOKENS,
        timeoutMs: input.llmInput.timeoutMs,
        signal: input.llmInput.signal,
      },
    });
    return normalizeStyleMetadataDraft(result.output, input.preferredCategory ?? null);
  }

  async selectAntiAiRuleKeys(input: {
    name: string;
    summary?: string;
    coreDraft: StyleCreationCoreDraft;
    llmInput: LlmInput;
  }): Promise<string[]> {
    const antiAiRules = await this.listEnabledAntiAiRules();
    if (antiAiRules.length === 0) {
      return [];
    }

    const result = await runStructuredPrompt({
      asset: styleProfileAntiAiSelectionPrompt,
      promptInput: {
        name: input.name,
        summary: input.summary,
        styleDigest: buildStyleMetadataDigest(input.coreDraft),
        riskDigest: buildStyleAntiAiRiskDigest(input.coreDraft),
        catalogText: buildAntiAiCatalogText(antiAiRules),
        maxRuleCount: 4,
      },
      options: {
        provider: input.llmInput.provider ?? "deepseek",
        model: input.llmInput.model,
        temperature: 0.2,
        maxTokens: STYLE_ANTI_AI_SELECTION_MAX_TOKENS,
        timeoutMs: input.llmInput.timeoutMs,
        signal: input.llmInput.signal,
      },
    });

    const rawKeys = isRecord(result.output) && Array.isArray(result.output.antiAiRuleKeys)
      ? result.output.antiAiRuleKeys.filter((item): item is string => typeof item === "string")
      : [];
    const normalized = normalizeStyleAntiAiSelectionDraft(
      result.output,
      antiAiRules.map((rule) => rule.key),
    );
    const droppedKeys = rawKeys.filter((key) => !normalized.antiAiRuleKeys.includes(key));
    if (droppedKeys.length > 0) {
      logger.warn("[style.profile.anti_ai] dropped_invalid_rule_keys", {
        name: input.name,
        droppedKeys,
      });
    }
    return normalized.antiAiRuleKeys;
  }

  async persistGeneratedProfile(input: {
    inputName: string;
    sourceType: StyleSourceType;
    sourceRefId?: string;
    sourceContent: string;
    generated: GeneratedStylePayload;
  }): Promise<StyleProfile> {
    const antiAiRuleIds = await this.resolveAntiAiRuleIds(input.generated.antiAiRuleKeys ?? []);
    return this.callbacks.createManualProfile({
      name: input.generated.name?.trim() || input.inputName,
      description: input.generated.description ?? undefined,
      category: input.generated.category ?? undefined,
      tags: input.generated.tags ?? [],
      applicableGenres: input.generated.applicableGenres ?? [],
      sourceType: input.sourceType,
      sourceRefId: input.sourceRefId,
      sourceContent: input.sourceContent,
      extractionAntiAiRuleKeys: input.generated.antiAiRuleKeys ?? [],
      analysisMarkdown: input.generated.analysisMarkdown ?? undefined,
      narrativeRules: input.generated.narrativeRules,
      characterRules: input.generated.characterRules,
      languageRules: input.generated.languageRules,
      rhythmRules: input.generated.rhythmRules,
      antiAiRuleIds,
    });
  }

  async listEnabledAntiAiRules() {
    const rows = await prisma.antiAiRule.findMany({
      where: { enabled: true },
      orderBy: [{ type: "asc" }, { severity: "desc" }, { name: "asc" }],
    });
    return rows.map((row) => mapAntiAiRuleRow(row));
  }

  async resolveAntiAiRuleIds(ruleKeys: string[]): Promise<string[]> {
    if (ruleKeys.length === 0) {
      return [];
    }
    const normalizedRuleKeys = Array.from(new Set(ruleKeys.map((key) => key.trim()).filter(Boolean)));
    const antiRules = await prisma.antiAiRule.findMany({
      where: { key: { in: normalizedRuleKeys } },
    });
    const matchedKeySet = new Set(antiRules.map((rule) => rule.key));
    const droppedKeys = normalizedRuleKeys.filter((key) => !matchedKeySet.has(key));
    if (droppedKeys.length > 0) {
      logger.warn("[style.profile.anti_ai] unresolved_rule_keys", {
        droppedKeys,
      });
    }
    return antiRules.map((rule) => rule.id);
  }

  normalizeGeneratedStyleCorePayload(
    value: GeneratedStyleCorePayload,
    fallbackName: string,
  ): GeneratedStyleCorePayload {
    return {
      name: value.name?.trim() || fallbackName,
      description: normalizeOptionalText(value.description),
      analysisMarkdown: normalizeOptionalText(value.analysisMarkdown),
      narrativeRules: normalizeRuleRecord(value.narrativeRules),
      characterRules: normalizeRuleRecord(value.characterRules),
      languageRules: normalizeRuleRecord(value.languageRules),
      rhythmRules: normalizeRuleRecord(value.rhythmRules),
    };
  }

  hasUsableExtractionFeatures(value: unknown): boolean {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return false;
    }
    const record = value as Record<string, unknown>;
    return [record.features, record.extractedFeatures, record.featurePool]
      .some((candidate) => Array.isArray(candidate) && candidate.length > 0);
  }
}
