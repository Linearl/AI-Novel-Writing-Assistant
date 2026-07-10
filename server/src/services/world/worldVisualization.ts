/**
 * World Visualization — facade module.
 *
 * All implementation has been extracted to:
 *   - worldVisualizationTypes.ts     (types, constants, alias maps)
 *   - worldVisualizationNormalize.ts (normalizer functions)
 *
 * This file contains only the high-level orchestration functions
 * that combine structure parsing, fallback building, LLM calls,
 * and sanitization into the final payload.
 */

import type {
  WorldVisualizationPayload,
} from "@ai-novel/shared";
import { runStructuredPrompt } from "../../prompting/core/promptRunner";
import { worldVisualizationPrompt } from "../../prompting/prompts/world/world.prompts";
import {
  buildWorldBindingSupport,
  parseWorldStructurePayload,
} from "./worldStructure";
import { readWorldEdgeTables } from "./worldEdgeTableSync";

import type {
  VisualizationDraft,
  VisualizationSource,
} from "./worldVisualizationTypes";

import {
  MAX_FACTION_NODES,
  MAX_FACTION_EDGES,
  MAX_GEO_NODES,
  MAX_TIMELINE_ITEMS,
  MAX_POWER_ITEMS,
  DIRECTION_COORDINATES,
} from "./worldVisualizationTypes";

import {
  normalizeGraphNodes,
  normalizeGraphEdges,
  normalizeGeographyNodes,
  normalizeGeographyEdges,
  normalizeNodeType,
  normalizeRouteType,
  inferFactionNodeType,
  inferDirectionFromText,
  inferRegionType,
  offsetCoordinate,
  parseListFromText,
  splitIntoSentences,
  normalizeEdgeRelation,
  makeId,
} from "./worldVisualizationNormalize";

import type {
  WorldGeographyMapEdge,
} from "@ai-novel/shared";

/* ------------------------------------------------------------------ */
/*  Fallback builders (text-only, no structured data)                  */
/* ------------------------------------------------------------------ */

function buildFactionLabels(world: VisualizationSource): string[] {
  const combined = [
    world.factions ?? "",
    world.politics ?? "",
    world.races ?? "",
    world.conflicts ?? "",
  ].filter(Boolean).join("\n");
  const exclusions = new Set([
    "核心冲突",
    "主要势力",
    "势力关系",
    "政治结构",
    "组织势力",
    "阵营关系",
    "社会结构",
  ]);
  const fromLists = parseListFromText(combined, []);
  const entityPattern = /[一-鿿]{2,16}(?:政府|政权|王朝|王国|帝国|联邦|共和国|军|军队|部队|军团|旅|团|会|盟|帮|派|组织|教团|族|族群|民族)/g;
  const namedEntities: string[] = [];
  for (const match of combined.matchAll(entityPattern)) {
    const value = match[0]?.trim();
    if (value && !exclusions.has(value)) {
      namedEntities.push(value);
    }
  }
  const seen = new Set<string>();
  return [...fromLists, ...namedEntities]
    .map((item) => item.trim())
    .filter((item) => {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    })
    .slice(0, MAX_FACTION_NODES);
}

