/**
 * World structure legacy text builders — functions that convert
 * structured world data into legacy text formats for backward
 * compatibility fields.
 * Extracted from worldStructure.ts for modularity.
 */

import type {
  WorldFaction,
  WorldForce,
  WorldForceRelation,
  WorldLocation,
  WorldStructuredData,
} from "@ai-novel/shared/types/world";

import {
  dedupeByName,
  dedupeById,
  makeId,
  normalizeRecord,
  normalizeStringArray,
  normalizeText,
  parseAxiomStrings,
  parseLegacyArray,
  parseLegacyObject,
  parseListText,
  formatRuleText,
} from "./worldStructureHelpers";

import {
  WORLD_STRUCTURE_SCHEMA_VERSION,
} from "./worldStructureConstants";

import {
  normalizeFaction,
  normalizeForce,
  normalizeLocation,
  createEmptyWorldStructure,
  createEmptyWorldRelations,
  normalizeWorldStructuredData,
} from "./worldStructureNormalization";

import { buildStructuredRulesFromAxiomTexts } from "./worldStructureHelpers";

import type { WorldStructureSource } from "./worldStructureSource";

/* ------------------------------------------------------------------ */
/*  Seed helpers (used by legacy builders)                             */
/* ------------------------------------------------------------------ */

function seedFaction(name: string, description = ""): WorldFaction {
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

function seedForce(name: string, description = "", category = ""): WorldForce {
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

function seedLocation(name: string, description = "", terrain = ""): WorldLocation {
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

function buildLegacyFactionSeeds(raw: string | null | undefined): { factions: WorldFaction[]; forces: WorldForce[] } {
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

function buildLegacyLocationSeeds(geography: string | null | undefined, conflicts: string | null | undefined): WorldLocation[] {
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

function buildLegacyForceRelations(conflicts: string | null | undefined, forces: WorldForce[]): WorldForceRelation[] {
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

/* ------------------------------------------------------------------ */
/*  buildWorldStructureFromLegacySource                                */
/* ------------------------------------------------------------------ */

export function buildWorldStructureFromLegacySource(source: WorldStructureSource): WorldStructuredData {
  const empty = createEmptyWorldStructure();
  const factionSeeds = buildLegacyFactionSeeds(source.factions);
  const policyObject = parseLegacyObject(source.politics);
  const policyForceName = normalizeText(policyObject.governance) ? "三方联合委员会" : "";
  const extraForces = policyForceName ? [seedForce(policyForceName, normalizeText(policyObject.governance), "coordination")] : [];
  const forces = dedupeByName([...factionSeeds.forces, ...extraForces]);
  const locations = buildLegacyLocationSeeds(source.geography, source.conflicts);
  const axiomTexts = parseAxiomStrings(source.axioms);

  const structure = normalizeWorldStructuredData(
    {
      profile: {
        summary: source.description ?? source.overviewSummary ?? "",
        identity: source.worldType ? `${source.worldType} 世界` : "",
        tone: "",
        themes: parseListText(source.cultures).slice(0, 6),
        coreConflict: source.conflicts ?? "",
      },
      rules: {
        summary: source.magicSystem ?? "",
        axioms: buildStructuredRulesFromAxiomTexts(axiomTexts),
        taboo: [],
        sharedConsequences: [],
      },
      factions: dedupeByName(factionSeeds.factions),
      forces,
      locations,
      relations: {
        ...createEmptyWorldRelations(),
        forceRelations: buildLegacyForceRelations(source.conflicts, forces),
      },
      metadata: {
        schemaVersion: WORLD_STRUCTURE_SCHEMA_VERSION,
        seededFrom: "legacy-text",
      },
    },
    empty,
  );

  return structure;
}

/* ------------------------------------------------------------------ */
/*  Legacy text builders (structured -> text fields)                   */
/* ------------------------------------------------------------------ */

export function buildFactionLegacyText(structure: WorldStructuredData): string | null {
  const forceNameById = new Map(structure.forces.map((item) => [item.id, item.name]));
  const lines = [
    ...structure.factions.map((item) =>
      [
        item.name,
        item.position && `立场：${item.position}`,
        item.doctrine && `主张：${item.doctrine}`,
        item.goals.length > 0 && `目标：${item.goals.join("、")}`,
        item.methods.length > 0 && `手段：${item.methods.join("、")}`,
        item.representativeForceIds.length > 0
          && `代表势力：${item.representativeForceIds.map((id) => forceNameById.get(id) ?? id).join("、")}`,
      ]
        .filter(Boolean)
        .join(" | "),
    ),
    ...structure.forces.map((item) =>
      [
        item.name,
        item.type && `类型：${item.type}`,
        item.summary && `概述：${item.summary}`,
        item.leader && `核心人物：${item.leader}`,
      ]
        .filter(Boolean)
        .join(" | "),
    ),
  ].filter(Boolean);
  return lines.length > 0 ? lines.join("\n") : null;
}

export function buildBackgroundLegacyText(structure: WorldStructuredData, bindingSupport: { recommendedEntryPoints: string[] }): string | null {
  const lines = [
    structure.profile.identity && `世界身份：${structure.profile.identity}`,
    structure.profile.summary && `当前处境：${structure.profile.summary}`,
    structure.profile.coreConflict && `开局压力：${structure.profile.coreConflict}`,
    bindingSupport.recommendedEntryPoints.length > 0
      && `可开局入口：${bindingSupport.recommendedEntryPoints.slice(0, 3).join("；")}`,
  ].filter(Boolean);
  return lines.length > 0 ? lines.join("\n") : null;
}

export function buildPowerLegacyText(structure: WorldStructuredData): string | null {
  const ruleLines = [
    structure.rules.summary && `运行规则：${structure.rules.summary}`,
    ...structure.rules.axioms.map((item) =>
      [
        item.name,
        item.summary,
        item.cost && `代价：${item.cost}`,
        item.boundary && `边界：${item.boundary}`,
      ].filter(Boolean).join(" | "),
    ),
  ].filter(Boolean);
  const resourceLines = structure.forces
    .filter((item) => item.resources && item.resources.length > 0)
    .map((item) => `${item.name} 掌握：${(item.resources ?? []).join("、")}`);
  const lines = [...ruleLines, ...resourceLines].filter(Boolean);
  return lines.length > 0 ? lines.join("\n") : null;
}

export function buildCultureLegacyText(structure: WorldStructuredData): string | null {
  const lines = [
    structure.profile.tone && `整体气质：${structure.profile.tone}`,
    structure.profile.themes.length > 0 && `主题压力：${structure.profile.themes.join("、")}`,
    ...structure.rules.taboo.map((item) => `禁忌：${item}`),
    ...structure.rules.sharedConsequences.map((item) => `共同后果：${item}`),
    ...structure.factions.map((item) =>
      [
        item.name,
        item.doctrine && `价值主张：${item.doctrine}`,
        item.methods.length > 0 && `常用方式：${item.methods.join("、")}`,
      ].filter(Boolean).join(" | "),
    ),
  ].filter(Boolean);
  return lines.length > 0 ? lines.join("\n") : null;
}

export function buildHistoryLegacyText(structure: WorldStructuredData): string | null {
  const lines = [
    structure.profile.identity && `故事开始时的世界阶段：${structure.profile.identity}`,
    structure.profile.summary && `当前局面来源：${structure.profile.summary}`,
    structure.profile.coreConflict && `长期矛盾：${structure.profile.coreConflict}`,
    ...structure.relations.forceRelations.slice(0, 4).map((item) =>
      [item.relation, item.tension, item.detail].filter(Boolean).join(" | "),
    ),
  ].filter(Boolean);
  return lines.length > 0 ? lines.join("\n") : null;
}

export function buildEconomyLegacyText(structure: WorldStructuredData): string | null {
  const lines = structure.forces
    .filter((item) => (item.resources ?? []).length > 0 || item.baseOfPower || item.pressure)
    .map((item) =>
      [
        item.name,
        item.resources && item.resources.length > 0 && `资源：${item.resources.join("、")}`,
        item.baseOfPower && `权力基础：${item.baseOfPower}`,
        item.pressure && `压力：${item.pressure}`,
      ].filter(Boolean).join(" | "),
    );
  return lines.length > 0 ? lines.join("\n") : null;
}

export function buildPoliticsLegacyText(structure: WorldStructuredData): string | null {
  const forceNameById = new Map(structure.forces.map((item) => [item.id, item.name]));
  const lines = [
    ...structure.factions.map((item) =>
      [
        item.name,
        item.position && `立场：${item.position}`,
        item.goals.length > 0 && `目标：${item.goals.join("、")}`,
        item.methods.length > 0 && `手段：${item.methods.join("、")}`,
      ]
        .filter(Boolean)
        .join(" | "),
    ),
    ...structure.forces.map((item) =>
      [
        item.name,
        item.currentObjective && `当前目标：${item.currentObjective}`,
        item.pressure && `施压方式：${item.pressure}`,
        item.baseOfPower && `权力基础：${item.baseOfPower}`,
      ]
        .filter(Boolean)
        .join(" | "),
    ),
    ...structure.relations.forceRelations.map((item) =>
      [
        forceNameById.get(item.sourceForceId) ?? item.sourceForceId,
        item.relation,
        forceNameById.get(item.targetForceId) ?? item.targetForceId,
        item.detail,
      ]
        .filter(Boolean)
        .join(" | "),
    ),
  ].filter(Boolean);
  return lines.length > 0 ? lines.join("\n") : null;
}

export function buildGeographyLegacyText(structure: WorldStructuredData): string | null {
  const lines = structure.locations
    .map((item) =>
      [
        item.name,
        item.terrain && `地形：${item.terrain}`,
        item.summary && `概述：${item.summary}`,
        item.narrativeFunction && `叙事功能：${item.narrativeFunction}`,
        item.risk && `风险：${item.risk}`,
      ]
        .filter(Boolean)
        .join(" | "),
    )
    .filter(Boolean);
  return lines.length > 0 ? lines.join("\n") : null;
}

export function buildConflictLegacyText(structure: WorldStructuredData): string | null {
  const forceNameById = new Map(structure.forces.map((item) => [item.id, item.name]));
  const lines = [
    structure.profile.coreConflict,
    ...structure.forces
      .map((item) => item.pressure ? `${item.name}：${item.pressure}` : "")
      .filter(Boolean),
    ...structure.relations.forceRelations
      .map((item) =>
        [
          forceNameById.get(item.sourceForceId) ?? item.sourceForceId,
          item.relation,
          forceNameById.get(item.targetForceId) ?? item.targetForceId,
          item.tension,
          item.detail,
        ]
          .filter(Boolean)
          .join(" | "),
      )
      .filter(Boolean),
  ].filter(Boolean);
  return lines.length > 0 ? lines.join("\n") : null;
}
