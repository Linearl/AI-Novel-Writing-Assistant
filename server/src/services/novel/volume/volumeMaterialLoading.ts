/**
 * REQ-2058: 卷生成流水线 material_index 按需材料加载
 *
 * 职责：
 * - 从 NovelMaterial 表查询材料索引（调用公共入口 exportNovelPromptMaterials）
 * - 按 requestedMaterialIds 查询材料全文
 * - 提供 B2 两轮加载的通用流程封装
 *
 * 架构约束：
 * - 通用 promptRunner 不直接依赖 Prisma 或 NovelMaterial
 * - 领域逻辑收敛在此模块
 */
import { HumanMessage } from "@langchain/core/messages";
import type { ZodType } from "zod";
import { z } from "zod";
import { prisma } from "../../../db/prisma";
import { exportNovelPromptMaterials } from "../../../prompting/materials/NovelPromptMaterialExporter";
import { createContextBlock } from "../../../prompting/core/contextBudget";
import {
  preparePromptExecution,
  runStructuredPrompt,
} from "../../../prompting/core/promptRunner";
import {
  getPromptRunnerStructuredInvoker,
  resolveStructuredRepairAttempts,
} from "../../../prompting/core/promptRunnerHelpers";
import { applyPromptPostValidate } from "../../../prompting/core/promptRunnerTelemetry";
import { resolveStructuredOutput } from "../../../prompting/core/promptRunnerStructuredOutput";
import type { PromptContextBlock } from "../../../prompting/core/promptTypes";
import type {
  PromptAsset,
  PromptExecutionOptions,
  PromptRunResult,
} from "../../../prompting/core/promptTypes";

/* ------------------------------------------------------------------ */
/*  Material Index Loading (T2)                                        */
/* ------------------------------------------------------------------ */

/**
 * 查询 material_index 并构建 context block。
 *
 * 调用公共入口 exportNovelPromptMaterials({ novelId, groups: ["material_index"] })，
 * 不直接访问 private buildMaterialIndex()。
 *
 * @returns material_index context block，无材料时返回 null
 */
export async function loadMaterialIndexBlock(
  novelId: string,
): Promise<PromptContextBlock | null> {
  const result = await exportNovelPromptMaterials({
    novelId,
    groups: ["material_index"],
    maxTokens: 4000,
  });
  const block = result.blocks.find((b) => b.group === "material_index");
  if (!block) {
    return null;
  }
  return createContextBlock({
    id: "material_index",
    group: "material_index",
    priority: 70,
    content: block.content,
  });
}

/**
 * 构建 material_index context block 列表（从预加载的 data 构建）。
 * 用于 contextBlocks.ts 中的同步 builder 函数。
 */
export function buildMaterialIndexContextBlockFromData(
  content: string,
): PromptContextBlock {
  return createContextBlock({
    id: "material_index",
    group: "material_index",
    priority: 70,
    content,
  });
}

/* ------------------------------------------------------------------ */
/*  Material Full-Text Loading                                         */
/* ------------------------------------------------------------------ */

/**
 * 按 requestedMaterialIds 查询材料全文。
 *
 * 过滤条件：novelId 匹配 + enabled: true。
 * ID 去重、过滤空字符串。
 */
