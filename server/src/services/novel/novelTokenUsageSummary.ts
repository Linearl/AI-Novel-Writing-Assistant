import type { TaskTokenUsageSummary } from "@ai-novel/shared";
import { prisma } from "../../db/prisma";
import { toTaskTokenUsageSummary } from "../task/taskTokenUsageSummary";

type UsageAccumulator = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  llmCallCount: number;
  lastTokenRecordedAt: Date | null;
};

function createEmptyAccumulator(): UsageAccumulator {
  return {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    llmCallCount: 0,
    lastTokenRecordedAt: null,
  };
}

function toSafeNumber(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.round(value));
}

function mergeUsage(accumulator: UsageAccumulator, input: {
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  llmCallCount?: number | null;
  lastTokenRecordedAt?: Date | null;
}): void {
  accumulator.promptTokens += toSafeNumber(input.promptTokens);
  accumulator.completionTokens += toSafeNumber(input.completionTokens);
  accumulator.totalTokens += toSafeNumber(input.totalTokens);
  accumulator.llmCallCount += toSafeNumber(input.llmCallCount);
  if (
    input.lastTokenRecordedAt
    && (!accumulator.lastTokenRecordedAt || input.lastTokenRecordedAt.getTime() > accumulator.lastTokenRecordedAt.getTime())
  ) {
    accumulator.lastTokenRecordedAt = input.lastTokenRecordedAt;
  }
}

export function extractWorkflowTaskIdFromGenerationJobPayload(payload: string | null | undefined): string | null {
  if (typeof payload !== "string" || payload.trim().length === 0) {
    return null;
  }
  try {
    const parsed = JSON.parse(payload) as { workflowTaskId?: unknown } | null;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return typeof parsed.workflowTaskId === "string" && parsed.workflowTaskId.trim().length > 0
      ? parsed.workflowTaskId.trim()
      : null;
  } catch {
    return null;
  }
}

/**
 * Fallback: 从 NovelWorkflowTask + GenerationJob 聚合（旧逻辑）
 * 仅当 LlmTokenUsage 表无数据时使用
 */
async function listNovelTokenUsageFromLegacySources(novelIds: string[]): Promise<Map<string, UsageAccumulator>> {
  const [workflowUsageRows, generationJobRows] = await Promise.all([
    prisma.novelWorkflowTask.groupBy({
      by: ["novelId"],
      where: { novelId: { in: novelIds } },
      _sum: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        llmCallCount: true,
      },
      _max: { lastTokenRecordedAt: true },
    }),
    prisma.generationJob.findMany({
      where: {
        novelId: { in: novelIds },
        OR: [
          { promptTokens: { gt: 0 } },
          { completionTokens: { gt: 0 } },
          { totalTokens: { gt: 0 } },
          { llmCallCount: { gt: 0 } },
        ],
      },
      select: {
        novelId: true,
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        llmCallCount: true,
        lastTokenRecordedAt: true,
        payload: true,
      },
    }),
  ]);

  const usageByNovelId = new Map<string, UsageAccumulator>(
    novelIds.map((novelId) => [novelId, createEmptyAccumulator()]),
  );

  for (const row of workflowUsageRows) {
    if (!row.novelId) continue;
    const acc = usageByNovelId.get(row.novelId);
    if (!acc) continue;
    mergeUsage(acc, {
      promptTokens: row._sum.promptTokens,
      completionTokens: row._sum.completionTokens,
      totalTokens: row._sum.totalTokens,
      llmCallCount: row._sum.llmCallCount,
      lastTokenRecordedAt: row._max.lastTokenRecordedAt,
    });
  }

  for (const row of generationJobRows) {
    if (extractWorkflowTaskIdFromGenerationJobPayload(row.payload)) continue;
    const acc = usageByNovelId.get(row.novelId);
    if (!acc) continue;
    mergeUsage(acc, row);
  }

  return usageByNovelId;
}

/**
 * 主数据源：从 LlmTokenUsage 表聚合
 */
async function listNovelTokenUsageFromLlmTokenUsage(novelIds: string[]): Promise<Map<string, UsageAccumulator>> {
  const rows = await prisma.llmTokenUsage.groupBy({
    by: ["novelId"],
    where: { novelId: { in: novelIds } },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      totalTokens: true,
    },
    _count: true,
    _max: { recordedAt: true },
  });

  const result = new Map<string, UsageAccumulator>(
    novelIds.map((novelId) => [novelId, createEmptyAccumulator()]),
  );

  for (const row of rows) {
    if (!row.novelId) continue;
    const acc = result.get(row.novelId);
    if (!acc) continue;
    acc.promptTokens = row._sum.inputTokens ?? 0;
    acc.completionTokens = row._sum.outputTokens ?? 0;
    acc.totalTokens = row._sum.totalTokens ?? 0;
    acc.llmCallCount = row._count;
    acc.lastTokenRecordedAt = row._max.recordedAt;
  }

  return result;
}

export async function listNovelTokenUsageByNovelIds(novelIds: string[]): Promise<Map<string, TaskTokenUsageSummary | null>> {
  const uniqueNovelIds = Array.from(new Set(novelIds.filter((id) => id.trim().length > 0)));
  if (uniqueNovelIds.length === 0) {
    return new Map();
  }

  // 主数据源：LlmTokenUsage（覆盖所有 LLM 调用，含 Creative Hub）
  const primaryUsage = await listNovelTokenUsageFromLlmTokenUsage(uniqueNovelIds);

  // 检查哪些 novel 在主数据源无数据，需要 fallback
  const fallbackNeeded: string[] = [];
  for (const novelId of uniqueNovelIds) {
    const acc = primaryUsage.get(novelId);
    if (!acc || (acc.totalTokens === 0 && acc.llmCallCount === 0)) {
      fallbackNeeded.push(novelId);
    }
  }

  // Fallback：从旧数据源补充
  if (fallbackNeeded.length > 0) {
    const legacyUsage = await listNovelTokenUsageFromLegacySources(fallbackNeeded);
    for (const novelId of fallbackNeeded) {
      const legacy = legacyUsage.get(novelId);
      if (legacy && legacy.totalTokens > 0) {
        primaryUsage.set(novelId, legacy);
      }
    }
  }

  return new Map(
    uniqueNovelIds.map((novelId) => {
      const acc = primaryUsage.get(novelId) ?? createEmptyAccumulator();
      return [
        novelId,
        toTaskTokenUsageSummary({
          promptTokens: acc.promptTokens,
          completionTokens: acc.completionTokens,
          totalTokens: acc.totalTokens,
          llmCallCount: acc.llmCallCount,
          lastTokenRecordedAt: acc.lastTokenRecordedAt,
        }),
      ];
    }),
  );
}
