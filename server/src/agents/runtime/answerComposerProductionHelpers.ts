import type { StructuredIntent, ToolExecutionContext } from "../types";
import { isRecord, type ToolExecutionResult } from "./runtimeHelpers";
import { getFirstSuccessfulOutput, getSuccessfulOutputs, truncateText } from "./answerComposerListHelpers";
import { composeMissingNovelKickoffAnswer } from "./novelSetupGuidanceComposer";

export function composeFactProductionStatusText(status: Record<string, unknown>, fallbackTitle = "当前小说"): string {
  const title = typeof status.title === "string" && status.title.trim() ? status.title.trim() : fallbackTitle;
  const currentStage = typeof status.currentStage === "string" && status.currentStage.trim()
    ? status.currentStage.trim()
    : "未知阶段";
  const factProgress = isRecord(status.factProgress) ? status.factProgress : null;
  const targetChapterCount = typeof status.targetChapterCount === "number" ? status.targetChapterCount : null;
  const chapterCount = typeof status.chapterCount === "number" ? status.chapterCount : 0;
  const runtimeStatus = isRecord(status.runtimeStatus) ? status.runtimeStatus : null;
  const runtimeLabel = typeof runtimeStatus?.label === "string" && runtimeStatus.label.trim()
    ? runtimeStatus.label.trim()
    : null;
  const runtimeState = typeof runtimeStatus?.state === "string" ? runtimeStatus.state : null;
  const pipelineStatus = typeof status.pipelineStatus === "string" ? status.pipelineStatus.trim() : null;
  const failureSummary = typeof status.failureSummary === "string" ? status.failureSummary.trim() : "";
  const recoveryHint = typeof status.recoveryHint === "string" ? status.recoveryHint.trim() : "";

  const parts = [`《${title}》事实进展：${currentStage}。`];
  if (factProgress) {
    const planningCompleted = typeof factProgress.planningCompleted === "number" ? factProgress.planningCompleted : null;
    const planningTotal = typeof factProgress.planningTotal === "number" ? factProgress.planningTotal : null;
    const draftedChapterCount = typeof factProgress.draftedChapterCount === "number" ? factProgress.draftedChapterCount : null;
    const reviewedChapterCount = typeof factProgress.reviewedChapterCount === "number" ? factProgress.reviewedChapterCount : null;
    const committedChapterCount = typeof factProgress.committedChapterCount === "number" ? factProgress.committedChapterCount : null;
    const needsRepairChapters = typeof factProgress.needsRepairChapters === "number" ? factProgress.needsRepairChapters : 0;
    if (planningCompleted != null && planningTotal != null) {
      parts.push(`规划：${planningCompleted}/${planningTotal} 项。`);
    }
    if (draftedChapterCount != null) {
      parts.push(targetChapterCount != null
        ? `正文：${draftedChapterCount}/${targetChapterCount} 章。`
        : `正文：${draftedChapterCount} 章。`);
    } else {
      parts.push(targetChapterCount != null ? `章节目录：${chapterCount}/${targetChapterCount} 章。` : `章节目录：${chapterCount} 章。`);
    }
    if (reviewedChapterCount != null && reviewedChapterCount > 0) {
      parts.push(`审校：${reviewedChapterCount} 章。`);
    }
    if (committedChapterCount != null && committedChapterCount > 0) {
      parts.push(`状态提交：${committedChapterCount} 章。`);
    }
    if (needsRepairChapters > 0) {
      parts.push(`${needsRepairChapters} 章待修复。`);
    }
  } else {
    parts.push(targetChapterCount != null ? `章节目录：${chapterCount}/${targetChapterCount} 章。` : `章节目录：${chapterCount} 章。`);
  }
  if (runtimeLabel && runtimeState !== "idle") {
    parts.push(`后台补充：${runtimeLabel}。`);
  } else if (pipelineStatus) {
    parts.push(`后台补充：${pipelineStatus}。`);
  }
  if (failureSummary) {
    parts.push(`后台失败原因：${failureSummary}`);
    parts.push("已产出的事实内容可继续使用。");
  }
  if (recoveryHint) {
    parts.push(`建议：${recoveryHint}`);
  }
  return parts.join("");
}

