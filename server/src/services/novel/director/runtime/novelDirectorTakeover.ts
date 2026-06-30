import type {
  BookSpec,
  DirectorCandidate,
  DirectorConfirmRequest,
  DirectorProjectContextInput,
  DirectorRunMode,
  DirectorTakeoverEntryStep,
  DirectorTakeoverExecutableRangeSnapshot,
  DirectorTakeoverPipelineJobSnapshot,
  DirectorTakeoverStartPhase,
  DirectorTakeoverStrategy,
  DirectorTakeoverCheckpointSnapshot,
} from "@ai-novel/shared/types/novelDirector";
import type { DirectorTakeoverAssetSnapshot } from "./novelDirectorTakeoverHelpers";
import type { NovelWorkflowStage, BookContract } from "@ai-novel/shared/types/novelWorkflow";
import type { StoryMacroPlan } from "@ai-novel/shared/types/storyMacro";
import { DIRECTOR_TAKEOVER_ENTRY_STEPS } from "@ai-novel/shared/types/novelDirector";
import { normalizeDirectorTargetChapterCount } from "./novelDirectorHelpers";

export interface DirectorTakeoverNovelContext extends Omit<DirectorProjectContextInput, "description"> {
  id: string;
  title: string;
  description?: string | null;
  commercialTags: string[];
}

export interface DirectorTakeoverDecisionInput {
  entryStep: DirectorTakeoverEntryStep;
  strategy: DirectorTakeoverStrategy;
  snapshot: DirectorTakeoverAssetSnapshot;
  activePipelineJob?: DirectorTakeoverPipelineJobSnapshot | null;
  latestCheckpoint?: DirectorTakeoverCheckpointSnapshot | null;
  executableRange?: DirectorTakeoverExecutableRangeSnapshot | null;
}

export interface DirectorTakeoverResolvedPlan {
  entryStep: DirectorTakeoverEntryStep;
  strategy: DirectorTakeoverStrategy;
  effectiveStep: DirectorTakeoverEntryStep;
  effectiveStage: NovelWorkflowStage;
  startPhase: DirectorTakeoverStartPhase;
  resumeStage: "basic" | "story_macro" | "character" | "outline" | "structured" | "chapter" | "pipeline";
  skipSteps: DirectorTakeoverEntryStep[];
  summary: string;
  effectSummary: string;
  impactNotes: string[];
  usesCurrentBatch: boolean;
  currentStep?: DirectorTakeoverEntryStep | null;
  restartStep?: DirectorTakeoverEntryStep | null;
  executionMode: "phase" | "auto_execution";
  phase?: DirectorTakeoverStartPhase;
  resumeCheckpointType?: "chapter_batch_ready" | "replan_required" | null;
}

// ─── Seed material helpers ──────────────────────────────────────────────────

export function hasMeaningfulSeedMaterial(novel: DirectorTakeoverNovelContext): boolean {
  return Boolean(
    novel.description?.trim()
    || novel.targetAudience?.trim()
    || novel.bookSellingPoint?.trim()
    || novel.competingFeel?.trim()
    || novel.first30ChapterPromise?.trim()
    || novel.commercialTags.length > 0
    || novel.genreId?.trim()
    || novel.worldId?.trim(),
  );
}

