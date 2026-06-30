import type { BaseMessage } from "@langchain/core/messages";
import type { StructuredInvokeResult } from "../../llm/structuredInvoke";
import {
  recordPromptQualityEvent,
} from "./promptQualityTelemetry";
import {
  buildPromptInvocationMeta,
  buildSemanticRetryMessages,
  getPromptRunnerStructuredInvoker,
  markPromptQualityFailure,
  resolveStructuredRepairAttempts,
  resolveStructuredSemanticRetryAttempts,
  stringifyPromptError,
} from "./promptRunnerHelpers";
import {
  applyPromptPostValidate,
  logPromptEvent,
} from "./promptRunnerTelemetry";
import type {
  PromptAsset,
  PromptExecutionOptions,
  PromptInvocationMeta,
  PromptRenderContext,
} from "./promptTypes";

export async function resolveStructuredOutput<I, O, R = O>(input: {
  asset: PromptAsset<I, O, R>;
  promptInput: I;
  context: PromptRenderContext;
  baseMessages: BaseMessage[];
  outputSchema: NonNullable<PromptAsset<I, O, R>["outputSchema"]>;
  initialResult: StructuredInvokeResult<R>;
  options?: PromptExecutionOptions;
}): Promise<{
  output: O;
  invocation: PromptInvocationMeta;
  postValidateFailureRecovered: boolean;
}> {
  const asset = input.asset as PromptAsset<unknown, unknown, unknown>;
  const invoker = getPromptRunnerStructuredInvoker();
  let currentMessages = input.baseMessages;
  let currentResult = input.initialResult;
  let totalRepairAttempts = currentResult.repairAttempts;
  let repairUsed = currentResult.repairUsed;
  let semanticRetryAttempts = 0;
  const maxSemanticRetryAttempts = resolveStructuredSemanticRetryAttempts(asset);

  while (true) {
    try {
      const output = applyPromptPostValidate({
        asset: input.asset,
        promptInput: input.promptInput,
        context: input.context,
        rawOutput: currentResult.data,
      });
      return {
        output,
        invocation: buildPromptInvocationMeta(
          asset,
          input.context,
          repairUsed,
          totalRepairAttempts,
          semanticRetryAttempts > 0,
          semanticRetryAttempts,
          input.options,
        ),
        postValidateFailureRecovered: false,
      };
    } catch (error) {
      if (semanticRetryAttempts >= maxSemanticRetryAttempts) {
        if (input.asset.postValidateFailureRecovery) {
          logPromptEvent({
            event: "semantic_retry_recovered",
            asset: asset as PromptAsset<unknown, unknown, unknown>,
            context: input.context,
            provider: input.options?.provider,
            model: input.options?.model,
            attempt: semanticRetryAttempts,
            validationError: stringifyPromptError(error),
          });
          recordPromptQualityEvent({
            event: "semantic_retry_recovered",
            promptId: asset.id,
            promptVersion: asset.version,
            taskType: asset.taskType,
            mode: asset.mode,
            provider: input.options?.provider,
            model: input.options?.model,
            stage: input.options?.stage,
            entrypoint: input.options?.entrypoint,
            estimatedInputTokens: input.context.estimatedInputTokens,
            semanticRetryUsed: semanticRetryAttempts > 0,
            semanticRetryAttempts,
            postValidateFailureRecovered: true,
          });
          return {
            output: input.asset.postValidateFailureRecovery({
              promptInput: input.promptInput,
              context: input.context,
              rawOutput: currentResult.data,
              validationError: stringifyPromptError(error),
              semanticRetryAttempts,
            }),
            invocation: buildPromptInvocationMeta(
              asset,
              input.context,
              repairUsed,
              totalRepairAttempts,
              semanticRetryAttempts > 0,
              semanticRetryAttempts,
              input.options,
            ),
            postValidateFailureRecovered: true,
          };
        }
        throw markPromptQualityFailure(error, "post_validate_failed");
      }

      semanticRetryAttempts += 1;
      recordPromptQualityEvent({
        event: "semantic_retry_start",
        promptId: asset.id,
        promptVersion: asset.version,
        taskType: asset.taskType,
        mode: asset.mode,
        provider: input.options?.provider,
        model: input.options?.model,
        stage: input.options?.stage,
        entrypoint: input.options?.entrypoint,
        estimatedInputTokens: input.context.estimatedInputTokens,
        semanticRetryUsed: true,
        semanticRetryAttempts,
      });
      logPromptEvent({
        event: "semantic_retry_start",
        asset: asset as PromptAsset<unknown, unknown, unknown>,
        context: input.context,
        provider: input.options?.provider,
        model: input.options?.model,
        attempt: semanticRetryAttempts,
        validationError: stringifyPromptError(error),
      });
      currentMessages = buildSemanticRetryMessages({
        asset: input.asset,
        promptInput: input.promptInput,
        context: input.context,
        baseMessages: currentMessages,
        parsedOutput: currentResult.data,
        validationError: stringifyPromptError(error),
        attempt: semanticRetryAttempts,
      });
      currentResult = await invoker<R>({
        label: `${input.asset.id}@${input.asset.version}#semantic-retry-${semanticRetryAttempts}`,
        provider: input.options?.provider,
        model: input.options?.model,
        temperature: input.options?.temperature,
        maxTokens: input.options?.maxTokens,
        timeoutMs: input.options?.timeoutMs,
        signal: input.options?.signal,
        taskType: input.asset.taskType,
        messages: currentMessages,
        schema: input.outputSchema,
        maxRepairAttempts: resolveStructuredRepairAttempts(asset),
        promptMeta: buildPromptInvocationMeta(
          asset,
          input.context,
          repairUsed,
          totalRepairAttempts,
          true,
          semanticRetryAttempts,
          input.options,
        ),
      });
      logPromptEvent({
        event: "semantic_retry_done",
        asset: asset as PromptAsset<unknown, unknown, unknown>,
        context: input.context,
        provider: input.options?.provider,
        model: input.options?.model,
        attempt: semanticRetryAttempts,
      });
      recordPromptQualityEvent({
        event: "semantic_retry_done",
        promptId: asset.id,
        promptVersion: asset.version,
        taskType: asset.taskType,
        mode: asset.mode,
        provider: input.options?.provider,
        model: input.options?.model,
        stage: input.options?.stage,
        entrypoint: input.options?.entrypoint,
        estimatedInputTokens: input.context.estimatedInputTokens,
        repairUsed: currentResult.repairUsed,
        repairAttempts: currentResult.repairAttempts,
        semanticRetryUsed: true,
        semanticRetryAttempts,
      });
      totalRepairAttempts += currentResult.repairAttempts;
      repairUsed = repairUsed || currentResult.repairUsed;
    }
  }
}
