import type { PayoffLedgerNormalizedStatus } from "@ai-novel/shared/types/payoffLedger";
import { NORMALIZED_STATUS_MAP } from "@ai-novel/shared/types/payoffLedger";
import { prisma } from "../../db/prisma";

interface StatusComputationInput {
  currentStatus: "setup" | "hinted" | "pending_payoff" | "paid_off" | "failed" | "overdue";
  setupChapterOrder: number | null;
  payoffChapterOrder: number | null;
  currentChapterOrder: number;
  threshold: number;
}

/**
 * 计算 normalizedStatus 并决定 chaptersElapsed。
 *
 * 规则：
 * - 已 paid_off / failed → resolved（不参与过期检测）
 * - 已 overdue → expired
 * - 其他：若 setupChapterOrder 有值，计算 elapsed，超阈值则 expired，否则保持 mapped 状态
 */
export function computeNormalizedStatus(input: StatusComputationInput): {
  normalizedStatus: PayoffLedgerNormalizedStatus;
  chaptersElapsed: number;
} {
  const { currentStatus, setupChapterOrder, payoffChapterOrder, currentChapterOrder, threshold } = input;

  // 已完成态：直接映射
  if (currentStatus === "paid_off" || currentStatus === "failed") {
    return {
      normalizedStatus: NORMALIZED_STATUS_MAP[currentStatus],
      chaptersElapsed: (payoffChapterOrder != null && setupChapterOrder != null)
        ? payoffChapterOrder - setupChapterOrder
        : 0,
    };
  }

  // 已过期：直接映射
  if (currentStatus === "overdue") {
    const elapsed = (setupChapterOrder != null)
      ? currentChapterOrder - setupChapterOrder
      : 0;
    return {
      normalizedStatus: "expired",
      chaptersElapsed: Math.max(0, elapsed),
    };
  }

  // 计算已跨越章节数
  const elapsed = (setupChapterOrder != null)
    ? currentChapterOrder - setupChapterOrder
    : 0;
  const clampedElapsed = Math.max(0, elapsed);

  // 超过阈值 → expired
  if (clampedElapsed >= threshold && setupChapterOrder != null) {
    return {
      normalizedStatus: "expired",
      chaptersElapsed: clampedElapsed,
    };
  }

  return {
    normalizedStatus: NORMALIZED_STATUS_MAP[currentStatus],
    chaptersElapsed: clampedElapsed,
  };
}

/**
 * 批量更新小说下所有 planted/active 伏笔的 chaptersElapsed 和 normalizedStatus。
 * 通常在章节创建/提交后调用。
 */
export async function updateChaptersElapsed(novelId: string): Promise<number> {
  // 获取最新章节序号
  const latestChapter = await prisma.chapter.findFirst({
    where: { novelId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const currentChapterOrder = latestChapter?.order ?? 0;

  // 获取小说过期阈值
  const novel = await prisma.novel.findUnique({
    where: { id: novelId },
    select: { payoffExpiryThreshold: true },
  });
  const threshold = novel?.payoffExpiryThreshold ?? 20;

  // 获取所有伏笔条目
  const rows = await prisma.payoffLedgerItem.findMany({
    where: { novelId },
    select: {
      id: true,
      currentStatus: true,
      normalizedStatus: true,
      setupChapterId: true,
      payoffChapterId: true,
    },
  });

  if (rows.length === 0) {
    return 0;
  }

  // 预加载章节 order 映射
  const chapterIds = rows
    .flatMap((row) => [row.setupChapterId, row.payoffChapterId])
    .filter((id): id is string => id != null);

  const chapters = chapterIds.length > 0
    ? await prisma.chapter.findMany({
        where: { id: { in: chapterIds } },
        select: { id: true, order: true },
      })
    : [];

  const chapterOrderMap = new Map(chapters.map((ch) => [ch.id, ch.order]));

  let updatedCount = 0;

  for (const row of rows) {
    const setupChapterOrder = row.setupChapterId ? (chapterOrderMap.get(row.setupChapterId) ?? null) : null;
    const payoffChapterOrder = row.payoffChapterId ? (chapterOrderMap.get(row.payoffChapterId) ?? null) : null;

    const { normalizedStatus, chaptersElapsed } = computeNormalizedStatus({
      currentStatus: row.currentStatus,
      setupChapterOrder,
      payoffChapterOrder,
      currentChapterOrder,
      threshold,
    });

    // 仅在有变化时更新
    if (normalizedStatus !== row.normalizedStatus || chaptersElapsed !== undefined) {
      const updateData: Record<string, unknown> = {
        normalizedStatus,
        chaptersElapsed,
      };

      // 如果检测到过期但 currentStatus 还未更新，同步更新
      if (normalizedStatus === "expired" && row.currentStatus !== "overdue") {
        updateData.currentStatus = "overdue";
      }

      await prisma.payoffLedgerItem.update({
        where: { id: row.id },
        data: updateData,
      });
      updatedCount++;
    }
  }

  return updatedCount;
}
