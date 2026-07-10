/**
 * World structure legacy — top-level facade that composes seed builders,
 * text builders, and source-to-structure conversion.
 * Individual helpers live in worldStructureLegacySeed.ts and
 * worldStructureLegacyTextBuilders.ts.
 */

import type {
  WorldBindingSupport,
  WorldFaction,
  WorldForce,
  WorldForceRelation,
  WorldLocation,
  WorldStructuredData,
} from "@ai-novel/shared";

import {
  dedupeByName,
  makeId,
  normalizeRecord,
  normalizeStringArray,
  normalizeText,
  parseAxiomStrings,
  parseLegacyArray,
  parseLegacyObject,
  parseListText,
  formatRuleText,
  buildStructuredRulesFromAxiomTexts,
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

/* ── Seed helpers (re-exported from sub-module) ──────────────────── */

export {
  seedFaction,
  seedForce,
  seedLocation,
  buildLegacyFactionSeeds,
  buildLegacyLocationSeeds,
  buildLegacyForceRelations,
} from "./worldStructureLegacySeed";

/* ── Text builders (re-exported from sub-module) ─────────────────── */

export {
  buildFactionLegacyText,
  buildBackgroundLegacyText,
  buildPowerLegacyText,
  buildCultureLegacyText,
  buildHistoryLegacyText,
  buildEconomyLegacyText,
  buildPoliticsLegacyText,
  buildGeographyLegacyText,
  buildConflictLegacyText,
} from "./worldStructureLegacyTextBuilders";

import {
  seedFaction,
  seedForce,
  seedLocation,
  buildLegacyFactionSeeds,
  buildLegacyLocationSeeds,
  buildLegacyForceRelations,
} from "./worldStructureLegacySeed";

import {
  buildBackgroundLegacyText,
  buildCultureLegacyText,
  buildPowerLegacyText,
  buildFactionLegacyText,
  buildPoliticsLegacyText,
  buildGeographyLegacyText,
  buildConflictLegacyText,
  buildHistoryLegacyText,
  buildEconomyLegacyText,
} from "./worldStructureLegacyTextBuilders";

import type { WorldStructureSource } from "./worldStructureSource";

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
/*  buildWorldStructureSeedFromSource                                 */
/* ------------------------------------------------------------------ */

import { parseWorldGenerationBlueprint } from "@ai-novel/shared";

export function buildWorldStructureSeedFromSource(source: WorldStructureSource): WorldStructuredData {
  const seeded = buildWorldStructureFromLegacySource(source);
  const blueprint = parseWorldGenerationBlueprint(source.selectedElements);
  const themes = new Set(seeded.profile.themes);
  const factions = [...seeded.factions];
  const forces = [...seeded.forces];
  const locations = [...seeded.locations];
  const rules = [...seeded.rules.axioms];

  for (const element of blueprint.classicElements) {
    if (element.trim()) {
      themes.add(element.trim());
    }
  }

  for (const selection of blueprint.propertySelections) {
    const detail = selection.detail?.trim() || selection.description.trim();
    const category = (selection.sourceCategory ?? "").trim().toLowerCase();
    if (category === "terrain" || selection.targetLayer === "foundation") {
      locations.push(seedLocation(selection.name, detail, category === "terrain" ? "terrain" : ""));
      continue;
    }
    if (category === "organization") {
      factions.push(seedFaction(selection.name, detail));
      forces.push(seedForce(selection.name, detail, "organization"));
      continue;
    }
    if (selection.targetLayer === "society") {
      factions.push(seedFaction(selection.name, detail));
      forces.push(seedForce(selection.name, detail));
      continue;
    }
    themes.add(selection.name);
  }

  const selectedRuleIds = new Set(blueprint.referenceContext?.selectedSeedIds?.ruleIds ?? []);
  const selectedFactionIds = new Set(blueprint.referenceContext?.selectedSeedIds?.factionIds ?? []);
  const selectedForceIds = new Set(blueprint.referenceContext?.selectedSeedIds?.forceIds ?? []);
  const selectedLocationIds = new Set(blueprint.referenceContext?.selectedSeedIds?.locationIds ?? []);
  const referenceSeeds = blueprint.referenceContext?.referenceSeeds;

  if (referenceSeeds) {
    for (const rule of referenceSeeds.rules) {
      if (selectedRuleIds.has(rule.id)) {
        rules.push(rule);
      }
    }

    for (const faction of referenceSeeds.factions) {
      if (selectedFactionIds.has(faction.id)) {
        factions.push({
          ...faction,
          representativeForceIds: faction.representativeForceIds.filter((id: string) => selectedForceIds.has(id)),
        });
      }
    }

    for (const force of referenceSeeds.forces) {
      if (selectedForceIds.has(force.id)) {
        forces.push({
          ...force,
          factionId: force.factionId && selectedFactionIds.has(force.factionId) ? force.factionId : null,
        });
      }
    }

    for (const location of referenceSeeds.locations) {
      if (selectedLocationIds.has(location.id)) {
        locations.push({
          ...location,
          controllingForceIds: location.controllingForceIds.filter((id: string) => selectedForceIds.has(id)),
        });
      }
    }
  }

  return normalizeWorldStructuredData(
    {
      ...seeded,
      profile: {
        ...seeded.profile,
        themes: Array.from(themes).slice(0, 8),
      },
      rules: {
        ...seeded.rules,
        axioms: buildStructuredRulesFromAxiomTexts(rules.map(formatRuleText)),
      },
      factions: dedupeByName(factions),
      forces: dedupeByName(forces),
      locations: dedupeByName(locations),
      metadata: {
        ...seeded.metadata,
        seededFrom:
          blueprint.propertySelections.length > 0
          || blueprint.classicElements.length > 0
          || selectedRuleIds.size > 0
          || selectedFactionIds.size > 0
          || selectedForceIds.size > 0
          || selectedLocationIds.size > 0
            ? "wizard-blueprint"
            : seeded.metadata.seededFrom,
      },
    },
    seeded,
  );
}

/* ------------------------------------------------------------------ */
/*  buildWorldBindingSupport                                          */
/* ------------------------------------------------------------------ */

export function buildWorldBindingSupport(structure: WorldStructuredData): WorldBindingSupport {
  const recommendedEntryPoints = Array.from(
    new Set(
      [
        ...structure.locations
          .filter((item) => item.narrativeFunction || item.summary)
          .slice(0, 3)
          .map((item) => `${item.name}${item.narrativeFunction ? `：${item.narrativeFunction}` : ""}`),
        ...structure.forces
          .filter((item) => item.narrativeRole || item.summary)
          .slice(0, 3)
          .map((item) => `${item.name}${item.narrativeRole ? `：${item.narrativeRole}` : ""}`),
      ].filter(Boolean),
    ),
  ).slice(0, 6);

  const highPressureForces = structure.forces
    .filter((item) => item.pressure)
    .map((item) => `${item.name}：${item.pressure}`)
    .slice(0, 6);

  const suggestedLocationClusters = structure.locations
    .slice(0, 3)
    .map((item, index) => ({
      id: makeId("cluster", index, item.name),
      label: `${item.name} 场景群`,
      locationIds: [item.id],
      reason: item.narrativeFunction || item.summary || item.risk,
    }));

  const compatibleConflicts = Array.from(
    new Set(
      structure.relations.forceRelations
        .map((item) => item.detail || item.tension || `${item.sourceForceId} ${item.relation} ${item.targetForceId}`)
        .filter(Boolean),
    ),
  ).slice(0, 8);

  const forbiddenCombinations = [
    ...structure.rules.taboo,
    ...structure.rules.sharedConsequences.map((item) => `避免忽略：${item}`),
  ].slice(0, 8);

  return {
    recommendedEntryPoints,
    highPressureForces,
    suggestedLocationClusters,
    compatibleConflicts,
    forbiddenCombinations,
  };
}

/* ------------------------------------------------------------------ */
/*  applyStructuredWorldToLegacyFields                                */
/* ------------------------------------------------------------------ */

export function applyStructuredWorldToLegacyFields(
  structure: WorldStructuredData,
  existing?: Partial<WorldStructureSource>,
  bindingSupport = buildWorldBindingSupport(structure),
) {
  const axioms = structure.rules.axioms.map(formatRuleText).filter(Boolean);
  const overviewSummary = structure.profile.summary
    || [structure.profile.identity, structure.profile.coreConflict].filter(Boolean).join(" | ");

  return {
    description: structure.profile.summary || existing?.description || null,
    background: buildBackgroundLegacyText(structure, bindingSupport) ?? existing?.background ?? null,
    overviewSummary: overviewSummary || existing?.overviewSummary || null,
    axioms: axioms.length > 0 ? JSON.stringify(axioms) : existing?.axioms ?? null,
    cultures: buildCultureLegacyText(structure) ?? existing?.cultures ?? null,
    magicSystem: buildPowerLegacyText(structure) ?? existing?.magicSystem ?? null,
    factions: buildFactionLegacyText(structure) ?? existing?.factions ?? null,
    politics: buildPoliticsLegacyText(structure) ?? existing?.politics ?? null,
    geography: buildGeographyLegacyText(structure) ?? existing?.geography ?? null,
    conflicts: buildConflictLegacyText(structure) ?? existing?.conflicts ?? null,
    history: buildHistoryLegacyText(structure) ?? existing?.history ?? null,
    economy: buildEconomyLegacyText(structure) ?? existing?.economy ?? null,
    structureJson: JSON.stringify({
      ...structure,
      metadata: {
        ...structure.metadata,
        schemaVersion: WORLD_STRUCTURE_SCHEMA_VERSION,
      },
    }),
    bindingSupportJson: JSON.stringify(bindingSupport),
    structureSchemaVersion: WORLD_STRUCTURE_SCHEMA_VERSION,
  };
}

/* ------------------------------------------------------------------ */
/*  buildWorldStructureOverview                                       */
/* ------------------------------------------------------------------ */

export function buildWorldStructureOverview(structure: WorldStructuredData, bindingSupport: WorldBindingSupport) {
  return {
    summary:
      structure.profile.summary
      || [structure.profile.identity, structure.profile.coreConflict].filter(Boolean).join(" | ")
      || "World summary is not available yet.",
    sections: [
      {
        key: "profile",
        title: "世界概要",
        content: [
          structure.profile.identity && `世界身份：${structure.profile.identity}`,
          structure.profile.tone && `整体调性：${structure.profile.tone}`,
          structure.profile.summary && `摘要：${structure.profile.summary}`,
          structure.profile.coreConflict && `核心冲突：${structure.profile.coreConflict}`,
          structure.profile.themes.length > 0 && `主题：${structure.profile.themes.join("、")}`,
        ]
          .filter(Boolean)
          .join("\n"),
      },
      {
        key: "rules",
        title: "规则中心",
        content: [
          structure.rules.summary,
          ...structure.rules.axioms.map(formatRuleText),
          ...structure.rules.taboo.map((item) => `禁忌：${item}`),
          ...structure.rules.sharedConsequences.map((item) => `共通后果：${item}`),
        ]
          .filter(Boolean)
          .join("\n"),
      },
      {
        key: "factions",
        title: "阵营与势力",
        content: [buildFactionLegacyText(structure), buildPoliticsLegacyText(structure)].filter(Boolean).join("\n\n"),
      },
      {
        key: "locations",
        title: "地点与地形",
        content: buildGeographyLegacyText(structure) ?? "",
      },
      {
        key: "relations",
        title: "关系网络",
        content: [
          ...structure.relations.forceRelations.map((item) =>
            [item.sourceForceId, item.relation, item.targetForceId, item.tension, item.detail]
              .filter(Boolean)
              .join(" | "),
          ),
          ...structure.relations.locationControls.map((item) =>
            [item.forceId, item.relation, item.locationId, item.detail].filter(Boolean).join(" | "),
          ),
          ...bindingSupport.compatibleConflicts.map((item) => `可兼容冲突：${item}`),
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ].filter((section) => section.content.trim()),
  };
}