export function composeProgressAnswer(results: ToolExecutionResult[]): string {
  const productionStatus = getFirstSuccessfulOutput(results, "get_novel_production_status");
  if (productionStatus) {
    return composeFactProductionStatusText(productionStatus);
  }
  const context = getSuccessfulOutputs(results, "get_novel_context")[0];
  if (!context) {
    return "当前信息不足，无法继续";
  }
  const completedChapterCount = typeof context.completedChapterCount === "number"
    ? context.completedChapterCount
    : null;
  const chapterCount = typeof context.chapterCount === "number" ? context.chapterCount : null;
  const latestCompletedChapterOrder = typeof context.latestCompletedChapterOrder === "number"
    ? context.latestCompletedChapterOrder
    : null;
  if (completedChapterCount == null) {
    return "当前信息不足，无法继续";
  }
  const parts = [
    chapterCount != null
      ? `正文：${completedChapterCount}/${chapterCount} 章。`
      : `正文：${completedChapterCount} 章。`,
  ];
  if (latestCompletedChapterOrder != null) {
    parts.push(`最近完成到第${latestCompletedChapterOrder}章。`);
  }
  if (completedChapterCount === 0) {
    parts.push("未检测到写入正文的章节。");
  }
  return parts.join("");
}

export function composeChapterAnswer(results: ToolExecutionResult[]): string | null {
  const contentOutputs = [
    ...getSuccessfulOutputs(results, "get_chapter_content_by_order"),
    ...getSuccessfulOutputs(results, "get_chapter_content"),
  ]
    .filter((item) => typeof item.order === "number")
    .sort((left, right) => Number(left.order) - Number(right.order));
  if (contentOutputs.length > 0) {
    return contentOutputs.map((item) => {
      const order = Number(item.order);
      const title = typeof item.title === "string" ? item.title.trim() : "";
      const content = typeof item.content === "string" ? item.content : "";
      return `第${order}章${title ? `《${title}》` : ""}：${truncateText(content, 360) || "正文为空"}`;
    }).join("\n\n");
  }

  const rangeSummary = getSuccessfulOutputs(results, "summarize_chapter_range")[0];
  if (rangeSummary && typeof rangeSummary.summary === "string" && rangeSummary.summary.trim()) {
    return rangeSummary.summary.trim();
  }
  return null;
}

export function composeWriteAnswer(results: ToolExecutionResult[], waitingForApproval: boolean): string | null {
  const preview = getSuccessfulOutputs(results, "preview_pipeline_run")[0];
  const queue = getSuccessfulOutputs(results, "queue_pipeline_run")[0];
  const draft = getSuccessfulOutputs(results, "save_chapter_draft")[0];
  const patch = getSuccessfulOutputs(results, "apply_chapter_patch")[0];

  if (draft && typeof draft.summary === "string") {
    return draft.summary;
  }
  if (patch && typeof patch.summary === "string") {
    return patch.summary;
  }
  if (waitingForApproval && preview) {
    const start = typeof preview.startOrder === "number" ? preview.startOrder : null;
    const end = typeof preview.endOrder === "number" ? preview.endOrder : null;
    if (start != null && end != null) {
      return start === end
        ? `已完成第${start}章执行预览，当前等待审批。`
        : `已完成第${start}到第${end}章执行预览，当前等待审批。`;
    }
  }
  if (queue) {
    const start = typeof queue.startOrder === "number" ? queue.startOrder : null;
    const end = typeof queue.endOrder === "number" ? queue.endOrder : null;
    const jobId = typeof queue.jobId === "string" ? queue.jobId : "";
    if (start != null && end != null) {
      const scope = start === end ? `第${start}章` : `第${start}到第${end}章`;
      return `已创建 ${scope} 的写作任务${jobId ? `（任务 ${jobId}）` : ""}。`;
    }
  }
  return null;
}

export function composeProductionStatusAnswer(
  results: ToolExecutionResult[],
  context: Omit<ToolExecutionContext, "runId" | "agentName">,
): string {
  const status = getFirstSuccessfulOutput(results, "get_novel_production_status");
  if (!status) {
    return context.novelId
      ? "未获取到整本生产状态。"
      : "没有当前小说上下文，无法读取整本生产状态。";
  }
  const title = typeof status.title === "string" ? status.title.trim() : "当前小说";
  return composeFactProductionStatusText(status, title);
}

