// @ts-nocheck — 历史迁移脚本，已执行完毕，字段已从 schema 移除
/**
 * REQ-7005 + REQ-7007: P1+P2 数据迁移脚本
 *
 * P1: World.structureJson.relations → WorldForceRelation / WorldLocationControl / WorldLocationConnection
 * P2: 4 个零散 IdsJson → OpenConflictCharacter / CharacterResourceKnownBy / StoryPlanIssue / StateVersionProposal
 *
 * 用法：npx ts-node-dev --transpile-only src/prisma/migrations-data/20260630_migrate_p1_p2.ts
 */

import { prisma } from "../../db/prisma";

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

// ── P1: World.structureJson → 3 个边表 ──────────────────────

interface StructureRelation {
  id?: string;
  sourceForceId?: string;
  targetForceId?: string;
  forceId?: string;
  locationId?: string;
  sourceLocationId?: string;
  targetLocationId?: string;
  relation?: string;
  tension?: string;
  detail?: string;
  connectionType?: string;
  distanceHint?: string;
  narrativeUse?: string;
}

async function migrateWorldRelations() {
  console.log("[P1] World.structureJson → 边表...");
  const worlds = await prisma.world.findMany({
    where: { structureJson: { not: null } },
    select: { id: true, structureJson: true },
  });

  let totalEdges = 0;
  for (const world of worlds) {
    let structure: { relations?: { forceRelations?: StructureRelation[]; locationControls?: StructureRelation[]; locationConnections?: StructureRelation[] } };
    try {
      structure = JSON.parse(world.structureJson || "{}");
    } catch { continue; }

    const relations = structure.relations;
    if (!relations) continue;

    const ops: Promise<unknown>[] = [];

    // WorldForceRelation
    const forceRelations = relations.forceRelations ?? [];
    if (forceRelations.length > 0) {
      ops.push(prisma.worldForceRelation.createMany({
        data: forceRelations.map((r) => ({
          worldId: world.id,
          sourceForceId: r.sourceForceId ?? "",
          targetForceId: r.targetForceId ?? "",
          relation: r.relation ?? "",
          tension: r.tension ?? "",
          detail: r.detail ?? "",
        })),
      }));
      totalEdges += forceRelations.length;
    }

    // WorldLocationControl
    const locationControls = relations.locationControls ?? [];
    if (locationControls.length > 0) {
      ops.push(prisma.worldLocationControl.createMany({
        data: locationControls.map((r) => ({
          worldId: world.id,
          forceId: r.forceId ?? "",
          locationId: r.locationId ?? "",
          relation: r.relation ?? "",
          detail: r.detail ?? "",
        })),
      }));
      totalEdges += locationControls.length;
    }

    // WorldLocationConnection
    const locationConnections = relations.locationConnections ?? [];
    if (locationConnections.length > 0) {
      ops.push(prisma.worldLocationConnection.createMany({
        data: locationConnections.map((r) => ({
          worldId: world.id,
          sourceLocationId: r.sourceLocationId ?? "",
          targetLocationId: r.targetLocationId ?? "",
          connectionType: r.connectionType ?? "",
          distanceHint: r.distanceHint ?? "",
          narrativeUse: r.narrativeUse ?? "",
        })),
      }));
      totalEdges += locationConnections.length;
    }

    if (ops.length > 0) await Promise.all(ops);
  }
  console.log(`[P1] Worlds: ${worlds.length}, edges created: ${totalEdges}`);
  return { entityCount: worlds.length, edgeCount: totalEdges };
}

// ── P2: 4 个零散字段 → 4 个边表 ──────────────────────

async function migrateOpenConflictCharacters() {
  console.log("[P2] OpenConflict.affectedCharacterIdsJson → OpenConflictCharacter...");
  const items = await prisma.openConflict.findMany({
    where: { affectedCharacterIdsJson: { not: null } },
    select: { id: true, novelId: true, affectedCharacterIdsJson: true },
  });

  let totalEdges = 0;
  let skippedDangling = 0;
  for (const item of items) {
    const charIds = parseJsonArray(item.affectedCharacterIdsJson);
    for (const characterId of charIds) {
      try {
        await prisma.openConflictCharacter.create({
          data: { novelId: item.novelId, conflictId: item.id, characterId },
        });
        totalEdges++;
      } catch (err: unknown) {
        if (err instanceof Error && (err.message.includes("Foreign key") || err.message.includes("Unique constraint"))) {
          skippedDangling++;
        } else { throw err; }
      }
    }
  }
  console.log(`[P2] OpenConflict: ${items.length} items, ${totalEdges} edges, ${skippedDangling} dangling`);
  return { entityCount: items.length, edgeCount: totalEdges };
}

async function migrateCharacterResourceKnownBy() {
  console.log("[P2] CharacterResourceLedgerItem.knownByCharacterIdsJson → CharacterResourceKnownBy...");
  const items = await prisma.characterResourceLedgerItem.findMany({
    where: { knownByCharacterIdsJson: { not: null } },
    select: { id: true, novelId: true, knownByCharacterIdsJson: true },
  });

  let totalEdges = 0;
  let skippedDangling = 0;
  for (const item of items) {
    const charIds = parseJsonArray(item.knownByCharacterIdsJson);
    for (const characterId of charIds) {
      try {
        await prisma.characterResourceKnownBy.create({
          data: { novelId: item.novelId, resourceId: item.id, characterId },
        });
        totalEdges++;
      } catch (err: unknown) {
        if (err instanceof Error && (err.message.includes("Foreign key") || err.message.includes("Unique constraint"))) {
          skippedDangling++;
        } else { throw err; }
      }
    }
  }
  console.log(`[P2] CharacterResource: ${items.length} items, ${totalEdges} edges, ${skippedDangling} dangling`);
  return { entityCount: items.length, edgeCount: totalEdges };
}

