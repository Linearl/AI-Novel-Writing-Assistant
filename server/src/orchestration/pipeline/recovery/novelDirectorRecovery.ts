import {
  isDirectorAutoExecutionRunMode,
  type DirectorRunMode,
} from "@ai-novel/shared";
import { normalizeDirectorRunMode } from "../runtime/core/novelDirectorHelpers";
import type { StructuredOutlineRecoveryStep } from "./novelDirectorStructuredOutlineRecovery";

export type DirectorPipelinePhase =
  | "story_macro"
  | "book_contract"
  | "world_setup"
  | "character_setup"
  | "volume_strategy"
  | "structured_outline";

export function resolveObservedResumePhaseFromWorkspace(input: {
  hasVolumeWorkspace: boolean;
  hasVolumeStrategyPlan: boolean;
}): "structured_outline" | null {
  return input.hasVolumeWorkspace && input.hasVolumeStrategyPlan ? "structured_outline" : null;
}

export function resolveSafeDirectorPipelineStartPhase(input: {
  requestedPhase: DirectorPipelinePhase;
  hasStoryMacroPlan?: boolean;
  hasBookContract?: boolean;
  hasWorldSetupPrepared?: boolean;
  hasCharacters?: boolean;
  hasVolumeWorkspace: boolean;
  hasVolumeStrategyPlan: boolean;
}): DirectorPipelinePhase {
  const observedPhase = resolveObservedResumePhaseFromWorkspace({
    hasVolumeWorkspace: input.hasVolumeWorkspace,
    hasVolumeStrategyPlan: input.hasVolumeStrategyPlan,
  });
  const shouldEnterStructuredOutline = input.requestedPhase === "structured_outline" || Boolean(observedPhase);
  if (shouldEnterStructuredOutline) {
    if (!input.hasStoryMacroPlan) {
      return "story_macro";
    }
    if (!input.hasBookContract) {
      return "book_contract";
    }
    if (!input.hasWorldSetupPrepared) {
      return "world_setup";
    }
    if (!input.hasCharacters) {
      return "character_setup";
    }
    if (!input.hasVolumeWorkspace || !input.hasVolumeStrategyPlan) {
      return "volume_strategy";
    }
    return "structured_outline";
  }

  let safePhase = input.requestedPhase;
  if (safePhase === "story_macro" && input.hasStoryMacroPlan && !input.hasBookContract) {
    safePhase = "book_contract";
  }
  if (
    (safePhase === "story_macro" || safePhase === "book_contract")
    && input.hasStoryMacroPlan
    && input.hasBookContract
  ) {
    safePhase = input.hasWorldSetupPrepared ? "character_setup" : "world_setup";
  }
  if (safePhase === "book_contract" && !input.hasStoryMacroPlan) {
    safePhase = "story_macro";
  }
  if (safePhase === "world_setup" && (!input.hasStoryMacroPlan || !input.hasBookContract)) {
    safePhase = input.hasStoryMacroPlan ? "book_contract" : "story_macro";
  }
  if (
    (safePhase === "character_setup" || safePhase === "volume_strategy" || safePhase === "structured_outline")
    && !input.hasWorldSetupPrepared
  ) {
    safePhase = "world_setup";
  }
  if (
    (safePhase === "story_macro" || safePhase === "book_contract" || safePhase === "world_setup" || safePhase === "character_setup")
    && input.hasWorldSetupPrepared
    && input.hasCharacters
  ) {
    safePhase = "volume_strategy";
  }
  return safePhase;
}

