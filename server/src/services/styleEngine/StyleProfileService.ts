import type {
  StyleExtractionDraft,
  StyleExtractionPreset,
  StyleFeatureDecision,
  StyleProfile,
  StyleProfileFeature,
  StyleSourceType,
  StyleTemplate,
} from "@ai-novel/shared";
import { prisma } from "../../db/prisma";
import { ensureStyleEngineSeedData } from "./StyleEngineSeedService";
import {
  mapStyleProfileRow,
  mapStyleTemplateRow,
  serializeJson,
} from "./helpers";
import {
  buildExtractionAnalysisMarkdown,
  buildProfileFeaturesFromDraft,
  buildRuleSetFromExtraction,
  buildRuleSetFromProfileFeatures,
  normalizeStyleExtractionDraft,
  normalizeStyleProfileFeatures,
} from "./styleExtraction";
import {
  StyleProfileLlmService,
  AI_STYLE_BRIEF_SOURCE_PREFIX,
  DEFAULT_EXTRACTION_PRESET_KEY,
  type GeneratedStyleCorePayload,
  type GeneratedStylePayload,
  type LlmInput,
  type ManualProfileInput,
  type TextExtractionSourceType,
} from "./StyleProfileLlmService";

export type { ManualProfileInput, LlmInput, GeneratedStyleCorePayload, GeneratedStylePayload, TextExtractionSourceType };

export class StyleProfileService {
  private readonly llm: StyleProfileLlmService;

  constructor() {
    this.llm = new StyleProfileLlmService({
      createManualProfile: (input) => this.createManualProfile(input),
      getProfileById: (id) => this.getProfileById(id),
    });
  }

