import type {
  VolumeGenerationScope,
  VolumePlanDocument,
} from "@ai-novel/shared";
import { prisma } from "../../../db/prisma";
import { runStructuredPrompt } from "../../../prompting/core/promptRunner";
import type { PromptContextBlock } from "../../../prompting/core/promptTypes";
import {
  volumeChapterBoundaryPrompt,
  volumeChapterPurposePrompt,
} from "../../../prompting/prompts/novel/volume/chapterDetail.prompts";
import {
  buildVolumeChapterDetailContextBlocks,
  buildVolumeRebalanceContextBlocks,
  buildVolumeSkeletonContextBlocks,
  buildVolumeStrategyContextBlocks,
  buildVolumeStrategyCritiqueContextBlocks,
} from "../../../prompting/prompts/novel/volume/contextBlocks";
import { volumeRebalancePrompt } from "../../../prompting/prompts/novel/volume/rebalance.prompts";
import { createVolumeSkeletonPrompt } from "../../../prompting/prompts/novel/volume/skeleton.prompts";
import {
  createVolumeStrategyPrompt,
  volumeStrategyCritiquePrompt,
} from "../../../prompting/prompts/novel/volume/strategy.prompts";
import { buildStoryModePromptBlock, normalizeStoryModeOutput } from "../../storyMode/storyModeProfile";
import type { StoryMacroPlanService } from "../storyMacro/StoryMacroPlanService";
import {
  inferRequiredChapterCountFromBeatSheet,
  resolveTargetChapterCount,
} from "./volumeBeatSheetChapterBudget";
import { generateBeatChunkedChapterList } from "./volumeChapterListGeneration";
import { normalizeVolumeDraftContextInput } from "./volumeDraftContext";
import {
  allocateChapterBudgets,
  assertScopeReadiness,
  deriveChapterBudget,
  generateChapterTaskSheetDetail,
  getBeatSheet,
  getTargetChapter,
  getTargetVolume,
  mergeChapterDetail,
  mergeCritiqueReport,
  mergeRebalance,
  mergeSkeleton,
  mergeStrategyPlan,
  normalizeScope,
} from "./volumeGenerationHelpers";
import type {
  VolumeGenerateOptions,
  VolumeGenerationPhase,
  VolumeGenerationNovel,
  VolumeWorkspace,
} from "./volumeModels";
import { buildVolumeWorkspaceDocument } from "./volumeWorkspaceDocument";
import { formatChapterDetailModeLabel } from "./chapterDetailModeLabel";
import {
  generateBeatSheet,
  resolveBeatSheetTargetChapterCount,
} from "./volumeBeatSheetGeneration";
import { logger } from "../../logging/LoggerService";
import {
  MAX_VOLUME_COUNT,
  buildVolumeCountGuidance,
} from "@ai-novel/shared";
import {
  loadMaterialIndexBlock,
  runWithTwoRoundMaterialLoading,
} from "./volumeMaterialLoading";

type StoryMacroPlanResult = Awaited<ReturnType<StoryMacroPlanService["getPlan"]>> | null;

async function notifyVolumeGenerationPhase(input: {
  novelId: string;
  scope: VolumeGenerationScope;
  phase: VolumeGenerationPhase;
  label: string;
  options: VolumeGenerateOptions;
}): Promise<void> {
  logger.info(
    `[volume.generate] event=phase_start novelId=${input.novelId} scope=${input.scope} phase=${input.phase} label=${JSON.stringify(input.label)}`,
  );
  await input.options.onPhaseStart?.({
    scope: input.scope,
    phase: input.phase,
    label: input.label,
  });
}

