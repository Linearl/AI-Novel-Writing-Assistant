import type { LLMProvider } from "@ai-novel/shared";
import type { AuditReport, OpenConflict, PayoffLedgerResponse } from "@ai-novel/shared";
import type { PayoffLedgerItem } from "@ai-novel/shared";
import { NORMALIZED_STATUS_MAP } from "@ai-novel/shared";
import { prisma } from "../../db/prisma";
import { runStructuredPrompt } from "../../prompting/core/promptRunner";
import { payoffDetectionPrompt } from "../../prompting/prompts/payoff/payoffDetection.prompts";
import { payoffLedgerSyncPrompt } from "../../prompting/prompts/payoff/payoffLedgerSync.prompts";
import {
  appendStaleRiskSignal,
  buildPayoffLedgerResponse,
  buildSyntheticPayoffIssues,
  clearStaleRiskSignal,
  dedupeRiskSignals,
  mapPayoffLedgerRow,
  normalizePayoffLedgerIdentity,
  resolvePayoffLedgerSyncLedgerKey,
  sanitizePayoffLedgerSyncItem,
  serializeLedgerJson,
} from "./payoffLedgerShared";
import {
  createNovelChapterReferenceLookup,
  normalizePayoffLedgerPromptChapterRefs,
} from "./payoffLedgerChapterRefs";

interface PayoffLedgerSyncOptions {
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
  chapterOrder?: number | null;
  sourceChapterId?: string | null;
}

interface PayoffLedgerReadOptions extends PayoffLedgerSyncOptions {
  syncIfMissing?: boolean;
}

