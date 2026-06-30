/**
 * WorldStructureSource type definition.
 * Extracted from worldStructure.ts for modularity.
 */

import type { World as PrismaWorld } from "@prisma/client";

export type WorldStructureSource = Pick<
  PrismaWorld,
  | "id"
  | "name"
  | "worldType"
  | "description"
  | "overviewSummary"
  | "axioms"
  | "background"
  | "geography"
  | "cultures"
  | "magicSystem"
  | "politics"
  | "races"
  | "religions"
  | "technology"
  | "conflicts"
  | "history"
  | "economy"
  | "factions"
  | "selectedElements"
  | "structureJson"
  | "bindingSupportJson"
  | "structureSchemaVersion"
>;
