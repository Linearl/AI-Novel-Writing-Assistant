import type { DynamicCharacterOverview } from "@ai-novel/shared/types/characterDynamics";
import { prisma } from "../../../db/prisma";
import { generateVolumeProjection, extractChapterDynamics } from "./characterDynamicsLlm";
import type { CharacterDynamicsQueryService } from "./CharacterDynamicsQueryService";
import {
  CHAPTER_EXTRACT_SOURCE_TYPE,
  normalizeName,
  PROJECTION_SOURCE_TYPES,
} from "./characterDynamicsShared";
import { buildVolumeWindows, dedupeStrings, mergeProjectionAssignments, resolveCurrentVolume } from "./characterDynamicsUtils";
import { buildContentHash } from "../runtime/ChapterArtifactDeltaService";
import { logger } from "../../logging/LoggerService";

export async function rebuildDynamics(
  novelId: string,
  queryService: CharacterDynamicsQueryService,
  options: { sourceType?: string } = {},
): Promise<DynamicCharacterOverview> {
  const context = await prisma.novel.findUnique({
    where: { id: novelId },
    select: {
      id: true,
      title: true,
      description: true,
      targetAudience: true,
      bookSellingPoint: true,
      first30ChapterPromise: true,
      outline: true,
      structuredOutline: true,
      characters: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          role: true,
          castRole: true,
          relationToProtagonist: true,
          storyFunction: true,
          currentGoal: true,
          currentState: true,
        },
      },
      characterRelations: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          sourceCharacterId: true,
          targetCharacterId: true,
          surfaceRelation: true,
          hiddenTension: true,
          conflictSource: true,
          dynamicLabel: true,
          nextTurnPoint: true,
          sourceCharacter: { select: { name: true } },
          targetCharacter: { select: { name: true } },
        },
      },
      characterCastOptions: {
        where: { status: "applied" },
        take: 1,
        select: {
          title: true,
          summary: true,
        },
      },
      volumePlans: {
        orderBy: { sortOrder: "asc" },
        include: {
          chapters: {
            orderBy: { chapterOrder: "asc" },
          },
        },
      },
    },
  });
  if (!context || context.characters.length === 0 || context.volumePlans.length === 0) {
    return queryService.getOverview(novelId);
  }

  const lockedChapterIds = new Set(
    (await prisma.chapter.findMany({
      where: { novelId, locked: true },
      select: { id: true },
    })).map((c) => c.id),
  );
  const contextWithLockedFilter = {
    ...context,
    volumePlans: context.volumePlans.map((volume) => ({
      ...volume,
      chapters: volume.chapters.filter((chapter) => chapter.chapterId !== null && !lockedChapterIds.has(chapter.chapterId)),
    })),
  };

  const projectionVolumePlans = contextWithLockedFilter.volumePlans.filter((volume) => volume.chapters.length > 0);
  if (projectionVolumePlans.length === 0) {
    return queryService.getOverview(novelId);
  }

  const projection = await generateVolumeProjection({
    ...contextWithLockedFilter,
    volumePlans: projectionVolumePlans,
  });
  const sourceType = options.sourceType ?? "rebuild_projection";
  const characterIdByName = new Map(contextWithLockedFilter.characters.map((character) => [normalizeName(character.name), character.id]));
  const volumeBySortOrder = new Map(contextWithLockedFilter.volumePlans.map((volume) => [volume.sortOrder, volume]));
  const mergedAssignments = mergeProjectionAssignments(projection.assignments);
  const validAssignments = mergedAssignments.filter((assignment) => (
    characterIdByName.has(normalizeName(assignment.characterName))
    && volumeBySortOrder.has(assignment.volumeSortOrder)
  ));
  if (mergedAssignments.length < projection.assignments.length) {
    logger.warn(
      `[CharacterDynamicsMutationService] Deduped ${projection.assignments.length - mergedAssignments.length} duplicate character-volume assignments for novel ${novelId}.`,
    );
  }
  if (validAssignments.length === 0) {
    logger.warn(
      `[CharacterDynamicsMutationService] Skipped character dynamics rebuild for novel ${novelId}: projection contained no valid character-volume assignments.`,
    );
    return queryService.getOverview(novelId);
  }
  const relationByPair = new Map(context.characterRelations.map((relation) => [
    `${relation.sourceCharacterId}:${relation.targetCharacterId}`,
    relation,
  ]));
  const anchoredCurrentStagePairs = new Set(
    (await prisma.characterRelationStage.findMany({
      where: {
        novelId,
        isCurrent: true,
        sourceType: { notIn: PROJECTION_SOURCE_TYPES },
      },
      select: {
        sourceCharacterId: true,
        targetCharacterId: true,
      },
    })).map((item) => `${item.sourceCharacterId}:${item.targetCharacterId}`),
  );

  await prisma.$transaction(async (tx) => {
    await tx.characterVolumeAssignment.deleteMany({ where: { novelId } });
    await tx.characterFactionTrack.deleteMany({
      where: {
        novelId,
        sourceType: { in: PROJECTION_SOURCE_TYPES },
      },
    });
    await tx.characterRelationStage.deleteMany({
      where: {
        novelId,
        sourceType: { in: PROJECTION_SOURCE_TYPES },
      },
    });

    for (const assignment of validAssignments) {
      const characterId = characterIdByName.get(normalizeName(assignment.characterName));
      const volume = volumeBySortOrder.get(assignment.volumeSortOrder);
      if (!characterId || !volume) {
        continue;
      }
      const plannedChapterOrders = assignment.plannedChapterOrders.length > 0
        ? assignment.plannedChapterOrders
        : volume.chapters.map((chapter) => chapter.chapterOrder);
      const existingAssignment = await tx.characterVolumeAssignment.findFirst({
        where: { novelId, characterId, volumeId: volume.id },
        select: { id: true },
      });
      if (existingAssignment) {
        await tx.characterVolumeAssignment.update({
          where: { id: existingAssignment.id },
          data: {
            roleLabel: assignment.roleLabel || null,
            responsibility: assignment.responsibility,
            appearanceExpectation: assignment.appearanceExpectation || null,
            plannedChapterOrdersJson: JSON.stringify(plannedChapterOrders),
            isCore: assignment.isCore,
            absenceWarningThreshold: assignment.absenceWarningThreshold ?? 3,
            absenceHighRiskThreshold: assignment.absenceHighRiskThreshold ?? 5,
          },
        });
      } else {
        await tx.characterVolumeAssignment.create({
          data: {
            novelId,
            characterId,
            volumeId: volume.id,
            roleLabel: assignment.roleLabel || null,
            responsibility: assignment.responsibility,
            appearanceExpectation: assignment.appearanceExpectation || null,
            plannedChapterOrdersJson: JSON.stringify(plannedChapterOrders),
            isCore: assignment.isCore,
            absenceWarningThreshold: assignment.absenceWarningThreshold ?? 3,
            absenceHighRiskThreshold: assignment.absenceHighRiskThreshold ?? 5,
          },
        });
      }
    }

    for (const track of projection.factionTracks) {
      const characterId = characterIdByName.get(normalizeName(track.characterName));
      const volume = volumeBySortOrder.get(track.volumeSortOrder) ?? null;
      if (!characterId || !volume) {
        continue;
      }
      await tx.characterFactionTrack.create({
        data: {
          novelId,
          characterId,
          volumeId: volume.id,
          chapterId: null,
          chapterOrder: null,
          factionLabel: track.factionLabel,
          stanceLabel: track.stanceLabel || null,
          summary: track.summary || null,
          sourceType,
          confidence: track.confidence ?? null,
        },
      });
    }

    for (const stage of projection.relationStages) {
      const sourceCharacterId = characterIdByName.get(normalizeName(stage.sourceCharacterName));
      const targetCharacterId = characterIdByName.get(normalizeName(stage.targetCharacterName));
      const volume = volumeBySortOrder.get(stage.volumeSortOrder) ?? null;
      if (!sourceCharacterId || !targetCharacterId || sourceCharacterId === targetCharacterId || !volume) {
        continue;
      }
      const relation = relationByPair.get(`${sourceCharacterId}:${targetCharacterId}`) ?? null;
      await tx.characterRelationStage.create({
        data: {
          novelId,
          relationId: relation?.id ?? null,
          sourceCharacterId,
          targetCharacterId,
          volumeId: volume.id,
          chapterId: null,
          chapterOrder: null,
          stageLabel: stage.stageLabel,
          stageSummary: stage.stageSummary,
          nextTurnPoint: stage.nextTurnPoint || null,
          sourceType,
          confidence: stage.confidence ?? null,
          isCurrent: !anchoredCurrentStagePairs.has(`${sourceCharacterId}:${targetCharacterId}`),
        },
      });
    }
  });

  return queryService.getOverview(novelId);
}

