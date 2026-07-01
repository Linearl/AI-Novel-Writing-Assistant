/**
 * Timeline Edge Table Sync — dual-write helper for REQ-7004.
 *
 * When timeline entities are persisted, this module simultaneously writes
 * the relations into edge tables:
 *   - TimelineEventParticipant
 *   - TimelineEventFaction
 *   - TimelineEventEdge
 *   - TimelineAnchorEventLink
 *   - TimelineHookEventLink
 *   - TimelineHookParticipant
 *   - TimelineConstraintLink
 *
 * Strategy: deleteMany + createMany — idempotent upsert.
 */

import { prisma } from "../../db/prisma";

// ── Event sync ──────────────────────

export async function syncEventEdges(
  eventId: string,
  novelId: string,
  participantIds: string[],
  factionIds: string[],
  prerequisiteIds: string[],
  consequenceIds: string[],
): Promise<{
  participants: number;
  factions: number;
  edges: number;
}> {
  const [pCount, fCount, eCount] = await Promise.all([
    // TimelineEventParticipant
    prisma.timelineEventParticipant
      .deleteMany({ where: { eventId } })
      .then(() =>
        participantIds.length > 0
          ? prisma.timelineEventParticipant.createMany({
              data: participantIds.map((characterId) => ({
                eventId,
                characterId,
                novelId,
              })),
            })
          : { count: 0 },
      )
      .then((r) => r.count),

    // TimelineEventFaction
    prisma.timelineEventFaction
      .deleteMany({ where: { eventId } })
      .then(() =>
        factionIds.length > 0
          ? prisma.timelineEventFaction.createMany({
              data: factionIds.map((factionId) => ({
                eventId,
                factionId,
                novelId,
              })),
            })
          : { count: 0 },
      )
      .then((r) => r.count),

    // TimelineEventEdge (outgoing consequence + incoming prerequisite)
    prisma.timelineEventEdge
      .deleteMany({
        where: {
          OR: [{ sourceId: eventId }, { targetId: eventId }],
        },
      })
      .then(() => {
        const data: Array<{
          sourceId: string;
          targetId: string;
          edgeType: string;
          novelId: string;
        }> = [];

        for (const targetId of prerequisiteIds) {
          data.push({
            sourceId: targetId,
            targetId: eventId,
            edgeType: "prerequisite",
            novelId,
          });
        }
        for (const targetId of consequenceIds) {
          data.push({
            sourceId: eventId,
            targetId,
            edgeType: "consequence",
            novelId,
          });
        }

        return data.length > 0
          ? prisma.timelineEventEdge.createMany({ data })
          : { count: 0 };
      })
      .then((r) => r.count),
  ]);

  return { participants: pCount, factions: fCount, edges: eCount };
}

// ── Anchor sync ──────────────────────

interface AnchorLinkData {
  linkType: string;
  eventIds: string[];
}

function buildAnchorLinkData(
  anchorId: string,
  novelId: string,
  links: AnchorLinkData[],
): Array<{
  anchorId: string;
  linkType: string;
  eventId: string;
  novelId: string;
}> {
  const rows: Array<{
    anchorId: string;
    linkType: string;
    eventId: string;
    novelId: string;
  }> = [];

  for (const { linkType, eventIds } of links) {
    for (const eventId of eventIds) {
      rows.push({ anchorId, linkType, eventId, novelId });
    }
  }
  return rows;
}

export async function syncAnchorEdges(
  anchorId: string,
  novelId: string,
  startsAfterIds: string[],
  plannedEventIds: string[],
  endedWithIds: string[],
  previousHookIds: string[],
  nextHookIds: string[],
  forbiddenEventIds: string[],
): Promise<number> {
  const rows = buildAnchorLinkData(anchorId, novelId, [
    { linkType: "startsAfter", eventIds: startsAfterIds },
    { linkType: "plannedEvent", eventIds: plannedEventIds },
    { linkType: "endedWith", eventIds: endedWithIds },
    { linkType: "previousHook", eventIds: previousHookIds },
    { linkType: "nextHook", eventIds: nextHookIds },
    { linkType: "forbiddenEvent", eventIds: forbiddenEventIds },
  ]);

  await prisma.timelineAnchorEventLink.deleteMany({ where: { anchorId } });
  if (rows.length > 0) {
    const result = await prisma.timelineAnchorEventLink.createMany({ data: rows });
    return result.count;
  }
  return 0;
}

// ── Hook sync ──────────────────────

