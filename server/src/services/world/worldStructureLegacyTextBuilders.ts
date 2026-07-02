/**
 * World structure legacy text builders — functions that convert
 * structured world data into legacy text fields (factions, background,
 * power, culture, history, economy, politics, geography, conflict).
 * Extracted from worldStructureLegacy.ts for modularity.
 */

import type {
  WorldStructuredData,
  WorldBindingSupport,
} from "@ai-novel/shared/types/world";

import { formatRuleText } from "./worldStructureHelpers";

/* ------------------------------------------------------------------ */
/*  buildFactionLegacyText                                            */
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

/* ------------------------------------------------------------------ */
/*  buildBackgroundLegacyText                                         */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  buildPowerLegacyText                                              */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  buildCultureLegacyText                                            */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  buildHistoryLegacyText                                            */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  buildEconomyLegacyText                                            */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  buildPoliticsLegacyText                                           */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  buildGeographyLegacyText                                          */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  buildConflictLegacyText                                           */
/* ------------------------------------------------------------------ */

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
