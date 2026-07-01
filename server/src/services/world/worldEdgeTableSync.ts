/**
 * World Edge Table Sync — dual-write helper for REQ-7007.
 *
 * When structureJson is persisted, this module同步 writes the
 * relations into 3 edge tables:
 *   - WorldForceRelation
 *   - WorldLocationControl
 *   - WorldLocationConnection
 *
 * Strategy: deleteMany(worldId) + createMany — idempotent upsert.
 */

import type { WorldStructuredData } from "@ai-novel/shared/types/world";
import { prisma } from "../../db/prisma";

export interface EdgeTableSyncResult {
  forceRelations: number;
  locationControls: number;
  locationConnections: number;
}

/**
 * Sync edge tables from the parsed WorldStructuredData.
 * Idempotent: deletes all existing edges for the world, then bulk-inserts.
 */
export async function syncWorldEdgeTables(
  worldId: string,
  structure: WorldStructuredData,
): Promise<EdgeTableSyncResult> {
  const { forceRelations, locationControls, locationConnections } = structure.relations;

  const [frCount, lcCount, lconCount] = await Promise.all([
    // WorldForceRelation
    forceRelations.length > 0
      ? prisma.worldForceRelation
        .deleteMany({ where: { worldId } })
        .then(() =>
          prisma.worldForceRelation.createMany({
            data: forceRelations.map((r) => ({
              worldId,
              sourceForceId: r.sourceForceId,
              targetForceId: r.targetForceId,
              relation: r.relation,
              tension: r.tension,
              detail: r.detail,
            })),
          })
        )
        .then((r) => r.count)
      : prisma.worldForceRelation.deleteMany({ where: { worldId } }).then(() => 0),

    // WorldLocationControl
    locationControls.length > 0
      ? prisma.worldLocationControl
        .deleteMany({ where: { worldId } })
        .then(() =>
          prisma.worldLocationControl.createMany({
            data: locationControls.map((r) => ({
              worldId,
              forceId: r.forceId,
              locationId: r.locationId,
              relation: r.relation,
              detail: r.detail,
            })),
          })
        )
        .then((r) => r.count)
      : prisma.worldLocationControl.deleteMany({ where: { worldId } }).then(() => 0),

    // WorldLocationConnection
    (locationConnections ?? []).length > 0
      ? prisma.worldLocationConnection
        .deleteMany({ where: { worldId } })
        .then(() =>
          prisma.worldLocationConnection.createMany({
            data: (locationConnections ?? []).map((r) => ({
              worldId,
              sourceLocationId: r.sourceLocationId,
              targetLocationId: r.targetLocationId,
              connectionType: r.connectionType,
              distanceHint: r.distanceHint,
              narrativeUse: r.narrativeUse,
            })),
          })
        )
        .then((r) => r.count)
      : prisma.worldLocationConnection.deleteMany({ where: { worldId } }).then(() => 0),
  ]);

  return {
    forceRelations: frCount,
    locationControls: lcCount,
    locationConnections: lconCount,
  };
}

/**
 * Read edge tables for a world. Returns the data directly from Prisma.
 * Used by visualization to prefer edge tables over JSON.
 */
export async function readWorldEdgeTables(worldId: string) {
  const [forceRelations, locationControls, locationConnections] = await Promise.all([
    prisma.worldForceRelation.findMany({
      where: { worldId },
      select: { sourceForceId: true, targetForceId: true, relation: true, tension: true, detail: true },
    }),
    prisma.worldLocationControl.findMany({
      where: { worldId },
      select: { forceId: true, locationId: true, relation: true, detail: true },
    }),
    prisma.worldLocationConnection.findMany({
      where: { worldId },
      select: {
        sourceLocationId: true,
        targetLocationId: true,
        connectionType: true,
        distanceHint: true,
        narrativeUse: true,
      },
    }),
  ]);

  return { forceRelations, locationControls, locationConnections };
}
