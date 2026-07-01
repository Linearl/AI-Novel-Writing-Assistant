// @ts-nocheck — 历史迁移脚本，已执行完毕，字段已从 schema 移除
/**
 * REQ-7004: 数据迁移脚本 — JSON 软引用 → 独立边表
 *
 * 迁移范围：
 * - StoryTimelineEvent: participantIdsJson, factionIdsJson, prerequisiteIdsJson, consequenceIdsJson
 * - ChapterTimeAnchor: startsAfterIdsJson, plannedEventIdsJson, endedWithIdsJson, forbiddenEventIdsJson
 * - TimelineHook: relatedEventIdsJson, participantIdsJson
 * - TimelineConstraint: relatedEventIdsJson, relatedHookIdsJson, relatedCharacterIdsJson
 *
 * 用法：npx ts-node-dev --transpile-only src/prisma/migrations-data/20260630_migrate_json_to_edges.ts
 */

import { prisma } from "../../db/prisma";
import { logger } from "../../services/logging/LoggerService";

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

async function migrateStoryTimelineEvents() {
  logger.info("[migrate] StoryTimelineEvent → edge tables...");
  const events = await prisma.storyTimelineEvent.findMany({
    select: { id: true, novelId: true, participantIdsJson: true, factionIdsJson: true, prerequisiteIdsJson: true, consequenceIdsJson: true },
  });

  let totalEdges = 0;
  for (const event of events) {
    const ops: Promise<unknown>[] = [];

    const prereqIds = parseJsonArray(event.prerequisiteIdsJson);
    if (prereqIds.length > 0) {
      ops.push(prisma.timelineEventEdge.createMany({
        data: prereqIds.map(targetId => ({ novelId: event.novelId, sourceId: event.id, targetId, edgeType: "prerequisite" })),
      }));
      totalEdges += prereqIds.length;
    }

    const consequenceIds = parseJsonArray(event.consequenceIdsJson);
    if (consequenceIds.length > 0) {
      ops.push(prisma.timelineEventEdge.createMany({
        data: consequenceIds.map(targetId => ({ novelId: event.novelId, sourceId: event.id, targetId, edgeType: "consequence" })),
      }));
      totalEdges += consequenceIds.length;
    }

    const participantIds = parseJsonArray(event.participantIdsJson);
    if (participantIds.length > 0) {
      ops.push(prisma.timelineEventParticipant.createMany({
        data: participantIds.map(characterId => ({ novelId: event.novelId, eventId: event.id, characterId })),
      }));
      totalEdges += participantIds.length;
    }

    const factionIds = parseJsonArray(event.factionIdsJson);
    if (factionIds.length > 0) {
      ops.push(prisma.timelineEventFaction.createMany({
        data: factionIds.map(factionId => ({ novelId: event.novelId, eventId: event.id, factionId })),
      }));
      totalEdges += factionIds.length;
    }

    if (ops.length > 0) await Promise.all(ops);
  }
  logger.info(`[migrate] StoryTimelineEvent: ${events.length} events, ${totalEdges} edges created`);
  return { entityCount: events.length, edgeCount: totalEdges };
}

async function migrateChapterTimeAnchors() {
  logger.info("[migrate] ChapterTimeAnchor → edge tables...");
  const anchors = await prisma.chapterTimeAnchor.findMany({
    select: { id: true, novelId: true, startsAfterIdsJson: true, plannedEventIdsJson: true, endedWithIdsJson: true, forbiddenEventIdsJson: true },
  });

  let totalEdges = 0;
  for (const anchor of anchors) {
    const allLinkTypes: Array<{ json: string; linkType: string }> = [
      { json: anchor.startsAfterIdsJson, linkType: "startsAfter" },
      { json: anchor.plannedEventIdsJson, linkType: "plannedEvent" },
      { json: anchor.endedWithIdsJson, linkType: "endedWith" },
      { json: anchor.forbiddenEventIdsJson, linkType: "forbidden" },
    ];

    const data: Array<{ novelId: string; anchorId: string; eventId: string; linkType: string }> = [];
    for (const { json, linkType } of allLinkTypes) {
      const eventIds = parseJsonArray(json);
      for (const eventId of eventIds) {
        data.push({ novelId: anchor.novelId, anchorId: anchor.id, eventId, linkType });
      }
      totalEdges += eventIds.length;
    }

    if (data.length > 0) {
      await prisma.timelineAnchorEventLink.createMany({ data });
    }
  }
  logger.info(`[migrate] ChapterTimeAnchor: ${anchors.length} anchors, ${totalEdges} edges created`);
  return { entityCount: anchors.length, edgeCount: totalEdges };
}

