import type {
  ChapterTimeAnchor,
  StoryTimelineEvent,
  TimelineCheckReport,
  TimelineConstraint,
  TimelineHook,
  TimelineHookResolveMode,
  TimelineIssue,
} from "@ai-novel/shared/types/timeline";
import { prisma } from "../../db/prisma";
import type { Prisma } from "@prisma/client";

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function stringifyJson(value: unknown): string {
  return JSON.stringify(value ?? []);
}

// ── REQ-7004: Edge table helpers ──────────────────────────────

function groupById(rows: Array<Record<string, string>>, keyField: string, valueField: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const key = row[keyField];
    const val = row[valueField];
    if (!key || !val) continue;
    const arr = map.get(key) ?? [];
    arr.push(val);
    map.set(key, arr);
  }
  return map;
}

async function batchLoadEventEdges(eventIds: string[]) {
  const empty = { prerequisiteIds: new Map<string, string[]>(), consequenceIds: new Map<string, string[]>(), participantIds: new Map<string, string[]>(), factionIds: new Map<string, string[]>() };
  if (eventIds.length === 0) return empty;
  const [prereq, consequence, participants, factions] = await Promise.all([
    prisma.timelineEventEdge.findMany({ where: { sourceId: { in: eventIds }, edgeType: "prerequisite" }, select: { sourceId: true, targetId: true } }),
    prisma.timelineEventEdge.findMany({ where: { sourceId: { in: eventIds }, edgeType: "consequence" }, select: { sourceId: true, targetId: true } }),
    prisma.timelineEventParticipant.findMany({ where: { eventId: { in: eventIds } }, select: { eventId: true, characterId: true } }),
    prisma.timelineEventFaction.findMany({ where: { eventId: { in: eventIds } }, select: { eventId: true, factionId: true } }),
  ]);
  return {
    prerequisiteIds: groupById(prereq as Record<string, string>[], "sourceId", "targetId"),
    consequenceIds: groupById(consequence as Record<string, string>[], "sourceId", "targetId"),
    participantIds: groupById(participants as Record<string, string>[], "eventId", "characterId"),
    factionIds: groupById(factions as Record<string, string>[], "eventId", "factionId"),
  };
}

async function batchLoadAnchorEdges(anchorIds: string[]) {
  const empty = { startsAfterIds: new Map<string, string[]>(), plannedEventIds: new Map<string, string[]>(), endedWithIds: new Map<string, string[]>(), forbiddenIds: new Map<string, string[]>() };
  if (anchorIds.length === 0) return empty;
  const links = await prisma.timelineAnchorEventLink.findMany({ where: { anchorId: { in: anchorIds } }, select: { anchorId: true, eventId: true, linkType: true } });
  return {
    startsAfterIds: groupById(links.filter(l => l.linkType === "startsAfter") as Record<string, string>[], "anchorId", "eventId"),
    plannedEventIds: groupById(links.filter(l => l.linkType === "plannedEvent") as Record<string, string>[], "anchorId", "eventId"),
    endedWithIds: groupById(links.filter(l => l.linkType === "endedWith") as Record<string, string>[], "anchorId", "eventId"),
    forbiddenIds: groupById(links.filter(l => l.linkType === "forbidden") as Record<string, string>[], "anchorId", "eventId"),
  };
}

async function batchLoadHookEdges(hookIds: string[]) {
  const empty = { relatedEventIds: new Map<string, string[]>(), participantIds: new Map<string, string[]>() };
  if (hookIds.length === 0) return empty;
  const [eventLinks, participants] = await Promise.all([
    prisma.timelineHookEventLink.findMany({ where: { hookId: { in: hookIds } }, select: { hookId: true, eventId: true } }),
    prisma.timelineHookParticipant.findMany({ where: { hookId: { in: hookIds } }, select: { hookId: true, characterId: true } }),
  ]);
  return {
    relatedEventIds: groupById(eventLinks as Record<string, string>[], "hookId", "eventId"),
    participantIds: groupById(participants as Record<string, string>[], "hookId", "characterId"),
  };
}

