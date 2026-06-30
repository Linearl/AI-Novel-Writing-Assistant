import type { BaseMessageChunk } from "@langchain/core/messages";
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import {
  extractLlmTokenUsage,
  mergeStreamTokenUsage,
  type LlmTokenUsageSnapshot,
} from "../../llm/usageTracking";
import { toText } from "../../services/novel/novelP0Utils";
import {
  recordPromptQualityEvent,
} from "./promptQualityTelemetry";
import {
  classifyPromptQualityFailure,
  estimateOutputChars,
  isPromptOutputEmpty,
} from "./promptRunnerHelpers";
import type {
  PromptAsset,
  PromptInvocationMeta,
  PromptRenderContext,
  PromptRunResult,
} from "./promptTypes";

/* ------------------------------------------------------------------ */
/*  Logging                                                           */
/* ------------------------------------------------------------------ */

export function logPromptCompletion(input: {
  meta: PromptInvocationMeta;
  provider?: LLMProvider;
  model?: string;
  latencyMs: number;
}): void {
  console.info(
    [
      "[prompt.runner]",
      `promptId=${input.meta.promptId}`,
      `promptVersion=${input.meta.promptVersion}`,
      `taskType=${input.meta.taskType}`,
      input.meta.novelId ? `novelId=${input.meta.novelId}` : "",
      input.meta.chapterId ? `chapterId=${input.meta.chapterId}` : "",
      input.meta.stage ? `stage=${input.meta.stage}` : "",
      typeof input.meta.sceneIndex === "number" ? `sceneIndex=${input.meta.sceneIndex}` : "",
      typeof input.meta.roundIndex === "number" ? `roundIndex=${input.meta.roundIndex}` : "",
      input.meta.triggerReason ? `triggerReason=${JSON.stringify(input.meta.triggerReason)}` : "",
      `contextBlockIds=${input.meta.contextBlockIds.join(",") || "none"}`,
      `droppedContextBlockIds=${input.meta.droppedContextBlockIds.join(",") || "none"}`,
      `summarizedContextBlockIds=${input.meta.summarizedContextBlockIds.join(",") || "none"}`,
      `estimatedInputTokens=${input.meta.estimatedInputTokens}`,
      `repairUsed=${input.meta.repairUsed}`,
      `repairAttempts=${input.meta.repairAttempts}`,
      `semanticRetryUsed=${input.meta.semanticRetryUsed}`,
      `semanticRetryAttempts=${input.meta.semanticRetryAttempts}`,
      `provider=${input.provider ?? "default"}`,
      `model=${input.model ?? "default"}`,
      `latencyMs=${input.latencyMs}`,
    ].join(" "),
  );
}

export function logPromptEvent(input: {
  event: string;
  asset: PromptAsset<unknown, unknown, unknown>;
  context: PromptRenderContext;
  provider?: LLMProvider;
  model?: string;
  attempt?: number;
  validationError?: string;
}): void {
  console.info(
    [
      "[prompt.runner]",
      `event=${input.event}`,
      `promptId=${input.asset.id}`,
      `promptVersion=${input.asset.version}`,
      `taskType=${input.asset.taskType}`,
      `contextBlockIds=${input.context.selectedBlockIds.join(",") || "none"}`,
      `estimatedInputTokens=${input.context.estimatedInputTokens}`,
      `provider=${input.provider ?? "default"}`,
      `model=${input.model ?? "default"}`,
      typeof input.attempt === "number" ? `attempt=${input.attempt}` : "",
      input.validationError ? `validationError=${JSON.stringify(input.validationError.slice(0, 240))}` : "",
    ].filter(Boolean).join(" "),
  );
}

/* ------------------------------------------------------------------ */
/*  Recording (quality telemetry)                                     */
/* ------------------------------------------------------------------ */

export function recordPromptCompletion(input: {
  asset: PromptAsset<unknown, unknown, unknown>;
  output: unknown;
  context: PromptRenderContext;
  invocation: PromptInvocationMeta;
  provider?: LLMProvider;
  model?: string;
  latencyMs: number;
  renderedPromptChars?: number;
  tokenUsage?: LlmTokenUsageSnapshot | null;
  postValidateFailureRecovered?: boolean;
}): void {
  recordPromptQualityEvent({
    event: "completed",
    promptId: input.asset.id,
    promptVersion: input.asset.version,
    taskType: input.asset.taskType,
    mode: input.asset.mode,
    provider: input.provider,
    model: input.model,
    stage: input.invocation.stage,
    entrypoint: input.invocation.entrypoint,
    latencyMs: input.latencyMs,
    estimatedInputTokens: input.context.estimatedInputTokens,
    renderedPromptChars: input.renderedPromptChars,
    outputChars: estimateOutputChars(input.output),
    repairUsed: input.invocation.repairUsed,
    repairAttempts: input.invocation.repairAttempts,
    semanticRetryUsed: input.invocation.semanticRetryUsed,
    semanticRetryAttempts: input.invocation.semanticRetryAttempts,
    postValidateFailureRecovered: input.postValidateFailureRecovered,
    emptyOutput: isPromptOutputEmpty(input.output),
    tokenUsage: input.tokenUsage,
  });
}