function buildFactionEdges(
  nodes: Array<{ id: string; label: string; type: string }>,
  world: VisualizationSource,
): Array<{ source: string; target: string; relation: string }> {
  const sentences = splitIntoSentences([
    world.politics ?? "",
    world.factions ?? "",
    world.conflicts ?? "",
    world.background ?? "",
  ].filter(Boolean).join("。"));
  const relationCounter = new Map<string, Map<string, number>>();

  for (const sentence of sentences) {
    const mentioned = nodes.filter((node) => sentence.includes(node.label));
    if (mentioned.length < 2) continue;
    const relation = normalizeEdgeRelation("", sentence);
    for (let i = 0; i < mentioned.length; i++) {
      for (let j = i + 1; j < mentioned.length; j++) {
        const key = [mentioned[i].id, mentioned[j].id].sort().join("|");
        const bucket = relationCounter.get(key) ?? new Map<string, number>();
        bucket.set(relation, (bucket.get(relation) ?? 0) + 1);
        relationCounter.set(key, bucket);
      }
    }
  }

  const edges = Array.from(relationCounter.entries())
    .map(([key, bucket]) => {
      const [source, target] = key.split("|");
      const relation = Array.from(bucket.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "关联";
      return { source, target, relation };
    })
    .slice(0, MAX_FACTION_EDGES);

  if (edges.length > 0) return edges;
  if (nodes.length <= 1) return [];
  const defaultRelation = world.conflicts?.trim() ? "对抗" : "关联";
  return nodes.slice(1).map((node) => ({
    source: nodes[0].id,
    target: node.id,
    relation: defaultRelation,
  }));
}

function buildGeographyMap(world: VisualizationSource): WorldVisualizationPayload["geographyMap"] {
  const geoSeeds = parseListFromText(
    [world.geography ?? "", world.background ?? ""].filter(Boolean).join("\n"),
    ["核心区域", "边境区域", "未知区域"],
  )
    .slice(0, MAX_GEO_NODES)
    .map((label, index) => {
      const directionHint = inferDirectionFromText(label, index);
      const point = offsetCoordinate(DIRECTION_COORDINATES[directionHint], index);
      return {
        id: makeId("geo", index),
        label,
        x: point.x,
        y: point.y,
        directionHint,
        regionType: inferRegionType(label),
      };
    });

  const edges = geoSeeds.slice(1).map((node, index) => ({
    source: geoSeeds[index]?.id ?? geoSeeds[0].id,
    target: node.id,
    relation: "相邻",
    routeType: "other" as const,
    direction: node.directionHint,
  }));

  return { nodes: geoSeeds, edges };
}

function buildPowerTree(world: VisualizationSource): WorldVisualizationPayload["powerTree"] {
  return parseListFromText(world.magicSystem ?? world.technology ?? "", ["力量层级未明确"])
    .slice(0, MAX_POWER_ITEMS)
    .map((description, index) => ({
      level: `L${index + 1}`,
      description,
    }));
}

function buildTimeline(world: VisualizationSource): WorldVisualizationPayload["timeline"] {
  return parseListFromText(world.history ?? "", ["当前历史脉络尚未明确"])
    .slice(0, MAX_TIMELINE_ITEMS)
    .map((event, index) => {
      const yearMatch = event.match(/\d{2,4}(?:年)?|民国\d+年|昭和\d+年|stage\s*\d+/i);
      return {
        year: yearMatch?.[0] ?? `阶段${index + 1}`,
        event,
      };
    });
}

export function buildFallbackWorldVisualizationPayload(world: VisualizationSource): WorldVisualizationPayload {
  const factionLabels = buildFactionLabels(world);
  const factionNodes = factionLabels.map((label, index) => ({
    id: makeId("faction", index),
    label,
    type: inferFactionNodeType(label),
  }));
  const factionEdges = buildFactionEdges(factionNodes, world);

  return {
    worldId: world.id,
    factionGraph: { nodes: factionNodes, edges: factionEdges },
    powerTree: buildPowerTree(world),
    geographyMap: buildGeographyMap(world),
    timeline: buildTimeline(world),
  };
}

/* ------------------------------------------------------------------ */
/*  Structured-data path                                               */
/* ------------------------------------------------------------------ */

async function buildStructuredWorldVisualizationPayload(world: VisualizationSource): Promise<WorldVisualizationPayload | null> {
  const { structure, hasStructuredData } = parseWorldStructurePayload(world.structureJson, world.bindingSupportJson);
  if (!hasStructuredData) return null;

  // REQ-7007: Read from edge tables; fall back to JSON if edge tables are empty
  const edgeData = await readWorldEdgeTables(world.id);
  const forceRelations = edgeData.forceRelations.length > 0
    ? edgeData.forceRelations
    : structure.relations.forceRelations;
  const locationConnections = edgeData.locationConnections.length > 0
    ? edgeData.locationConnections
    : (structure.relations.locationConnections ?? []);
  const locationControls = edgeData.locationControls.length > 0
    ? edgeData.locationControls
    : structure.relations.locationControls;

  const forceNodes = structure.forces.map((item) => ({
    id: item.id,
    label: item.name,
    type: normalizeNodeType(item.type, item.name),
  }));
  const factionNodes = structure.factions
    .filter((item) => !forceNodes.some((force) => force.label === item.name))
    .map((item) => ({
      id: item.id,
      label: item.name,
      type: "faction",
    }));
  const factionNodesMerged = [...forceNodes, ...factionNodes].slice(0, MAX_FACTION_NODES);
  const factionNodeIds = new Set(factionNodesMerged.map((item) => item.id));
  const factionEdges = forceRelations
    .filter((item) => factionNodeIds.has(item.sourceForceId) && factionNodeIds.has(item.targetForceId))
    .map((item) => ({
      source: item.sourceForceId,
      target: item.targetForceId,
      relation: item.relation || "关联",
    }))
    .slice(0, MAX_FACTION_EDGES);

  const geographyNodes = structure.locations
    .map((item, index) => {
      const directionHint = inferDirectionFromText(
        [item.name, item.terrain, item.summary, item.narrativeFunction, item.risk].join(" "),
        index,
      );
      const point = offsetCoordinate(DIRECTION_COORDINATES[directionHint], index);
      return {
        id: item.id,
        label: item.name,
        x: item.x ?? point.x,
        y: item.y ?? point.y,
        directionHint: item.directionHint ?? directionHint,
        regionType: inferRegionType([item.name, item.type, item.terrain].filter(Boolean).join(" ")),
        terrain: item.terrain || undefined,
        summary: item.summary || undefined,
        controllingForceIds: item.controllingForceIds,
        risk: item.risk || (item.riskLevel ? `风险等级 ${item.riskLevel}` : undefined),
        storyRelevance: item.storyRelevance || item.narrativeFunction || undefined,
      };
    })
    .slice(0, MAX_GEO_NODES);
  const geographyNodeIdSet = new Set(geographyNodes.map((item) => item.id));
  const forceNameById = new Map(structure.forces.map((item) => [item.id, item.name]));
  const explicitLocationEdges = locationConnections
    .filter((item) => geographyNodeIdSet.has(item.sourceLocationId) && geographyNodeIdSet.has(item.targetLocationId))
    .map((item) => ({
      source: item.sourceLocationId,
      target: item.targetLocationId,
      relation: item.connectionType || "相邻",
      routeType: normalizeRouteType(item.connectionType, item.connectionType),
      distanceHint: item.distanceHint || undefined,
      risk: item.narrativeUse || undefined,
    }));
  const geographyEdges = explicitLocationEdges.length > 0 ? explicitLocationEdges : locationControls
    .filter((item) => geographyNodeIdSet.has(item.locationId))
    .reduce<WorldGeographyMapEdge[]>((acc, relation, index, list) => {
      const sibling = list.find(
        (candidate, siblingIndex) =>
          siblingIndex > index
          && candidate.forceId === relation.forceId
          && candidate.locationId !== relation.locationId
          && geographyNodeIdSet.has(candidate.locationId),
      );
      if (!sibling) return acc;
      acc.push({
        source: relation.locationId,
        target: sibling.locationId,
        relation: `${forceNameById.get(relation.forceId) ?? relation.forceId}${relation.relation ? `:${relation.relation}` : "控制"}`,
        routeType: "border",
      });
      return acc;
    }, [])
    .slice(0, MAX_FACTION_EDGES);

  const powerTree = (
    structure.rules.axioms.length > 0
      ? structure.rules.axioms.map((item, index) => ({
        level: `R${index + 1}`,
        description: [item.name, item.summary].filter(Boolean).join("："),
      }))
      : buildPowerTree(world)
  ).slice(0, MAX_POWER_ITEMS);

  const bindingSupport = buildWorldBindingSupport(structure);
  const timeline = bindingSupport.compatibleConflicts.length > 0
    ? bindingSupport.compatibleConflicts.slice(0, MAX_TIMELINE_ITEMS).map((item, index) => ({
      year: `阶段${index + 1}`,
      event: item,
    }))
    : buildTimeline(world);

  if (factionNodesMerged.length === 0 && geographyNodes.length === 0) return null;

  const fallback = buildFallbackWorldVisualizationPayload(world);
  const shouldUseFallbackFactions = factionNodesMerged.length === 0;
  const shouldUseFallbackGeography = geographyNodes.length === 0;

  return {
    worldId: world.id,
    factionGraph: {
      nodes: shouldUseFallbackFactions ? fallback.factionGraph.nodes : factionNodesMerged,
      edges: shouldUseFallbackFactions ? fallback.factionGraph.edges : factionEdges,
    },
    powerTree,
    geographyMap: {
      nodes: shouldUseFallbackGeography ? fallback.geographyMap.nodes : geographyNodes,
      edges: shouldUseFallbackGeography ? fallback.geographyMap.edges : geographyEdges,
    },
    timeline,
  };
}

/* ------------------------------------------------------------------ */
/*  LLM path + sanitization                                            */
/* ------------------------------------------------------------------ */

function buildVisualizationPrompt(world: VisualizationSource): string {
  return [
    `世界名：${world.name}`,
    `世界类型：${world.worldType ?? "custom"}`,
    `概述：${world.description ?? "无"}`,
    `背景：${world.background ?? "无"}`,
    `势力：${world.factions ?? "无"}`,
    `政治：${world.politics ?? "无"}`,
    `种族：${world.races ?? "无"}`,
    `地理：${world.geography ?? "无"}`,
    `历史：${world.history ?? "无"}`,
    `冲突：${world.conflicts ?? "无"}`,
    `力量/科技：${[world.magicSystem, world.technology].filter(Boolean).join("\n") || "无"}`,
  ].join("\n\n");
}

async function tryBuildWorldVisualizationWithLLM(
  world: VisualizationSource,
): Promise<VisualizationDraft | null> {
  try {
    const result = await runStructuredPrompt({
      asset: worldVisualizationPrompt,
      promptInput: { worldPromptSource: buildVisualizationPrompt(world) },
      options: { temperature: 0.2 },
    });
    return result.output;
  } catch {
    return null;
  }
}

function sanitizeVisualizationPayload(
  world: VisualizationSource,
  draft: VisualizationDraft | null,
  fallback: WorldVisualizationPayload,
): WorldVisualizationPayload {
  const factionNodes = normalizeGraphNodes(draft?.factionGraph?.nodes ?? fallback.factionGraph.nodes, "faction")
    .slice(0, MAX_FACTION_NODES);
  const factionEdges = normalizeGraphEdges(
    draft?.factionGraph?.edges ?? [], factionNodes, fallback.factionGraph.edges,
  );
  const geographyNodes = normalizeGeographyNodes(
    draft?.geographyMap?.nodes ?? fallback.geographyMap.nodes, fallback.geographyMap.nodes,
  );
  const geographyEdges = normalizeGeographyEdges(
    draft?.geographyMap?.edges ?? [], geographyNodes, fallback.geographyMap.edges,
  );
  const powerTree = (draft?.powerTree ?? fallback.powerTree)
    .map((item, index) => ({
      level: typeof item.level === "string" && item.level.trim() ? item.level.trim() : `L${index + 1}`,
      description: typeof item.description === "string" ? item.description.trim() : "",
    }))
    .filter((item) => item.description)
    .slice(0, MAX_POWER_ITEMS);
  const timeline = (draft?.timeline ?? fallback.timeline)
    .map((item, index) => ({
      year: typeof item.year === "string" && item.year.trim() ? item.year.trim() : `阶段${index + 1}`,
      event: typeof item.event === "string" ? item.event.trim() : "",
    }))
    .filter((item) => item.event)
    .slice(0, MAX_TIMELINE_ITEMS);

  return {
    worldId: world.id,
    factionGraph: {
      nodes: factionNodes.length > 0 ? factionNodes : fallback.factionGraph.nodes,
      edges: factionEdges,
    },
    powerTree: powerTree.length > 0 ? powerTree : fallback.powerTree,
    geographyMap: {
      nodes: geographyNodes.length > 0 ? geographyNodes : fallback.geographyMap.nodes,
      edges: geographyEdges,
    },
    timeline: timeline.length > 0 ? timeline : fallback.timeline,
  };
}

/* ------------------------------------------------------------------ */
/*  Public entry point                                                 */
/* ------------------------------------------------------------------ */

export async function buildWorldVisualizationPayload(world: VisualizationSource): Promise<WorldVisualizationPayload> {
  const structured = await buildStructuredWorldVisualizationPayload(world);
  if (structured) return structured;
  const fallback = buildFallbackWorldVisualizationPayload(world);
  const draft = await tryBuildWorldVisualizationWithLLM(world);
  return sanitizeVisualizationPayload(world, draft, fallback);
}
