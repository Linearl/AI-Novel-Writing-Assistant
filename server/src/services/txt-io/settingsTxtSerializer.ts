/**
 * Settings TXT serializer — serialises / deserialises world settings
 * to the `字段名=值` line format.
 *
 * Exports from the NovelWorld's structuredDataJson + the NovelWorld title/coverSummary.
 */

import type { WorldStructuredData, WorldProfile, WorldRules } from "@ai-novel/shared";

/* ------------------------------------------------------------------ */
/*  Export                                                             */
/* ------------------------------------------------------------------ */

/** Fields written to the TXT export (label -> source path). */
const FLAT_FIELDS: Array<{ label: string; get: (data: WorldStructuredData, extra: SettingsExtra) => string | null }> = [
  { label: "世界名称",   get: (_d, e) => e.title ?? null },
  { label: "概述",       get: (d) => d.profile.summary || null },
  { label: "身份认同",   get: (d) => d.profile.identity || null },
  { label: "基调",       get: (d) => d.profile.tone || null },
  { label: "主题",       get: (d) => d.profile.themes.length > 0 ? d.profile.themes.join("、") : null },
  { label: "核心冲突",   get: (d) => d.profile.coreConflict || null },
  { label: "世界规则",   get: (d) => d.rules.summary || null },
  { label: "禁忌",       get: (d) => d.rules.taboo.length > 0 ? d.rules.taboo.join("、") : null },
  { label: "共同代价",   get: (d) => d.rules.sharedConsequences.length > 0 ? d.rules.sharedConsequences.join("、") : null },
  { label: "势力",       get: (d) => d.factions.map((f) => f.name).join("、") || null },
  { label: "力量体系",   get: (d) => d.forces.map((f) => f.name).join("、") || null },
  { label: "地点",       get: (d) => d.locations.map((l) => l.name).join("、") || null },
];

interface SettingsExtra {
  title: string | null;
  coverSummary: string | null;
}

export interface SettingsExportInput {
  structuredData: WorldStructuredData;
  title: string | null;
  coverSummary: string | null;
}

/**
 * Serialise world settings to `字段名=值` TXT content.
 *
 * Multi-line values are escaped: actual newlines become `\n` literal.
 * Values containing `=` are preserved as-is (split on first `=` only when parsing).
 */
export function serializeSettingsTxt(input: SettingsExportInput): string {
  const extra: SettingsExtra = { title: input.title, coverSummary: input.coverSummary };
  const lines: string[] = [];
  for (const field of FLAT_FIELDS) {
    const value = field.get(input.structuredData, extra);
    if (value !== null) {
      lines.push(`${field.label}=${value.replace(/\n/g, "\\n")}`);
    }
  }
  return lines.join("\n") + "\n";
}

/* ------------------------------------------------------------------ */
/*  Import                                                             */
/* ------------------------------------------------------------------ */

/** Labels accepted during import (subset — only those we write back to structured data). */
const KNOWN_LABELS = new Set(FLAT_FIELDS.map((f) => f.label));

export interface ParsedSettingsField {
  label: string;
  value: string;
}

export interface SettingsParseResult {
  fields: ParsedSettingsField[];
}

/**
 * Parse `字段名=值` TXT content into structured fields.
 * Splits on the FIRST `=` only, so values may contain `=`.
 */
export function parseSettingsTxt(raw: string, lines: string[]): SettingsParseResult {
  const fields: ParsedSettingsField[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const eqIdx = line.indexOf("=");
    if (eqIdx < 1) {
      throw new Error(`格式错误`);
    }
    const label = line.slice(0, eqIdx).trim();
    const value = line.slice(eqIdx + 1).replace(/\\n/g, "\n").trim();
    if (!KNOWN_LABELS.has(label)) {
      // Skip unknown fields silently (forward-compatible).
      continue;
    }
    fields.push({ label, value });
  }
  return { fields };
}

/**
 * Apply parsed fields onto an existing WorldStructuredData (merge) or replace it entirely (overwrite).
 * Returns a new object — never mutates the input.
 */
export function applySettingsFields(
  existing: WorldStructuredData | null,
  fields: ParsedSettingsField[],
  mode: "overwrite" | "merge",
): WorldStructuredData {
  // Start from a clean base or existing data depending on mode.
  const base: WorldStructuredData = mode === "overwrite"
    ? emptyStructuredData()
    : (existing ?? emptyStructuredData());

  const profile = { ...base.profile };
  const rules = { ...base.rules, axioms: [...base.rules.axioms], taboo: [...base.rules.taboo], sharedConsequences: [...base.rules.sharedConsequences] };

  for (const { label, value } of fields) {
    switch (label) {
      case "概述":       profile.summary = value; break;
      case "身份认同":   profile.identity = value; break;
      case "基调":       profile.tone = value; break;
      case "主题":       profile.themes = splitList(value); break;
      case "核心冲突":   profile.coreConflict = value; break;
      case "世界规则":   rules.summary = value; break;
      case "禁忌":       rules.taboo = splitList(value); break;
      case "共同代价":   rules.sharedConsequences = splitList(value); break;
      // "势力", "力量体系", "地点" are export-only summary lines; we do not overwrite structured arrays from TXT.
    }
  }

  return {
    ...base,
    profile,
    rules,
    metadata: {
      ...base.metadata,
      schemaVersion: base.metadata.schemaVersion || 1,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function emptyStructuredData(): WorldStructuredData {
  return {
    profile: { summary: "", identity: "", tone: "", themes: [], coreConflict: "" },
    rules: { summary: "", axioms: [], taboo: [], sharedConsequences: [] },
    factions: [],
    forces: [],
    locations: [],
    relations: { forceRelations: [], locationControls: [] },
    metadata: { schemaVersion: 1 },
  };
}

function splitList(value: string): string[] {
  return value.split(/[、,，]/).map((s) => s.trim()).filter(Boolean);
}
