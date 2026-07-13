import { prisma } from "../../db/prisma";
import {
  compactText,
  formatMajorPayoffs,
  normalizeConflict,
  safeParseJson,
} from "./payoffLedgerSyncHelpers";
import type { PayoffLedgerSyncOptions } from "./payoffLedgerSyncTypes";

export async function getResolvedChapterOrder(
  novelId: string,
  options: PayoffLedgerSyncOptions,
): Promise<number | null> {
  if (typeof options.chapterOrder === "number") {
    return options.chapterOrder;
  }
  const [sourceChapter, latestChapter] = await Promise.all([
    options.sourceChapterId
      ? prisma.chapter.findFirst({
          where: { id: options.sourceChapterId, novelId },
          select: { order: true },
        })
      : Promise.resolve(null),
    prisma.chapter.findFirst({
      where: { novelId },
      orderBy: { order: "desc" },
      select: { order: true },
    }),
  ]);
  return sourceChapter?.order ?? latestChapter?.order ?? null;
}

export async function buildSyncPromptInput(novelId: string, options: PayoffLedgerSyncOptions) {
  const chapterOrder = await getResolvedChapterOrder(novelId, options);
  const [novel, volumeRows, snapshot, openConflicts, recentAuditReports] = await Promise.all([
    prisma.novel.findUnique({
      where: { id: novelId },
      select: {
        id: true,
        title: true,
        storyMacroPlan: {
          select: {
            decompositionJson: true,
          },
        },
      },
    }),
    prisma.volumePlan.findMany({
      where: { novelId },
      orderBy: { sortOrder: "asc" },
      include: {
        chapters: {
          orderBy: { chapterOrder: "asc" },
          select: {
            id: true,
            chapterOrder: true,
            title: true,
            summary: true,
            payoffRefsJson: true,
          },
        },
      },
    }),
    prisma.storyStateSnapshot.findFirst({
      where: { novelId },
      orderBy: { createdAt: "desc" },
      include: {
        sourceChapter: {
          select: {
            id: true,
            order: true,
            title: true,
          },
        },
        foreshadowStates: true,
      },
    }),
    prisma.openConflict.findMany({
      where: {
        novelId,
        status: "open",
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 8,
    }),
    prisma.auditReport.findMany({
      where: { novelId, auditType: "plot" },
      orderBy: [{ createdAt: "desc" }],
      take: 4,
      include: {
        issues: {
          where: { status: "open" },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
  ]);

  if (!novel) {
    throw new Error("小说不存在。");
  }

  const activeVolume = typeof chapterOrder === "number"
    ? volumeRows.find((volume) => volume.chapters.some((chapter) => chapter.chapterOrder === chapterOrder))
    : volumeRows.at(-1) ?? null;

  const activeVolumeSummary = activeVolume
    ? [
        `当前卷：第${activeVolume.sortOrder}卷《${activeVolume.title}》`,
        `卷摘要：${compactText(activeVolume.summary)}`,
        `卷 open payoffs：${safeParseJson<string[]>(activeVolume.openPayoffsJson, []).join("；") || "无"}`,
        activeVolume.chapters.length > 0
          ? `卷章节范围：${activeVolume.chapters[0]?.chapterOrder ?? "-"}-${activeVolume.chapters[activeVolume.chapters.length - 1]?.chapterOrder ?? "-"}`
          : "卷章节范围：无",
      ].join("\n")
    : `当前暂无激活卷窗口。${volumeRows.length > 0 ? `已有卷：${volumeRows.map((item) => `第${item.sortOrder}卷《${item.title}》`).join("；")}` : ""}`;

  const latestChapterContext = [
    typeof chapterOrder === "number" ? `当前章节序号：第${chapterOrder}章` : "当前章节序号：未知",
    snapshot?.sourceChapter
      ? `最新状态快照来源：第${snapshot.sourceChapter.order}章《${snapshot.sourceChapter.title}》`
      : "最新状态快照来源：无",
    snapshot?.summary ? `状态快照摘要：${snapshot.summary}` : "",
  ].filter(Boolean).join("\n");

  const openPayoffsText = volumeRows.length > 0
    ? volumeRows.map((volume) => {
        const openPayoffs = safeParseJson<string[]>(volume.openPayoffsJson, []);
        if (openPayoffs.length === 0) {
          return "";
        }
        return `【第${volume.sortOrder}卷 ${volume.title}】 ${openPayoffs.map((item) => compactText(item, "无")).join("；")}`;
      }).filter(Boolean).join("\n\n") || "无"
    : "无";

  const chapterPayoffRefsText = volumeRows.flatMap((volume) => volume.chapters.map((chapter) => {
    const refs = safeParseJson<string[]>(chapter.payoffRefsJson, []);
    if (refs.length === 0) {
      return "";
    }
    return `第${chapter.chapterOrder}章《${chapter.title}》 | ${refs.map((item) => compactText(item, "无")).join("；")}`;
  })).filter(Boolean).join("\n\n") || "无";

  const foreshadowStatesText = snapshot?.foreshadowStates.length
    ? snapshot.foreshadowStates.map((item) => (
      [
        `标题：${item.title}`,
        `状态：${compactText(item.status)}`,
        item.summary ? `摘要：${item.summary}` : "",
        item.setupChapterId ? `setupChapterId：${item.setupChapterId}` : "",
        item.payoffChapterId ? `payoffChapterId：${item.payoffChapterId}` : "",
      ].filter(Boolean).join(" | ")
    )).join("\n")
    : "无";

  const payoffConflictsText = openConflicts.length > 0
    ? openConflicts.map((row) => {
        const conflict = normalizeConflict(row);
        return [
          `${conflict.conflictType}/${conflict.severity}：${conflict.title}`,
          compactText(conflict.summary),
          conflict.resolutionHint ? `修复建议：${compactText(conflict.resolutionHint)}` : "",
        ].filter(Boolean).join(" | ");
      }).join("\n")
    : "无";

  const payoffAuditIssuesText = recentAuditReports.length > 0
    ? recentAuditReports.flatMap((report) => report.issues.map((issue) => (
      `${issue.code} (${issue.severity})：${compactText(issue.description)} | 证据：${compactText(issue.evidence)}`
    ))).join("\n") || "无"
    : "无";

  return {
    chapterOrder,
    latestSnapshotId: snapshot?.id ?? null,
    promptInput: {
      novelTitle: novel.title,
      activeVolumeSummary,
      latestChapterContext,
      majorPayoffsText: formatMajorPayoffs(novel.storyMacroPlan?.decompositionJson),
      openPayoffsText,
      chapterPayoffRefsText,
      foreshadowStatesText,
      payoffConflictsText,
      payoffAuditIssuesText,
    },
  };
}
