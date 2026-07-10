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

import type { Prisma } from "@prisma/client";
import type { WorldStructuredData } from "@ai-novel/shared";
import { prisma } from "../../db/prisma";

/** Database client — either the global prisma or a transaction client. */
export type WorldEdgeDbClient = Prisma.TransactionClient | typeof prisma;

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
  client?: WorldEdgeDbClient,
): Promise<EdgeTableSyncResult> {
  const db = client ?? prisma;
  const { forceRelations, locationControls, locationConnections } = structure.relations;

  const [frCount, lcCount, lconCount] = await Promise.all([
    // WorldForceRelation
    forceRelations.length > 0
      ? db.worldForceRelation
        .deleteMany({ where: { worldId } })
        .then(() =>
          db.worldForceRelation.createMany({
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
      : db.worldForceRelation.deleteMany({ where: { worldId } }).then(() => 0),

    // WorldLocationControl
    locationControls.length > 0
      ? db.worldLocationControl
        .deleteMany({ where: { worldId } })
        .then(() =>
          db.worldLocationControl.createMany({
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
      : db.worldLocationControl.deleteMany({ where: { worldId } }).then(() => 0),

    // WorldLocationConnection
    (locationConnections ?? []).length > 0
      ? db.worldLocationConnection
        .deleteMany({ where: { worldId } })
        .then(() =>
          db.worldLocationConnection.createMany({
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
      : db.worldLocationConnection.deleteMany({ where: { worldId } }).then(() => 0),
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