async function batchLoadConstraintEdges(constraintIds: string[]) {
  const empty = { relatedEventIds: new Map<string, string[]>(), relatedHookIds: new Map<string, string[]>(), relatedCharacterIds: new Map<string, string[]>() };
  if (constraintIds.length === 0) return empty;
  const links = await prisma.timelineConstraintLink.findMany({ where: { constraintId: { in: constraintIds } }, select: { constraintId: true, refId: true, refType: true } });
  return {
    relatedEventIds: groupById(links.filter(l => l.refType === "event") as Record<string, string>[], "constraintId", "refId"),
    relatedHookIds: groupById(links.filter(l => l.refType === "hook") as Record<string, string>[], "constraintId", "refId"),
    relatedCharacterIds: groupById(links.filter(l => l.refType === "character") as Record<string, string>[], "constraintId", "refId"),
  };
}

function edgeOrEmpty(edgeMap: Map<string, string[]>, id: string): string[] {
  return edgeMap.get(id) ?? [];
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function hookResolveModeRank(mode: TimelineHookResolveMode): number {
  if (mode === "immediate") {
    return 0;
  }
  if (mode === "short_arc") {
    return 1;
  }
  return 2;
}

function hookPriorityRank(priority: TimelineHook["priority"]): number {
  if (priority === "critical") {
    return 0;
  }
  if (priority === "high") {
    return 1;
  }
  if (priority === "medium") {
    return 2;
  }
  return 3;
}

function deriveHookDeadline(
  resolveMode: TimelineHookResolveMode,
  createdInChapterIndex: number,
): number | null {
  if (resolveMode === "immediate") {
    return createdInChapterIndex + 1;
  }
  if (resolveMode === "short_arc") {
    return createdInChapterIndex + 2;
  }
  return null;
}

type EventRow = Awaited<ReturnType<typeof prisma.storyTimelineEvent.findMany>>[number];
type AnchorRow = Awaited<ReturnType<typeof prisma.chapterTimeAnchor.findFirst>>;
type HookRow = Awaited<ReturnType<typeof prisma.timelineHook.findMany>>[number];
type ConstraintRow = Awaited<ReturnType<typeof prisma.timelineConstraint.findMany>>[number];
type ReportRow = Awaited<ReturnType<typeof prisma.timelineCheckReport.findFirst>>;

export function mapTimelineEvent(row: EventRow, edges?: { prerequisiteIds: Map<string, string[]>; consequenceIds: Map<string, string[]>; participantIds: Map<string, string[]>; factionIds: Map<string, string[]> }): StoryTimelineEvent {
  return {
    id: row.id,
    novelId: row.novelId,
    eventOrder: row.eventOrder,
    chapterId: row.chapterId,
    chapterIndex: row.chapterIndex,
    storyDayIndex: row.storyDayIndex,
    storyTimeLabel: row.storyTimeLabel,
    title: row.title,
    summary: row.summary,
    type: row.type as StoryTimelineEvent["type"],
    status: row.status as StoryTimelineEvent["status"],
    visibility: row.visibility as StoryTimelineEvent["visibility"],
    source: row.source as StoryTimelineEvent["source"],
    participantIds: edges ? edgeOrEmpty(edges.participantIds, row.id) : [],
    locationId: row.locationId,
    factionIds: edges ? edgeOrEmpty(edges.factionIds, row.id) : [],
    prerequisiteEventIds: edges ? edgeOrEmpty(edges.prerequisiteIds, row.id) : [],
    consequenceEventIds: edges ? edgeOrEmpty(edges.consequenceIds, row.id) : [],
    stateChanges: parseJson(row.stateChangesJson, []),
    eventKey: row.eventKey,
    confidence: row.confidence,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function mapAnchor(row: NonNullable<AnchorRow>, edges?: { startsAfterIds: Map<string, string[]>; plannedEventIds: Map<string, string[]>; endedWithIds: Map<string, string[]>; forbiddenIds: Map<string, string[]> }): ChapterTimeAnchor {
  return {
    id: row.id,
    novelId: row.novelId,
    chapterId: row.chapterId,
    chapterIndex: row.chapterIndex,
    storyDayIndex: row.storyDayIndex,
    timeLabel: row.timeLabel,
    startsAfterEventIds: edges ? edgeOrEmpty(edges.startsAfterIds, row.id) : [],
    plannedEventIds: edges ? edgeOrEmpty(edges.plannedEventIds, row.id) : [],
    endedWithEventIds: edges ? edgeOrEmpty(edges.endedWithIds, row.id) : [],
    previousHookIds: [],
    nextHookIds: [],
    forbiddenEventIds: edges ? edgeOrEmpty(edges.forbiddenIds, row.id) : [],
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

export function mapTimelineHook(row: HookRow, edges?: { relatedEventIds: Map<string, string[]>; participantIds: Map<string, string[]> }): TimelineHook {
  const resolveMode = (row.resolveMode as TimelineHookResolveMode | null | undefined) ?? "long_arc";
  const blocking = row.blocking ?? false;
  return {
    id: row.id,
    novelId: row.novelId,
    createdInChapterId: row.createdInChapterId,
    createdInChapterIndex: row.createdInChapterIndex,
    expectedResolveByChapterIndex: row.expectedResolveByChapterIndex,
    resolveMode,
    blocking,
    resolvedInChapterId: row.resolvedInChapterId,
    resolvedInChapterIndex: row.resolvedInChapterIndex,
    title: row.title,
    description: row.description,
    status: row.status as TimelineHook["status"],
    priority: row.priority as TimelineHook["priority"],
    relatedEventIds: edges ? edgeOrEmpty(edges.relatedEventIds, row.id) : [],
    participantIds: edges ? edgeOrEmpty(edges.participantIds, row.id) : [],
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function mapConstraint(row: ConstraintRow, edges?: { relatedEventIds: Map<string, string[]>; relatedHookIds: Map<string, string[]>; relatedCharacterIds: Map<string, string[]> }): TimelineConstraint {
  return {
    id: row.id,
    novelId: row.novelId,
    chapterId: row.chapterId,
    chapterIndex: row.chapterIndex,
    type: row.type as TimelineConstraint["type"],
    severity: row.severity as TimelineConstraint["severity"],
    description: row.description,
    relatedEventIds: edges ? edgeOrEmpty(edges.relatedEventIds, row.id) : [],
    relatedHookIds: edges ? edgeOrEmpty(edges.relatedHookIds, row.id) : [],
    relatedCharacterIds: edges ? edgeOrEmpty(edges.relatedCharacterIds, row.id) : [],
    active: row.active,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function mapReport(row: NonNullable<ReportRow>): TimelineCheckReport {
  return {
    id: row.id,
    novelId: row.novelId,
    chapterId: row.chapterId,
    chapterIndex: row.chapterIndex,
    status: row.status as TimelineCheckReport["status"],
    score: row.score,
    issues: parseJson<TimelineIssue[]>(row.issuesJson, []),
    createdAt: toIso(row.createdAt),
  };
}

export interface TimelineRepository {
  listEventsBeforeChapter(input: {
    novelId: string;
    chapterIndex: number;
    limit?: number;
  }): Promise<StoryTimelineEvent[]>;
  listPlannedEventsForChapter(input: { novelId: string; chapterIndex: number }): Promise<StoryTimelineEvent[]>;
  listForbiddenEventsForChapter(input: { novelId: string; chapterIndex: number }): Promise<StoryTimelineEvent[]>;
  listOpenHooks(input: { novelId: string; chapterIndex: number }): Promise<TimelineHook[]>;
  listActiveConstraints(input: { novelId: string; chapterId?: string; chapterIndex: number }): Promise<TimelineConstraint[]>;
  getChapterTimeAnchor(input: { novelId: string; chapterId: string }): Promise<ChapterTimeAnchor | null>;
  getLatestCheckReport(input: { novelId: string; chapterId: string }): Promise<TimelineCheckReport | null>;
  upsertChapterTimeAnchor(input: Omit<ChapterTimeAnchor, "id" | "createdAt" | "updatedAt">): Promise<ChapterTimeAnchor>;
  saveExtractedEvents(events: Array<Omit<StoryTimelineEvent, "id" | "createdAt" | "updatedAt">>): Promise<StoryTimelineEvent[]>;
  createHooks(hooks: Array<{
    novelId: string;
    createdInChapterId: string;
    createdInChapterIndex: number;
    expectedResolveByChapterIndex?: number | null;
    title: string;
    description: string;
    priority: TimelineHook["priority"];
    resolveMode?: TimelineHookResolveMode;
    blocking?: boolean;
    relatedEventIds?: string[];
    participantIds?: string[];
  }>): Promise<void>;
  markHooksAddressed(input: { hookIds: string[]; chapterId: string; chapterIndex: number; resolved?: boolean }): Promise<void>;
  expireOverdueImmediateHooks(input: { novelId: string; chapterId: string; chapterIndex: number }): Promise<void>;
  saveCheckReport(report: Omit<TimelineCheckReport, "id" | "createdAt">): Promise<TimelineCheckReport>;
}

export class PrismaTimelineRepository implements TimelineRepository {
  async listEventsBeforeChapter(input: { novelId: string; chapterIndex: number; limit?: number }): Promise<StoryTimelineEvent[]> {
    const rows = await prisma.storyTimelineEvent.findMany({
      where: {
        novelId: input.novelId,
        status: { in: ["occurred", "foreshadowed", "resolved"] },
        OR: [
          { chapterIndex: { lt: input.chapterIndex } },
          { chapterIndex: null, eventOrder: { lt: input.chapterIndex * 1000 } },
        ],
      },
      orderBy: [{ eventOrder: "desc" }, { updatedAt: "desc" }],
      take: input.limit ?? 20,
    });
    const ordered = rows.reverse();
    const edges = await batchLoadEventEdges(ordered.map(r => r.id));
    return ordered.map(r => mapTimelineEvent(r, edges));
  }

  async listPlannedEventsForChapter(input: { novelId: string; chapterIndex: number }): Promise<StoryTimelineEvent[]> {
    const rows = await prisma.storyTimelineEvent.findMany({
      where: {
        novelId: input.novelId,
        status: "planned",
        chapterIndex: input.chapterIndex,
      },
      orderBy: [{ eventOrder: "asc" }, { createdAt: "asc" }],
    });
    const edges = await batchLoadEventEdges(rows.map(r => r.id));
    return rows.map(r => mapTimelineEvent(r, edges));
  }

  async listForbiddenEventsForChapter(input: { novelId: string; chapterIndex: number }): Promise<StoryTimelineEvent[]> {
    const rows = await prisma.storyTimelineEvent.findMany({
      where: {
        novelId: input.novelId,
        status: "planned",
        chapterIndex: { gt: input.chapterIndex },
      },
      orderBy: [{ chapterIndex: "asc" }, { eventOrder: "asc" }],
      take: 12,
    });
    const edges = await batchLoadEventEdges(rows.map(r => r.id));
    return rows.map(r => mapTimelineEvent(r, edges));
  }

  async listOpenHooks(input: { novelId: string; chapterIndex: number }): Promise<TimelineHook[]> {
    const rows = await prisma.timelineHook.findMany({
      where: {
        novelId: input.novelId,
        status: { in: ["open", "addressed"] },
        createdInChapterIndex: { lt: input.chapterIndex },
      },
      orderBy: [{ createdInChapterIndex: "asc" }, { updatedAt: "desc" }],
      take: 12,
    });

    const hookEdges = await batchLoadHookEdges(rows.map(r => r.id));
    return rows
      .map(r => mapTimelineHook(r, hookEdges))
      .sort((left, right) => {
        const blockingDiff = Number(right.blocking) - Number(left.blocking);
        if (blockingDiff !== 0) {
          return blockingDiff;
        }
        const resolveDiff = hookResolveModeRank(left.resolveMode) - hookResolveModeRank(right.resolveMode);
        if (resolveDiff !== 0) {
          return resolveDiff;
        }
        const priorityDiff = hookPriorityRank(left.priority) - hookPriorityRank(right.priority);
        if (priorityDiff !== 0) {
          return priorityDiff;
        }
        if (left.createdInChapterIndex !== right.createdInChapterIndex) {
          return left.createdInChapterIndex - right.createdInChapterIndex;
        }
        return right.updatedAt.localeCompare(left.updatedAt);
      })
      .slice(0, 8);
  }

  async listActiveConstraints(input: { novelId: string; chapterId?: string; chapterIndex: number }): Promise<TimelineConstraint[]> {
    const rows = await prisma.timelineConstraint.findMany({
      where: {
        novelId: input.novelId,
        active: true,
        OR: [
          { chapterId: input.chapterId ?? undefined },
          { chapterIndex: input.chapterIndex },
          { chapterId: null, chapterIndex: null },
        ],
      },
      orderBy: [{ severity: "desc" }, { updatedAt: "desc" }],
      take: 20,
    });

    const constraintEdges = await batchLoadConstraintEdges(rows.map(r => r.id));
    return rows.map(r => mapConstraint(r, constraintEdges));
  }

  async getChapterTimeAnchor(input: { novelId: string; chapterId: string }): Promise<ChapterTimeAnchor | null> {
    const row = await prisma.chapterTimeAnchor.findUnique({
      where: { novelId_chapterId: { novelId: input.novelId, chapterId: input.chapterId } },
    });
    if (!row) return null;
    const anchorEdges = await batchLoadAnchorEdges([row.id]);
    return mapAnchor(row, anchorEdges);
  }

  async getLatestCheckReport(input: { novelId: string; chapterId: string }): Promise<TimelineCheckReport | null> {
    const row = await prisma.timelineCheckReport.findFirst({
      where: { novelId: input.novelId, chapterId: input.chapterId },
      orderBy: { createdAt: "desc" },
    });
    return row ? mapReport(row) : null;
  }

  async upsertChapterTimeAnchor(input: Omit<ChapterTimeAnchor, "id" | "createdAt" | "updatedAt">): Promise<ChapterTimeAnchor> {
    const row = await prisma.$transaction(async (tx) => {
      const data = {
        chapterIndex: input.chapterIndex,
        storyDayIndex: input.storyDayIndex ?? null,
        timeLabel: input.timeLabel,
        startsAfterIdsJson: stringifyJson(input.startsAfterEventIds),
        plannedEventIdsJson: stringifyJson(input.plannedEventIds),
        endedWithIdsJson: stringifyJson(input.endedWithEventIds),
        previousHookIdsJson: stringifyJson(input.previousHookIds),
        nextHookIdsJson: stringifyJson(input.nextHookIds),
        forbiddenEventIdsJson: stringifyJson(input.forbiddenEventIds),
      };
      const anchor = await tx.chapterTimeAnchor.upsert({
        where: { novelId_chapterId: { novelId: input.novelId, chapterId: input.chapterId } },
        create: { novelId: input.novelId, chapterId: input.chapterId, ...data },
        update: data,
      });
      // Write edge tables
      await tx.timelineAnchorEventLink.deleteMany({ where: { anchorId: anchor.id } });
      const linkOps: Prisma.PrismaPromise<unknown>[] = [];
      const saData = input.startsAfterEventIds.filter(id => !!id).map(eventId => ({ novelId: input.novelId, anchorId: anchor.id, eventId, linkType: "startsAfter" as const }));
      if (saData.length > 0) linkOps.push(tx.timelineAnchorEventLink.createMany({ data: saData }));
      const plData = input.plannedEventIds.filter(id => !!id).map(eventId => ({ novelId: input.novelId, anchorId: anchor.id, eventId, linkType: "plannedEvent" as const }));
      if (plData.length > 0) linkOps.push(tx.timelineAnchorEventLink.createMany({ data: plData }));
      const ewData = input.endedWithEventIds.filter(id => !!id).map(eventId => ({ novelId: input.novelId, anchorId: anchor.id, eventId, linkType: "endedWith" as const }));
      if (ewData.length > 0) linkOps.push(tx.timelineAnchorEventLink.createMany({ data: ewData }));
      const fbData = input.forbiddenEventIds.filter(id => !!id).map(eventId => ({ novelId: input.novelId, anchorId: anchor.id, eventId, linkType: "forbidden" as const }));
      if (fbData.length > 0) linkOps.push(tx.timelineAnchorEventLink.createMany({ data: fbData }));
      if (linkOps.length > 0) await Promise.all(linkOps);
      return anchor;
    });
    const anchorEdges = await batchLoadAnchorEdges([row.id]);
    return mapAnchor(row, anchorEdges);
  }

  async saveExtractedEvents(events: Array<Omit<StoryTimelineEvent, "id" | "createdAt" | "updatedAt">>): Promise<StoryTimelineEvent[]> {
    const created: StoryTimelineEvent[] = [];
    for (const event of events) {
      const result = await prisma.$transaction(async (tx) => {
        const row = await tx.storyTimelineEvent.create({
          data: {
            novelId: event.novelId,
            chapterId: event.chapterId ?? null,
            chapterIndex: event.chapterIndex ?? null,
            eventOrder: event.eventOrder,
            storyDayIndex: event.storyDayIndex ?? null,
            storyTimeLabel: event.storyTimeLabel ?? null,
            title: event.title,
            summary: event.summary,
            type: event.type,
            status: event.status,
            visibility: event.visibility,
            source: event.source,
            participantIdsJson: "[]",
            locationId: event.locationId ?? null,
            factionIdsJson: "[]",
            prerequisiteIdsJson: "[]",
            consequenceIdsJson: "[]",
            stateChangesJson: stringifyJson(event.stateChanges),
            eventKey: event.eventKey ?? null,
            confidence: event.confidence,
          },
        });
        // Write edge tables
        const edgeOps: Prisma.PrismaPromise<unknown>[] = [];
        const prereqData = event.prerequisiteEventIds.filter(id => !!id).map(targetId => ({ novelId: event.novelId, sourceId: row.id, targetId, edgeType: "prerequisite" as const }));
        if (prereqData.length > 0) edgeOps.push(tx.timelineEventEdge.createMany({ data: prereqData }));
        const consData = event.consequenceEventIds.filter(id => !!id).map(targetId => ({ novelId: event.novelId, sourceId: row.id, targetId, edgeType: "consequence" as const }));
        if (consData.length > 0) edgeOps.push(tx.timelineEventEdge.createMany({ data: consData }));
        const partData = event.participantIds.filter(id => !!id).map(characterId => ({ novelId: event.novelId, eventId: row.id, characterId }));
        if (partData.length > 0) edgeOps.push(tx.timelineEventParticipant.createMany({ data: partData }));
        const facData = event.factionIds.filter(id => !!id).map(factionId => ({ novelId: event.novelId, eventId: row.id, factionId }));
        if (facData.length > 0) edgeOps.push(tx.timelineEventFaction.createMany({ data: facData }));
        await Promise.all(edgeOps);
        return row;
      });
      const edges = await batchLoadEventEdges([result.id]);
      created.push(mapTimelineEvent(result, edges));
    }
    return created;
  }

  async createHooks(hooks: Array<{
    novelId: string;
    createdInChapterId: string;
    createdInChapterIndex: number;
    expectedResolveByChapterIndex?: number | null;
    title: string;
    description: string;
    priority: TimelineHook["priority"];
    resolveMode?: TimelineHookResolveMode;
    blocking?: boolean;
    relatedEventIds?: string[];
    participantIds?: string[];
  }>): Promise<void> {
    if (hooks.length === 0) {
      return;
    }
    const createdHooks = await prisma.timelineHook.createManyAndReturn({
      data: hooks.map((hook) => ({
        novelId: hook.novelId,
        createdInChapterId: hook.createdInChapterId,
        createdInChapterIndex: hook.createdInChapterIndex,
        expectedResolveByChapterIndex: hook.expectedResolveByChapterIndex ?? deriveHookDeadline(
          hook.resolveMode ?? "long_arc",
          hook.createdInChapterIndex,
        ),
        resolveMode: hook.resolveMode ?? "long_arc",
        blocking: hook.blocking ?? (hook.resolveMode === "immediate"),
        title: hook.title,
        description: hook.description,
        status: "open",
        priority: hook.priority,
        relatedEventIdsJson: "[]",
        participantIdsJson: "[]",
      })),
      select: { id: true, novelId: true },
    });
    // Write edge tables
    const edgeOps: Prisma.PrismaPromise<unknown>[] = [];
    for (let i = 0; i < createdHooks.length; i++) {
      const { id: hookId, novelId } = createdHooks[i];
      const input = hooks[i];
      if (!input) continue;
      const eventData = (input.relatedEventIds ?? []).filter(id => !!id).map(eventId => ({ novelId, hookId, eventId }));
      if (eventData.length > 0) edgeOps.push(prisma.timelineHookEventLink.createMany({ data: eventData }));
      const partData = (input.participantIds ?? []).filter(id => !!id).map(characterId => ({ novelId, hookId, characterId }));
      if (partData.length > 0) edgeOps.push(prisma.timelineHookParticipant.createMany({ data: partData }));
    }
    if (edgeOps.length > 0) await Promise.all(edgeOps);
  }

  async markHooksAddressed(input: { hookIds: string[]; chapterId: string; chapterIndex: number; resolved?: boolean }): Promise<void> {
    if (input.hookIds.length === 0) {
      return;
    }
    await prisma.timelineHook.updateMany({
      where: { id: { in: input.hookIds } },
      data: {
        status: input.resolved ? "resolved" : "addressed",
        resolvedInChapterId: input.chapterId,
        resolvedInChapterIndex: input.chapterIndex,
      },
    });
  }

  async expireOverdueImmediateHooks(input: { novelId: string; chapterId: string; chapterIndex: number }): Promise<void> {
    await prisma.timelineHook.updateMany({
      where: {
        novelId: input.novelId,
        status: { in: ["open", "addressed"] },
        blocking: true,
        resolveMode: "immediate",
        createdInChapterIndex: { lt: input.chapterIndex },
        OR: [
          { expectedResolveByChapterIndex: null },
          { expectedResolveByChapterIndex: { lte: input.chapterIndex } },
        ],
      },
      data: {
        status: "expired",
        resolvedInChapterId: input.chapterId,
        resolvedInChapterIndex: input.chapterIndex,
      },
    });
  }

  async saveCheckReport(report: Omit<TimelineCheckReport, "id" | "createdAt">): Promise<TimelineCheckReport> {
    const row = await prisma.timelineCheckReport.create({
      data: {
        novelId: report.novelId,
        chapterId: report.chapterId,
        chapterIndex: report.chapterIndex,
        status: report.status,
        score: report.score,
        issuesJson: stringifyJson(report.issues),
      },
    });
    return mapReport(row);
  }
}

export const timelineRepository = new PrismaTimelineRepository();