function splitToneKeywords(novel: DirectorTakeoverNovelContext): string[] {
  const raw = [
    novel.styleTone?.trim() ?? "",
    novel.competingFeel?.trim() ?? "",
    ...novel.commercialTags,
  ]
    .filter(Boolean)
    .join("，");
  return Array.from(
    new Set(
      raw
        .split(/[，、|/]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).slice(0, 4);
}

function buildTakeoverIdea(novel: DirectorTakeoverNovelContext): string {
  const lines = [
    novel.description?.trim() ? `故事概述：${novel.description.trim()}` : "",
    novel.title.trim() ? `项目标题：《${novel.title.trim()}》` : "",
    novel.targetAudience?.trim() ? `目标读者：${novel.targetAudience.trim()}` : "",
    novel.bookSellingPoint?.trim() ? `书级卖点：${novel.bookSellingPoint.trim()}` : "",
    novel.competingFeel?.trim() ? `对标气质：${novel.competingFeel.trim()}` : "",
    novel.first30ChapterPromise?.trim() ? `前30章承诺：${novel.first30ChapterPromise.trim()}` : "",
    novel.commercialTags.length > 0 ? `商业标签：${novel.commercialTags.join("、")}` : "",
  ].filter(Boolean);
  return lines.join("\n") || `项目标题：《${novel.title.trim() || "当前项目"}》`;
}

function buildTakeoverCandidate(input: {
  novel: DirectorTakeoverNovelContext;
  storyMacroPlan: StoryMacroPlan | null;
  bookContract: BookContract | null;
}): DirectorCandidate {
  const { novel, storyMacroPlan, bookContract } = input;
  const decomposition = storyMacroPlan?.decomposition ?? null;
  const expansion = storyMacroPlan?.expansion ?? null;
  const workingTitle = novel.title.trim() || "当前项目";
  const sellingPoint = bookContract?.coreSellingPoint?.trim()
    || novel.bookSellingPoint?.trim()
    || decomposition?.selling_point?.trim()
    || "围绕当前项目的核心卖点持续兑现读者回报。";
  const coreConflict = decomposition?.core_conflict?.trim()
    || novel.description?.trim()
    || bookContract?.readingPromise?.trim()
    || "围绕当前项目主线冲突持续推进。";
  const protagonistPath = decomposition?.growth_path?.trim()
    || expansion?.protagonist_core?.trim()
    || bookContract?.protagonistFantasy?.trim()
    || "主角在主线压力中持续成长并完成阶段转变。";
  const hookStrategy = decomposition?.main_hook?.trim()
    || bookContract?.chapter3Payoff?.trim()
    || novel.first30ChapterPromise?.trim()
    || "围绕当前卖点建立前期钩子和阶段回报。";
  const progressionLoop = decomposition?.progression_loop?.trim()
    || bookContract?.escalationLadder?.trim()
    || "目标推进 -> 阻力升级 -> 阶段回报 -> 新问题。";
  const endingDirection = decomposition?.ending_flavor?.trim()
    || bookContract?.relationshipMainline?.trim()
    || "沿当前项目既定气质和主线方向收束。";

  return {
    id: `takeover-${novel.id}`,
    workingTitle,
    logline: novel.description?.trim() || coreConflict,
    positioning: novel.targetAudience?.trim() || sellingPoint,
    sellingPoint,
    coreConflict,
    protagonistPath,
    endingDirection,
    hookStrategy,
    progressionLoop,
    whyItFits: "沿用当前项目已保存的书级信息与既有资产，继续自动导演。",
    toneKeywords: splitToneKeywords(novel),
    targetChapterCount: normalizeDirectorTargetChapterCount(novel.estimatedChapterCount),
  };
}

export function buildDirectorTakeoverInput(input: {
  novel: DirectorTakeoverNovelContext;
  storyMacroPlan: StoryMacroPlan | null;
  bookContract: BookContract | null;
  runMode?: DirectorRunMode;
}): DirectorConfirmRequest {
  return {
    title: input.novel.title.trim(),
    description: input.novel.description?.trim() || undefined,
    targetAudience: input.novel.targetAudience?.trim() || undefined,
    bookSellingPoint: input.novel.bookSellingPoint?.trim() || undefined,
    competingFeel: input.novel.competingFeel?.trim() || undefined,
    first30ChapterPromise: input.novel.first30ChapterPromise?.trim() || undefined,
    commercialTags: input.novel.commercialTags.length > 0 ? input.novel.commercialTags : undefined,
    genreId: input.novel.genreId?.trim() || undefined,
    primaryStoryModeId: input.novel.primaryStoryModeId?.trim() || undefined,
    secondaryStoryModeId: input.novel.secondaryStoryModeId?.trim() || undefined,
    worldId: input.novel.worldId?.trim() || undefined,
    writingMode: input.novel.writingMode,
    projectMode: input.novel.projectMode,
    narrativePov: input.novel.narrativePov,
    pacePreference: input.novel.pacePreference,
    styleTone: input.novel.styleTone?.trim() || undefined,
    emotionIntensity: input.novel.emotionIntensity,
    aiFreedom: input.novel.aiFreedom,
    postGenerationStyleReviewEnabled: input.novel.postGenerationStyleReviewEnabled,
    defaultChapterLength: input.novel.defaultChapterLength,
    estimatedChapterCount: input.novel.estimatedChapterCount ?? undefined,
    projectStatus: input.novel.projectStatus,
    storylineStatus: input.novel.storylineStatus,
    outlineStatus: input.novel.outlineStatus,
    resourceReadyScore: input.novel.resourceReadyScore,
    sourceNovelId: input.novel.sourceNovelId ?? undefined,
    sourceKnowledgeDocumentId: input.novel.sourceKnowledgeDocumentId ?? undefined,
    continuationBookAnalysisId: input.novel.continuationBookAnalysisId ?? undefined,
    continuationBookAnalysisSections: input.novel.continuationBookAnalysisSections ?? undefined,
    idea: buildTakeoverIdea(input.novel),
    candidate: buildTakeoverCandidate({
      novel: input.novel,
      storyMacroPlan: input.storyMacroPlan,
      bookContract: input.bookContract,
    }),
    runMode: input.runMode,
  };
}

// ─── Snapshot readiness predicates ──────────────────────────────────────────

export function isStoryMacroReady(snapshot: DirectorTakeoverAssetSnapshot): boolean {
  return snapshot.hasStoryMacroPlan && snapshot.hasBookContract;
}

export function isCharacterReady(snapshot: DirectorTakeoverAssetSnapshot): boolean {
  return snapshot.characterCount > 0;
}

export function isOutlineReady(snapshot: DirectorTakeoverAssetSnapshot): boolean {
  return snapshot.volumeCount > 0 && Boolean(snapshot.hasVolumeStrategyPlan);
}

export function isTakeoverStructuredOutlineReadyForValidation(snapshot: Pick<DirectorTakeoverAssetSnapshot, "structuredOutlineRecoveryStep">): boolean {
  return snapshot.structuredOutlineRecoveryStep === "chapter_sync"
    || snapshot.structuredOutlineRecoveryStep === "completed";
}

export function isStructuredReady(snapshot: DirectorTakeoverAssetSnapshot): boolean {
  return isTakeoverStructuredOutlineReadyForValidation(snapshot);
}

export function isStructuredSyncPending(snapshot: DirectorTakeoverAssetSnapshot): boolean {
  return snapshot.structuredOutlineRecoveryStep === "chapter_sync";
}

export function hasAnyStructuredAsset(snapshot: DirectorTakeoverAssetSnapshot): boolean {
  return Boolean(snapshot.firstVolumeBeatSheetReady)
    || snapshot.firstVolumeChapterCount > 0
    || (snapshot.firstVolumePreparedChapterCount ?? 0) > 0;
}

export function hasExecutableRange(input: {
  snapshot: DirectorTakeoverAssetSnapshot;
  executableRange?: DirectorTakeoverExecutableRangeSnapshot | null;
  latestCheckpoint?: DirectorTakeoverCheckpointSnapshot | null;
  activePipelineJob?: DirectorTakeoverPipelineJobSnapshot | null;
}): boolean {
  return Boolean(
    input.executableRange
    || input.activePipelineJob,
  );
}

function isRepairingPipelineJob(job: DirectorTakeoverPipelineJobSnapshot | null | undefined): boolean {
  if (!job?.currentStage) {
    return false;
  }
  return job.currentStage === "reviewing" || job.currentStage === "repairing";
}

export function hasPendingRepairContext(input: {
  snapshot: DirectorTakeoverAssetSnapshot;
  activePipelineJob?: DirectorTakeoverPipelineJobSnapshot | null;
  latestCheckpoint?: DirectorTakeoverCheckpointSnapshot | null;
}): boolean {
  return Boolean(
    isRepairingPipelineJob(input.activePipelineJob)
    || input.latestCheckpoint?.checkpointType === "chapter_batch_ready"
    || input.latestCheckpoint?.checkpointType === "replan_required"
    || (input.snapshot.pendingRepairChapterCount ?? 0) > 0,
  );
}

// ─── Step mapping utilities ────────────────────────────────────────────────

function entryStepToLegacyStartPhase(step: DirectorTakeoverEntryStep): DirectorTakeoverStartPhase {
  if (step === "story_macro" || step === "basic") return "story_macro";
  if (step === "character") return "character_setup";
  if (step === "outline") return "volume_strategy";
  return "structured_outline";
}

function entryStepToWorkflowStage(step: DirectorTakeoverEntryStep): NovelWorkflowStage {
  if (step === "story_macro" || step === "basic") return "story_macro";
  if (step === "character") return "character_setup";
  if (step === "outline") return "volume_strategy";
  if (step === "structured") return "structured_outline";
  if (step === "chapter") return "chapter_execution";
  return "quality_repair";
}

function buildSkipSteps(from: DirectorTakeoverEntryStep, to: DirectorTakeoverEntryStep): DirectorTakeoverEntryStep[] {
  const fromIndex = DIRECTOR_TAKEOVER_ENTRY_STEPS.indexOf(from);
  const toIndex = DIRECTOR_TAKEOVER_ENTRY_STEPS.indexOf(to);
  if (fromIndex < 0 || toIndex < 0 || toIndex <= fromIndex) {
    return [];
  }
  return DIRECTOR_TAKEOVER_ENTRY_STEPS.slice(fromIndex, toIndex).filter((step) => step !== to);
}

// ─── Execution continuation resolution ─────────────────────────────────────

function resolveExecutionContinuationStep(input: {
  snapshot: DirectorTakeoverAssetSnapshot;
  activePipelineJob?: DirectorTakeoverPipelineJobSnapshot | null;
  latestCheckpoint?: DirectorTakeoverCheckpointSnapshot | null;
  executableRange?: DirectorTakeoverExecutableRangeSnapshot | null;
  preferPipeline: boolean;
}): DirectorTakeoverEntryStep | null {
  const executable = hasExecutableRange(input);
  if (!executable) {
    return null;
  }
  const pendingRepair = hasPendingRepairContext(input);
  if (pendingRepair) {
    return "pipeline";
  }
  if (input.snapshot.hasUnpreparedChaptersInRange && !input.activePipelineJob) {
    return null;
  }
  return "chapter";
}

function resolveContinueTargetStep(input: {
  entryStep: DirectorTakeoverEntryStep;
  selectedEntryStep?: DirectorTakeoverEntryStep;
  snapshot: DirectorTakeoverAssetSnapshot;
  activePipelineJob?: DirectorTakeoverPipelineJobSnapshot | null;
  latestCheckpoint?: DirectorTakeoverCheckpointSnapshot | null;
  executableRange?: DirectorTakeoverExecutableRangeSnapshot | null;
}): DirectorTakeoverEntryStep {
  const storyReady = isStoryMacroReady(input.snapshot);
  const characterReady = isCharacterReady(input.snapshot);
  const outlineReady = isOutlineReady(input.snapshot);
  const structuredExecutionReady = hasExecutableRange(input);

  if (input.entryStep === "basic") {
    if (!storyReady) return "story_macro";
    if (!characterReady) return "character";
    if (!outlineReady) return "outline";
    if (!structuredExecutionReady) return "structured";
    return resolveExecutionContinuationStep({
      ...input,
      preferPipeline: false,
    }) ?? "structured";
  }
  if (input.entryStep === "story_macro") {
    if (!storyReady) return "story_macro";
    return resolveContinueTargetStep({ ...input, selectedEntryStep: input.selectedEntryStep ?? input.entryStep, entryStep: "character" });
  }
  if (input.entryStep === "character") {
    if (!characterReady) return "character";
    return resolveContinueTargetStep({ ...input, selectedEntryStep: input.selectedEntryStep ?? input.entryStep, entryStep: "outline" });
  }
  if (input.entryStep === "outline") {
    if (!outlineReady) return "outline";
    return resolveContinueTargetStep({ ...input, selectedEntryStep: input.selectedEntryStep ?? input.entryStep, entryStep: "structured" });
  }
  if (input.entryStep === "structured") {
    if ((input.selectedEntryStep ?? input.entryStep) === "structured") return "structured";
    if (!structuredExecutionReady) return "structured";
    return resolveExecutionContinuationStep({
      ...input,
      preferPipeline: false,
    }) ?? "structured";
  }
  if (input.entryStep === "chapter") {
    return resolveExecutionContinuationStep({
      ...input,
      preferPipeline: false,
    }) ?? "structured";
  }
  return resolveExecutionContinuationStep({
    ...input,
    preferPipeline: true,
  }) ?? "structured";
}

// ─── Plan builders ─────────────────────────────────────────────────────────

function buildPhasePlan(input: {
  entryStep: DirectorTakeoverEntryStep;
  strategy: DirectorTakeoverStrategy;
  effectiveStep: Extract<DirectorTakeoverEntryStep, "story_macro" | "character" | "outline" | "structured">;
  summary: string;
  effectSummary: string;
  impactNotes: string[];
}): DirectorTakeoverResolvedPlan {
  const startPhase = entryStepToLegacyStartPhase(input.effectiveStep);
  return {
    entryStep: input.entryStep,
    strategy: input.strategy,
    effectiveStep: input.effectiveStep,
    effectiveStage: entryStepToWorkflowStage(input.effectiveStep),
    startPhase,
    phase: startPhase,
    resumeStage: input.effectiveStep,
    skipSteps: buildSkipSteps(input.entryStep, input.effectiveStep),
    summary: input.summary,
    effectSummary: input.effectSummary,
    impactNotes: input.impactNotes,
    usesCurrentBatch: false,
    currentStep: input.strategy === "continue_existing" ? input.effectiveStep : null,
    restartStep: input.strategy === "restart_current_step" ? input.effectiveStep : null,
    executionMode: "phase",
    resumeCheckpointType: null,
  };
}

function buildAutoExecutionPlan(input: {
  entryStep: DirectorTakeoverEntryStep;
  strategy: DirectorTakeoverStrategy;
  effectiveStep: "chapter" | "pipeline";
  usesCurrentBatch: boolean;
  summary: string;
  effectSummary: string;
  impactNotes: string[];
  latestCheckpoint?: DirectorTakeoverCheckpointSnapshot | null;
}): DirectorTakeoverResolvedPlan {
  const effectiveStage = input.effectiveStep === "pipeline" ? "quality_repair" : "chapter_execution";
  return {
    entryStep: input.entryStep,
    strategy: input.strategy,
    effectiveStep: input.effectiveStep,
    effectiveStage,
    startPhase: "structured_outline",
    resumeStage: input.effectiveStep,
    skipSteps: buildSkipSteps(input.entryStep, input.effectiveStep),
    summary: input.summary,
    effectSummary: input.effectSummary,
    impactNotes: input.impactNotes,
    usesCurrentBatch: input.usesCurrentBatch,
    currentStep: input.strategy === "continue_existing" ? input.effectiveStep : null,
    restartStep: input.strategy === "restart_current_step" ? input.entryStep : null,
    executionMode: "auto_execution",
    resumeCheckpointType: input.latestCheckpoint?.checkpointType ?? null,
  };
}

export function resolveDirectorTakeoverPlan(input: DirectorTakeoverDecisionInput): DirectorTakeoverResolvedPlan {
  const executable = hasExecutableRange(input);
  const pendingRepair = hasPendingRepairContext(input);

  if (input.strategy === "continue_existing") {
    const effectiveStep = resolveContinueTargetStep(input);
    if (effectiveStep === "story_macro") {
      return buildPhasePlan({
        entryStep: input.entryStep,
        strategy: input.strategy,
        effectiveStep,
        summary: "继续已有进度，先补齐故事宏观规划。",
        effectSummary: "会复用当前基础信息，只补缺失的 Story Macro 与 Book Contract。",
        impactNotes: ["不会清空已有章节与正文。"],
      });
    }
    if (effectiveStep === "character") {
      return buildPhasePlan({
        entryStep: input.entryStep,
        strategy: input.strategy,
        effectiveStep,
        summary: "继续已有进度，接着补角色准备。",
        effectSummary: "会复用已完成的书级规划，只补角色阵容与角色应用。",
        impactNotes: ["不会重跑已存在的 Story Macro / Book Contract。"],
      });
    }
    if (effectiveStep === "outline") {
      return buildPhasePlan({
        entryStep: input.entryStep,
        strategy: input.strategy,
        effectiveStep,
        summary: "继续已有进度，接着补卷战略。",
        effectSummary: "会复用现有书级规划与角色资产，只补卷战略和卷骨架。",
        impactNotes: ["不会清空已存在的角色与正文。"],
      });
    }
    if (effectiveStep === "structured") {
      return buildPhasePlan({
        entryStep: input.entryStep,
        strategy: input.strategy,
        effectiveStep,
        summary: "继续已有进度，接着补节奏 / 拆章。",
        effectSummary: "会复用已完成的卷战略，只补当前卷节奏板、章节列表、章节细化或同步步骤。",
        impactNotes: ["保留已有正文，不会批量删章节。"],
      });
    }
    if (!executable) {
      throw new Error("当前还没有可继续的章节执行范围，请先补齐节奏 / 拆章资源。");
    }
    if (effectiveStep === "pipeline") {
      return buildAutoExecutionPlan({
        entryStep: input.entryStep,
        strategy: input.strategy,
        effectiveStep,
        usesCurrentBatch: true,
        latestCheckpoint: input.latestCheckpoint,
        summary: "继续已有进度，优先恢复当前质量修复批次。",
        effectSummary: "会优先恢复当前修复中的批次或待修章节，不会新开一条重复任务。",
        impactNotes: ["保留现有正文与规划资产。", "只会跳过已正式通过的章节。"],
      });
    }
    return buildAutoExecutionPlan({
      entryStep: input.entryStep,
      strategy: input.strategy,
      effectiveStep: "chapter",
      usesCurrentBatch: executable,
      latestCheckpoint: input.latestCheckpoint,
      summary: "继续已有进度，优先恢复当前章节批次。",
      effectSummary: "会优先恢复活动中的批次、检查点或已准备好的章节范围继续执行。",
      impactNotes: ["不会清空已有正文。", "只会跳过 approved / published 的章节。"],
    });
  }

  if (input.entryStep === "basic" || input.entryStep === "story_macro") {
    return buildPhasePlan({
      entryStep: input.entryStep,
      strategy: input.strategy,
      effectiveStep: "story_macro",
      summary: "重新生成当前步，从故事宏观规划重跑。",
      effectSummary: "会先清空 Story Macro 与 Book Contract，再从故事宏观规划重跑。",
      impactNotes: ["会刷新当前书级规划资产。", "不会删除已写正文。"],
    });
  }
  if (input.entryStep === "character") {
    if (!isStoryMacroReady(input.snapshot)) {
      throw new Error("当前缺少 Story Macro 或 Book Contract，不能直接从角色准备重跑。");
    }
    return buildPhasePlan({
      entryStep: input.entryStep,
      strategy: input.strategy,
      effectiveStep: "character",
      summary: "重新生成当前步，从角色准备重跑。",
      effectSummary: "会先清空当前角色阵容、关系和角色准备候选，再重跑角色准备。",
      impactNotes: ["保留前置书级规划。", "不会清空已有正文。"],
    });
  }
  if (input.entryStep === "outline") {
    if (!isStoryMacroReady(input.snapshot) || !isCharacterReady(input.snapshot)) {
      throw new Error("当前前置资产不足，不能直接从卷战略重跑。");
    }
    return buildPhasePlan({
      entryStep: input.entryStep,
      strategy: input.strategy,
      effectiveStep: "outline",
      summary: "重新生成当前步，从卷战略重跑。",
      effectSummary: "会先清空当前卷战略与卷骨架，再从卷战略重跑。",
      impactNotes: ["保留前置书级规划与角色。", "不会清空已有正文。"],
    });
  }
  if (input.entryStep === "structured") {
    if (!isStoryMacroReady(input.snapshot) || !isCharacterReady(input.snapshot) || !isOutlineReady(input.snapshot)) {
      throw new Error("当前前置资产不足，不能直接从节奏 / 拆章重跑。");
    }
    return buildPhasePlan({
      entryStep: input.entryStep,
      strategy: input.strategy,
      effectiveStep: "structured",
      summary: "重新生成当前步，从节奏 / 拆章重跑。",
      effectSummary: "会先清空当前卷的节奏板、章节列表和章节细化资源，再重跑这一阶段。",
      impactNotes: ["会清空当前卷尚未开写的拆章产物。", "不会删除已写正文。"],
    });
  }
  if (!executable) {
    throw new Error("当前还没有可执行的章节范围，不能直接新开章节批次。");
  }
  if (input.entryStep === "pipeline" && !pendingRepair && !executable) {
    throw new Error("当前没有可继续的质量修复上下文。");
  }
  return buildAutoExecutionPlan({
    entryStep: input.entryStep,
    strategy: input.strategy,
    effectiveStep: input.entryStep === "pipeline" ? "pipeline" : "chapter",
    usesCurrentBatch: false,
    latestCheckpoint: input.latestCheckpoint,
    summary: input.entryStep === "pipeline" ? "重新生成当前步，清空当前质量修复结果后重跑。" : "重新生成当前步，清空当前章节批次后重跑。",
    effectSummary: input.entryStep === "pipeline"
      ? "会先清空当前质量修复结果与通过状态，再对现有正文重新审校 / 修复。"
      : "会先清空当前章节执行范围的正文草稿、审校状态和派生摘要，再重新生成这一批。",
    impactNotes: input.entryStep === "pipeline"
      ? ["保留当前章节正文。", "会重新进入自动审校与修复。"]
      : ["会清空当前批次正文草稿。", "保留前置规划和章节结构。"],
  });
}

// ─── Re-export readiness APIs for backward compatibility ────────────────────

export {
  buildDirectorTakeoverReadiness,
  assertDirectorTakeoverPhaseAvailable,
} from "./novelDirectorTakeoverReadiness";

export function buildTakeoverBookSpec(input: {
  novel: DirectorTakeoverNovelContext;
  storyMacroPlan: StoryMacroPlan | null;
  bookContract: BookContract | null;
}): BookSpec {
  const candidate = buildTakeoverCandidate(input);
  const idea = buildTakeoverIdea(input.novel);
  return {
    storyInput: idea,
    positioning: candidate.positioning,
    sellingPoint: candidate.sellingPoint,
    coreConflict: candidate.coreConflict,
    protagonistPath: candidate.protagonistPath,
    endingDirection: candidate.endingDirection,
    hookStrategy: candidate.hookStrategy,
    progressionLoop: candidate.progressionLoop,
    targetChapterCount: candidate.targetChapterCount,
  };
}