async function loadGenerationContext(params: {
  novelId: string;
  workspace: VolumeWorkspace;
  storyMacroPlanService: Pick<StoryMacroPlanService, "getPlan">;
}): Promise<{
  novel: VolumeGenerationNovel;
  storyMacroPlan: StoryMacroPlanResult;
}> {
  const { novelId, storyMacroPlanService } = params;
  const [rawNovel, storyMacroPlan] = await Promise.all([
    prisma.novel.findUnique({
      where: { id: novelId },
      select: {
        title: true,
        description: true,
        targetAudience: true,
        bookFramingJson: true,
        commercialTagsJson: true,
        estimatedChapterCount: true,
        narrativePov: true,
        pacePreference: true,
        emotionIntensity: true,
        outline: true,  // 用户粘贴的完整素材（世界观、角色、大纲、章节梗概等）
        primaryStoryMode: {
          select: {
            id: true,
            name: true,
            description: true,
            template: true,
            parentId: true,
            profileJson: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        secondaryStoryMode: {
          select: {
            id: true,
            name: true,
            description: true,
            template: true,
            parentId: true,
            profileJson: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        genre: {
          select: { name: true },
        },
        characters: {
          orderBy: { createdAt: "asc" },
          select: {
            name: true,
            role: true,
            currentGoal: true,
            currentState: true,
          },
        },
      },
    }),
    storyMacroPlanService.getPlan(novelId).catch(() => null),
  ]);

  if (!rawNovel) {
    throw new Error("小说不存在。");
  }

  const { bookFramingJson, primaryStoryMode, secondaryStoryMode, ...restRawNovel } = rawNovel;
  const bookFraming = ((): { bookSellingPoint?: string | null; competingFeel?: string | null; first30ChapterPromise?: string | null } => {
    try {
      return bookFramingJson ? JSON.parse(bookFramingJson) as Record<string, unknown> : {};
    } catch {
      return {};
    }
  })();

  const novel: VolumeGenerationNovel = {
    ...restRawNovel,
    bookSellingPoint: bookFraming.bookSellingPoint ?? null,
    competingFeel: bookFraming.competingFeel ?? null,
    first30ChapterPromise: bookFraming.first30ChapterPromise ?? null,
    storyModePromptBlock: buildStoryModePromptBlock({
      primary: primaryStoryMode ? normalizeStoryModeOutput(primaryStoryMode) : null,
      secondary: secondaryStoryMode ? normalizeStoryModeOutput(secondaryStoryMode) : null,
    }),
  };

  return {
    novel,
    storyMacroPlan,
  };
}

async function generateStrategy(params: {
  document: VolumePlanDocument;
  novel: VolumeGenerationNovel;
  workspace: VolumeWorkspace;
  storyMacroPlan: StoryMacroPlanResult;
  options: VolumeGenerateOptions;
  materialIndexBlock?: PromptContextBlock | null;
}): Promise<VolumePlanDocument> {
  const { document, novel, workspace, storyMacroPlan, options, materialIndexBlock } = params;
  const chapterBudget = deriveChapterBudget({ novel, workspace, options });
  const volumeCountGuidance = buildVolumeCountGuidance({
    chapterBudget,
    existingVolumeCount: workspace.volumes.length,
    respectExistingVolumeCount: options.respectExistingVolumeCount,
    userPreferredVolumeCount: options.userPreferredVolumeCount,
    maxVolumeCount: MAX_VOLUME_COUNT,
  });
  await notifyVolumeGenerationPhase({
    novelId: document.novelId,
    scope: "strategy",
    phase: "prompt",
    label: "正在生成卷战略",
    options,
  });
  const strategyAsset = createVolumeStrategyPrompt({
    maxVolumeCount: MAX_VOLUME_COUNT,
    allowedVolumeCountRange: volumeCountGuidance.allowedVolumeCountRange,
    fixedRecommendedVolumeCount: volumeCountGuidance.userPreferredVolumeCount,
    hardPlannedVolumeRange: volumeCountGuidance.hardPlannedVolumeRange,
  });
  const strategyPromptInput = {
    novel,
    workspace,
    storyMacroPlan,
    guidance: options.guidance,
    volumeCountGuidance,
  };
  const strategyContextBlocks = buildVolumeStrategyContextBlocks(strategyPromptInput);
  const allStrategyContextBlocks = materialIndexBlock
    ? [...strategyContextBlocks, materialIndexBlock]
    : strategyContextBlocks;

  const generated = await runWithTwoRoundMaterialLoading({
    asset: strategyAsset,
    promptInput: strategyPromptInput,
    contextBlocks: allStrategyContextBlocks,
    options: {
      provider: options.provider,
      model: options.model,
      temperature: options.temperature ?? 0.3,
      novelId: document.novelId,
      taskId: options.taskId,
      stage: "volume_strategy",
      itemKey: "volume_strategy",
      scope: "strategy",
      entrypoint: options.entrypoint,
      signal: options.signal,
    },
    novelId: document.novelId,
  });
  return mergeStrategyPlan(document, generated.output);
}

async function generateStrategyCritique(params: {
  document: VolumePlanDocument;
  novel: VolumeGenerationNovel;
  workspace: VolumeWorkspace;
  storyMacroPlan: StoryMacroPlanResult;
  options: VolumeGenerateOptions;
}): Promise<VolumePlanDocument> {
  const { document, novel, workspace, storyMacroPlan, options } = params;
  if (!document.strategyPlan) {
    throw new Error("请先生成卷战略建议。");
  }
  await notifyVolumeGenerationPhase({
    novelId: document.novelId,
    scope: "strategy_critique",
    phase: "prompt",
    label: "正在评估卷战略",
    options,
  });
  const generated = await runStructuredPrompt({
    asset: volumeStrategyCritiquePrompt,
    promptInput: {
      novel,
      workspace,
      storyMacroPlan,
      strategyPlan: document.strategyPlan,
      guidance: options.guidance,
    },
    contextBlocks: buildVolumeStrategyCritiqueContextBlocks({
      novel,
      workspace,
      storyMacroPlan,
      strategyPlan: document.strategyPlan,
      guidance: options.guidance,
    }),
    options: {
      provider: options.provider,
      model: options.model,
      temperature: options.temperature ?? 0.2,
      novelId: document.novelId,
      taskId: options.taskId,
      stage: "volume_strategy",
      itemKey: "volume_strategy",
      scope: "strategy_critique",
      entrypoint: options.entrypoint,
      signal: options.signal,
    },
  });
  return mergeCritiqueReport(document, generated.output);
}

async function generateSkeleton(params: {
  document: VolumePlanDocument;
  novel: VolumeGenerationNovel;
  workspace: VolumeWorkspace;
  storyMacroPlan: StoryMacroPlanResult;
  options: VolumeGenerateOptions;
}): Promise<VolumePlanDocument> {
  const { document, novel, workspace, storyMacroPlan, options } = params;
  if (!document.strategyPlan) {
    throw new Error("请先生成卷战略建议。");
  }
  const chapterBudget = deriveChapterBudget({ novel, workspace, options });
  const volumeCountGuidance = buildVolumeCountGuidance({
    chapterBudget,
    existingVolumeCount: workspace.volumes.length,
    respectExistingVolumeCount: options.respectExistingVolumeCount,
    userPreferredVolumeCount: options.userPreferredVolumeCount,
    maxVolumeCount: MAX_VOLUME_COUNT,
  });
  const targetVolumeCount = document.strategyPlan.recommendedVolumeCount;
  await notifyVolumeGenerationPhase({
    novelId: document.novelId,
    scope: "skeleton",
    phase: "prompt",
    label: "正在生成卷骨架",
    options,
  });
  const generated = await runStructuredPrompt({
    asset: createVolumeSkeletonPrompt(targetVolumeCount),
    promptInput: {
      novel,
      workspace,
      storyMacroPlan,
      strategyPlan: document.strategyPlan,
      guidance: options.guidance,
      volumeCountGuidance,
      chapterBudget,
    },
    contextBlocks: buildVolumeSkeletonContextBlocks({
      novel,
      workspace,
      storyMacroPlan,
      strategyPlan: document.strategyPlan,
      guidance: options.guidance,
      volumeCountGuidance,
      chapterBudget,
    }),
    options: {
      provider: options.provider,
      model: options.model,
      temperature: options.temperature ?? 0.35,
      novelId: document.novelId,
      taskId: options.taskId,
      stage: "volume_strategy",
      itemKey: "volume_skeleton",
      scope: "skeleton",
      entrypoint: options.entrypoint,
      signal: options.signal,
    },
  });
  return mergeSkeleton(document, generated.output.volumes);
}

export { resolveBeatSheetTargetChapterCount };

async function generateRebalance(params: {
  document: VolumePlanDocument;
  novel: VolumeGenerationNovel;
  workspace: VolumeWorkspace;
  storyMacroPlan: StoryMacroPlanResult;
  options: VolumeGenerateOptions;
}): Promise<VolumePlanDocument> {
  const { document, novel, workspace, storyMacroPlan, options } = params;
  const anchorVolume = getTargetVolume(document, options.targetVolumeId);
  const anchorIndex = document.volumes.findIndex((volume) => volume.id === anchorVolume.id);
  const previousVolume = anchorIndex > 0 ? document.volumes[anchorIndex - 1] : undefined;
  const nextVolume = anchorIndex >= 0 && anchorIndex < document.volumes.length - 1 ? document.volumes[anchorIndex + 1] : undefined;
  await notifyVolumeGenerationPhase({
    novelId: document.novelId,
    scope: "rebalance",
    phase: "prompt",
    label: `正在校准第 ${anchorVolume.sortOrder} 卷与相邻卷衔接`,
    options,
  });
  const generated = await runStructuredPrompt({
    asset: volumeRebalancePrompt,
    promptInput: {
      novel,
      workspace,
      storyMacroPlan,
      strategyPlan: document.strategyPlan,
      anchorVolume,
      previousVolume,
      nextVolume,
      guidance: options.guidance,
    },
    contextBlocks: buildVolumeRebalanceContextBlocks({
      novel,
      workspace,
      storyMacroPlan,
      strategyPlan: document.strategyPlan,
      anchorVolume,
      previousVolume,
      nextVolume,
      guidance: options.guidance,
    }),
    options: {
      provider: options.provider,
      model: options.model,
      temperature: options.temperature ?? 0.25,
      novelId: document.novelId,
      volumeId: anchorVolume.id,
      taskId: options.taskId,
      stage: "structured_outline",
      itemKey: "chapter_list",
      scope: "rebalance",
      entrypoint: options.entrypoint,
      signal: options.signal,
    },
  });
  return mergeRebalance(document, anchorVolume.id, generated.output.decisions);
}

async function generateChapterList(params: {
  document: VolumePlanDocument;
  novel: VolumeGenerationNovel;
  workspace: VolumeWorkspace;
  storyMacroPlan: StoryMacroPlanResult;
  options: VolumeGenerateOptions;
  materialIndexBlock?: PromptContextBlock | null;
}): Promise<VolumePlanDocument> {
  const { document, novel, workspace, storyMacroPlan, options, materialIndexBlock } = params;
  const targetVolume = getTargetVolume(document, options.targetVolumeId);
  const { mergedDocument, mergedWorkspace } = await generateBeatChunkedChapterList({
    document,
    novel,
    workspace,
    storyMacroPlan,
    options,
    materialIndexBlock,
    notifyPhase: async (label) => notifyVolumeGenerationPhase({
      novelId: document.novelId,
      scope: "chapter_list",
      phase: "prompt",
      label,
      options,
    }),
    notifyIntermediateDocument: options.persistIntermediateDocuments === true && options.onIntermediateDocument
      ? async (event) => {
        if (event.isFinal === false) {
          await options.onIntermediateDocument?.(event);
        }
      }
      : undefined,
  });
  const rebalancedDocument = await generateRebalance({
    document: mergedDocument,
    novel,
    workspace: mergedWorkspace,
    storyMacroPlan,
    options: {
      ...options,
      scope: "rebalance",
      targetVolumeId: targetVolume.id,
    },
  });
  await options.onIntermediateDocument?.({
    scope: "chapter_list",
    document: rebalancedDocument,
    isFinal: true,
    targetVolumeId: targetVolume.id,
    targetBeatKey: options.targetBeatKey,
    generationMode: options.generationMode,
  });
  return rebalancedDocument;
}

async function generateChapterDetail(params: {
  document: VolumePlanDocument;
  novel: VolumeGenerationNovel;
  workspace: VolumeWorkspace;
  storyMacroPlan: StoryMacroPlanResult;
  options: VolumeGenerateOptions;
  materialIndexBlock?: PromptContextBlock | null;
}): Promise<VolumePlanDocument> {
  const { document, novel, workspace, storyMacroPlan, options, materialIndexBlock } = params;
  const targetVolume = getTargetVolume(document, options.targetVolumeId);
  const targetChapter = getTargetChapter(targetVolume, options.targetChapterId);
  const detailMode = options.detailMode;
  if (!detailMode) {
    throw new Error("生成章节细化时必须指定 detailMode。");
  }

  const promptInput = {
    novel,
    workspace,
    storyMacroPlan,
    strategyPlan: document.strategyPlan,
    targetVolume,
    targetBeatSheet: getBeatSheet(document, targetVolume.id),
    targetChapter,
    guidance: options.guidance,
    detailMode,
  };
  await notifyVolumeGenerationPhase({
    novelId: document.novelId,
    scope: "chapter_detail",
    phase: "prompt",
    label: `正在细化第 ${targetVolume.sortOrder} 卷第 ${targetChapter.chapterOrder} 章 ${formatChapterDetailModeLabel(detailMode)}`,
    options,
  });
  const detailContextBlocks = buildVolumeChapterDetailContextBlocks(promptInput);
  const allDetailContextBlocks = materialIndexBlock
    ? [...detailContextBlocks, materialIndexBlock]
    : detailContextBlocks;
  const chapterDetailOptions = {
    provider: options.provider,
    model: options.model,
    temperature: options.temperature ?? 0.35,
    taskId: options.taskId,
    entrypoint: options.entrypoint,
    novelId: document.novelId,
    volumeId: targetVolume.id,
    chapterId: targetChapter.id,
    scope: "chapter_detail" as const,
    itemKey: "chapter_detail_bundle",
    triggerReason: "chapter_detail_generation" as const,
    signal: options.signal,
  };

  const generated = detailMode === "purpose"
    ? await runWithTwoRoundMaterialLoading({
      asset: volumeChapterPurposePrompt,
      promptInput,
      contextBlocks: allDetailContextBlocks,
      options: {
        ...chapterDetailOptions,
        stage: "chapter_detail_purpose",
      },
      novelId: document.novelId,
    })
    : detailMode === "boundary"
      ? await runWithTwoRoundMaterialLoading({
        asset: volumeChapterBoundaryPrompt,
        promptInput,
        contextBlocks: allDetailContextBlocks,
        options: {
          ...chapterDetailOptions,
          stage: "chapter_detail_boundary",
        },
        novelId: document.novelId,
      })
      : {
        output: await generateChapterTaskSheetDetail({
          promptInput: {
            ...promptInput,
            detailMode: "task_sheet",
          },
          options,
          materialIndexBlock,
        }),
      };

  return mergeChapterDetail({
    document,
    targetVolumeId: targetVolume.id,
    targetChapterId: targetChapter.id,
    detailMode,
    generatedDetail: generated.output as Record<string, unknown>,
  });
}

export async function generateVolumePlanDocument(params: {
  novelId: string;
  workspace: VolumeWorkspace;
  options?: VolumeGenerateOptions;
  storyMacroPlanService: Pick<StoryMacroPlanService, "getPlan">;
}): Promise<VolumePlanDocument> {
  const { novelId, workspace, options = {}, storyMacroPlanService } = params;
  const scope = normalizeScope(options.scope);
  const baseDocument = buildVolumeWorkspaceDocument({
    novelId,
    volumes: options.draftVolumes
      ? normalizeVolumeDraftContextInput(novelId, options.draftVolumes)
      : workspace.volumes,
    strategyPlan: workspace.strategyPlan,
    critiqueReport: workspace.critiqueReport,
    beatSheets: workspace.beatSheets,
    rebalanceDecisions: workspace.rebalanceDecisions,
    source: workspace.source,
    activeVersionId: workspace.activeVersionId,
  });
  assertScopeReadiness(baseDocument, scope, options.targetVolumeId);
  await notifyVolumeGenerationPhase({
    novelId,
    scope,
    phase: "load_context",
    label: scope === "chapter_list"
      ? "正在整理拆章上下文"
      : scope === "beat_sheet"
        ? "正在整理节奏板上下文"
        : scope === "skeleton"
          ? "正在整理卷骨架上下文"
          : scope === "strategy"
            ? "正在整理卷战略上下文"
            : scope === "rebalance"
              ? "正在整理相邻卷衔接上下文"
              : "正在整理卷规划上下文",
    options,
  });
  const { novel, storyMacroPlan } = await loadGenerationContext({
    novelId,
    workspace,
    storyMacroPlanService,
  });

  // REQ-2058: Load material_index block for B2 two-round material loading
  const materialIndexBlock = await loadMaterialIndexBlock(novelId).catch(() => null);

  const currentWorkspace: VolumeWorkspace = {
    ...workspace,
    ...baseDocument,
  };

  if (scope === "strategy") {
    return generateStrategy({
      document: baseDocument,
      novel,
      workspace: currentWorkspace,
      storyMacroPlan,
      options,
      materialIndexBlock,
    });
  }
  if (scope === "strategy_critique") {
    return generateStrategyCritique({
      document: baseDocument,
      novel,
      workspace: currentWorkspace,
      storyMacroPlan,
      options,
    });
  }
  if (scope === "skeleton") {
    return generateSkeleton({
      document: baseDocument,
      novel,
      workspace: currentWorkspace,
      storyMacroPlan,
      options,
    });
  }
  if (scope === "beat_sheet") {
    return generateBeatSheet({
      document: baseDocument,
      novel,
      workspace: currentWorkspace,
      storyMacroPlan,
      options,
      notifyVolumeGenerationPhase,
      materialIndexBlock,
    });
  }
  if (scope === "chapter_list") {
    return generateChapterList({
      document: baseDocument,
      novel,
      workspace: currentWorkspace,
      storyMacroPlan,
      options,
      materialIndexBlock,
    });
  }
  if (scope === "rebalance") {
    return generateRebalance({
      document: baseDocument,
      novel,
      workspace: currentWorkspace,
      storyMacroPlan,
      options,
    });
  }
  return generateChapterDetail({
    document: baseDocument,
    novel,
    workspace: currentWorkspace,
    storyMacroPlan,
    options,
    materialIndexBlock,
  });
}