export function recordPromptFailure(input: {
  asset: PromptAsset<unknown, unknown, unknown>;
  context: PromptRenderContext;
  invocation: PromptInvocationMeta;
  provider?: LLMProvider;
  model?: string;
  latencyMs: number;
  renderedPromptChars?: number;
  error: unknown;
}): void {
  recordPromptQualityEvent({
    event: "failed",
    promptId: input.asset.id,
    promptVersion: input.asset.version,
    taskType: input.asset.taskType,
    mode: input.asset.mode,
    provider: input.provider,
    model: input.model,
    stage: input.invocation.stage,
    entrypoint: input.invocation.entrypoint,
    latencyMs: input.latencyMs,
    estimatedInputTokens: input.context.estimatedInputTokens,
    renderedPromptChars: input.renderedPromptChars,
    repairUsed: input.invocation.repairUsed,
    repairAttempts: input.invocation.repairAttempts,
    semanticRetryUsed: input.invocation.semanticRetryUsed,
    semanticRetryAttempts: input.invocation.semanticRetryAttempts,
    failureKind: classifyPromptQualityFailure(input.error),
  });
}

/* ------------------------------------------------------------------ */
/*  Stream capture                                                    */
/* ------------------------------------------------------------------ */

export function captureStreamOutput(rawStream: AsyncIterable<BaseMessageChunk>): {
  stream: AsyncIterable<BaseMessageChunk>;
  completedText: Promise<string>;
  completedUsage: Promise<LlmTokenUsageSnapshot | null>;
} {
  let resolveText!: (value: string) => void;
  let rejectText!: (reason?: unknown) => void;
  let resolveUsage!: (value: LlmTokenUsageSnapshot | null) => void;
  let rejectUsage!: (reason?: unknown) => void;
  const completedText = new Promise<string>((resolve, reject) => {
    resolveText = resolve;
    rejectText = reject;
  });
  const completedUsage = new Promise<LlmTokenUsageSnapshot | null>((resolve, reject) => {
    resolveUsage = resolve;
    rejectUsage = reject;
  });

  const stream = {
    async *[Symbol.asyncIterator]() {
      const chunks: string[] = [];
      let usage: LlmTokenUsageSnapshot | null = null;
      try {
        for await (const chunk of rawStream) {
          chunks.push(toText(chunk.content));
          usage = mergeStreamTokenUsage(usage, extractLlmTokenUsage(chunk));
          yield chunk;
        }
        resolveText(chunks.join(""));
        resolveUsage(usage);
      } catch (error) {
        rejectText(error);
        rejectUsage(error);
        throw error;
      }
    },
  };

  return {
    stream,
    completedText,
    completedUsage,
  };
}

/* ------------------------------------------------------------------ */
/*  Result builders                                                   */
/* ------------------------------------------------------------------ */

export function buildPromptRunResult<T>(input: {
  asset: PromptAsset<unknown, unknown, unknown>;
  output: T;
  context: PromptRenderContext;
  provider?: LLMProvider;
  model?: string;
  latencyMs: number;
  invocation: PromptInvocationMeta;
  renderedPromptChars?: number;
  tokenUsage?: LlmTokenUsageSnapshot | null;
  postValidateFailureRecovered?: boolean;
}): PromptRunResult<T> {
  const meta = {
    provider: input.provider,
    model: input.model,
    latencyMs: input.latencyMs,
    invocation: input.invocation,
  };
  logPromptCompletion({
    meta: input.invocation,
    provider: meta.provider,
    model: meta.model,
    latencyMs: meta.latencyMs,
  });
  recordPromptCompletion({
    asset: input.asset,
    output: input.output,
    context: input.context,
    invocation: input.invocation,
    provider: meta.provider,
    model: meta.model,
    latencyMs: meta.latencyMs,
    renderedPromptChars: input.renderedPromptChars,
    tokenUsage: input.tokenUsage,
    postValidateFailureRecovered: input.postValidateFailureRecovered,
  });
  return {
    output: input.output,
    meta,
    context: input.context,
  };
}

/* ------------------------------------------------------------------ */
/*  Post-validate                                                     */
/* ------------------------------------------------------------------ */

export function applyPromptPostValidate<I, O, R = O>(input: {
  asset: PromptAsset<I, O, R>;
  promptInput: I;
  context: PromptRenderContext;
  rawOutput: R;
}): O {
  return input.asset.postValidate
    ? input.asset.postValidate(input.rawOutput, input.promptInput, input.context)
    : input.rawOutput as unknown as O;
}