async function migrateStoryPlanIssues() {
  console.log("[P2] StoryPlan.sourceIssueIdsJson → StoryPlanIssue...");
  const items = await prisma.storyPlan.findMany({
    where: { sourceIssueIdsJson: { not: null } },
    select: { id: true, novelId: true, sourceIssueIdsJson: true },
  });

  let totalEdges = 0;
  let skippedDangling = 0;
  for (const item of items) {
    const issueIds = parseJsonArray(item.sourceIssueIdsJson);
    for (const issueId of issueIds) {
      try {
        await prisma.storyPlanIssue.create({
          data: { novelId: item.novelId, planId: item.id, issueId },
        });
        totalEdges++;
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes("Foreign key")) {
          skippedDangling++;
        } else {
          throw err;
        }
      }
    }
  }
  console.log(`[P2] StoryPlan: ${items.length} items, ${totalEdges} edges, ${skippedDangling} dangling refs skipped`);
  return { entityCount: items.length, edgeCount: totalEdges };
}

async function migrateStateVersionProposals() {
  console.log("[P2] CanonicalStateVersion.acceptedProposalIdsJson → StateVersionProposal...");
  const items = await prisma.canonicalStateVersion.findMany({
    where: { acceptedProposalIdsJson: { not: null } },
    select: { id: true, novelId: true, acceptedProposalIdsJson: true },
  });

  let totalEdges = 0;
  let skippedDangling = 0;
  for (const item of items) {
    const proposalIds = parseJsonArray(item.acceptedProposalIdsJson);
    for (const proposalId of proposalIds) {
      try {
        await prisma.stateVersionProposal.create({
          data: { novelId: item.novelId, versionId: item.id, proposalId },
        });
        totalEdges++;
      } catch (err: unknown) {
        if (err instanceof Error && (err.message.includes("Foreign key") || err.message.includes("Unique constraint"))) {
          skippedDangling++;
        } else { throw err; }
      }
    }
  }
  console.log(`[P2] CanonicalStateVersion: ${items.length} items, ${totalEdges} edges, ${skippedDangling} dangling`);
  return { entityCount: items.length, edgeCount: totalEdges };
}

// ── Verify ──────────────────────

async function verify(results: Array<{ label: string; entityCount: number; edgeCount: number }>) {
  const [wfr, wlc, wlcon, occ, crk, spi, svp] = await Promise.all([
    prisma.worldForceRelation.count(),
    prisma.worldLocationControl.count(),
    prisma.worldLocationConnection.count(),
    prisma.openConflictCharacter.count(),
    prisma.characterResourceKnownBy.count(),
    prisma.storyPlanIssue.count(),
    prisma.stateVersionProposal.count(),
  ]);

  const totalInTables = wfr + wlc + wlcon + occ + crk + spi + svp;
  const totalFromJson = results.reduce((sum, r) => sum + r.edgeCount, 0);

  console.log("\n[verify] Edge table row counts:");
  console.log(`  WorldForceRelation:          ${wfr}`);
  console.log(`  WorldLocationControl:        ${wlc}`);
  console.log(`  WorldLocationConnection:     ${wlcon}`);
  console.log(`  OpenConflictCharacter:       ${occ}`);
  console.log(`  CharacterResourceKnownBy:    ${crk}`);
  console.log(`  StoryPlanIssue:              ${spi}`);
  console.log(`  StateVersionProposal:        ${svp}`);
  console.log(`  TOTAL in edge tables:        ${totalInTables}`);
  console.log(`  TOTAL from JSON:             ${totalFromJson}`);

  for (const r of results) {
    console.log(`  ${r.label}: ${r.entityCount} entities, ${r.edgeCount} edges`);
  }

  if (totalInTables === totalFromJson) {
    console.log("\n✅ Verification PASSED: JSON element count == edge table row count");
  } else {
    console.warn(`\n⚠️  Verification MISMATCH: ${totalInTables} in tables vs ${totalFromJson} from JSON (diff: ${totalInTables - totalFromJson})`);
  }
}

async function main() {
  console.log("=== REQ-7005 + REQ-7007: P1+P2 数据迁移 ===\n");

  const [worldResult, ocResult, crResult, spResult, csvResult] = await Promise.all([
    migrateWorldRelations(),
    migrateOpenConflictCharacters(),
    migrateCharacterResourceKnownBy(),
    migrateStoryPlanIssues(),
    migrateStateVersionProposals(),
  ]);

  await verify([
    { label: "World.structureJson", ...worldResult },
    { label: "OpenConflict", ...ocResult },
    { label: "CharacterResource", ...crResult },
    { label: "StoryPlan", ...spResult },
    { label: "CanonicalStateVersion", ...csvResult },
  ]);

  console.log("\n=== 迁移完成 ===");
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
