/**
 * World structure legacy seed builders — parse legacy text fields into
 * structured WorldFaction / WorldForce / WorldLocation objects.
 * Extracted from worldStructureLegacy.ts for modularity.
 */

import type {
  WorldFaction,
  WorldForce,
  WorldForceRelation,
  WorldLocation,
} from "@ai-novel/shared";

import {
  dedupeByName,
  dedupeById,
  makeId,
  normalizeRecord,
  normalizeStringArray,
  normalizeText,
  normalizeStringArray as _normalizeStringArray,
  parseLegacyArray,
  parseLegacyObject,
  parseListText,
} from "./worldStructureHelpers";

import {
  normalizeFaction,
  normalizeForce,
  normalizeLocation,
} from "./worldStructureNormalization";

/* ------------------------------------------------------------------ */
/*  Seed helpers (used by legacy builders)                             */
/* ------------------------------------------------------------------ */

export function seedFaction(name: string, description = ""): WorldFaction {
  return {
    id: makeId("faction", 0, name),
    name,
    position: "",
    doctrine: description,
    goals: [],
    methods: [],
    representativeForceIds: [],
  };
}

export function seedForce(name: string, description = "", category = ""): WorldForce {
  return {
    id: makeId("force", 0, name),
    name,
    type: category,
    factionId: null,
    role: null,
    resources: [],
    controlledLocationIds: [],
    summary: description,
    baseOfPower: "",
    currentObjective: "",
    pressure: "",
    leader: null,
    narrativeRole: "",
  };
}

export function seedLocation(name: string, description = "", terrain = ""): WorldLocation {
  return {
    id: makeId("location", 0, name),
    name,
    type: null,
    region: null,
    terrain,
    summary: description,
    narrativeFunction: "",
    risk: "",
    riskLevel: undefined,
    storyRelevance: "",
    entryConstraint: "",
    exitCost: "",
    controllingForceIds: [],
  };
}

/* ------------------------------------------------------------------ */
/*  Legacy faction/force seed builders                                 */
/* ------------------------------------------------------------------ */

export function buildLegacyFactionSeeds(raw: string | null | undefined): { factions: WorldFaction[]; forces: WorldForce[] } {
  const parsedItems = parseLegacyArray(raw, ["factions", "forces", "organizations"]);
  if (parsedItems) {
    const factions = parsedItems
      .map((item, index) => normalizeFaction(item, index))
      .filter((item): item is WorldFaction => Boolean(item));
    const forces = parsedItems
      .map((item, index) => normalizeForce(item, index))
      .filter((item): item is WorldForce => Boolean(item));
    return { factions, forces };
  }
  const names = parseListText(raw);
  return {
    factions: names.map((name) => seedFaction(name)),
    forces: names.map((name) => seedForce(name)),
  };
}

/* ------------------------------------------------------------------ */
/*  Legacy location helpers                                            */
/* ------------------------------------------------------------------ */

function inferLegacyLocationName(text: string): string {
  const normalized = text.replace(/^[-*]\s*/, "").trim();
  const afterColon = normalized.includes("：") ? normalized.split("：").slice(1).join("：").trim() : normalized;
  const patterns: Array<[RegExp, string]> = [
    [/太平洋.*禁航区|太平洋.*异界入口|深海.*异界入口/, "太平洋深海禁航区"],
    [/北极冰盖|北极.*基地/, "北极冰盖秘密基地"],
    [/昆仑山|昆仑.*通道/, "昆仑山神话通道"],
    [/阿尔卑斯.*古堡|欧洲.*古堡/, "阿尔卑斯古堡指挥中心"],
    [/城市.*地下|地下.*设施/, "全球城市地下设施"],
    [/南极冰盖|极夜风暴/, "南极旧日封印区"],
  ];
  for (const [pattern, name] of patterns) {
    if (pattern.test(afterColon)) {
      return name;
    }
  }
  const candidate = afterColon
    .split(/[，。,.]|被|隐藏|实为|用于|传言|内有|是/)
    .map((item) => item.trim())
    .find((item) => item.length >= 2);
  return candidate ? candidate.slice(0, 24) : normalized.slice(0, 24);
}

function splitLegacyGeographyClauses(raw: string | null | undefined): string[] {
  const normalized = raw?.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }
  const content = normalized.includes("：")
    ? normalized.split("：").slice(1).join("：").trim()
    : normalized;
  return Array.from(
    new Set(
      content
        .split(/[\n;；]+/)
        .map((item) => item.replace(/^此外[，,]\s*/, "").trim())
        .filter((item) => item.length >= 4),
    ),
  );
}

export function buildLegacyLocationSeeds(geography: string | null | undefined, conflicts: string | null | undefined): WorldLocation[] {
  const parsedLocations = parseLegacyArray(geography, ["locations", "regions", "places"]);
  const locations = parsedLocations
    ? parsedLocations
      .map((item, index) => normalizeLocation(item, index))
      .filter((item): item is WorldLocation => Boolean(item))
    : splitLegacyGeographyClauses(geography)
      .map((item, index) => seedLocation(inferLegacyLocationName(item), item))
      .filter((item) => item.name);

  const conflictObject = parseLegacyObject(conflicts);
  const flashpoints = Array.isArray(conflictObject.flashpoints) ? conflictObject.flashpoints : [];
  const flashpointLocations = flashpoints
    .map((item, index) => {
      const record = normalizeRecord(item);
      const name = normalizeText(record.location ?? record.name);
      if (!name) {
        return null;
      }
      return seedLocation(name, normalizeText(record.description), "冲突热点");
    })
    .filter((item): item is WorldLocation => Boolean(item));

  return dedupeByName([...locations, ...flashpointLocations]);
}

export function buildLegacyForceRelations(conflicts: string | null | undefined, forces: WorldForce[]): WorldForceRelation[] {
  const conflictObject = parseLegacyObject(conflicts);
  const primaryConflicts = Array.isArray(conflictObject.primaryConflicts) ? conflictObject.primaryConflicts : [];
  const forceByName = new Map(forces.map((item) => [item.name, item]));
  const relations: WorldForceRelation[] = [];
  primaryConflicts.forEach((item, index) => {
    const record = normalizeRecord(item);
    const parties = normalizeStringArray(record.parties);
    const matched = parties
      .map((party) => Array.from(forceByName.values()).find((force) => party.includes(force.name) || force.name.includes(party)))
      .filter((force): force is WorldForce => Boolean(force));
    if (matched.length < 2) {
      return;
    }
    relations.push({
      id: makeId("force-relation", index, `${matched[0].id}-${matched[1].id}`),
      sourceForceId: matched[0].id,
      targetForceId: matched[1].id,
      relation: normalizeText(record.type, "冲突"),
      tension: normalizeText(record.type),
      detail: normalizeText(record.description),
    });
  });
  return dedupeById(relations);
}