export async function loadRequestedMaterials(params: {
  novelId: string;
  materialIds: string[];
}): Promise<string | null> {
  const uniqueIds = [
    ...new Set(
      params.materialIds
        .filter((id) => typeof id === "string" && id.trim().length > 0)
        .map((id) => id.trim()),
    ),
  ];
  if (uniqueIds.length === 0) {
    return null;
  }

  const materials = await prisma.novelMaterial.findMany({
    where: {
      id: { in: uniqueIds },
      novelId: params.novelId,
      enabled: true,
    },
    orderBy: { sortOrder: "asc" },
  });
  if (materials.length === 0) {
    return null;
  }

  const lines: string[] = ["以下是您请求的参考材料全文：", ""];
  for (const m of materials) {
    const content = m.content?.trim();
    if (!content) {
      continue;
    }
    lines.push(`---`);
    lines.push(`## ${m.title}`);
    lines.push("");
    lines.push(content);
    lines.push("");
  }
  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/*  B2 Two-Round Loading Flow                                          */
/* ------------------------------------------------------------------ */

/**
 * 为原始 schema 添加 optional requestedMaterialIds 字段。
 *
 * schema 使用 z.intersection，因为部分原始 schema 是 ZodEffects（z.preprocess 产生），
 * 不能使用 .extend()。
 */
function buildB2UnionSchema<T extends ZodType>(
  originalSchema: T,
): ZodType {
  return z.intersection(
    originalSchema,
    z.object({
      requestedMaterialIds: z.array(z.string()).optional(),
    }),
  );
}

/**
 * B2 两轮加载封装。
 *
 * 第一轮：使用 union schema（含 requestedMaterialIds），LLM 自主决定是否请求材料。
 * 若 LLM 输出 requestedMaterialIds 且非空：
 *   - 查询材料全文
 *   - 追加 user message 携带材料全文
 *   - 使用原始 schema 发起第二轮调用
 *   - 返回第二轮结果（剥离 requestedMaterialIds）
 * 若未请求材料：直接返回第一轮结果（剥离 requestedMaterialIds）。
 *
 * 质量门：保持 assertRegistered、repair、postValidate。
 */
export async function runWithTwoRoundMaterialLoading<I, O>(input: {
  asset: PromptAsset<I, O>;
  promptInput: I;
  contextBlocks: PromptContextBlock[];
  options?: PromptExecutionOptions;
  novelId: string;
}): Promise<PromptRunResult<O>> {
  const { asset, promptInput, options, novelId } = input;

  // --- Build B2 union schema for round 1 ---
  const originalSchema = asset.outputSchema;
  if (!originalSchema) {
    throw new Error(`Prompt asset ${asset.id} has no outputSchema.`);
  }
  const unionSchema = buildB2UnionSchema(originalSchema);

  // --- Prepare messages (overlay resolution is inside preparePromptExecution) ---
  const prepared = preparePromptExecution({
    asset: asset as PromptAsset<unknown, unknown, unknown>,
    promptInput: promptInput as unknown,
    contextBlocks: input.contextBlocks,
    options,
  });

  // --- Round 1: invoke with union schema ---
  const invoker = getPromptRunnerStructuredInvoker();
  const round1Result = await invoker({
    label: `${asset.id}@${asset.version} [B2-round1]`,
    provider: options?.provider,
    model: options?.model,
    temperature: options?.temperature,
    maxTokens: options?.maxTokens,
    timeoutMs: options?.timeoutMs,
    signal: options?.signal,
    taskType: asset.taskType,
    messages: prepared.messages,
    schema: unionSchema as ZodType,
    maxRepairAttempts: resolveStructuredRepairAttempts(
      asset as PromptAsset<unknown, unknown, unknown>,
    ),
    promptMeta: prepared.invocation,
  });

  // --- Check if material loading is needed ---
  const rawRound1 = round1Result.data as Record<string, unknown> | undefined;
  const requestedIds = (rawRound1 as { requestedMaterialIds?: string[] })
    ?.requestedMaterialIds;
  const hasRequestedMaterials =
    Array.isArray(requestedIds) && requestedIds.length > 0;

  if (!hasRequestedMaterials) {
    // No materials requested — return round 1 result (strip requestedMaterialIds)
    const cleaned = stripRequestedMaterialIds(rawRound1);
    const resolved = await resolveStructuredOutput({
      asset: asset as PromptAsset<unknown, unknown, unknown>,
      promptInput: promptInput as unknown,
      context: prepared.context,
      baseMessages: prepared.messages,
      outputSchema: originalSchema,
      initialResult: {
        ...round1Result,
        data: cleaned as O,
      },
      options,
    });
    return {
      output: resolved.output as unknown as O,
      meta: {
        provider: options?.provider,
        model: options?.model,
        latencyMs: 0,
        invocation: resolved.invocation,
      },
      context: prepared.context,
    };
  }

  // --- Load requested materials ---
  const materialText = await loadRequestedMaterials({
    novelId,
    materialIds: requestedIds,
  });
  if (!materialText) {
    // Materials not found or empty — return round 1 result anyway
    const cleaned = stripRequestedMaterialIds(rawRound1);
    const resolved = await resolveStructuredOutput({
      asset: asset as PromptAsset<unknown, unknown, unknown>,
      promptInput: promptInput as unknown,
      context: prepared.context,
      baseMessages: prepared.messages,
      outputSchema: originalSchema,
      initialResult: {
        ...round1Result,
        data: cleaned as O,
      },
      options,
    });
    return {
      output: resolved.output as unknown as O,
      meta: {
        provider: options?.provider,
        model: options?.model,
        latencyMs: 0,
        invocation: resolved.invocation,
      },
      context: prepared.context,
    };
  }

  // --- Round 2: append materials as user message, invoke with original schema ---
  const round2Messages = [
    ...prepared.messages,
    new HumanMessage(materialText),
  ];
  const round2Result = await invoker({
    label: `${asset.id}@${asset.version} [B2-round2]`,
    provider: options?.provider,
    model: options?.model,
    temperature: options?.temperature,
    maxTokens: options?.maxTokens,
    timeoutMs: options?.timeoutMs,
    signal: options?.signal,
    taskType: asset.taskType,
    messages: round2Messages,
    schema: originalSchema,
    maxRepairAttempts: resolveStructuredRepairAttempts(
      asset as PromptAsset<unknown, unknown, unknown>,
    ),
    promptMeta: prepared.invocation,
  });

  // --- Resolve round 2 output (with postValidate + semantic retry) ---
  const resolved = await resolveStructuredOutput({
    asset: asset as PromptAsset<unknown, unknown, unknown>,
    promptInput: promptInput as unknown,
    context: prepared.context,
    baseMessages: round2Messages,
    outputSchema: originalSchema,
    initialResult: round2Result,
    options,
  });

  return {
    output: resolved.output as unknown as O,
    meta: {
      provider: options?.provider,
      model: options?.model,
      latencyMs: 0,
      invocation: resolved.invocation,
    },
    context: prepared.context,
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function stripRequestedMaterialIds(
  data: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!data || typeof data !== "object") {
    return data;
  }
  const { requestedMaterialIds: _, ...rest } = data;
  return rest;
}
