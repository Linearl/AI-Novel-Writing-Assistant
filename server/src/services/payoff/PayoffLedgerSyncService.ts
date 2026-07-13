import type { AuditReport, PayoffLedgerItem, PayoffLedgerResponse } from "@ai-novel/shared";
import { prisma } from "../../db/prisma";
import { runStructuredPrompt } from "../../prompting/core/promptRunner";
import { payoffLedgerSyncPrompt } from "../../prompting/prompts/payoff/payoffLedgerSync.prompts";
import {
  appendStaleRiskSignal,
  buildPayoffLedgerResponse,
  buildSyntheticPayoffIssues,
  clearStaleRiskSignal,
  dedupeRiskSignals,
  mapPayoffLedgerRow,
  resolvePayoffLedgerSyncLedgerKey,
  sanitizePayoffLedgerSyncItem,
  serializeLedgerJson,
} from "./payoffLedgerShared";
import {
  createNovelChapterReferenceLookup,
  normalizePayoffLedgerPromptChapterRefs,
} from "./payoffLedgerChapterRefs";
import { buildSyncPromptInput } from "./payoffLedgerSyncPromptBuilder";
import { safeParseJson } from "./payoffLedgerSyncHelpers";
import type { PayoffLedgerReadOptions, PayoffLedgerSyncOptions } from "./payoffLedgerSyncTypes";

export class PayoffLedgerSyncService {
  private async loadLedgerRows(novelId: string) {
    return prisma.payoffLedgerItem.findMany({
      where: { novelId },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });
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
      const { promptInput, chapterOrder, latestSnapshotId } = await buildSyncPromptInput(novelId, options);
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
}

export const payoffLedgerSyncService = new PayoffLedgerSyncService();

// Re-export extracted functions for backward-compatible imports
export { detectNewPayoffsAfterGeneration } from "./payoffLedgerDetection";
export { buildPayoffReminderContext } from "./payoffLedgerReminder";
export type { PayoffLedgerSyncOptions, PayoffLedgerReadOptions } from "./payoffLedgerSyncTypes";