export async function syncHookEdges(
  hookId: string,
  novelId: string,
  relatedEventIds: string[],
  participantIds: string[],
): Promise<{ eventLinks: number; participants: number }> {
  const [eCount, pCount] = await Promise.all([
    // TimelineHookEventLink
    prisma.timelineHookEventLink
      .deleteMany({ where: { hookId } })
      .then(() =>
        relatedEventIds.length > 0
          ? prisma.timelineHookEventLink.createMany({
              data: relatedEventIds.map((eventId) => ({
                hookId,
                eventId,
                novelId,
              })),
            })
          : { count: 0 },
      )
      .then((r) => r.count),

    // TimelineHookParticipant
    prisma.timelineHookParticipant
      .deleteMany({ where: { hookId } })
      .then(() =>
        participantIds.length > 0
          ? prisma.timelineHookParticipant.createMany({
              data: participantIds.map((characterId) => ({
                hookId,
                characterId,
                novelId,
              })),
            })
          : { count: 0 },
      )
      .then((r) => r.count),
  ]);

  return { eventLinks: eCount, participants: pCount };
}

// ── Constraint sync ──────────────────────

interface ConstraintRefData {
  refType: string;
  refIds: string[];
}

function buildConstraintLinkData(
  constraintId: string,
  novelId: string,
  refs: ConstraintRefData[],
): Array<{
  constraintId: string;
  refType: string;
  refId: string;
  novelId: string;
}> {
  const rows: Array<{
    constraintId: string;
    refType: string;
    refId: string;
    novelId: string;
  }> = [];

  for (const { refType, refIds } of refs) {
    for (const refId of refIds) {
      rows.push({ constraintId, refType, refId, novelId });
    }
  }
  return rows;
}

export async function syncConstraintEdges(
  constraintId: string,
  novelId: string,
  relatedEventIds: string[],
  relatedHookIds: string[],
  relatedCharacterIds: string[],
): Promise<number> {
  const rows = buildConstraintLinkData(constraintId, novelId, [
    { refType: "event", refIds: relatedEventIds },
    { refType: "hook", refIds: relatedHookIds },
    { refType: "character", refIds: relatedCharacterIds },
  ]);

  await prisma.timelineConstraintLink.deleteMany({ where: { constraintId } });
  if (rows.length > 0) {
    const result = await prisma.timelineConstraintLink.createMany({ data: rows });
    return result.count;
  }
  return 0;
}

// ── Read helpers (edge-first, JSON fallback) ──────────────────────

export async function readEventEdges(eventId: string) {
  const [participants, factions, outgoingEdges, incomingEdges] = await Promise.all([
    prisma.timelineEventParticipant.findMany({
      where: { eventId },
      select: { characterId: true },
    }),
    prisma.timelineEventFaction.findMany({
      where: { eventId },
      select: { factionId: true },
    }),
    prisma.timelineEventEdge.findMany({
      where: { sourceId: eventId },
      select: { targetId: true, edgeType: true },
    }),
    prisma.timelineEventEdge.findMany({
      where: { targetId: eventId },
      select: { sourceId: true, edgeType: true },
    }),
  ]);

  return {
    participantIds: participants.map((p) => p.characterId),
    factionIds: factions.map((f) => f.factionId),
    prerequisiteEventIds: incomingEdges
      .filter((e) => e.edgeType === "prerequisite")
      .map((e) => e.sourceId),
    consequenceEventIds: outgoingEdges
      .filter((e) => e.edgeType === "consequence")
      .map((e) => e.targetId),
  };
}

export async function readAnchorEdges(anchorId: string) {
  const links = await prisma.timelineAnchorEventLink.findMany({
    where: { anchorId },
    select: { linkType: true, eventId: true },
  });

  return {
    startsAfterEventIds: links.filter((l) => l.linkType === "startsAfter").map((l) => l.eventId),
    plannedEventIds: links.filter((l) => l.linkType === "plannedEvent").map((l) => l.eventId),
    endedWithEventIds: links.filter((l) => l.linkType === "endedWith").map((l) => l.eventId),
    previousHookIds: links.filter((l) => l.linkType === "previousHook").map((l) => l.eventId),
    nextHookIds: links.filter((l) => l.linkType === "nextHook").map((l) => l.eventId),
    forbiddenEventIds: links.filter((l) => l.linkType === "forbiddenEvent").map((l) => l.eventId),
  };
}

export async function readHookEdges(hookId: string) {
  const [eventLinks, participants] = await Promise.all([
    prisma.timelineHookEventLink.findMany({
      where: { hookId },
      select: { eventId: true },
    }),
    prisma.timelineHookParticipant.findMany({
      where: { hookId },
      select: { characterId: true },
    }),
  ]);

  return {
    relatedEventIds: eventLinks.map((l) => l.eventId),
    participantIds: participants.map((p) => p.characterId),
  };
}

export async function readConstraintEdges(constraintId: string) {
  const links = await prisma.timelineConstraintLink.findMany({
    where: { constraintId },
    select: { refType: true, refId: true },
  });

  return {
    relatedEventIds: links.filter((l) => l.refType === "event").map((l) => l.refId),
    relatedHookIds: links.filter((l) => l.refType === "hook").map((l) => l.refId),
    relatedCharacterIds: links.filter((l) => l.refType === "character").map((l) => l.refId),
  };
}
