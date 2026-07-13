import { NORMALIZED_STATUS_MAP } from "@ai-novel/shared";
import { prisma } from "../../db/prisma";

/**
 * T8: 章节生成前检查未回收伏笔，生成回收提醒上下文。
 *
 * 流程：
 * 1. 查询所有 planted/active 状态伏笔
 * 2. 计算 chaptersElapsed（当前章节序号 - 埋设章节序号）
 * 3. 按 chaptersElapsed 降序排序，取前 5 条
 * 4. 返回格式化的提醒文本
 */
export async function buildPayoffReminderContext(
  novelId: string,
  currentChapterOrder: number,
): Promise<string> {
  const rows = await prisma.payoffLedgerItem.findMany({
    where: { novelId },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });
  const activeItems = rows.filter((row) => {
    const ns = row.normalizedStatus ?? NORMALIZED_STATUS_MAP[row.currentStatus];
    return ns === "planted" || ns === "active";
  });

  if (activeItems.length === 0) {
    return "";
  }

  // 预加载章节 order 映射
  const chapterIds = activeItems
    .map((row) => row.setupChapterId)
    .filter((id): id is string => id != null);
  const chapters = chapterIds.length > 0
    ? await prisma.chapter.findMany({
        where: { id: { in: chapterIds } },
        select: { id: true, order: true },
      })
    : [];
  const chapterOrderMap = new Map(chapters.map((ch) => [ch.id, ch.order]));

  // 计算 chaptersElapsed 并排序
  const withElapsed = activeItems.map((row) => {
    const setupOrder = row.setupChapterId
      ? (chapterOrderMap.get(row.setupChapterId) ?? row.firstSeenChapterOrder ?? 0)
      : row.firstSeenChapterOrder ?? 0;
    const elapsed = Math.max(0, currentChapterOrder - setupOrder);
    return { row, elapsed };
  });

  withElapsed.sort((a, b) => b.elapsed - a.elapsed);

  // 取前 5 条最紧迫的
  const topItems = withElapsed.slice(0, 5);
  if (topItems.length === 0) {
    return "";
  }

  const lines = topItems.map(({ row, elapsed }) => {
    const ns = row.normalizedStatus ?? NORMALIZED_STATUS_MAP[row.currentStatus];
    const statusLabel = ns === "planted" ? "已埋设" : "进行中";
    const elapsedText = elapsed > 0 ? `跨越 ${elapsed} 章` : "本章埋设";
    return `- [${statusLabel}] ${row.title}：${row.summary}（${elapsedText}）`;
  });

  return [
    "以下伏笔需要在本章或近期章节中回收：",
    ...lines,
    "",
    "请在本章创作中优先安排回收上述伏笔，或在剧情中自然推进。",
  ].join("\n");
}
