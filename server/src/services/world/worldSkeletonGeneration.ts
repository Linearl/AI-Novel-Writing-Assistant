import type { LLMProvider } from "@ai-novel/shared/types/llm";
import type {
  WorldGenerationBlueprint,
  WorldGenProgressEvent,
  WorldGenStageInfo,
  WorldReferenceContext,
  WorldSkeletonGenerationPayload,
  WorldSkeletonGenerationOptions,
} from "@ai-novel/shared/types/worldWizard";
import { normalizeWorldSkeletonGenerationOptions } from "@ai-novel/shared/types/worldWizard";
import { runStructuredPrompt } from "../../prompting/core/promptRunner";
import { worldSkeletonGenerationPrompt } from "../../prompting/prompts/world/worldDraft.prompts";
import {
  buildWorldBindingSupport,
  normalizeWorldBindingSupport,
  normalizeWorldStructuredData,
  WORLD_STRUCTURE_SCHEMA_VERSION,
} from "./worldStructure";

export interface WorldSkeletonGenerateInput {
  idea: string;
  worldType?: string;
  template?: string;
  referenceContext?: WorldReferenceContext | null;
  blueprint?: WorldGenerationBlueprint | null;
  options?: Partial<WorldSkeletonGenerationOptions>;
  provider?: LLMProvider;
  model?: string;
}

const SKELETON_STAGES: WorldGenStageInfo[] = [
  { id: "prepare", label: "准备生成参数", order: 1, totalStages: 4 },
  { id: "llm_generate", label: "AI 生成世界骨架", order: 2, totalStages: 4 },
  { id: "normalize", label: "整理结构化数据", order: 3, totalStages: 4 },
  { id: "assess", label: "完成评估与绑定", order: 4, totalStages: 4 },
];

export type SkeletonProgressCallback = (event: WorldGenProgressEvent) => void;

function emitStage(
  callback: SkeletonProgressCallback | undefined,
  stage: WorldGenStageInfo,
  type: WorldGenProgressEvent["type"],
  message?: string,
): void {
  callback?.({ type, stage, message });
}

export async function generateWorldSkeleton(
  input: WorldSkeletonGenerateInput,
): Promise<WorldSkeletonGenerationPayload> {
  const options = normalizeWorldSkeletonGenerationOptions(input.options);
  const result = await runStructuredPrompt({
    asset: worldSkeletonGenerationPrompt,
    promptInput: {
      idea: input.idea,
      worldType: input.worldType,
      template: input.template,
      referenceContext: input.referenceContext ?? null,
      blueprint: input.blueprint ?? null,
      options,
    },
    options: {
      provider: input.provider ?? "deepseek",
      model: input.model,
      temperature: 0.7,
    },
  });

  const output = result.output;
  const structuredData = normalizeWorldStructuredData({
    ...output.structuredData,
    metadata: {
      ...output.structuredData.metadata,
      schemaVersion: WORLD_STRUCTURE_SCHEMA_VERSION,
      seededFrom: "world-skeleton",
      lastGeneratedAt: new Date().toISOString(),
    },
  });
  const generatedBindingSupport = buildWorldBindingSupport(structuredData);
  const bindingSupport = normalizeWorldBindingSupport(output.bindingSupport, {
    ...generatedBindingSupport,
    recommendedEntryPoints: [
      ...output.storyEntrySuggestions.map((item) => `${item.title}：${item.description}`),
      ...generatedBindingSupport.recommendedEntryPoints,
    ].slice(0, 6),
  });

  return {
    concept: output.concept,
    structuredData,
    bindingSupport,
    storyEntrySuggestions: output.storyEntrySuggestions,
    assessment: output.assessment,
  };
}

export async function generateWorldSkeletonWithProgress(
  input: WorldSkeletonGenerateInput,
  onProgress?: SkeletonProgressCallback,
): Promise<WorldSkeletonGenerationPayload> {
  const stages = SKELETON_STAGES;
  const options = normalizeWorldSkeletonGenerationOptions(input.options);

  emitStage(onProgress, stages[0], "stage_start", "准备生成参数...");
  emitStage(onProgress, stages[0], "stage_complete");

  emitStage(onProgress, stages[1], "stage_start", "AI 正在生成世界骨架...");
  let result;
  try {
    result = await runStructuredPrompt({
      asset: worldSkeletonGenerationPrompt,
      promptInput: {
        idea: input.idea,
        worldType: input.worldType,
        template: input.template,
        referenceContext: input.referenceContext ?? null,
        blueprint: input.blueprint ?? null,
        options,
      },
      options: {
        provider: input.provider ?? "deepseek",
        model: input.model,
        temperature: 0.7,
      },
    });
  } catch (error) {
    emitStage(onProgress, stages[1], "generation_error", error instanceof Error ? error.message : "AI 生成失败");
    throw error;
  }
  emitStage(onProgress, stages[1], "stage_complete", "AI 生成完成");

  emitStage(onProgress, stages[2], "stage_start", "整理结构化数据...");
  const output = result.output;
  const structuredData = normalizeWorldStructuredData({
    ...output.structuredData,
    metadata: {
      ...output.structuredData.metadata,
      schemaVersion: WORLD_STRUCTURE_SCHEMA_VERSION,
      seededFrom: "world-skeleton",
      lastGeneratedAt: new Date().toISOString(),
    },
  });
  emitStage(onProgress, stages[2], "stage_complete");

  emitStage(onProgress, stages[3], "stage_start", "生成评估与绑定...");
  const generatedBindingSupport = buildWorldBindingSupport(structuredData);
  const bindingSupport = normalizeWorldBindingSupport(output.bindingSupport, {
    ...generatedBindingSupport,
    recommendedEntryPoints: [
      ...output.storyEntrySuggestions.map((item) => `${item.title}：${item.description}`),
      ...generatedBindingSupport.recommendedEntryPoints,
    ].slice(0, 6),
  });

  const payload: WorldSkeletonGenerationPayload = {
    concept: output.concept,
    structuredData,
    bindingSupport,
    storyEntrySuggestions: output.storyEntrySuggestions,
    assessment: output.assessment,
  };

  emitStage(onProgress, stages[3], "stage_complete");
  emitStage(onProgress, stages[3], "generation_complete", "世界骨架生成完成");

  return payload;
}
