import { createHash } from "node:crypto";
import { prisma } from "../../../db/prisma";
import { runStructuredPrompt } from "../../../prompting/core/promptRunner";
import {
  chapterArtifactDeltaPrompt,
  type ChapterArtifactDeltaOutput,
} from "../../../prompting/prompts/novel/chapterArtifactDelta.prompts";
import { ragServices } from "../../rag";
import type { RagOwnerType } from "../../rag/types";
import { stateService } from "../../state/StateService";
import { characterResourceLedgerService } from "../characterResource/CharacterResourceLedgerService";
import { compactText } from "../characterResource/characterResourceShared";
import { novelFactService, type NovelFactWriteItem } from "../fact/NovelFactService";
import { extractFacts } from "../novelP0Utils";
import { stateCommitService } from "../state/StateCommitService";
import {
  buildContentHash,
  stringifyPreviousState,
  stringifyChapterResourceText,
  stringifyPayoffText,
  toCharacterResourceProposals,
  persistStateSnapshot,
  applyCharacterDynamics,
  applyKnowledgeStates,
  type CharacterLookupItem,
  type ChapterReference,
  type ChapterArtifactDeltaSyncInput,
  type ChapterArtifactDeltaSyncResult,
} from "./chapterArtifactDeltaHelpers";

// Re-export public API from helpers for backward compatibility
export { buildContentHash } from "./chapterArtifactDeltaHelpers";
export { mergeKnowledgeBoundaryState } from "./chapterArtifactDeltaHelpers";

const ARTIFACT_DELTA_SOURCE_TYPE = "chapter_artifact_delta";
const ARTIFACT_DELTA_SOURCE_STAGE = "chapter_execution";

function joinFactContents(items: string[], maxItems = 3): string | null {
  const uniqueSeen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const normalized = compactText(item);
    if (!normalized || uniqueSeen.has(normalized)) continue;
    uniqueSeen.add(normalized);
    result.push(normalized);
    if (result.length >= maxItems) break;
  }
  const joined = result.join("；");
  return joined || null;
}

function normalizeLedgerKey(title: string, fallback: string): string {
  const base = compactText(title)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96);
  return base || fallback;
}

export class ChapterArtifactDeltaService {
  async syncChapterArtifacts(input: ChapterArtifactDeltaSyncInput): Promise<ChapterArtifactDeltaSyncResult> {
    const content = compactText(input.content);
    if (!content) {
      throw new Error("章节正文为空，无法提取资产 delta。");
    }

    const [novel, chapter, chapters, characters, existingResources, payoffRows] = await Promise.all([
      prisma.novel.findUnique({
        where: { id: input.novelId },
        select: { title: true },
      }),
      prisma.chapter.findFirst({
        where: { id: input.chapterId, novelId: input.novelId },
        select: { id: true, order: true, title: true, expectation: true, taskSheet: true },
      }),
      prisma.chapter.findMany({
        where: { novelId: input.novelId },
        select: { id: true, order: true, title: true },
        orderBy: { order: "asc" },
      }),
      prisma.character.findMany({
        where: { novelId: input.novelId },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          role: true,
          castRole: true,
          currentGoal: true,
          currentState: true,
        },
      }),
      characterResourceLedgerService.listResources(input.novelId).catch(() => []),
      prisma.payoffLedgerItem.findMany({
        where: { novelId: input.novelId },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        select: {
          ledgerKey: true,
          title: true,
          currentStatus: true,
          summary: true,
          targetStartChapterOrder: true,
          targetEndChapterOrder: true,
          lastTouchedChapterOrder: true,
        },
        take: 30,
      }),
    ]);

    if (!novel || !chapter) {
      throw new Error("小说或章节不存在，无法提取资产 delta。");
    }

    const previousSnapshot = await stateService.getLatestSnapshotBeforeChapter(input.novelId, chapter.order);
    const contentHash = buildContentHash(content);
    const result = await runStructuredPrompt({
      asset: chapterArtifactDeltaPrompt,
      promptInput: {
        novelTitle: novel.title,
        chapterOrder: chapter.order,
        chapterTitle: chapter.title,
        chapterGoal: chapter.taskSheet?.trim() || chapter.expectation?.trim() || "无明确章节目标",
        characterRosterText: this.buildCharacterRosterText(characters),
        previousStateText: stringifyPreviousState(previousSnapshot),
        existingResourceText: stringifyChapterResourceText(existingResources),
        existingPayoffText: stringifyPayoffText(payoffRows),
        chapterContent: content,
      },
      options: {
        provider: input.provider,
        model: input.model,
        temperature: Math.min(input.temperature ?? 0.2, 0.4),
        novelId: input.novelId,
        chapterId: input.chapterId,
        stage: "chapter_artifact_delta",
      },
    });

