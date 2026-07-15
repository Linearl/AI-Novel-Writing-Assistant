import type { Router } from "express";
import type {
  CharacterResourceLedgerResponse,
  CharacterResourceProposalSummary,
} from "@ai-novel/shared";
import {
  characterResourceManualCreateSchema,
  characterResourceManualUpdateSchema,
  characterResourceUpdatePayloadSchema,
} from "@ai-novel/shared";
import type { ApiResponse } from "@ai-novel/shared";
import { z } from "zod";
import { llmProviderSchema } from "../../../../llm/providerSchema";
import { prisma } from "../../../../db/prisma";
import { AppError } from "../../../../middleware/errorHandler";
import { validate } from "../../../../middleware/validate";
import { characterResourceExtractionService } from "../../../../services/novel/characterResource/CharacterResourceExtractionService";
import { characterResourceLedgerService } from "../../../../services/novel/characterResource/CharacterResourceLedgerService";
import { stateCommitService } from "../../../../services/novel/state/StateCommitService";

const characterResourceCharacterParamsSchema = z.object({
  id: z.string().trim().min(1),
  characterId: z.string().trim().min(1),
});

const characterResourceChapterParamsSchema = z.object({
  id: z.string().trim().min(1),
  chapterId: z.string().trim().min(1),
});

const characterResourceProposalParamsSchema = z.object({
  id: z.string().trim().min(1),
  proposalId: z.string().trim().min(1),
});

const rejectProposalBodySchema = z.object({
  reason: z.string().trim().max(500).optional(),
  intent: z.string().trim().max(1000).optional(),
}).optional();

const characterResourceDetailParamsSchema = z.object({
  id: z.string().trim().min(1),
  resourceId: z.string().trim().min(1),
});

