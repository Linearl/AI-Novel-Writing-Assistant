import { prisma } from "../../db/prisma";
import { runStructuredPrompt } from "../../prompting/core/promptRunner";
import { payoffDetectionPrompt } from "../../prompting/prompts/payoff/payoffDetection.prompts";
import {
  normalizePayoffLedgerIdentity,
  serializeLedgerJson,
} from "./payoffLedgerShared";
import type { PayoffLedgerSyncOptions } from "./payoffLedgerSyncTypes";

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
export async function detectNewPayoffsAfterGeneration(
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
    const existingRows = await prisma.payoffLedgerItem.findMany({
      where: { novelId },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });
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
