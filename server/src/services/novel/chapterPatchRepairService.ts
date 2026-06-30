import type { LLMProvider } from "@ai-novel/shared/types/llm";
import type { ReviewIssue } from "@ai-novel/shared/types/novel";
import type { ChapterRepairContext, ChapterRuntimePackage } from "@ai-novel/shared/types/chapterRuntime";
import {
  applyChapterPatchRepairPlan,
  type ChapterPatchApplyResult,
  type ChapterPatchRepairPlan,
} from "@ai-novel/shared/types/chapterPatchRepair";
import { runStructuredPrompt } from "../../prompting/core/promptRunner";
import { buildChapterRepairContextBlocks } from "../../prompting/prompts/novel/chapterLayeredContext";
import { chapterPatchRepairPrompt } from "../../prompting/prompts/novel/chapterPatchRepair.prompts";
import { isDirectorDebugLogEnabled } from "../../config/directorDebug";
import { directorDebugBuffer } from "./director/debug/directorDebugBuffer";

export type PatchRepairMode =
  | "detect_only"
  | "light_repair"
  | "heavy_repair"
  | "continuity_only"
  | "character_only"
  | "ending_only";

export interface ChapterPatchRepairInput {
  novelId?: string;
  chapterId?: string;
  novelTitle: string;
  chapterTitle: string;
  content: string;
  issues: ReviewIssue[];
  modeHint?: string;
  repairContext?: ChapterRepairContext | null;
  runtimePackage?: ChapterRuntimePackage | null;
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
  repairMode?: PatchRepairMode;
  /** REQ-2022: 关联自动执行 taskId，用于 debug buffer 采集 */
  directorDebugTaskId?: string;
  /** REQ-2023: 用户拒绝的角色资源变更意图，注入到修复 prompt */
  rejectedIntents?: Array<{ resourceName: string; summary: string; rejectedIntent: string }>;
}

export interface ChapterPatchRepairResult {
  content: string;
  plan: ChapterPatchRepairPlan;
  appliedPatchIds: string[];
}

export class ChapterPatchRepairFailedError extends Error {
  constructor(
    message: string,
    readonly plan?: ChapterPatchRepairPlan,
    readonly applyResult?: ChapterPatchApplyResult,
  ) {
    super(message);
    this.name = "ChapterPatchRepairFailedError";
  }
}

export class ChapterPatchRepairService {
  async repair(input: ChapterPatchRepairInput): Promise<ChapterPatchRepairResult> {
    if (!input.content.trim()) {
      throw new ChapterPatchRepairFailedError("章节正文为空，不能执行局部补丁修复。");
    }
    if (input.repairMode === "detect_only") {
      throw new ChapterPatchRepairFailedError("当前为只检测模式，未执行章节修复。");
    }
    if (input.repairMode === "heavy_repair") {
      throw new ChapterPatchRepairFailedError("当前修复模式允许整章重写，跳过局部补丁。");
    }

    const repairContext = input.repairContext ?? input.runtimePackage?.context.chapterRepairContext;
    const contextBlocks = repairContext
      ? buildChapterRepairContextBlocks(repairContext)
      : undefined;
    const taskId = input.directorDebugTaskId;
    const debugEnabled = Boolean(taskId) && isDirectorDebugLogEnabled();
    const repairStartMs = debugEnabled ? Date.now() : 0;
    let generated: { output: ChapterPatchRepairPlan };
    try {
      const llmStartMs = debugEnabled ? Date.now() : 0;
      generated = await runStructuredPrompt({
        asset: chapterPatchRepairPrompt,
        promptInput: {
          novelTitle: input.novelTitle,
          chapterTitle: input.chapterTitle,
          chapterContent: input.content,
          issuesJson: JSON.stringify(input.issues, null, 2),
          modeHint: input.modeHint,
          rejectedIntents: input.rejectedIntents,
        },
        contextBlocks,
        options: {
          provider: input.provider,
          model: input.model,
          temperature: Math.min(input.temperature ?? 0.35, 0.45),
          novelId: input.novelId,
          chapterId: input.chapterId,
          stage: "chapter_patch",
          triggerReason: input.repairMode ?? "patch_first",
        },
      });
      if (debugEnabled && taskId) {
        const llmEndMs = Date.now();
        try {
          directorDebugBuffer.recordLlmCall(taskId, {
            timestamp: new Date().toISOString(),
            prompt: JSON.stringify({ asset: "chapterPatchRepair", issues: input.issues.length }).slice(0, 200),
            completion: JSON.stringify(generated.output).slice(0, 200),
            toolCalls: [],
            tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            durationMs: llmEndMs - llmStartMs,
          });
        } catch { /* fire-and-forget */ }
      }
    } catch (error) {
      const message = error instanceof Error && error.message.trim()
        ? error.message.trim()
        : String(error);
      if (debugEnabled && taskId) {
        try {
          directorDebugBuffer.recordRepairAttempt(taskId, {
            strategy: input.repairMode ?? "patch",
            inputSummary: `${input.issues.length} issues`,
            outputSummary: "",
            success: false,
            failureReason: message,
            timestamp: new Date().toISOString(),
            durationMs: Date.now() - repairStartMs,
          });
        } catch { /* fire-and-forget */ }
      }
      throw new ChapterPatchRepairFailedError(`局部补丁计划未通过结构校验：${message}`);
    }

    let applied: ChapterPatchApplyResult;
    try {
      applied = applyChapterPatchRepairPlan(input.content, generated.output);
    } catch (error) {
      const message = formatPatchRepairApplyError(error);
      if (debugEnabled && taskId) {
        try {
          directorDebugBuffer.recordRepairAttempt(taskId, {
            strategy: input.repairMode ?? "patch",
            inputSummary: `${input.issues.length} issues`,
            outputSummary: "",
            success: false,
            failureReason: message,
            timestamp: new Date().toISOString(),
            durationMs: Date.now() - repairStartMs,
          });
        } catch { /* fire-and-forget */ }
      }
      throw new ChapterPatchRepairFailedError(
        `局部补丁计划不可安全应用：${message}`,
        generated.output,
      );
    }
    if (!applied.success) {
      const reason = applied.failures.map((failure) => `${failure.patchId}: ${failure.reason}`).join("；")
        || generated.output.escalationReason
        || "局部补丁没有产生有效正文变化。";
      if (debugEnabled && taskId) {
        try {
          directorDebugBuffer.recordRepairAttempt(taskId, {
            strategy: input.repairMode ?? "patch",
            inputSummary: `${input.issues.length} issues`,
            outputSummary: "",
            success: false,
            failureReason: reason,
            timestamp: new Date().toISOString(),
            durationMs: Date.now() - repairStartMs,
          });
        } catch { /* fire-and-forget */ }
      }
      throw new ChapterPatchRepairFailedError(reason, generated.output, applied);
    }

    if (debugEnabled && taskId) {
      try {
        directorDebugBuffer.recordRepairAttempt(taskId, {
          strategy: input.repairMode ?? "patch",
          inputSummary: `${input.issues.length} issues`,
          outputSummary: applied.appliedPatchIds.join(","),
          success: true,
          timestamp: new Date().toISOString(),
          durationMs: Date.now() - repairStartMs,
        });
      } catch { /* fire-and-forget */ }
    }

    return {
      content: applied.content,
      plan: generated.output,
      appliedPatchIds: applied.appliedPatchIds,
    };
  }
}

function formatPatchRepairApplyError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return String(error);
}