const resourceLlmOptionsSchema = z.object({
  provider: llmProviderSchema.optional(),
  model: z.string().trim().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

const resourceExtractionSchema = resourceLlmOptionsSchema.default({});

const resourceBackfillSchema = resourceLlmOptionsSchema.extend({
  limit: z.number().int().min(1).max(10).optional(),
}).default({});

interface RegisterNovelCharacterResourceRoutesInput {
  router: Router;
  idParamsSchema: z.ZodType<{ id: string }>;
}

function parseStringArray(value: string | null | undefined): string[] {
  if (!value?.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.map((item) => String(item ?? "").replace(/\s+/g, " ").trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function parsePayload(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function mapProposal(row: {
  id: string;
  novelId: string;
  chapterId: string | null;
  sourceType: string;
  sourceStage: string | null;
  proposalType: string;
  riskLevel: string;
  status: string;
  summary: string;
  payloadJson: string;
  evidenceJson: string | null;
  validationNotesJson: string | null;
  createdAt: Date;
  updatedAt: Date;
}): CharacterResourceProposalSummary {
  const validationNotes = parseStringArray(row.validationNotesJson);
  const rejectedIntent = validationNotes.find((n) => n.startsWith("rejectedIntent:"))?.slice("rejectedIntent:".length);
  const rejectedReason = validationNotes.find((n) => n.startsWith("rejectedReason:"))?.slice("rejectedReason:".length);
  return {
    id: row.id,
    novelId: row.novelId,
    chapterId: row.chapterId,
    sourceType: row.sourceType,
    sourceStage: row.sourceStage,
    proposalType: "character_resource_update",
    riskLevel: row.riskLevel === "high" ? "high" : row.riskLevel === "medium" ? "medium" : "low",
    status: row.status === "committed" || row.status === "rejected" || row.status === "validated"
      ? row.status
      : "pending_review",
    summary: row.summary,
    payload: parsePayload(row.payloadJson),
    evidence: parseStringArray(row.evidenceJson),
    validationNotes,
    rejectedIntent: rejectedIntent || undefined,
    rejectedReason: rejectedReason || undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function listPendingResourceProposals(novelId: string): Promise<CharacterResourceProposalSummary[]> {
  const rows = await prisma.stateChangeProposal.findMany({
    where: {
      novelId,
      proposalType: "character_resource_update",
      status: "pending_review",
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: 50,
  });
  return rows.map(mapProposal);
}

export function registerNovelCharacterResourceRoutes(
  input: RegisterNovelCharacterResourceRoutesInput,
): void {
  const { router, idParamsSchema } = input;

  router.get(
    "/:id/character-resources",
    validate({ params: idParamsSchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const [items, pendingProposals] = await Promise.all([
          characterResourceLedgerService.listResources(id),
          listPendingResourceProposals(id),
        ]);
        const data: CharacterResourceLedgerResponse = { items, pendingProposals };
        res.status(200).json({
          success: true,
          data,
          message: "角色关键资源已加载。",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/:id/characters/:characterId/resources",
    validate({ params: characterResourceCharacterParamsSchema }),
    async (req, res, next) => {
      try {
        const { id, characterId } = req.params as z.infer<typeof characterResourceCharacterParamsSchema>;
        const data = await characterResourceLedgerService.listCharacterResources(id, characterId);
        res.status(200).json({
          success: true,
          data,
          message: "角色资源已加载。",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/:id/chapters/:chapterId/resource-context",
    validate({ params: characterResourceChapterParamsSchema }),
    async (req, res, next) => {
      try {
        const { id, chapterId } = req.params as z.infer<typeof characterResourceChapterParamsSchema>;
        const data = await characterResourceLedgerService.getChapterResourceContext(id, chapterId);
        res.status(200).json({
          success: true,
          data,
          message: "本章关键资源已加载。",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/chapters/:chapterId/resources/extract",
    validate({ params: characterResourceChapterParamsSchema, body: resourceExtractionSchema }),
    async (req, res, next) => {
      try {
        const { id, chapterId } = req.params as z.infer<typeof characterResourceChapterParamsSchema>;
        const body = resourceExtractionSchema.parse(req.body);
        const proposals = await characterResourceExtractionService.extractChapterResourceProposals({
          novelId: id,
          chapterId,
          provider: body.provider,
          model: body.model,
          temperature: body.temperature,
          sourceType: "manual_resource_extract",
          sourceStage: "chapter_resource_review",
        });
        const data = await stateCommitService.proposeAndCommit({
          novelId: id,
          chapterId,
          sourceType: "manual_resource_extract",
          sourceStage: "chapter_resource_review",
          proposals,
          skipFactExtraction: true,
        });
        res.status(200).json({
          success: true,
          data,
          message: "资源变化已提取，低风险变化会用于后续写作。",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/character-resources/backfill",
    validate({ params: idParamsSchema, body: resourceBackfillSchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const body = resourceBackfillSchema.parse(req.body);
        const limit = body.limit ?? 3;
        const candidateChapters = await prisma.chapter.findMany({
          where: {
            novelId: id,
            content: { not: null },
          },
          orderBy: { order: "desc" },
          take: limit * 3,
          select: { id: true, order: true, content: true },
        });
        const chapters = candidateChapters
          .filter((chapter) => String(chapter.content ?? "").replace(/\s+/g, " ").trim().length > 0)
          .slice(0, limit)
          .sort((left, right) => left.order - right.order);

        let committedCount = 0;
        let pendingReviewCount = 0;
        let rejectedCount = 0;
        let proposalCount = 0;
        for (const chapter of chapters) {
          const proposals = await characterResourceExtractionService.extractChapterResourceProposals({
            novelId: id,
            chapterId: chapter.id,
            chapterOrder: chapter.order,
            provider: body.provider,
            model: body.model,
            temperature: body.temperature,
            sourceType: "manual_resource_backfill",
            sourceStage: "character_resource_backfill",
          });
          proposalCount += proposals.length;
          const result = await stateCommitService.proposeAndCommit({
            novelId: id,
            chapterId: chapter.id,
            chapterOrder: chapter.order,
            sourceType: "manual_resource_backfill",
            sourceStage: "character_resource_backfill",
            proposals,
            skipFactExtraction: true,
          });
          committedCount += result.committed.length;
          pendingReviewCount += result.pendingReview.length;
          rejectedCount += result.rejected.length;
        }

        const data = {
          scannedChapterCount: chapters.length,
          proposalCount,
          committedCount,
          pendingReviewCount,
          rejectedCount,
          items: await characterResourceLedgerService.listResources(id),
          pendingProposals: await listPendingResourceProposals(id),
        };
        res.status(200).json({
          success: true,
          data,
          message: "最近章节资源已回填。",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/character-resource-proposals/:proposalId/confirm",
    validate({ params: characterResourceProposalParamsSchema }),
    async (req, res, next) => {
      try {
        const { id, proposalId } = req.params as z.infer<typeof characterResourceProposalParamsSchema>;
        const row = await prisma.stateChangeProposal.findFirst({
          where: {
            id: proposalId,
            novelId: id,
            proposalType: "character_resource_update",
            status: "pending_review",
          },
        });
        if (!row) {
          throw new AppError("没有找到可确认的角色资源变更。", 404);
        }

        const payload = characterResourceUpdatePayloadSchema.parse(parsePayload(row.payloadJson));
        const evidence = parseStringArray(row.evidenceJson);
        const validationNotes = parseStringArray(row.validationNotesJson);
        await prisma.$transaction(async (tx) => {
          const chapter = row.chapterId
            ? await tx.chapter.findFirst({
                where: { id: row.chapterId, novelId: id },
                select: { order: true },
              })
            : null;
          await characterResourceLedgerService.applyCommittedUpdate(tx, {
            novelId: id,
            chapterId: row.chapterId,
            chapterOrder: typeof payload.chapterOrder === "number" ? payload.chapterOrder : chapter?.order ?? null,
            payload,
            evidence,
            validationNotes,
          });
          await tx.stateChangeProposal.update({
            where: { id: proposalId },
            data: { status: "committed" },
          });
        });

        const data: CharacterResourceLedgerResponse = {
          items: await characterResourceLedgerService.listResources(id),
          pendingProposals: await listPendingResourceProposals(id),
        };
        res.status(200).json({
          success: true,
          data,
          message: "资源变更已确认，后续写作会参考它。",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/character-resource-proposals/:proposalId/reject",
    validate({ params: characterResourceProposalParamsSchema, body: rejectProposalBodySchema }),
    async (req, res, next) => {
      try {
        const { id, proposalId } = req.params as z.infer<typeof characterResourceProposalParamsSchema>;
        const body = (req.body ?? {}) as z.infer<typeof rejectProposalBodySchema>;

        // Build update data; append intent/reason to validationNotesJson if provided
        const updateData: { status: string; validationNotesJson?: string } = { status: "rejected" };
        if (body?.intent || body?.reason) {
          const existing = await prisma.stateChangeProposal.findUnique({
            where: { id: proposalId },
            select: { validationNotesJson: true },
          });
          const notes: string[] = parseStringArray(existing?.validationNotesJson ?? null);
          if (body.intent) {
            notes.unshift(`rejectedIntent:${body.intent}`);
          }
          if (body.reason) {
            notes.unshift(`rejectedReason:${body.reason}`);
          }
          updateData.validationNotesJson = JSON.stringify(notes);
        }

        const updated = await prisma.stateChangeProposal.updateMany({
          where: {
            id: proposalId,
            novelId: id,
            proposalType: "character_resource_update",
            status: "pending_review",
          },
          data: updateData,
        });
        if (updated.count === 0) {
          throw new AppError("没有找到可忽略的角色资源变更。", 404);
        }
        const data: CharacterResourceLedgerResponse = {
          items: await characterResourceLedgerService.listResources(id),
          pendingProposals: await listPendingResourceProposals(id),
        };
        const hasIntent = Boolean(body?.intent);
        res.status(200).json({
          success: true,
          data,
          message: hasIntent
            ? "资源变更已拒绝，修正意图已记录，后续修复会参考。"
            : "资源变更已忽略，不会影响后续写作。",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  // Manual CRUD for character resources
  router.post(
    "/:id/character-resources/manual",
    validate({ params: idParamsSchema, body: characterResourceManualCreateSchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const body = characterResourceManualCreateSchema.parse(req.body);
        const resourceKey = body.resourceKey
          || body.name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "").slice(0, 80)
            + ":" + (body.holderCharacterId ?? body.ownerName ?? "manual").slice(0, 32);
        await prisma.characterResourceLedgerItem.create({
          data: {
            novelId: id,
            resourceKey,
            name: body.name,
            summary: body.summary,
            resourceType: body.resourceType,
            narrativeFunction: body.narrativeFunction,
            ownerType: body.ownerType,
            ownerId: body.ownerId ?? null,
            ownerName: body.ownerName ?? null,
            ownerCharacterId: body.ownerType === "character" ? (body.ownerId ?? body.holderCharacterId ?? null) : null,
            holderCharacterId: body.holderCharacterId ?? null,
            holderCharacterName: body.holderCharacterName ?? null,
            status: body.status,
            readerKnows: body.readerKnows,
            holderKnows: body.holderKnows,
            introducedChapterOrder: body.introducedChapterOrder ?? null,
            lastTouchedChapterOrder: body.lastTouchedChapterOrder ?? null,
            expectedUseStartChapterOrder: body.expectedUseStartChapterOrder ?? null,
            expectedUseEndChapterOrder: body.expectedUseEndChapterOrder ?? null,
            constraintsJson: JSON.stringify(body.constraints),
            confidence: body.confidence ?? null,
            sourceRefsJson: JSON.stringify([{ kind: "manual", refLabel: "手动创建" }]),
            evidenceJson: "[]",
            riskSignalsJson: "[]",
          },
        });
        const data: CharacterResourceLedgerResponse = {
          items: await characterResourceLedgerService.listResources(id),
          pendingProposals: await listPendingResourceProposals(id),
        };
        res.status(201).json({ success: true, data, message: "资源已手动创建。" } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    "/:id/character-resources/:resourceId",
    validate({ params: characterResourceDetailParamsSchema, body: characterResourceManualUpdateSchema }),
    async (req, res, next) => {
      try {
        const { id, resourceId } = req.params as z.infer<typeof characterResourceDetailParamsSchema>;
        const body = characterResourceManualUpdateSchema.parse(req.body);
        const existing = await prisma.characterResourceLedgerItem.findFirst({
          where: { id: resourceId, novelId: id },
        });
        if (!existing) {
          throw new AppError("资源不存在。", 404);
        }
        await prisma.characterResourceLedgerItem.update({
          where: { id: resourceId },
          data: {
            name: body.name,
            summary: body.summary,
            resourceType: body.resourceType,
            narrativeFunction: body.narrativeFunction,
            status: body.status,
            ownerType: body.ownerType,
            readerKnows: body.readerKnows,
            holderKnows: body.holderKnows,
            confidence: body.confidence,
            constraintsJson: body.constraints ? JSON.stringify(body.constraints) : undefined,
            ...(body.holderCharacterId !== undefined ? { holderCharacterId: body.holderCharacterId } : {}),
            ...(body.holderCharacterName !== undefined ? { holderCharacterName: body.holderCharacterName } : {}),
            ...(body.ownerId !== undefined ? { ownerId: body.ownerId } : {}),
            ...(body.ownerName !== undefined ? { ownerName: body.ownerName } : {}),
            ...(body.introducedChapterOrder !== undefined ? { introducedChapterOrder: body.introducedChapterOrder } : {}),
            ...(body.lastTouchedChapterOrder !== undefined ? { lastTouchedChapterOrder: body.lastTouchedChapterOrder } : {}),
            ...(body.expectedUseStartChapterOrder !== undefined ? { expectedUseStartChapterOrder: body.expectedUseStartChapterOrder } : {}),
            ...(body.expectedUseEndChapterOrder !== undefined ? { expectedUseEndChapterOrder: body.expectedUseEndChapterOrder } : {}),
            updatedAt: new Date(),
          },
        });
        const data: CharacterResourceLedgerResponse = {
          items: await characterResourceLedgerService.listResources(id),
          pendingProposals: await listPendingResourceProposals(id),
        };
        res.status(200).json({ success: true, data, message: "资源已更新。" } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    "/:id/character-resources/:resourceId",
    validate({ params: characterResourceDetailParamsSchema }),
    async (req, res, next) => {
      try {
        const { id, resourceId } = req.params as z.infer<typeof characterResourceDetailParamsSchema>;
        const existing = await prisma.characterResourceLedgerItem.findFirst({
          where: { id: resourceId, novelId: id },
        });
        if (!existing) {
          throw new AppError("资源不存在。", 404);
        }
        await prisma.characterResourceLedgerItem.delete({ where: { id: resourceId } });
        const data: CharacterResourceLedgerResponse = {
          items: await characterResourceLedgerService.listResources(id),
          pendingProposals: await listPendingResourceProposals(id),
        };
        res.status(200).json({ success: true, data, message: "资源已删除。" } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );
}