export function resolveAssetFirstRecoveryFromSnapshot(input: {
  runMode?: DirectorRunMode;
  structuredOutlineRecoveryStep?: StructuredOutlineRecoveryStep | null;
  volumeCount: number;
  hasVolumeStrategyPlan: boolean;
  hasActivePipelineJob: boolean;
  hasExecutableRange: boolean;
  hasAutoExecutionState: boolean;
  hasMissingExecutionContractInRange?: boolean;
  /**
   * 全书层面是否存在「未处理且缺少完整章节细化」的章节。
   * REQ-7085: 当当前范围已耗尽（hasMissingExecutionContractInRange=false）
   * 但全书仍有未细化章节时，回到 structured_outline 补齐下一批细化，
   * 而非进入 auto_execution 导致 runFromReady 标记 succeeded 并循环。
   */
  hasAnyUnpreparedChapters?: boolean;
  latestCheckpointType?: "chapter_batch_ready" | "replan_required" | null;
}):
  | {
    type: "auto_execution";
    resumeCheckpointType: "chapter_batch_ready" | "replan_required";
  }
  | {
    type: "phase";
    phase: "structured_outline";
  }
  | null {
  // 执行区持久化章节在目标范围内仍缺少完整细化时，优先回到节奏 / 拆章补齐，
  // 而不是进入章节执行——否则 runFromReady 会抛「缺少完整章节细化」并卡死。
  // 该信号基于执行区真实契约，弥补了卷工作区 cursor 与执行区可能不一致的缺口。
  if (
    isDirectorAutoExecutionRunMode(normalizeDirectorRunMode(input.runMode))
    && input.hasVolumeStrategyPlan
    && input.hasMissingExecutionContractInRange
    && !input.hasActivePipelineJob
  ) {
    return {
      type: "phase",
      phase: "structured_outline",
    };
  }

  if (
    isDirectorAutoExecutionRunMode(normalizeDirectorRunMode(input.runMode))
    && input.hasVolumeStrategyPlan
    && input.structuredOutlineRecoveryStep
    && (
      input.structuredOutlineRecoveryStep !== "chapter_sync"
      || !input.hasExecutableRange
    )
    && input.structuredOutlineRecoveryStep !== "completed"
  ) {
    return {
      type: "phase",
      phase: "structured_outline",
    };
  }

  // REQ-7085: 当前范围已耗尽（范围内全部细化完成）但全书仍有未细化章节时，
  // 回到 structured_outline 补齐下一批细化。
  // 场景：1-10 已细化且已写，11-30 未细化。
  // 此时 hasMissingExecutionContractInRange=false（范围内无缺），
  // hasAnyUnpreparedChapters=true（全书有缺），不应进入 auto_execution，
  // 否则 runFromReady 会因 remainingChapterCount=0 标记 succeeded 并循环。
  // 不打断进行中的批次（hasActivePipelineJob=true 时仍走 auto_execution）。
  if (
    isDirectorAutoExecutionRunMode(normalizeDirectorRunMode(input.runMode))
    && input.hasVolumeStrategyPlan
    && input.hasAnyUnpreparedChapters
    && !input.hasMissingExecutionContractInRange
    && !input.hasActivePipelineJob
  ) {
    return {
      type: "phase",
      phase: "structured_outline",
    };
  }

  if (
    isDirectorAutoExecutionRunMode(normalizeDirectorRunMode(input.runMode))
    && (
      input.hasActivePipelineJob
      || input.hasExecutableRange
      || input.hasAutoExecutionState
    )
    && (
      input.structuredOutlineRecoveryStep === "chapter_sync"
      || input.structuredOutlineRecoveryStep === "completed"
      || input.hasExecutableRange
      || input.hasActivePipelineJob
    )
  ) {
    return {
      type: "auto_execution",
      resumeCheckpointType: input.latestCheckpointType === "chapter_batch_ready" || input.latestCheckpointType === "replan_required"
        ? input.latestCheckpointType
        : "chapter_batch_ready",
    };
  }

  if (input.hasVolumeStrategyPlan && (input.structuredOutlineRecoveryStep || input.volumeCount > 0)) {
    // If structured outline is already complete, don't re-enter it
    if (input.structuredOutlineRecoveryStep === "completed" || input.structuredOutlineRecoveryStep === "chapter_sync") {
      return null;
    }
    return {
      type: "phase",
      phase: "structured_outline",
    };
  }

  return null;
}
