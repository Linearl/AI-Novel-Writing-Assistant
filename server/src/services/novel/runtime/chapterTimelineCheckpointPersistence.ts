import type { ChapterTimelineFinalizationMode } from "./chapterTimelineFinalizationHelpers";
import type { TimelineFinalizationClaimStatus } from "./chapterTimelineFinalizationHelpers";
import { prisma } from "../../../db/prisma";

const TIMELINE_FINALIZATION_RUNNING_STALE_MS = 15 * 60 * 1000;

export async function resolveChapterOrder(chapterId: string): Promise<number> {
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { order: true },
  });
  return chapter?.order ?? 0;
}

export async function markTimelineCheckpoint(input: {
  novelId: string;
  chapterId: string;
  contentHash: string;
  syncMode: ChapterTimelineFinalizationMode;
  sourceStage: string;
  metadata: Record<string, unknown>;
}): Promise<void> {
  await prisma.chapterArtifactSyncCheckpoint.upsert({
    where: {
      novelId_chapterId_contentHash_artifactType_syncMode: {
        novelId: input.novelId,
        chapterId: input.chapterId,
        contentHash: input.contentHash,
        artifactType: "timeline_finalization",
        syncMode: input.syncMode,
      },
    },
    create: {
      novelId: input.novelId,
      chapterId: input.chapterId,
      contentHash: input.contentHash,
      artifactType: "timeline_finalization",
      syncMode: input.syncMode,
      status: "succeeded",
      sourceType: "chapter_runtime",
      sourceStage: input.sourceStage,
      metadataJson: JSON.stringify(input.metadata),
    },
    update: {
      status: "succeeded",
      sourceType: "chapter_runtime",
      sourceStage: input.sourceStage,
      metadataJson: JSON.stringify(input.metadata),
      updatedAt: new Date(),
    },
  });
}

export async function claimTimelineCheckpoint(input: {
  novelId: string;
  chapterId: string;
  contentHash: string;
  syncMode: ChapterTimelineFinalizationMode;
  sourceStage: string;
  metadata: Record<string, unknown>;
}): Promise<TimelineFinalizationClaimStatus> {
  const where = {
    novelId_chapterId_contentHash_artifactType_syncMode: {
      novelId: input.novelId,
      chapterId: input.chapterId,
      contentHash: input.contentHash,
      artifactType: "timeline_finalization",
      syncMode: input.syncMode,
    },
  };
  const metadataJson = JSON.stringify(input.metadata);
  try {
    await prisma.chapterArtifactSyncCheckpoint.create({
      data: {
        novelId: input.novelId,
        chapterId: input.chapterId,
        contentHash: input.contentHash,
        artifactType: "timeline_finalization",
        syncMode: input.syncMode,
        status: "running",
        sourceType: "chapter_runtime",
        sourceStage: input.sourceStage,
        metadataJson,
      },
    });
    return "claimed";
  } catch {
    const existing = await prisma.chapterArtifactSyncCheckpoint.findUnique({
      where,
      select: { status: true, updatedAt: true },
    }).catch(() => null);
    if (existing?.status === "succeeded") {
      return "already_done";
    }
    const staleBefore = new Date(Date.now() - TIMELINE_FINALIZATION_RUNNING_STALE_MS);
    if (existing?.status === "running" && existing.updatedAt > staleBefore) {
      return "running";
    }
    const claimed = await prisma.chapterArtifactSyncCheckpoint.updateMany({
      where: {
        novelId: input.novelId,
        chapterId: input.chapterId,
        contentHash: input.contentHash,
        artifactType: "timeline_finalization",
        syncMode: input.syncMode,
        OR: [
          { status: { not: "running" } },
          { updatedAt: { lt: staleBefore } },
        ],
      },
      data: {
        status: "running",
        sourceType: "chapter_runtime",
        sourceStage: input.sourceStage,
        metadataJson,
        updatedAt: new Date(),
      },
    }).catch(() => ({ count: 0 }));
    return claimed.count > 0 ? "claimed" : "running";
  }
}

export async function markTimelineCheckpointFailed(input: {
  novelId: string;
  chapterId: string;
  contentHash: string;
  syncMode: ChapterTimelineFinalizationMode;
  sourceStage: string;
  metadata: Record<string, unknown>;
}): Promise<void> {
  await prisma.chapterArtifactSyncCheckpoint.updateMany({
    where: {
      novelId: input.novelId,
      chapterId: input.chapterId,
      contentHash: input.contentHash,
      artifactType: "timeline_finalization",
      syncMode: input.syncMode,
      status: "running",
    },
    data: {
      status: "failed",
      sourceType: "chapter_runtime",
      sourceStage: input.sourceStage,
      metadataJson: JSON.stringify(input.metadata),
      updatedAt: new Date(),
    },
  }).catch(() => null);
}
