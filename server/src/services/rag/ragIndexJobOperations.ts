/**
 * Job-level operations extracted from RagIndexService.
 *
 * Handles owner collection for reindexing and knowledge-document status sync.
 * Accepts explicit dependencies so they can live outside the class.
 */
import type { PrismaClient } from "@prisma/client";
import type { RagJobStatus, RagJobType, RagOwnerType } from "./types";
import type { PendingOwner } from "./ragIndexServiceHelpers";

export type ReindexScope = "novel" | "world" | "all";

// ---------------------------------------------------------------------------
// collectOwners
// ---------------------------------------------------------------------------

export async function collectOwners(
  prisma: PrismaClient,
  scope: ReindexScope,
  id?: string,
): Promise<PendingOwner[]> {
  const owners = new Map<string, PendingOwner>();
  const push = (ownerType: RagOwnerType, ownerId: string) => {
    const key = `${ownerType}:${ownerId}`;
    owners.set(key, { ownerType, ownerId });
  };

  if (scope === "novel" || scope === "all") {
    const novelIds = scope === "novel"
      ? (id ? [id] : [])
      : (await prisma.novel.findMany({ select: { id: true } })).map((item) => item.id);
    if (scope === "novel" && !id) {
      const all = await prisma.novel.findMany({ select: { id: true } });
      all.forEach((item) => novelIds.push(item.id));
    }
    for (const novelId of novelIds) {
      push("novel", novelId);
      push("bible", novelId);
    }
    const [chapters, summaries, facts, characters, timelines] = await Promise.all([
      prisma.chapter.findMany({
        where: { novelId: { in: novelIds } },
        select: { id: true },
      }),
      prisma.chapterSummary.findMany({
        where: { novelId: { in: novelIds } },
        select: { chapterId: true },
      }),
      prisma.consistencyFact.findMany({
        where: { novelId: { in: novelIds } },
        select: { id: true },
      }),
      prisma.character.findMany({
        where: { novelId: { in: novelIds } },
        select: { id: true },
      }),
      prisma.characterTimeline.findMany({
        where: { novelId: { in: novelIds } },
        select: { id: true },
      }),
    ]);
    chapters.forEach((item) => push("chapter", item.id));
    summaries.forEach((item) => push("chapter_summary", item.chapterId));
    facts.forEach((item) => push("consistency_fact", item.id));
    characters.forEach((item) => push("character", item.id));
    timelines.forEach((item) => push("character_timeline", item.id));
  }

  if (scope === "world" || scope === "all") {
    const worldIds = scope === "world"
      ? (id ? [id] : [])
      : (await prisma.world.findMany({ select: { id: true } })).map((item) => item.id);
    if (scope === "world" && !id) {
      const all = await prisma.world.findMany({ select: { id: true } });
      all.forEach((item) => worldIds.push(item.id));
    }
    worldIds.forEach((worldId) => push("world", worldId));
    const library = await prisma.worldPropertyLibrary.findMany({
      where: scope === "world" ? { sourceWorldId: id ?? undefined } : {},
      select: { id: true },
    });
    library.forEach((item) => push("world_library_item", item.id));
  }

  return Array.from(owners.values());
}

// ---------------------------------------------------------------------------
// syncKnowledgeDocumentIndexStatus
// ---------------------------------------------------------------------------

export async function syncKnowledgeDocumentIndexStatus(
  prisma: PrismaClient,
  ownerType: RagOwnerType,
  ownerId: string,
  status: RagJobStatus,
  jobType: RagJobType,
): Promise<void> {
  if (ownerType !== "knowledge_document") {
    return;
  }

  const nextStatus =
    jobType === "delete" && (status === "succeeded" || status === "cancelled")
      ? "idle"
      : status === "queued"
        ? "queued"
        : status === "running"
          ? "running"
          : status === "succeeded"
            ? "succeeded"
            : status === "cancelled"
              ? "idle"
              : "failed";

  await prisma.knowledgeDocument.updateMany({
    where: { id: ownerId },
    data: {
      latestIndexStatus: nextStatus,
      ...(status === "succeeded" && jobType !== "delete" ? { lastIndexedAt: new Date() } : {}),
    },
  });
}