function compactText(value: string | null | undefined, fallback = "无"): string {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw?.trim()) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalizeConflict(row: {
  id: string;
  novelId: string;
  chapterId: string | null;
  sourceSnapshotId: string | null;
  sourceIssueId: string | null;
  sourceType: string;
  conflictType: string;
  conflictKey: string;
  title: string;
  summary: string;
  severity: string;
  status: string;
  evidenceJson: string | null;
  resolutionHint: string | null;
  lastSeenChapterOrder: number | null;
  createdAt: Date;
  updatedAt: Date;
}): OpenConflict {
  return {
    id: row.id,
    novelId: row.novelId,
    chapterId: row.chapterId,
    sourceSnapshotId: row.sourceSnapshotId,
    sourceIssueId: row.sourceIssueId,
    sourceType: row.sourceType,
    conflictType: row.conflictType,
    conflictKey: row.conflictKey,
    title: row.title,
    summary: row.summary,
    severity: row.severity,
    status: row.status,
    evidenceJson: row.evidenceJson,
    resolutionHint: row.resolutionHint,
    lastSeenChapterOrder: row.lastSeenChapterOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function formatMajorPayoffs(rawPlanJson: string | null | undefined): string {
  const parsed = safeParseJson<{ major_payoffs?: unknown }>(rawPlanJson, {});
  const majorPayoffs = Array.isArray(parsed.major_payoffs)
    ? parsed.major_payoffs.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
  return majorPayoffs.length > 0
    ? majorPayoffs.map((item, index) => `${index + 1}. ${item}`).join("\n")
    : "无";
}

export class PayoffLedgerSyncService {
  private async getResolvedChapterOrder(novelId: string, options: PayoffLedgerSyncOptions): Promise<number | null> {
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

  private async loadLedgerRows(novelId: string) {
    return prisma.payoffLedgerItem.findMany({
      where: { novelId },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });
  }

  private async buildSyncPromptInput(novelId: string, options: PayoffLedgerSyncOptions) {
    const chapterOrder = await this.getResolvedChapterOrder(novelId, options);
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

  private async syncLedgerOpenConflicts(novelId: string, items: PayoffLedgerItem[]): Promise<void> {
    const syntheticIssues = buildSyntheticPayoffIssues(items);
    const activeConflictKeys = syntheticIssues.map((issue) => `payoff:${issue.ledgerKey}:${issue.code}`);

    await prisma.$transaction(async (tx) => {
      await tx.openConflict.updateMany({
        where: {
          novelId,
          sourceType: "payoff_ledger",
          status: "open",
          conflictKey: {
            notIn: activeConflictKeys,
          },
        },
        data: {
          status: "resolved",
        },
      });

      for (const issue of syntheticIssues) {
        const ledgerItem = items.find((item) => item.ledgerKey === issue.ledgerKey);
        const conflictKey = `payoff:${issue.ledgerKey}:${issue.code}`;
        const data = {
          chapterId: ledgerItem?.lastTouchedChapterId ?? ledgerItem?.setupChapterId ?? ledgerItem?.payoffChapterId ?? null,
          sourceSnapshotId: ledgerItem?.lastSnapshotId ?? null,
          sourceIssueId: null,
          conflictType: issue.code,
          title: `payoff/${issue.code}`,
          summary: issue.description,
          severity: issue.severity,
          status: "open",
          evidenceJson: JSON.stringify([issue.evidence]),
          resolutionHint: issue.fixSuggestion,
          lastSeenChapterOrder: ledgerItem?.lastTouchedChapterOrder ?? ledgerItem?.targetEndChapterOrder ?? null,
        };
        const updated = await tx.openConflict.updateMany({
          where: {
            novelId,
            sourceType: "payoff_ledger",
            conflictKey,
          },
          data,
        });
        if (updated.count === 0) {
          await tx.openConflict.create({
            data: {
              novelId,
              sourceType: "payoff_ledger",
              conflictKey,
              ...data,
            },
          });
        }
      }
    });
  }

  async getPayoffLedger(novelId: string, options: PayoffLedgerReadOptions = {}): Promise<PayoffLedgerResponse> {
    let rows = await this.loadLedgerRows(novelId);
    if (rows.length === 0 && options.syncIfMissing !== false) {
      try {
        const synced = await this.syncLedger(novelId, options);
        return synced;
      } catch {
        rows = await this.loadLedgerRows(novelId);
      }
    }
    return buildPayoffLedgerResponse(rows.map(mapPayoffLedgerRow), options.chapterOrder);
  }

  async syncLedger(novelId: string, options: PayoffLedgerSyncOptions = {}): Promise<PayoffLedgerResponse> {
    const existingRows = await this.loadLedgerRows(novelId);
    try {
      const { promptInput, chapterOrder, latestSnapshotId } = await this.buildSyncPromptInput(novelId, options);
      const result = await runStructuredPrompt({
        asset: payoffLedgerSyncPrompt,
        promptInput,
        options: {
          provider: options.provider,
          model: options.model,
          temperature: options.temperature ?? 0.2,
        },
      });
      const now = new Date();
      const resolvedItemsByKey = new Map<string, typeof result.output.items[number]>();
      for (const rawItem of result.output.items) {
        const sanitizedItem = sanitizePayoffLedgerSyncItem(rawItem);
        const ledgerKey = resolvePayoffLedgerSyncLedgerKey(sanitizedItem, existingRows);
        resolvedItemsByKey.set(ledgerKey, {
          ...sanitizedItem,
          ledgerKey,
        });
      }
      const resolvedItems = Array.from(resolvedItemsByKey.values());
      const outputByKey = new Map(resolvedItems.map((item) => [item.ledgerKey, item]));
      const chapterLookup = createNovelChapterReferenceLookup(await prisma.chapter.findMany({
        where: { novelId },
        select: {
          id: true,
          order: true,
        },
      }));

      await prisma.$transaction(async (tx) => {
        for (const item of resolvedItems) {
          const previous = existingRows.find((row) => row.ledgerKey === item.ledgerKey);
          const normalizedChapterRefs = normalizePayoffLedgerPromptChapterRefs({
            item,
            previous,
            lookup: chapterLookup,
            currentChapterOrder: chapterOrder,
            sourceChapterId: options.sourceChapterId,
          });
          const riskSignals = clearStaleRiskSignal(dedupeRiskSignals(item.riskSignals.map((signal) => ({
            code: signal.code,
            severity: signal.severity,
            summary: signal.summary,
          }))));
          await tx.payoffLedgerItem.upsert({
            where: {
              novelId_ledgerKey: {
                novelId,
                ledgerKey: item.ledgerKey,
              },
            },
            create: {
              novelId,
              ledgerKey: item.ledgerKey,
              title: item.title,
              summary: item.summary,
              scopeType: item.scopeType,
              currentStatus: item.currentStatus,
              targetStartChapterOrder: item.targetStartChapterOrder ?? null,
              targetEndChapterOrder: item.targetEndChapterOrder ?? null,
              firstSeenChapterOrder: item.firstSeenChapterOrder ?? null,
              lastTouchedChapterOrder: item.lastTouchedChapterOrder ?? null,
              lastTouchedChapterId: normalizedChapterRefs.lastTouchedChapterId,
              setupChapterId: normalizedChapterRefs.setupChapterId,
              payoffChapterId: normalizedChapterRefs.payoffChapterId,
              lastSnapshotId: latestSnapshotId ?? previous?.lastSnapshotId ?? null,
              sourceRefsJson: serializeLedgerJson(normalizedChapterRefs.sourceRefs),
              evidenceJson: serializeLedgerJson(normalizedChapterRefs.evidence),
              riskSignalsJson: serializeLedgerJson(riskSignals),
              statusReason: item.statusReason?.trim() || null,
              confidence: item.confidence ?? null,
              updatedAt: now,
            },
            update: {
              title: item.title,
              summary: item.summary,
              scopeType: item.scopeType,
              currentStatus: item.currentStatus,
              targetStartChapterOrder: item.targetStartChapterOrder ?? null,
              targetEndChapterOrder: item.targetEndChapterOrder ?? null,
              firstSeenChapterOrder: item.firstSeenChapterOrder ?? previous?.firstSeenChapterOrder ?? null,
              lastTouchedChapterOrder: item.lastTouchedChapterOrder ?? previous?.lastTouchedChapterOrder ?? null,
              lastTouchedChapterId: normalizedChapterRefs.lastTouchedChapterId,
              setupChapterId: normalizedChapterRefs.setupChapterId,
              payoffChapterId: normalizedChapterRefs.payoffChapterId,
              lastSnapshotId: latestSnapshotId ?? previous?.lastSnapshotId ?? null,
              sourceRefsJson: serializeLedgerJson(normalizedChapterRefs.sourceRefs),
              evidenceJson: serializeLedgerJson(normalizedChapterRefs.evidence),
              riskSignalsJson: serializeLedgerJson(riskSignals),
              statusReason: item.statusReason?.trim() || null,
              confidence: item.confidence ?? null,
              updatedAt: now,
            },
          });
        }

        for (const row of existingRows) {
          if (outputByKey.has(row.ledgerKey) || row.currentStatus === "paid_off") {
            continue;
          }
          const staleSignals = appendStaleRiskSignal(
            safeParseJson(row.riskSignalsJson, [] as Array<{ code: string; severity: "low" | "medium" | "high" | "critical"; summary: string; stale?: boolean }>),
            "本轮 AI 对账没有再次命中这条伏笔，已保留旧账本并标记为 stale，等待下一次同步确认。",
          );
          await tx.payoffLedgerItem.update({
            where: { id: row.id },
            data: {
              riskSignalsJson: serializeLedgerJson(staleSignals),
              updatedAt: now,
            },
          });
        }
      });

      const rows = await this.loadLedgerRows(novelId);
      const items = rows.map(mapPayoffLedgerRow);
      await this.syncLedgerOpenConflicts(novelId, items);
      return buildPayoffLedgerResponse(items, chapterOrder);
    } catch (error) {
      if (existingRows.length > 0) {
        await prisma.$transaction(async (tx) => {
          for (const row of existingRows) {
            const staleSignals = appendStaleRiskSignal(
              safeParseJson(row.riskSignalsJson, [] as Array<{ code: string; severity: "low" | "medium" | "high" | "critical"; summary: string; stale?: boolean }>),
              "伏笔账本同步失败，已保留上次成功结果。",
            );
            await tx.payoffLedgerItem.update({
              where: { id: row.id },
              data: {
                riskSignalsJson: serializeLedgerJson(staleSignals),
              },
            });
          }
        }).catch(() => null);
        return buildPayoffLedgerResponse(existingRows.map(mapPayoffLedgerRow), options.chapterOrder);
      }
      throw error;
    }
  }

  buildSyntheticAuditReports(novelId: string, chapterId: string, chapterOrder: number, ledger: PayoffLedgerResponse): AuditReport[] {
    const issues = buildSyntheticPayoffIssues(ledger.items, chapterOrder);
    if (issues.length === 0) {
      return [];
    }
    const reportId = `payoff-ledger:${novelId}:${chapterId}`;
    const now = new Date().toISOString();
    return [{
      id: reportId,
      novelId,
      chapterId,
      auditType: "plot",
      overallScore: null,
      summary: "系统根据伏笔账本补充了需要继续跟踪的兑现风险。",
      legacyScoreJson: null,
      issues: issues.map((issue) => ({
        id: `${reportId}:${issue.ledgerKey}:${issue.code}`,
        reportId,
        auditType: "plot",
        severity: issue.severity,
        code: issue.code,
        description: issue.description,
        evidence: issue.evidence,
        fixSuggestion: issue.fixSuggestion,
        status: "open",
        createdAt: now,
        updatedAt: now,
      })),
      createdAt: now,
      updatedAt: now,
    }];
  }

  /**
   * T7: 章节生成后自动检测新埋设伏笔。
   *
   * 流程：
   * 1. 读取章节内容
   * 2. 调用 LLM (payoffDetectionPrompt) 分析内容提取伏笔候选
   * 3. 与现有 ledger 去重（标题相似度匹配）
   * 4. 新伏笔写入 ledger，状态为 setup (normalizedStatus: planted)
   * 5. 返回写入的条目数量
   */
  async detectNewPayoffsAfterGeneration(
    novelId: string,
    chapterId: string,
    chapterOrder: number,
    chapterTitle: string,
    chapterContent: string,
    options: PayoffLedgerSyncOptions = {},
  ): Promise<{ detected: number; inserted: number }> {
    if (!chapterContent?.trim()) {
      return { detected: 0, inserted: 0 };
    }

    try {
      // 1. 读取已有伏笔用于去重
      const existingRows = await this.loadLedgerRows(novelId);
      const existingSummaries = existingRows
        .map((row) => `- ${row.title}（${row.currentStatus}）：${row.summary}`)
        .join("\n") || "无";

      // 2. 调用 LLM 检测
      const result = await runStructuredPrompt({
        asset: payoffDetectionPrompt,
        promptInput: {
          novelTitle: (await prisma.novel.findUnique({ where: { id: novelId }, select: { title: true } }))?.title ?? "",
          chapterOrder,
          chapterTitle,
          chapterContent,
          existingLedgerSummaries: existingSummaries,
        },
        options: {
          provider: options.provider,
          model: options.model,
          temperature: options.temperature ?? 0.2,
        },
      });

      const detected = result.output.detectedPayoffs;
      if (detected.length === 0) {
        return { detected: 0, inserted: 0 };
      }

      // 3. 去重：与已有伏笔标题匹配
      const existingIdentities = new Set(
        existingRows.map((row) => normalizePayoffLedgerIdentity(row.title)),
      );

      const novelTitle = (await prisma.novel.findUnique({ where: { id: novelId }, select: { title: true } }))?.title ?? "";
      const novelIdPrefix = novelId.slice(0, 8);
      const now = new Date();
      let insertedCount = 0;

      // 4. 写入新伏笔
      for (const candidate of detected) {
        const identity = normalizePayoffLedgerIdentity(candidate.title);
        if (existingIdentities.has(identity)) {
          continue; // 跳过重复
        }

        const ledgerKey = `detect:${novelIdPrefix}:${chapterOrder}:${identity.slice(0, 30)}`;

        try {
          await prisma.payoffLedgerItem.create({
            data: {
              novelId,
              ledgerKey,
              title: candidate.title,
              summary: candidate.summary,
              scopeType: candidate.scopeType,
              currentStatus: "setup",
              normalizedStatus: "planted",
              setupChapterId: chapterId,
              firstSeenChapterOrder: chapterOrder,
              lastTouchedChapterOrder: chapterOrder,
              lastTouchedChapterId: chapterId,
              sourceRefsJson: serializeLedgerJson([{
                kind: "chapter_payoff_ref",
                refLabel: `第${chapterOrder}章《${chapterTitle}》自动生成检测`,
                chapterId,
                chapterOrder,
              }]),
              evidenceJson: serializeLedgerJson([{
                summary: candidate.evidenceSummary,
                chapterId,
                chapterOrder,
              }]),
              riskSignalsJson: serializeLedgerJson([]),
              statusReason: `由 AI 章节生成后检测自动创建（confidence: ${candidate.confidence}）`,
              confidence: candidate.confidence,
              updatedAt: now,
            },
          });
          insertedCount++;
        } catch {
          // ledgerKey 唯一约束冲突，跳过
          continue;
        }
      }

      return { detected: detected.length, inserted: insertedCount };
    } catch {
      // 伏笔检测失败不影响章节生成流程
      return { detected: 0, inserted: 0 };
    }
  }

  /**
   * T8: 章节生成前检查未回收伏笔，生成回收提醒上下文。
   *
   * 流程：
   * 1. 查询所有 planted/active 状态伏笔
   * 2. 计算 chaptersElapsed（当前章节序号 - 埋设章节序号）
   * 3. 按 chaptersElapsed 降序排序，取前 5 条
   * 4. 返回格式化的提醒文本
   */
  async buildPayoffReminderContext(
    novelId: string,
    currentChapterOrder: number,
  ): Promise<string> {
    const rows = await this.loadLedgerRows(novelId);
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
}

export const payoffLedgerSyncService = new PayoffLedgerSyncService();