export async function composeProduceNovelAnswer(
  results: ToolExecutionResult[],
  waitingForApproval: boolean,
  context: Omit<ToolExecutionContext, "runId" | "agentName">,
  goal: string,
  structuredIntent?: StructuredIntent,
): Promise<string> {
  const created = getFirstSuccessfulOutput(results, "create_novel");
  const world = getFirstSuccessfulOutput(results, "generate_world_for_novel");
  const characters = getFirstSuccessfulOutput(results, "generate_novel_characters");
  const bible = getFirstSuccessfulOutput(results, "generate_story_bible");
  const outline = getFirstSuccessfulOutput(results, "generate_novel_outline");
  const structured = getFirstSuccessfulOutput(results, "generate_structured_outline");
  const synced = getFirstSuccessfulOutput(results, "sync_chapters_from_structured_outline");
  const preview = getFirstSuccessfulOutput(results, "preview_pipeline_run");
  const queued = getFirstSuccessfulOutput(results, "queue_pipeline_run");
  const productionStatus = getFirstSuccessfulOutput(results, "get_novel_production_status");

  if (!created && !context.novelId) {
    return composeMissingNovelKickoffAnswer(goal, context, structuredIntent, "produce_missing_title");
  }

  const title = typeof created?.title === "string" && created.title.trim()
    ? created.title.trim()
    : typeof productionStatus?.title === "string" && productionStatus.title.trim()
      ? productionStatus.title.trim()
      : "当前小说";
  const assetParts: string[] = [];
  if (world) {
    const worldName = typeof world.worldName === "string" ? world.worldName.trim() : "";
    assetParts.push(worldName ? `世界观《${worldName}》` : "世界观");
  }
  if (characters) {
    const characterCount = typeof characters.characterCount === "number" ? characters.characterCount : 0;
    assetParts.push(`${characterCount} 个核心角色`);
  }
  if (bible) {
    assetParts.push("小说圣经");
  }
  if (outline) {
    assetParts.push("发展走向");
  }
  if (structured) {
    const targetChapterCount = typeof structured.targetChapterCount === "number" ? structured.targetChapterCount : null;
    assetParts.push(targetChapterCount != null ? `${targetChapterCount} 章结构化大纲` : "结构化大纲");
  }
  if (synced) {
    const chapterCount = typeof synced.chapterCount === "number" ? synced.chapterCount : null;
    assetParts.push(chapterCount != null ? `${chapterCount} 个章节目录` : "章节目录");
  }

  if (waitingForApproval && preview) {
    return `《${title}》的核心资产已生成完成${assetParts.length > 0 ? `：${assetParts.join("、")}。` : "。"}整本写作预览已完成，当前等待审批。`;
  }
  if (queued) {
    const jobId = typeof queued.jobId === "string" && queued.jobId.trim() ? `（任务 ${queued.jobId}）` : "";
    return `《${title}》的核心资产已生成完成${assetParts.length > 0 ? `：${assetParts.join("、")}。` : "。"}整本写作任务已启动${jobId}。`;
  }
  if (preview) {
    return `《${title}》的核心资产已生成完成${assetParts.length > 0 ? `：${assetParts.join("、")}。` : "。"}整本写作未启动。`;
  }
  return `《${title}》的核心资产已生成完成${assetParts.length > 0 ? `：${assetParts.join("、")}。` : "。"}`
}

export function composeFailureDiagnosisAnswer(results: ToolExecutionResult[]): string {
  const candidates = [
    ...getSuccessfulOutputs(results, "get_run_failure_reason"),
    ...getSuccessfulOutputs(results, "explain_generation_blocker"),
    ...getSuccessfulOutputs(results, "get_task_failure_reason"),
    ...getSuccessfulOutputs(results, "get_index_failure_reason"),
    ...getSuccessfulOutputs(results, "get_book_analysis_failure_reason"),
  ];
  const first = candidates.find((item) => typeof item.failureSummary === "string" && item.failureSummary.trim());
  if (!first) {
    return "当前没有可用的失败诊断信息";
  }
  const parts = [String(first.failureSummary).trim()];
  if (typeof first.failureDetails === "string" && first.failureDetails.trim() && first.failureDetails.trim() !== parts[0]) {
    parts.push(`详情：${first.failureDetails.trim()}`);
  }
  if (typeof first.recoveryHint === "string" && first.recoveryHint.trim()) {
    parts.push(`建议：${first.recoveryHint.trim()}`);
  }
  if (typeof first.lastFailedStep === "string" && first.lastFailedStep.trim()) {
    parts.push(`失败步骤：${first.lastFailedStep.trim()}`);
  }
  return parts.join("\n");
}
