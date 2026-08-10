import type { StepTokenUsageSummary } from "@ai-novel/shared";
import { prisma } from "../../db/prisma";

/**
 * 按 stepType 分组查询小说的 Token 消耗统计
 * stepType 为 NULL 的记录不参与步骤分布计算
 */
export async function getNovelTokenUsageByStep(novelId: string): Promise<StepTokenUsageSummary[]> {
  const rows = await prisma.llmTokenUsage.groupBy({
    by: ["stepType"],
    where: {
      novelId,
      stepType: { not: null },
    },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      totalTokens: true,
    },
    _count: true,
  });

  const grandTotal = rows.reduce((sum, r) => sum + (r._sum.totalTokens ?? 0), 0);

  return rows
    .filter((r) => r.stepType !== null)
    .map((r) => ({
      stepType: r.stepType!,
      inputTokens: r._sum.inputTokens ?? 0,
      outputTokens: r._sum.outputTokens ?? 0,
      totalTokens: r._sum.totalTokens ?? 0,
      callCount: r._count,
      percentage: grandTotal > 0 ? (r._sum.totalTokens ?? 0) / grandTotal : 0,
    }))
    .sort((a, b) => b.totalTokens - a.totalTokens);
}