export async function syncChapterDraftDynamics(novelId: string, chapterId: string, chapterOrder: number): Promise<void> {
  const [chapter, novel] = await Promise.all([
    prisma.chapter.findFirst({
      where: { id: chapterId, novelId },
      select: {
        id: true,
        title: true,
        order: true,
        content: true,
      },
    }),
    prisma.novel.findUnique({
      where: { id: novelId },
      select: {
        title: true,
        targetAudience: true,
        bookSellingPoint: true,
        first30ChapterPromise: true,
        characters: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            role: true,
            currentGoal: true,
            currentState: true,
          },
        },
        characterRelations: {
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            sourceCharacterId: true,
            targetCharacterId: true,
            sourceCharacter: { select: { name: true } },
            targetCharacter: { select: { name: true } },
            surfaceRelation: true,
            dynamicLabel: true,
            nextTurnPoint: true,
          },
        },
        volumePlans: {
          orderBy: { sortOrder: "asc" },
          include: {
            chapters: {
              orderBy: { chapterOrder: "asc" },
            },
          },
        },
      },
    }),
  ]);
  if (!chapter?.content?.trim() || !novel) {
    return;
  }
  const artifactDeltaCheckpoint = await prisma.chapterArtifactSyncCheckpoint.findFirst({
    where: {
      novelId,
      chapterId,
      contentHash: buildContentHash(chapter.content),
      artifactType: "artifact_delta",
      status: "succeeded",
    },
    select: { id: true },
  }).catch(() => null);
  if (artifactDeltaCheckpoint) {
    return;
  }

  const currentVolume = resolveCurrentVolume(buildVolumeWindows(novel.volumePlans), chapterOrder);
  const extracted = await extractChapterDynamics({
    novelId,
    chapterId,
    novelTitle: novel.title,
    targetAudience: novel.targetAudience,
    bookSellingPoint: novel.bookSellingPoint,
    first30ChapterPromise: novel.first30ChapterPromise,
    currentVolumeTitle: currentVolume?.title ?? null,
    rosterLines: novel.characters.map((item) => `${item.name} | ${item.role} | goal=${item.currentGoal ?? ""} | state=${item.currentState ?? ""}`),
    relationLines: novel.characterRelations.map((item) => `${item.sourceCharacter.name} -> ${item.targetCharacter.name} | ${item.surfaceRelation} | dynamic=${item.dynamicLabel ?? ""} | next=${item.nextTurnPoint ?? ""}`),
    chapterOrder: chapter.order,
    chapterTitle: chapter.title,
    chapterContent: chapter.content,
  });

  const characterByName = new Map(novel.characters.map((item) => [normalizeName(item.name), item]));
  const relationByPair = new Map(novel.characterRelations.map((item) => [
    `${item.sourceCharacterId}:${item.targetCharacterId}`,
    item,
  ]));
  const dedupedCandidates = extracted.candidates.filter((candidate, index, list) => (
    list.findIndex((item) => normalizeName(item.proposedName) === normalizeName(candidate.proposedName)) === index
  ));

  await prisma.$transaction(async (tx) => {
    await tx.characterCandidate.deleteMany({
      where: {
        novelId,
        sourceChapterId: chapterId,
        status: "pending",
      },
    });
    for (const candidate of dedupedCandidates) {
      const matchedCharacter = candidate.matchedCharacterName
        ? characterByName.get(normalizeName(candidate.matchedCharacterName))
        : characterByName.get(normalizeName(candidate.proposedName));
      if (matchedCharacter) {
        continue;
      }
      await tx.characterCandidate.create({
        data: {
          novelId,
          sourceChapterId: chapterId,
          proposedName: candidate.proposedName,
          proposedRole: candidate.proposedRole || null,
          summary: candidate.summary || null,
          evidenceJson: JSON.stringify(dedupeStrings(candidate.evidence)),
          matchedCharacterId: null,
          status: "pending",
          confidence: candidate.confidence ?? null,
        },
      });
    }

    await tx.characterFactionTrack.deleteMany({
      where: {
        novelId,
        chapterId,
        sourceType: CHAPTER_EXTRACT_SOURCE_TYPE,
      },
    });
    for (const update of extracted.factionUpdates) {
      const matched = characterByName.get(normalizeName(update.characterName));
      if (!matched) {
        continue;
      }
      await tx.characterFactionTrack.create({
        data: {
          novelId,
          characterId: matched.id,
          volumeId: currentVolume?.id ?? null,
          chapterId,
          chapterOrder,
          factionLabel: update.factionLabel,
          stanceLabel: update.stanceLabel || null,
          summary: update.summary || null,
          sourceType: CHAPTER_EXTRACT_SOURCE_TYPE,
          confidence: update.confidence ?? null,
        },
      });
    }

    await tx.characterRelationStage.deleteMany({
      where: {
        novelId,
        chapterId,
        sourceType: CHAPTER_EXTRACT_SOURCE_TYPE,
      },
    });
    for (const stage of extracted.relationStages) {
      const sourceCharacter = characterByName.get(normalizeName(stage.sourceCharacterName));
      const targetCharacter = characterByName.get(normalizeName(stage.targetCharacterName));
      if (!sourceCharacter || !targetCharacter || sourceCharacter.id === targetCharacter.id) {
        continue;
      }
      await tx.characterRelationStage.updateMany({
        where: {
          novelId,
          sourceCharacterId: sourceCharacter.id,
          targetCharacterId: targetCharacter.id,
          isCurrent: true,
        },
        data: {
          isCurrent: false,
        },
      });
      const relation = relationByPair.get(`${sourceCharacter.id}:${targetCharacter.id}`) ?? null;
      await tx.characterRelationStage.create({
        data: {
          novelId,
          relationId: relation?.id ?? null,
          sourceCharacterId: sourceCharacter.id,
          targetCharacterId: targetCharacter.id,
          volumeId: currentVolume?.id ?? null,
          chapterId,
          chapterOrder,
          stageLabel: stage.stageLabel,
          stageSummary: stage.stageSummary,
          nextTurnPoint: stage.nextTurnPoint || null,
          sourceType: CHAPTER_EXTRACT_SOURCE_TYPE,
          confidence: stage.confidence ?? null,
          isCurrent: true,
        },
      });
    }
  });
}
