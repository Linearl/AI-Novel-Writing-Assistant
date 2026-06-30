import type {
  ChapterEditAntiAiExtractResult,
  ChapterEditDiffExtractRequest,
  ChapterEditStyleForkResult,
  StyleProfile,
} from "@ai-novel/shared/types/styleEngine";
import { prisma } from "../../db/prisma";
import { runStructuredPrompt } from "../../prompting/core/promptRunner";
import {
  chapterEditAntiAiExtractPrompt,
  chapterEditStyleForkPrompt,
} from "../../prompting/prompts/style/style.prompts";
import { ensureStyleEngineSeedData } from "./StyleEngineSeedService";
import { mapAntiAiRuleRow, mapStyleProfileRow, serializeJson } from "./helpers";

function formatExistingRulesForDedup(rules: Array<{ key: string; name: string; description: string }>): string {
  return rules.map((r) => `- [${r.key}] ${r.name}: ${r.description}`).join("\n");
}

function formatStyleRulesForPrompt(profile: Pick<StyleProfile, "narrativeRules" | "characterRules" | "languageRules" | "rhythmRules">): string {
  const sections: string[] = [];
  if (Object.keys(profile.narrativeRules).length > 0) {
    sections.push(`【叙事规则】\n${JSON.stringify(profile.narrativeRules, null, 2)}`);
  }
  if (Object.keys(profile.characterRules).length > 0) {
    sections.push(`【角色规则】\n${JSON.stringify(profile.characterRules, null, 2)}`);
  }
  if (Object.keys(profile.languageRules).length > 0) {
    sections.push(`【语言规则】\n${JSON.stringify(profile.languageRules, null, 2)}`);
  }
  if (Object.keys(profile.rhythmRules).length > 0) {
    sections.push(`【节奏规则】\n${JSON.stringify(profile.rhythmRules, null, 2)}`);
  }
  return sections.join("\n\n") || "无已有写法规则";
}

export class ChapterEditDiffService {
  async extractAntiAiRules(input: ChapterEditDiffExtractRequest): Promise<ChapterEditAntiAiExtractResult> {
    await ensureStyleEngineSeedData();

    // Resolve existing anti-AI rules for dedup
    let existingRulesText: string | undefined;
    const bindings = await prisma.styleBinding.findMany({
      where: { enabled: true, targetType: "novel", targetId: input.novelId },
      include: {
        styleProfile: {
          include: {
            antiAiBindings: {
              where: { enabled: true },
              include: { antiAiRule: true },
            },
          },
        },
      },
    });

    const existingRules = bindings.flatMap((binding) =>
      (binding.styleProfile?.antiAiBindings ?? []).map((ab) => ab.antiAiRule),
    );

    if (existingRules.length > 0) {
      existingRulesText = formatExistingRulesForDedup(
        existingRules.map((r) => ({ key: r.key, name: r.name, description: r.description })),
      );
    }

    const result = await runStructuredPrompt({
      asset: chapterEditAntiAiExtractPrompt,
      promptInput: {
        beforeText: input.beforeText,
        afterText: input.afterText,
        existingAntiAiRules: existingRulesText,
      },
      options: {
        provider: input.provider ?? "deepseek",
        model: input.model,
        temperature: input.temperature ?? 0.4,
        maxTokens: 2000,
      },
    });

    const output = result.output;
    return {
      intentSummary: output.intentSummary,
      drafts: (output.drafts ?? []).map((draft) => ({
        key: draft.key || `chapter_edit_${Date.now()}`,
        name: draft.name,
        type: draft.type,
        severity: draft.severity,
        description: draft.description,
        detectPatterns: Array.isArray(draft.detectPatterns) ? draft.detectPatterns : [],
        promptInstruction: draft.promptInstruction ?? null,
        rewriteSuggestion: draft.rewriteSuggestion ?? null,
        enabled: true,
        globalBaselineEnabled: false,
        autoRewrite: false,
      })),
    };
  }