async function migrateTimelineHooks() {
  logger.info("[migrate] TimelineHook → edge tables...");
  const hooks = await prisma.timelineHook.findMany({
    select: { id: true, novelId: true, relatedEventIdsJson: true, participantIdsJson: true },
  });

  let totalEdges = 0;
  for (const hook of hooks) {
    const ops: Promise<unknown>[] = [];

    const eventIds = parseJsonArray(hook.relatedEventIdsJson);
    if (eventIds.length > 0) {
      ops.push(prisma.timelineHookEventLink.createMany({
        data: eventIds.map(eventId => ({ novelId: hook.novelId, hookId: hook.id, eventId })),
      }));
      totalEdges += eventIds.length;
    }

    const participantIds = parseJsonArray(hook.participantIdsJson);
    if (participantIds.length > 0) {
      ops.push(prisma.timelineHookParticipant.createMany({
        data: participantIds.map(characterId => ({ novelId: hook.novelId, hookId: hook.id, characterId })),
      }));
      totalEdges += participantIds.length;
    }

    if (ops.length > 0) await Promise.all(ops);
  }
  logger.info(`[migrate] TimelineHook: ${hooks.length} hooks, ${totalEdges} edges created`);
  return { entityCount: hooks.length, edgeCount: totalEdges };
}

async function migrateTimelineConstraints() {
  logger.info("[migrate] TimelineConstraint → edge tables...");
  const constraints = await prisma.timelineConstraint.findMany({
    select: { id: true, novelId: true, relatedEventIdsJson: true, relatedHookIdsJson: true, relatedCharacterIdsJson: true },
  });

  let totalEdges = 0;
  for (const constraint of constraints) {
    const data: Array<{ novelId: string; constraintId: string; refType: string; refId: string }> = [];

    const eventIds = parseJsonArray(constraint.relatedEventIdsJson);
    for (const refId of eventIds) data.push({ novelId: constraint.novelId, constraintId: constraint.id, refType: "event", refId });
    totalEdges += eventIds.length;

    const hookIds = parseJsonArray(constraint.relatedHookIdsJson);
    for (const refId of hookIds) data.push({ novelId: constraint.novelId, constraintId: constraint.id, refType: "hook", refId });
    totalEdges += hookIds.length;

    const charIds = parseJsonArray(constraint.relatedCharacterIdsJson);
    for (const refId of charIds) data.push({ novelId: constraint.novelId, constraintId: constraint.id, refType: "character", refId });
    totalEdges += charIds.length;

    if (data.length > 0) {
      await prisma.timelineConstraintLink.createMany({ data });
    }
  }
  logger.info(`[migrate] TimelineConstraint: ${constraints.length} constraints, ${totalEdges} edges created`);
  return { entityCount: constraints.length, edgeCount: totalEdges };
}

async function verify(results: Array<{ entityCount: number; edgeCount: number }>) {
  const [edgeCount, participantCount, factionCount, anchorLinkCount, hookEventCount, hookPartCount, constraintLinkCount] = await Promise.all([
    prisma.timelineEventEdge.count(),
    prisma.timelineEventParticipant.count(),
    prisma.timelineEventFaction.count(),
    prisma.timelineAnchorEventLink.count(),
    prisma.timelineHookEventLink.count(),
    prisma.timelineHookParticipant.count(),
    prisma.timelineConstraintLink.count(),
  ]);

  const totalInTables = edgeCount + participantCount + factionCount + anchorLinkCount + hookEventCount + hookPartCount + constraintLinkCount;
  const totalFromJson = results.reduce((sum, r) => sum + r.edgeCount, 0);

  logger.info("\n[verify] Edge table row counts:");
  logger.info(`  TimelineEventEdge:          ${edgeCount}`);
  logger.info(`  TimelineEventParticipant:   ${participantCount}`);
  logger.info(`  TimelineEventFaction:       ${factionCount}`);
  logger.info(`  TimelineAnchorEventLink:    ${anchorLinkCount}`);
  logger.info(`  TimelineHookEventLink:      ${hookEventCount}`);
  logger.info(`  TimelineHookParticipant:    ${hookPartCount}`);
  logger.info(`  TimelineConstraintLink:     ${constraintLinkCount}`);
  logger.info(`  TOTAL in edge tables:       ${totalInTables}`);
  logger.info(`  TOTAL from JSON arrays:     ${totalFromJson}`);

  if (totalInTables === totalFromJson) {
    logger.info("\n✅ Verification PASSED: JSON element count == edge table row count");
  } else {
    logger.warn(`\n⚠️  Verification MISMATCH: ${totalInTables} in tables vs ${totalFromJson} from JSON (diff: ${totalInTables - totalFromJson})`);
  }
}

async function main() {
  logger.info("=== REQ-7004: JSON 软引用 → 边表数据迁移 ===\n");

  const results = await Promise.all([
    migrateStoryTimelineEvents(),
    migrateChapterTimeAnchors(),
    migrateTimelineHooks(),
    migrateTimelineConstraints(),
  ]);

  await verify(results);

  logger.info("\n=== 迁移完成 ===");
}

main()
  .catch((err) => {
    logger.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
