import type {
  DirectorCandidate,
  DirectorCandidateBatch,
  DirectorProjectContextInput,
} from "@ai-novel/shared";
import type { StoryMacroPlan } from "@ai-novel/shared";
import { createContextBlock } from "../../core/contextBudget";
import type { PromptContextBlock } from "../../core/promptTypes";

function compactText(value: string | null | undefined, fallback = "无"): string {
  return value?.replace(/\s+/g, " ").trim() || fallback;
}

function takeUnique(items: Array<string | null | undefined>, limit = items.length): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const normalized = compactText(item, "");
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
    if (result.length >= limit) {
      break;
    }
  }
  return result;
}

function readerChannelPreferenceLabel(value: DirectorProjectContextInput["readerChannelPreference"]): string {
  switch (value) {
    case "ai_judge":
      return "AI 判断";
    case "male_oriented":
      return "男性向";
    case "female_oriented":
      return "女性向";
    case "general":
      return "通用 / 不限";
    default:
      return "";
  }
}

export function formatProjectContext(input: DirectorProjectContextInput): string {
  const styleSummaryLines = input.styleIntentSummary?.stageSummaryLines ?? [];
  const readerChannel = readerChannelPreferenceLabel(input.readerChannelPreference);
  const lines = [
    input.title?.trim() ? `当前书名: ${input.title.trim()}` : "",
    input.description?.trim() ? `当前简介: ${input.description.trim()}` : "",
    input.targetAudience?.trim() ? `目标读者: ${input.targetAudience.trim()}` : "",
    input.bookSellingPoint?.trim() ? `核心卖点: ${input.bookSellingPoint.trim()}` : "",
    input.competingFeel?.trim() ? `对标感受: ${input.competingFeel.trim()}` : "",
    input.first30ChapterPromise?.trim() ? `前30章承诺: ${input.first30ChapterPromise.trim()}` : "",
    input.commercialTags && input.commercialTags.length > 0
      ? `商业标签: ${input.commercialTags.join(", ")}`
      : "",
    input.genreId?.trim() ? `类型 ID: ${input.genreId.trim()}` : "",
    input.primaryStoryModeId?.trim() ? `主故事模式 ID: ${input.primaryStoryModeId.trim()}` : "",
    input.secondaryStoryModeId?.trim() ? `副故事模式 ID: ${input.secondaryStoryModeId.trim()}` : "",
    input.worldId?.trim() ? `世界 ID: ${input.worldId.trim()}` : "",
    input.writingMode ? `写作模式: ${input.writingMode}` : "",
    input.projectMode ? `项目模式: ${input.projectMode}` : "",
    readerChannel ? `读者频道倾向: ${readerChannel}` : "",
    input.narrativePov ? `叙事视角: ${input.narrativePov}` : "",
    input.pacePreference ? `节奏偏好: ${input.pacePreference}` : "",
    input.styleTone?.trim() && !input.styleProfileId?.trim() ? `风格基调: ${input.styleTone.trim()}` : "",
    input.styleProfileId?.trim() ? `风格配置 ID: ${input.styleProfileId.trim()}` : "",
    input.styleIntentSummary?.headline?.trim() ? `当前风格提示: ${input.styleIntentSummary.headline.trim()}` : "",
    styleSummaryLines.length > 0 ? `风格意图摘要: ${styleSummaryLines.join(" | ")}` : "",
    input.emotionIntensity ? `情绪强度: ${input.emotionIntensity}` : "",
    input.aiFreedom ? `AI 自由度: ${input.aiFreedom}` : "",
    typeof input.defaultChapterLength === "number" ? `默认章节长度: ${input.defaultChapterLength}` : "",
    typeof input.estimatedChapterCount === "number" ? `预估章节数: ${input.estimatedChapterCount}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}

function formatCandidateDigest(candidate: DirectorCandidate): string {
  return [
    `书名: ${candidate.workingTitle}`,
    `一句话梗概: ${candidate.logline}`,
    `定位: ${candidate.positioning}`,
    `核心卖点: ${candidate.sellingPoint}`,
    `核心冲突: ${candidate.coreConflict}`,
    `主角路径: ${candidate.protagonistPath}`,
    `钩子策略: ${candidate.hookStrategy}`,
    `推进循环: ${candidate.progressionLoop}`,
    `结局方向: ${candidate.endingDirection}`,
  ].join("\n");
}

function formatLatestBatchDigest(batch: DirectorCandidateBatch | undefined): string {
  if (!batch) {
    return "无前置批次。";
  }
  return [
    `${batch.roundLabel}: ${compactText(batch.refinementSummary, "最新候选轮次")}`,
    ...batch.candidates.map((candidate, index) => (
      [`候选 ${index + 1}`, formatCandidateDigest(candidate)].join("\n")
    )),
  ].join("\n\n");
}

function formatStoryMacroSummary(plan: StoryMacroPlan | null | undefined): string {
  if (!plan) {
    return "无宏观故事计划。";
  }
  return [
    plan.expansion?.expanded_premise ? `展开前提: ${plan.expansion.expanded_premise}` : "",
    plan.expansion?.conflict_engine ? `冲突引擎: ${plan.expansion.conflict_engine}` : "",
    plan.expansion?.mystery_box ? `悬念箱: ${plan.expansion.mystery_box}` : "",
    plan.decomposition?.selling_point ? `核心卖点: ${plan.decomposition.selling_point}` : "",
    plan.decomposition?.core_conflict ? `核心冲突: ${plan.decomposition.core_conflict}` : "",
    plan.decomposition?.progression_loop ? `推进循环: ${plan.decomposition.progression_loop}` : "",
    plan.decomposition?.growth_path ? `成长路径: ${plan.decomposition.growth_path}` : "",
    plan.decomposition?.ending_flavor ? `结局风味: ${plan.decomposition.ending_flavor}` : "",
    plan.constraints.length > 0 ? `约束: ${plan.constraints.join(" | ")}` : "",
  ].filter(Boolean).join("\n");
}

export function buildDirectorCandidateContextBlocks(input: {
  idea: string;
  context: DirectorProjectContextInput;
  latestBatch?: DirectorCandidateBatch;
  presets: string[];
  feedback?: string;
}): PromptContextBlock[] {
  return [
    createContextBlock({
      id: "idea_seed",
      group: "idea_seed",
      priority: 100,
      required: true,
      content: `创意种子:\n${compactText(input.idea)}`,
    }),
    createContextBlock({
      id: "project_context",
      group: "project_context",
      priority: 90,
      content: `项目上下文:\n${formatProjectContext(input.context) || "无"}`,
    }),
    createContextBlock({
      id: "latest_batch",
      group: "latest_batch",
      priority: 70,
      content: `最新批次摘要:\n${formatLatestBatchDigest(input.latestBatch)}`,
    }),
    createContextBlock({
      id: "preset_hints",
      group: "preset_hints",
      priority: 80,
      content: `预设修正提示:\n${input.presets.join("\n") || "无"}`,
    }),
    createContextBlock({
      id: "freeform_feedback",
      group: "freeform_feedback",
      priority: 76,
      content: `自由修正提示:\n${compactText(input.feedback) || "无"}`,
    }),
  ].filter((block) => block.content.trim().length > 0);
}

export function buildDirectorBlueprintContextBlocks(input: {
  idea: string;
  context: DirectorProjectContextInput;
  candidate: DirectorCandidate;
  storyMacroPlan: StoryMacroPlan;
  targetChapterCount: number;
}): PromptContextBlock[] {
  return [
    createContextBlock({
      id: "book_contract",
      group: "book_contract",
      priority: 100,
      required: true,
      content: [
        "书籍契约:",
        formatCandidateDigest(input.candidate),
        `目标章节数: ${input.targetChapterCount}`,
      ].join("\n"),
    }),
    createContextBlock({
      id: "idea_seed",
      group: "idea_seed",
      priority: 96,
      required: true,
      content: `创意种子:\n${compactText(input.idea)}`,
    }),
    createContextBlock({
      id: "project_context",
      group: "project_context",
      priority: 86,
      content: `项目上下文:\n${formatProjectContext(input.context) || "无"}`,
    }),
    createContextBlock({
      id: "macro_constraints",
      group: "macro_constraints",
      priority: 92,
      required: true,
      content: `宏观故事摘要:\n${formatStoryMacroSummary(input.storyMacroPlan)}`,
    }),
  ];
}

export function buildDirectorBookContractContextBlocks(input: {
  idea: string;
  context: DirectorProjectContextInput;
  candidate: DirectorCandidate;
  storyMacroPlan: StoryMacroPlan | null | undefined;
  targetChapterCount: number;
}): PromptContextBlock[] {
  return [
    createContextBlock({
      id: "book_direction",
      group: "book_contract",
      priority: 100,
      required: true,
      content: [
        "导演书籍方向:",
        formatCandidateDigest(input.candidate),
        `目标章节数: ${input.targetChapterCount}`,
      ].join("\n"),
    }),
    createContextBlock({
      id: "idea_seed",
      group: "idea_seed",
      priority: 96,
      required: true,
      content: `创意种子:\n${compactText(input.idea)}`,
    }),
    createContextBlock({
      id: "project_context",
      group: "project_context",
      priority: 88,
      content: `项目上下文:\n${formatProjectContext(input.context) || "无"}`,
    }),
    createContextBlock({
      id: "macro_constraints",
      group: "macro_constraints",
      priority: 92,
      content: `宏观故事摘要:\n${formatStoryMacroSummary(input.storyMacroPlan)}`,
    }),
  ].filter((block) => block.content.trim().length > 0);
}

export function buildStoryMacroDecompositionContextBlocks(input: {
  storyInput: string;
  projectContext: string;
}): PromptContextBlock[] {
  return [
    createContextBlock({
      id: "story_input",
      group: "story_input",
      priority: 100,
      required: true,
      content: `故事输入:\n${compactText(input.storyInput)}`,
    }),
    createContextBlock({
      id: "project_context",
      group: "project_context",
      priority: 92,
      content: `项目上下文:\n${compactText(input.projectContext)}`,
    }),
  ];
}

export function buildStoryMacroFieldRegenerationContextBlocks(input: {
  field: string;
  storyInput: string;
  projectContext: string;
  expansionSummary: string;
  decompositionSummary: string;
  constraints: string[];
  lockedFields: string[];
}): PromptContextBlock[] {
  return [
    createContextBlock({
      id: "story_input",
      group: "story_input",
      priority: 100,
      required: true,
      content: `故事输入:\n${compactText(input.storyInput)}`,
    }),
    createContextBlock({
      id: "target_field",
      group: "target_field",
      priority: 98,
      required: true,
      content: `目标字段: ${input.field}`,
    }),
    createContextBlock({
      id: "project_context",
      group: "project_context",
      priority: 90,
      content: `项目上下文:\n${compactText(input.projectContext)}`,
    }),
    createContextBlock({
      id: "expansion_summary",
      group: "expansion_summary",
      priority: 88,
      content: `展开摘要:\n${compactText(input.expansionSummary)}`,
    }),
    createContextBlock({
      id: "decomposition_summary",
      group: "decomposition_summary",
      priority: 94,
      required: true,
      content: `分解摘要:\n${compactText(input.decompositionSummary)}`,
    }),
    createContextBlock({
      id: "constraints",
      group: "constraints",
      priority: 96,
      required: true,
      content: `约束:\n${takeUnique(input.constraints, 8).join("\n") || "无"}`,
    }),
    createContextBlock({
      id: "locked_fields",
      group: "locked_fields",
      priority: 82,
      content: `已锁定字段:\n${takeUnique(input.lockedFields, 12).join("\n") || "无"}`,
    }),
  ].filter((block) => block.content.trim().length > 0);
}
