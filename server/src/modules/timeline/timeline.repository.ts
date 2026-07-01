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
import {
  syncEventEdges,
  syncAnchorEdges,
  syncHookEdges,
  syncConstraintEdges,
  readEventEdges,
  readAnchorEdges,
  readHookEdges,
  readConstraintEdges,
} from "./timelineEdgeTableSync";

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

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

interface EdgeOverrides {
  participantIds?: string[];
  factionIds?: string[];
  prerequisiteEventIds?: string[];
  consequenceEventIds?: string[];
}

function mapTimelineEvent(
  row: EventRow,
  edgeOverrides?: EdgeOverrides,
): StoryTimelineEvent {
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
    participantIds: edgeOverrides?.participantIds ?? parseJsonArray(row.participantIdsJson),
    locationId: row.locationId,
    factionIds: edgeOverrides?.factionIds ?? parseJsonArray(row.factionIdsJson),
    prerequisiteEventIds: edgeOverrides?.prerequisiteEventIds ?? parseJsonArray(row.prerequisiteIdsJson),
    consequenceEventIds: edgeOverrides?.consequenceEventIds ?? parseJsonArray(row.consequenceIdsJson),
    stateChanges: parseJson(row.stateChangesJson, []),
    eventKey: row.eventKey,
    confidence: row.confidence,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

interface AnchorEdgeOverrides {
  startsAfterEventIds?: string[];
  plannedEventIds?: string[];
  endedWithEventIds?: string[];
  previousHookIds?: string[];
  nextHookIds?: string[];
  forbiddenEventIds?: string[];
}

function mapAnchor(
  row: NonNullable<AnchorRow>,
  edgeOverrides?: AnchorEdgeOverrides,
): ChapterTimeAnchor {
  return {
    id: row.id,
    novelId: row.novelId,
    chapterId: row.chapterId,
    chapterIndex: row.chapterIndex,
    storyDayIndex: row.storyDayIndex,
    timeLabel: row.timeLabel,
    startsAfterEventIds: edgeOverrides?.startsAfterEventIds ?? parseJsonArray(row.startsAfterIdsJson),
    plannedEventIds: edgeOverrides?.plannedEventIds ?? parseJsonArray(row.plannedEventIdsJson),
    endedWithEventIds: edgeOverrides?.endedWithEventIds ?? parseJsonArray(row.endedWithIdsJson),
    previousHookIds: edgeOverrides?.previousHookIds ?? parseJsonArray(row.previousHookIdsJson),
    nextHookIds: edgeOverrides?.nextHookIds ?? parseJsonArray(row.nextHookIdsJson),
    forbiddenEventIds: edgeOverrides?.forbiddenEventIds ?? parseJsonArray(row.forbiddenEventIdsJson),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

interface HookEdgeOverrides {
  relatedEventIds?: string[];
  participantIds?: string[];
}

export function mapTimelineHook(
  row: HookRow,
  edgeOverrides?: HookEdgeOverrides,
): TimelineHook {
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
    relatedEventIds: edgeOverrides?.relatedEventIds ?? parseJsonArray(row.relatedEventIdsJson),
    participantIds: edgeOverrides?.participantIds ?? parseJsonArray(row.participantIdsJson),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

interface ConstraintEdgeOverrides {
  relatedEventIds?: string[];
  relatedHookIds?: string[];
  relatedCharacterIds?: string[];
}

function mapConstraint(
  row: ConstraintRow,
  edgeOverrides?: ConstraintEdgeOverrides,
): TimelineConstraint {
  return {
    id: row.id,
    novelId: row.novelId,
    chapterId: row.chapterId,
    chapterIndex: row.chapterIndex,
    type: row.type as TimelineConstraint["type"],
    severity: row.severity as TimelineConstraint["severity"],
    description: row.description,
    relatedEventIds: edgeOverrides?.relatedEventIds ?? parseJsonArray(row.relatedEventIdsJson),
    relatedHookIds: edgeOverrides?.relatedHookIds ?? parseJsonArray(row.relatedHookIdsJson),
    relatedCharacterIds: edgeOverrides?.relatedCharacterIds ?? parseJsonArray(row.relatedCharacterIdsJson),
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

/**
 * Resolve edge data for a batch of events from edge tables.
 * Returns a Map<eventId, EdgeOverrides>.
 */
async function resolveEventEdgesBatch(
  events: Array<{ id: string }>,
): Promise<Map<string, EdgeOverrides>> {
  if (events.length === 0) {
    return new Map();
  }
  const ids = events.map((e) => e.id);
  const [participants, factions, outgoingEdges, incomingEdges] = await Promise.all([
    prisma.timelineEventParticipant.findMany({
      where: { eventId: { in: ids } },
      select: { eventId: true, characterId: true },
    }),
    prisma.timelineEventFaction.findMany({
      where: { eventId: { in: ids } },
      select: { eventId: true, factionId: true },
    }),
    prisma.timelineEventEdge.findMany({
      where: { sourceId: { in: ids } },
      select: { sourceId: true, targetId: true, edgeType: true },
    }),
    prisma.timelineEventEdge.findMany({
      where: { targetId: { in: ids } },
      select: { sourceId: true, targetId: true, edgeType: true },
    }),
  ]);

  const map = new Map<string, EdgeOverrides>();

  // Build lookup by eventId
  const participantMap = new Map<string, string[]>();
  for (const p of participants) {
    const arr = participantMap.get(p.eventId) ?? [];
    arr.push(p.characterId);
    participantMap.set(p.eventId, arr);
  }

  const factionMap = new Map<string, string[]>();
  for (const f of factions) {
    const arr = factionMap.get(f.eventId) ?? [];
    arr.push(f.factionId);
    factionMap.set(f.eventId, arr);
  }

  const prereqMap = new Map<string, string[]>();
  for (const e of incomingEdges) {
    if (e.edgeType !== "prerequisite") continue;
    const arr = prereqMap.get(e.targetId) ?? [];
    arr.push(e.sourceId);
    prereqMap.set(e.targetId, arr);
  }

  const consequenceMap = new Map<string, string[]>();
  for (const e of outgoingEdges) {
    if (e.edgeType !== "consequence") continue;
    const arr = consequenceMap.get(e.sourceId) ?? [];
    arr.push(e.targetId);
    consequenceMap.set(e.sourceId, arr);
  }

  for (const event of events) {
    const overrides: EdgeOverrides = {};
    if (participantMap.has(event.id)) overrides.participantIds = participantMap.get(event.id);
    if (factionMap.has(event.id)) overrides.factionIds = factionMap.get(event.id);
    if (prereqMap.has(event.id)) overrides.prerequisiteEventIds = prereqMap.get(event.id);
    if (consequenceMap.has(event.id)) overrides.consequenceEventIds = consequenceMap.get(event.id);
    map.set(event.id, overrides);
  }

  return map;
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
    const edgeMap = await resolveEventEdgesBatch(ordered);
    return ordered.map((row) => mapTimelineEvent(row, edgeMap.get(row.id)));
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
    const edgeMap = await resolveEventEdgesBatch(rows);
    return rows.map((row) => mapTimelineEvent(row, edgeMap.get(row.id)));
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
    const edgeMap = await resolveEventEdgesBatch(rows);
    return rows.map((row) => mapTimelineEvent(row, edgeMap.get(row.id)));
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

    // Batch-resolve edge data for hooks
    const hookIds = rows.map((r) => r.id);
    const [eventLinks, participants] = await Promise.all([
      prisma.timelineHookEventLink.findMany({
        where: { hookId: { in: hookIds } },
        select: { hookId: true, eventId: true },
      }),
      prisma.timelineHookParticipant.findMany({
        where: { hookId: { in: hookIds } },
        select: { hookId: true, characterId: true },
      }),
    ]);

    const hookEventMap = new Map<string, string[]>();
    for (const l of eventLinks) {
      const arr = hookEventMap.get(l.hookId) ?? [];
      arr.push(l.eventId);
      hookEventMap.set(l.hookId, arr);
    }

    const hookPartMap = new Map<string, string[]>();
    for (const p of participants) {
      const arr = hookPartMap.get(p.hookId) ?? [];
      arr.push(p.characterId);
      hookPartMap.set(p.hookId, arr);
    }

    return rows
      .map((row) =>
        mapTimelineHook(row, {
          relatedEventIds: hookEventMap.get(row.id),
          participantIds: hookPartMap.get(row.id),
        }),
      )
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

    // Batch-resolve edge data for constraints
    const constraintIds = rows.map((r) => r.id);
    const links = await prisma.timelineConstraintLink.findMany({
      where: { constraintId: { in: constraintIds } },
      select: { constraintId: true, refType: true, refId: true },
    });

    const constraintLinksMap = new Map<string, ConstraintEdgeOverrides>();
    for (const l of links) {
      const existing = constraintLinksMap.get(l.constraintId) ?? {};
      if (l.refType === "event") {
        existing.relatedEventIds = [...(existing.relatedEventIds ?? []), l.refId];
      } else if (l.refType === "hook") {
        existing.relatedHookIds = [...(existing.relatedHookIds ?? []), l.refId];
      } else if (l.refType === "character") {
        existing.relatedCharacterIds = [...(existing.relatedCharacterIds ?? []), l.refId];
      }
      constraintLinksMap.set(l.constraintId, existing);
    }

    return rows.map((row) => mapConstraint(row, constraintLinksMap.get(row.id)));
  }

  async getChapterTimeAnchor(input: { novelId: string; chapterId: string }): Promise<ChapterTimeAnchor | null> {
    const row = await prisma.chapterTimeAnchor.findUnique({
      where: { novelId_chapterId: { novelId: input.novelId, chapterId: input.chapterId } },
    });
    if (!row) return null;
    const edgeData = await readAnchorEdges(row.id);
    return mapAnchor(row, edgeData);
  }

  async getLatestCheckReport(input: { novelId: string; chapterId: string }): Promise<TimelineCheckReport | null> {
    const row = await prisma.timelineCheckReport.findFirst({
      where: { novelId: input.novelId, chapterId: input.chapterId },
      orderBy: { createdAt: "desc" },
    });
    return row ? mapReport(row) : null;
  }

  async upsertChapterTimeAnchor(input: Omit<ChapterTimeAnchor, "id" | "createdAt" | "updatedAt">): Promise<ChapterTimeAnchor> {
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
    const row = await prisma.chapterTimeAnchor.upsert({
      where: { novelId_chapterId: { novelId: input.novelId, chapterId: input.chapterId } },
      create: {
        novelId: input.novelId,
        chapterId: input.chapterId,
        ...data,
      },
      update: data,
    });

    // Dual-write: sync anchor edge tables
    await syncAnchorEdges(
      row.id,
      input.novelId,
      input.startsAfterEventIds ?? [],
      input.plannedEventIds ?? [],
      input.endedWithEventIds ?? [],
      input.previousHookIds ?? [],
      input.nextHookIds ?? [],
      input.forbiddenEventIds ?? [],
    );

    const edgeData = await readAnchorEdges(row.id);
    return mapAnchor(row, edgeData);
  }

  async saveExtractedEvents(events: Array<Omit<StoryTimelineEvent, "id" | "createdAt" | "updatedAt">>): Promise<StoryTimelineEvent[]> {
    const created: StoryTimelineEvent[] = [];
    for (const event of events) {
      const row = await prisma.storyTimelineEvent.create({
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
          participantIdsJson: stringifyJson(event.participantIds),
          locationId: event.locationId ?? null,
          factionIdsJson: stringifyJson(event.factionIds),
          prerequisiteIdsJson: stringifyJson(event.prerequisiteEventIds),
          consequenceIdsJson: stringifyJson(event.consequenceEventIds),
          stateChangesJson: stringifyJson(event.stateChanges),
          eventKey: event.eventKey ?? null,
          confidence: event.confidence,
        },
      });

      // Dual-write: sync event edge tables
      await syncEventEdges(
        row.id,
        event.novelId,
        event.participantIds ?? [],
        event.factionIds ?? [],
        event.prerequisiteEventIds ?? [],
        event.consequenceEventIds ?? [],
      );

      const edgeData = await readEventEdges(row.id);
      created.push(mapTimelineEvent(row, edgeData));
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

    // createMany returns no IDs in SQLite, so we find the newly created hooks
    const now = new Date();
    await prisma.timelineHook.createMany({
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
        relatedEventIdsJson: stringifyJson(hook.relatedEventIds ?? []),
        participantIdsJson: stringifyJson(hook.participantIds ?? []),
      })),
    });

    // Dual-write: find the newly created hooks and sync edge tables
    const createdHooks = await prisma.timelineHook.findMany({
      where: {
        novelId: hooks[0].novelId,
        createdAt: { gte: now },
      },
      select: { id: true, title: true },
    });

    for (const hook of hooks) {
      const matchedHook = createdHooks.find((h) => h.title === hook.title);
      if (matchedHook) {
        await syncHookEdges(
          matchedHook.id,
          hook.novelId,
          hook.relatedEventIds ?? [],
          hook.participantIds ?? [],
        );
      }
    }
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