  async listProfiles(): Promise<StyleProfile[]> {
    await ensureStyleEngineSeedData();
    const rows = await prisma.styleProfile.findMany({
      include: {
        antiAiBindings: {
          where: { enabled: true },
          include: { antiAiRule: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map((row) => mapStyleProfileRow(row));
  }

  async getProfileById(id: string): Promise<StyleProfile | null> {
    await ensureStyleEngineSeedData();
    const row = await prisma.styleProfile.findUnique({
      where: { id },
      include: {
        antiAiBindings: {
          where: { enabled: true },
          include: { antiAiRule: true },
        },
      },
    });
    return row ? mapStyleProfileRow(row) : null;
  }

  async createManualProfile(input: ManualProfileInput): Promise<StyleProfile> {
    await ensureStyleEngineSeedData();
    const row = await prisma.styleProfile.create({
      data: {
        name: input.name,
        description: input.description,
        category: input.category,
        tagsJson: serializeJson(input.tags ?? []),
        applicableGenresJson: serializeJson(input.applicableGenres ?? []),
        sourceType: input.sourceType ?? "manual",
        sourceRefId: input.sourceRefId,
        sourceContent: input.sourceContent,
        extractedFeaturesJson: serializeJson(input.extractedFeatures ?? []),
        extractionPresetsJson: serializeJson(input.extractionPresets ?? []),
        extractionAntiAiRuleKeysJson: serializeJson(input.extractionAntiAiRuleKeys ?? []),
        selectedExtractionPresetKey: input.selectedExtractionPresetKey ?? null,
        analysisMarkdown: input.analysisMarkdown,
        narrativeRulesJson: serializeJson(input.narrativeRules ?? {}),
        characterRulesJson: serializeJson(input.characterRules ?? {}),
        languageRulesJson: serializeJson(input.languageRules ?? {}),
        rhythmRulesJson: serializeJson(input.rhythmRules ?? {}),
        antiAiBindings: input.antiAiRuleIds?.length
          ? {
              create: input.antiAiRuleIds.map((antiAiRuleId) => ({
                antiAiRuleId,
                enabled: true,
              })),
            }
          : undefined,
      },
      include: {
        antiAiBindings: {
          include: { antiAiRule: true },
        },
      },
    });
    return mapStyleProfileRow(row);
  }

  async updateProfile(
    id: string,
    input: Omit<ManualProfileInput, "sourceType"> & { status?: string },
  ): Promise<StyleProfile> {
    await ensureStyleEngineSeedData();
    const normalizedExtractedFeatures = input.extractedFeatures
      ? normalizeStyleProfileFeatures(input.extractedFeatures)
      : null;
    const compiledRuleSet = normalizedExtractedFeatures
      ? buildRuleSetFromProfileFeatures(normalizedExtractedFeatures)
      : null;
    await prisma.styleProfile.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        category: input.category,
        tagsJson: input.tags ? serializeJson(input.tags) : undefined,
        applicableGenresJson: input.applicableGenres ? serializeJson(input.applicableGenres) : undefined,
        sourceRefId: input.sourceRefId,
        sourceContent: input.sourceContent,
        extractedFeaturesJson: normalizedExtractedFeatures ? serializeJson(normalizedExtractedFeatures) : undefined,
        analysisMarkdown: input.analysisMarkdown,
        narrativeRulesJson: compiledRuleSet
          ? serializeJson(compiledRuleSet.narrativeRules)
          : (input.narrativeRules ? serializeJson(input.narrativeRules) : undefined),
        characterRulesJson: compiledRuleSet
          ? serializeJson(compiledRuleSet.characterRules)
          : (input.characterRules ? serializeJson(input.characterRules) : undefined),
        languageRulesJson: compiledRuleSet
          ? serializeJson(compiledRuleSet.languageRules)
          : (input.languageRules ? serializeJson(input.languageRules) : undefined),
        rhythmRulesJson: compiledRuleSet
          ? serializeJson(compiledRuleSet.rhythmRules)
          : (input.rhythmRules ? serializeJson(input.rhythmRules) : undefined),
        status: input.status,
      },
    });

    if (input.antiAiRuleIds) {
      await prisma.styleProfileAntiAiRule.deleteMany({
        where: { styleProfileId: id },
      });
      if (input.antiAiRuleIds.length > 0) {
        await prisma.styleProfileAntiAiRule.createMany({
          data: input.antiAiRuleIds.map((antiAiRuleId) => ({
            styleProfileId: id,
            antiAiRuleId,
            enabled: true,
          })),
        });
      }
    }

    const updated = await this.getProfileById(id);
    if (!updated) {
      throw new Error("写法资产不存在。");
    }
    return updated;
  }

  async deleteProfile(id: string): Promise<void> {
    await prisma.styleProfile.delete({ where: { id } });
  }

  /**
   * Build a portable export envelope from a StyleProfile (strips id, timestamps, and anti-AI rule internals).
   */
  buildExportEnvelope(profile: StyleProfile) {
    const exportData = {
      name: profile.name,
      description: profile.description,
      category: profile.category,
      tags: profile.tags,
      applicableGenres: profile.applicableGenres,
      sourceType: profile.sourceType,
      sourceContent: profile.sourceContent,
      analysisMarkdown: profile.analysisMarkdown,
      extractedFeatures: profile.extractedFeatures,
      extractionPresets: profile.extractionPresets,
      extractionAntiAiRuleKeys: profile.extractionAntiAiRuleKeys,
      selectedExtractionPresetKey: profile.selectedExtractionPresetKey,
      narrativeRules: profile.narrativeRules,
      characterRules: profile.characterRules,
      languageRules: profile.languageRules,
      rhythmRules: profile.rhythmRules,
      antiAiRuleKeys: profile.antiAiRules.map((rule) => rule.key),
    };
    return {
      formatVersion: 1 as const,
      exportedAt: new Date().toISOString(),
      profile: exportData,
    };
  }

  /**
   * Import a StyleProfile from exported JSON data, respecting the conflict strategy.
   * - overwrite: if a profile with the same name exists, replace it
   * - create_new: always create a new profile (appends "(imported)" if needed)
   * - skip: if a profile with the same name exists, skip it
   */
  async importProfile(input: {
    profileData: Record<string, unknown>;
    conflictStrategy: "overwrite" | "create_new" | "skip";
  }) {
    await ensureStyleEngineSeedData();
    const data = input.profileData as {
      name: string;
      description?: string | null;
      category?: string | null;
      tags: string[];
      applicableGenres: string[];
      sourceType?: StyleSourceType;
      sourceContent?: string | null;
      analysisMarkdown?: string | null;
      extractedFeatures?: StyleProfileFeature[];
      extractionPresets?: StyleExtractionPreset[];
      extractionAntiAiRuleKeys?: string[];
      selectedExtractionPresetKey?: string | null;
      narrativeRules?: Record<string, unknown>;
      characterRules?: Record<string, unknown>;
      languageRules?: Record<string, unknown>;
      rhythmRules?: Record<string, unknown>;
      antiAiRuleKeys?: string[];
    };

    const existingProfiles = await prisma.styleProfile.findMany({
      select: { id: true, name: true },
    });
    const existingByName = existingProfiles.find((p) => p.name === data.name);

    if (existingByName && input.conflictStrategy === "skip") {
      return {
        action: "skipped" as const,
        profileName: data.name,
        message: `已跳过：已存在同名写法资产"${data.name}"。`,
      };
    }

    // Resolve anti-AI rule IDs from keys
    let antiAiRuleIds: string[] = [];
    if (data.antiAiRuleKeys && data.antiAiRuleKeys.length > 0) {
      const resolved = await prisma.antiAiRule.findMany({
        where: { key: { in: data.antiAiRuleKeys } },
        select: { id: true },
      });
      antiAiRuleIds = resolved.map((r) => r.id);
    }

    const profileInput = {
      name: data.name,
      description: data.description ?? undefined,
      category: data.category ?? undefined,
      tags: data.tags ?? [],
      applicableGenres: data.applicableGenres ?? [],
      sourceType: (data.sourceType as StyleSourceType) ?? "manual",
      sourceContent: data.sourceContent ?? undefined,
      analysisMarkdown: data.analysisMarkdown ?? undefined,
      extractedFeatures: (data.extractedFeatures as StyleProfileFeature[]) ?? [],
      extractionPresets: (data.extractionPresets as StyleExtractionPreset[]) ?? [],
      extractionAntiAiRuleKeys: data.antiAiRuleKeys ?? [],
      selectedExtractionPresetKey: (data.selectedExtractionPresetKey as "imitate" | "balanced" | "transfer") ?? undefined,
      narrativeRules: data.narrativeRules ?? {},
      characterRules: data.characterRules ?? {},
      languageRules: data.languageRules ?? {},
      rhythmRules: data.rhythmRules ?? {},
      antiAiRuleIds,
    };

    if (existingByName && input.conflictStrategy === "overwrite") {
      await this.updateProfile(existingByName.id, profileInput as any);
      return {
        action: "overwritten" as const,
        profileId: existingByName.id,
        profileName: data.name,
        message: `已覆盖：同名写法资产"${data.name}"已更新。`,
      };
    }

    // create_new or first-time name
    const created = await this.createManualProfile(profileInput as any);
    return {
      action: "created" as const,
      profileId: created.id,
      profileName: created.name,
      message: `已导入：写法资产"${created.name}"创建成功。`,
    };
  }

  async listTemplates(): Promise<StyleTemplate[]> {
    await ensureStyleEngineSeedData();
    const rows = await prisma.styleTemplate.findMany({
      orderBy: { name: "asc" },
    });
    return rows.map((row) => mapStyleTemplateRow(row));
  }

  async createFromTemplate(input: { templateId: string; name?: string }): Promise<StyleProfile> {
    await ensureStyleEngineSeedData();
    const template = await prisma.styleTemplate.findUnique({ where: { id: input.templateId } });
    if (!template) {
      throw new Error("写法模板不存在。");
    }
    const antiRules = await prisma.antiAiRule.findMany({
      where: {
        key: {
          in: JSON.parse(template.defaultAntiAiRuleKeysJson ?? "[]"),
        },
      },
      orderBy: { name: "asc" },
    });
    return this.createManualProfile({
      name: input.name?.trim() || template.name,
      description: template.description,
      category: template.category,
      tags: JSON.parse(template.tagsJson ?? "[]"),
      applicableGenres: JSON.parse(template.applicableGenresJson ?? "[]"),
      sourceType: "manual",
      analysisMarkdown: template.analysisMarkdown ?? undefined,
      narrativeRules: JSON.parse(template.narrativeRulesJson ?? "{}"),
      characterRules: JSON.parse(template.characterRulesJson ?? "{}"),
      languageRules: JSON.parse(template.languageRulesJson ?? "{}"),
      rhythmRules: JSON.parse(template.rhythmRulesJson ?? "{}"),
      antiAiRuleIds: antiRules.map((rule) => rule.id),
    });
  }

  async createFromText(input: {
    name: string;
    sourceText: string;
    category?: string;
  } & LlmInput): Promise<StyleProfile> {
    const draft = await this.extractFromText(input);
    const balancedPreset = draft.presets.find((item) => item.key === DEFAULT_EXTRACTION_PRESET_KEY)
      ?? draft.presets[0];
    return this.createProfileFromExtraction({
      name: input.name,
      sourceText: input.sourceText,
      category: input.category,
      draft,
      presetKey: DEFAULT_EXTRACTION_PRESET_KEY,
      decisions: balancedPreset?.decisions ?? draft.features.map((feature) => ({
        featureId: feature.id,
        decision: "keep" as StyleFeatureDecision,
      })),
    });
  }

  async extractFromText(input: {
    name: string;
    sourceText: string;
    category?: string;
  } & LlmInput): Promise<StyleExtractionDraft> {
    await ensureStyleEngineSeedData();
    const coreDraft = normalizeStyleExtractionDraft(
      await this.llm.generateStructuredExtractionCore(input),
      input.name,
      input.category,
    );
    return this.llm.enrichExtractionDraft(coreDraft, input);
  }

  async createProfileFromExtraction(input: {
    name: string;
    sourceText: string;
    category?: string;
    draft: StyleExtractionDraft;
    decisions: Array<{ featureId: string; decision: StyleFeatureDecision }>;
    presetKey?: "imitate" | "balanced" | "transfer";
    sourceType?: TextExtractionSourceType;
    sourceRefId?: string;
  }): Promise<StyleProfile> {
    await ensureStyleEngineSeedData();
    const sourceType = input.sourceType ?? "from_text";
    const normalizedDraft = normalizeStyleExtractionDraft(input.draft, input.name, input.category);
    const ruleSet = buildRuleSetFromExtraction(normalizedDraft, input.decisions, input.presetKey);
    const extractedFeatures = buildProfileFeaturesFromDraft(normalizedDraft).map((feature) => ({
      ...feature,
      selectedDecision: input.decisions.find((item) => item.featureId === feature.id)?.decision ?? "keep",
      enabled: (input.decisions.find((item) => item.featureId === feature.id)?.decision ?? "keep") !== "remove",
    }));
    const antiAiRuleIds = await this.llm.resolveAntiAiRuleIds(normalizedDraft.antiAiRuleKeys);

    return this.createManualProfile({
      name: input.name.trim() || normalizedDraft.name,
      description: normalizedDraft.description
        ?? `${sourceType === "from_knowledge_document" ? "基于知识库原文提取生成" : "基于文本提取生成"}，保留 ${input.decisions.filter((item) => item.decision === "keep").length} 项特征，弱化 ${input.decisions.filter((item) => item.decision === "weaken").length} 项特征。`,
      category: input.category?.trim() || normalizedDraft.category || undefined,
      tags: normalizedDraft.tags,
      applicableGenres: normalizedDraft.applicableGenres,
      sourceType,
      sourceRefId: input.sourceRefId,
      sourceContent: input.sourceText,
      extractedFeatures,
      extractionPresets: normalizedDraft.presets,
      extractionAntiAiRuleKeys: normalizedDraft.antiAiRuleKeys,
      selectedExtractionPresetKey: input.presetKey ?? DEFAULT_EXTRACTION_PRESET_KEY,
      analysisMarkdown: normalizedDraft.analysisMarkdown
        ?? buildExtractionAnalysisMarkdown(normalizedDraft, input.decisions, input.presetKey),
      narrativeRules: ruleSet.narrativeRules,
      characterRules: ruleSet.characterRules,
      languageRules: ruleSet.languageRules,
      rhythmRules: ruleSet.rhythmRules,
      antiAiRuleIds,
    });
  }

  async createFromBookAnalysis(input: {
    bookAnalysisId: string;
    name: string;
  } & LlmInput): Promise<StyleProfile> {
    await ensureStyleEngineSeedData();
    const section = await prisma.bookAnalysisSection.findFirst({
      where: {
        analysisId: input.bookAnalysisId,
        sectionKey: "style_technique",
      },
      include: {
        analysis: true,
      },
    });
    if (!section) {
      throw new Error("未找到可用于生成写法的拆书文风与技法小节。");
    }
    const sourceText = section.editedContent?.trim() || section.aiContent?.trim();
    if (!sourceText) {
      throw new Error("拆书文风与技法小节为空，无法生成写法资产。");
    }
    const generatedCore = await this.llm.generateStructuredStyle(
      {
        analysisTitle: section.analysis.title,
        name: input.name,
        sourceText,
      },
      input,
    );
    const generated = await this.llm.enrichGeneratedStylePayload({
      sourceType: "from_book_analysis",
      preferredCategory: null,
      llmInput: input,
      core: generatedCore,
      fallbackName: input.name,
    });
    return this.llm.persistGeneratedProfile({
      inputName: input.name,
      sourceType: "from_book_analysis",
      sourceRefId: input.bookAnalysisId,
      sourceContent: sourceText,
      generated,
    });
  }

  async createFromBrief(input: {
    brief: string;
    name?: string;
    category?: string;
  } & LlmInput): Promise<StyleProfile> {
    await ensureStyleEngineSeedData();
    const generatedCore = await this.llm.generateStructuredStyleFromBrief(
      {
        brief: input.brief,
        name: input.name?.trim() || undefined,
        category: input.category?.trim() || undefined,
      },
      input,
    );
    const generated = await this.llm.enrichGeneratedStylePayload({
      sourceType: "from_brief",
      preferredCategory: input.category?.trim() || null,
      llmInput: input,
      core: generatedCore,
      fallbackName: input.name?.trim() || generatedCore.name?.trim() || "AI 生成写法",
    });
    return this.llm.persistGeneratedProfile({
      inputName: input.name?.trim() || generated.name?.trim() || "AI 生成写法",
      sourceType: "manual",
      sourceRefId: `${AI_STYLE_BRIEF_SOURCE_PREFIX}${Date.now()}`,
      sourceContent: input.brief,
      generated,
    });
  }
}