    const output = result.output;
    const sourceType = input.sourceType?.trim() || ARTIFACT_DELTA_SOURCE_TYPE;
    const sourceStage = input.sourceStage ?? ARTIFACT_DELTA_SOURCE_STAGE;
    const concreteFactCount = await this.persistChapterSummaryAndFacts({
      novelId: input.novelId,
      chapterId: input.chapterId,
      chapterOrder: chapter.order,
      content,
      output,
    });
    const stateSnapshotId = output.syncPlan.stateSnapshot === "skip"
      ? null
      : await persistStateSnapshot({
        novelId: input.novelId,
        chapterId: input.chapterId,
        output,
      });

    const resourceProposals = output.syncPlan.characterResources === "skip"
      ? []
      : toCharacterResourceProposals({
        novelId: input.novelId,
        chapterId: input.chapterId,
        chapterOrder: chapter.order,
        sourceType,
        sourceStage,
        contentHash,
        characters,
        updates: output.characterResourceDeltas,
      });

    const stateCommitResult = await stateCommitService.proposeAndCommit({
      novelId: input.novelId,
      chapterId: input.chapterId,
      chapterOrder: chapter.order,
      sourceType,
      sourceStage,
      proposals: resourceProposals,
    });

    const [payoffDeltaCount, characterDynamicsCount, characterKnowledgeStateCount] = await Promise.all([
      output.syncPlan.payoffLedger === "skip"
        ? Promise.resolve(0)
        : this.applyPayoffDeltas({
          novelId: input.novelId,
          chapterId: input.chapterId,
          chapterOrder: chapter.order,
          chapterTitle: chapter.title,
          chapters,
          output,
          stateSnapshotId,
        }),
      output.syncPlan.characterDynamics === "skip"
        ? Promise.resolve(0)
        : applyCharacterDynamics({
          novelId: input.novelId,
          chapterId: input.chapterId,
          chapterOrder: chapter.order,
          characters,
          output,
        }),
      output.characterKnowledgeStates.length === 0
        ? Promise.resolve(0)
        : applyKnowledgeStates({
          characters,
          output,
        }),
    ]);