  async forkStyleFromDiff(input: ChapterEditDiffExtractRequest): Promise<ChapterEditStyleForkResult> {
    await ensureStyleEngineSeedData();

    // Resolve current style profile bound to this novel
    const binding = await prisma.styleBinding.findFirst({
      where: { enabled: true, targetType: "novel", targetId: input.novelId },
      include: {
        styleProfile: {
          include: {
            antiAiBindings: {
              include: { antiAiRule: true },
            },
          },
        },
      },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    });

    if (!binding?.styleProfile) {
      throw new Error("当前小说未绑定风格画像，无法执行风格 fork。");
    }

    const currentProfile = mapStyleProfileRow(binding.styleProfile);
    const currentRulesText = formatStyleRulesForPrompt(currentProfile);

    const result = await runStructuredPrompt({
      asset: chapterEditStyleForkPrompt,
      promptInput: {
        beforeText: input.beforeText,
        afterText: input.afterText,
        currentStyleRules: currentRulesText,
      },
      options: {
        provider: input.provider ?? "deepseek",
        model: input.model,
        temperature: input.temperature ?? 0.4,
        maxTokens: 2000,
      },
    });

    const output = result.output;
    const suggestedName = output.suggestedName || `${currentProfile.name}-编辑偏好v1`;

    // Calculate version number: find max version among profiles with same name prefix
    const namePrefix = suggestedName.replace(/-v\d+$/, "");
    const existingProfiles = await prisma.styleProfile.findMany({
      where: {
        name: { startsWith: namePrefix },
      },
      select: { name: true },
    });

    let maxVersion = 0;
    for (const profile of existingProfiles) {
      const versionMatch = profile.name.match(/-v(\d+)$/);
      if (versionMatch) {
        const v = parseInt(versionMatch[1], 10);
        if (v > maxVersion) {
          maxVersion = v;
        }
      }
    }
    const finalVersion = maxVersion + 1;
    const finalName = `${namePrefix}-v${finalVersion}`;

    // Merge patch into existing rules
    const mergedRules = {
      narrativeRules: output.narrativeRules
        ? { ...currentProfile.narrativeRules, ...output.narrativeRules }
        : currentProfile.narrativeRules,
      characterRules: output.characterRules
        ? { ...currentProfile.characterRules, ...output.characterRules }
        : currentProfile.characterRules,
      languageRules: output.languageRules
        ? { ...currentProfile.languageRules, ...output.languageRules }
        : currentProfile.languageRules,
      rhythmRules: output.rhythmRules
        ? { ...currentProfile.rhythmRules, ...output.rhythmRules }
        : currentProfile.rhythmRules,
    };

    // Create new profile
    const newProfileRow = await prisma.styleProfile.create({
      data: {
        name: finalName,
        description: `${currentProfile.description ?? ""} (从编辑 diff fork)`.trim(),
        category: currentProfile.category,
        tagsJson: serializeJson(currentProfile.tags),
        applicableGenresJson: serializeJson(currentProfile.applicableGenres),
        sourceType: "from_current_work",
        sourceRefId: currentProfile.id,
        analysisMarkdown: output.changeSummary,
        narrativeRulesJson: serializeJson(mergedRules.narrativeRules),
        characterRulesJson: serializeJson(mergedRules.characterRules),
        languageRulesJson: serializeJson(mergedRules.languageRules),
        rhythmRulesJson: serializeJson(mergedRules.rhythmRules),
        extractedFeaturesJson: serializeJson([]),
        extractionPresetsJson: serializeJson([]),
        extractionAntiAiRuleKeysJson: serializeJson([]),
      },
      include: {
        antiAiBindings: {
          include: { antiAiRule: true },
        },
      },
    });

    // Create new binding and delete old one
    await prisma.styleBinding.create({
      data: {
        styleProfileId: newProfileRow.id,
        targetType: "novel",
        targetId: input.novelId,
        priority: binding.priority,
        weight: binding.weight,
        enabled: true,
      },
    });
    await prisma.styleBinding.delete({ where: { id: binding.id } });

    const newProfile = mapStyleProfileRow(newProfileRow);

    return {
      newProfile,
      originalProfileId: currentProfile.id,
      changeSummary: output.changeSummary,
      suggestedName: finalName,
    };
  }
}