    return {
      contentHash,
      output,
      stateSnapshotId,
      characterResourceProposalCount: resourceProposals.length,
      characterDynamicsCount,
      characterKnowledgeStateCount,
      payoffDeltaCount,
      canonicalCommittedCount: stateCommitResult.committed.length,
      concreteFactCount,
      requiresFullReconcile: output.requiresFullReconcile || output.syncPlan.payoffLedger === "full_reconcile",
    };
  }

  private buildCharacterRosterText(characters: CharacterLookupItem[]): string {
    return characters.map((character) => [
      `- ${character.id}`,
      character.name,
      character.role,
      character.castRole ? `cast=${character.castRole}` : "",
      character.currentGoal ? `goal=${character.currentGoal}` : "",
      character.currentState ? `state=${character.currentState}` : "",
    ].filter(Boolean).join(" | ")).join("\n");
  }

  private async persistChapterSummaryAndFacts(input: {
    novelId: string;
    chapterId: string;
    chapterOrder: number;
    content: string;
    output: ChapterArtifactDeltaOutput;
  }): Promise<number> {
    const summary = compactText(input.output.summary) || "暂无可总结正文";
    const extractedFacts = extractFacts(input.content || summary);
    const keyEvents = joinFactContents(
      extractedFacts.filter((item) => item.category === "plot").map((item) => item.content),
      3,
    );
    const characterStates = joinFactContents(
      extractedFacts.filter((item) => item.category === "character").map((item) => item.content),
      3,
    );
    await prisma.$transaction(async (tx) => {
      await tx.chapter.update({
        where: { id: input.chapterId },
        data: { expectation: summary },
      });
      await tx.chapterSummary.upsert({
        where: { chapterId: input.chapterId },
        update: {
          summary,
          keyEvents,
          characterStates,
        },
        create: {
          novelId: input.novelId,
          chapterId: input.chapterId,
          summary,
          keyEvents,
          characterStates,
        },
      });
    });

    const concreteFacts: NovelFactWriteItem[] = input.output.concreteFacts
      .map((fact) => ({
        text: compactText(fact.text),
        category: fact.category,
        source: "auto" as const,
      }))
      .filter((fact) => fact.text.length > 0);
    if (concreteFacts.length > 0) {
      await novelFactService.writeFacts(input.novelId, input.chapterOrder, concreteFacts);
    }

    this.queueRagUpsert("chapter", input.chapterId);
    this.queueRagUpsert("chapter_summary", input.chapterId);

    return concreteFacts.length;
  }

  private async applyPayoffDeltas(input: {
    novelId: string;
    chapterId: string;
    chapterOrder: number;
    chapterTitle: string;
    chapters: ChapterReference[];
    output: ChapterArtifactDeltaOutput;
    stateSnapshotId: string | null;
  }): Promise<number> {
    if (input.output.payoffDeltas.length === 0) {
      return 0;
    }
    const { resolveSnapshotChapterReference } = await import("../../state/StateService");
    const { clearStaleRiskSignal, dedupeRiskSignals, serializeLedgerJson } = await import("../../payoff/payoffLedgerShared");

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      for (const item of input.output.payoffDeltas) {
        const ledgerKey = normalizeLedgerKey(item.ledgerKey, normalizeLedgerKey(item.title, `chapter_${input.chapterOrder}_payoff`));
        const previous = await tx.payoffLedgerItem.findUnique({
          where: {
            novelId_ledgerKey: {
              novelId: input.novelId,
              ledgerKey,
            },
          },
        });
        const setupChapterId = resolveSnapshotChapterReference({
          value: item.setupChapterId ?? item.setupChapterOrder ?? item.firstSeenChapterOrder,
          chapters: input.chapters,
          currentChapterId: input.chapterId,
          fallbackToCurrentChapter: item.currentStatus === "setup" || item.currentStatus === "hinted",
        }) ?? previous?.setupChapterId ?? null;
        const payoffChapterId = resolveSnapshotChapterReference({
          value: item.payoffChapterId ?? item.payoffChapterOrder,
          chapters: input.chapters,
          currentChapterId: input.chapterId,
          fallbackToCurrentChapter: item.currentStatus === "paid_off",
        }) ?? previous?.payoffChapterId ?? null;
        const lastTouchedChapterId = resolveSnapshotChapterReference({
          value: item.lastTouchedChapterOrder,
          chapters: input.chapters,
          currentChapterId: input.chapterId,
          fallbackToCurrentChapter: true,
        }) ?? input.chapterId;
        const sourceRefs = item.sourceRefs.length > 0
          ? item.sourceRefs.map((ref) => ({
            ...ref,
            chapterId: ref.chapterId ?? lastTouchedChapterId,
            chapterOrder: ref.chapterOrder ?? input.chapterOrder,
          }))
          : [{
            kind: "chapter_payoff_ref" as const,
            refId: null,
            refLabel: `第${input.chapterOrder}章《${input.chapterTitle}》`,
            chapterId: input.chapterId,
            chapterOrder: input.chapterOrder,
            volumeId: null,
            volumeSortOrder: null,
          }];
        const evidence = item.evidence.length > 0
          ? item.evidence.map((evidenceItem) => ({
            ...evidenceItem,
            chapterId: evidenceItem.chapterId ?? input.chapterId,
            chapterOrder: evidenceItem.chapterOrder ?? input.chapterOrder,
          }))
          : [{
            summary: item.summary,
            chapterId: input.chapterId,
            chapterOrder: input.chapterOrder,
          }];
        const riskSignals = clearStaleRiskSignal(dedupeRiskSignals(item.riskSignals.map((signal) => ({
          code: signal.code,
          severity: signal.severity,
          summary: signal.summary,
        }))));
        await tx.payoffLedgerItem.upsert({
          where: {
            novelId_ledgerKey: {
              novelId: input.novelId,
              ledgerKey,
            },
          },
          create: {
            novelId: input.novelId,
            ledgerKey,
            title: item.title,
            summary: item.summary,
            scopeType: item.scopeType,
            currentStatus: item.currentStatus,
            targetStartChapterOrder: item.targetStartChapterOrder ?? null,
            targetEndChapterOrder: item.targetEndChapterOrder ?? null,
            firstSeenChapterOrder: item.firstSeenChapterOrder ?? input.chapterOrder,
            lastTouchedChapterOrder: item.lastTouchedChapterOrder ?? input.chapterOrder,
            lastTouchedChapterId,
            setupChapterId,
            payoffChapterId,
            lastSnapshotId: input.stateSnapshotId,
            sourceRefsJson: serializeLedgerJson(sourceRefs),
            evidenceJson: serializeLedgerJson(evidence),
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
            firstSeenChapterOrder: item.firstSeenChapterOrder ?? previous?.firstSeenChapterOrder ?? input.chapterOrder,
            lastTouchedChapterOrder: item.lastTouchedChapterOrder ?? input.chapterOrder,
            lastTouchedChapterId,
            setupChapterId,
            payoffChapterId,
            lastSnapshotId: input.stateSnapshotId ?? previous?.lastSnapshotId ?? null,
            sourceRefsJson: serializeLedgerJson(sourceRefs),
            evidenceJson: serializeLedgerJson(evidence),
            riskSignalsJson: serializeLedgerJson(riskSignals),
            statusReason: item.statusReason?.trim() || null,
            confidence: item.confidence ?? null,
            updatedAt: now,
          },
        });
      }
    });
    return input.output.payoffDeltas.length;
  }

  private queueRagUpsert(ownerType: RagOwnerType, ownerId: string): void {
    void ragServices.ragIndexService.enqueueUpsert(ownerType, ownerId).catch(() => {
      // Keep artifact extraction resilient when RAG queueing fails.
    });
  }
}

export const chapterArtifactDeltaService = new ChapterArtifactDeltaService();
