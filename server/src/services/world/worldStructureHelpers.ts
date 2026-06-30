/**
 * World structure normalization helpers — pure utility functions.
 * Extracted from worldStructure.ts for modularity.
 */

import type { WorldLocation, WorldRule } from "@ai-novel/shared/types/world";

/* ------------------------------------------------------------------ */
/*  Low-level parsing helpers                                          */
/* ------------------------------------------------------------------ */

export function safeParseJSON<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw?.trim()) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function normalizeText(raw: unknown, fallback = ""): string {
  if (typeof raw === "string") {
    return raw.trim();
  }
  if (typeof raw === "number" || typeof raw === "boolean") {
    return String(raw);
  }
  if (Array.isArray(raw)) {
    return raw.map((item) => normalizeText(item)).filter(Boolean).join(" / ");
  }
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    for (const key of ["summary", "description", "content", "text", "value", "name", "title", "label"]) {
      const value = normalizeText(record[key]);
      if (value) {
        return value;
      }
    }
  }
  return fallback;
}

export function normalizeStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return Array.from(new Set(raw.map((item) => normalizeText(item)).filter(Boolean)));
  }
  if (typeof raw === "string") {
    return Array.from(
      new Set(
        raw
          .split(/[\n,，;；]/)
          .map((item) => item.replace(/^[-*]\s*/, "").trim())
          .filter(Boolean),
      ),
    );
  }
  return [];
}

export function normalizeRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

/* ------------------------------------------------------------------ */
/*  ID / slug helpers                                                  */
/* ------------------------------------------------------------------ */

export function slugify(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9一-鿿-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || "item";
}

export function makeId(prefix: string, index: number, preferred?: string): string {
  const suffix = preferred ? slugify(preferred) : String(index + 1);
  return `${prefix}-${suffix}`;
}

/* ------------------------------------------------------------------ */
/*  Legacy JSON / list parsers                                         */
/* ------------------------------------------------------------------ */

export function parseListText(raw: string | null | undefined): string[] {
  return normalizeStringArray(raw ?? "");
}

export function parseLegacyJSON(raw: string | null | undefined): unknown {
  return safeParseJSON<unknown>(raw, null);
}

export function parseLegacyArray(raw: string | null | undefined, preferredKeys: string[] = []): unknown[] | null {
  const parsed = parseLegacyJSON(raw);
  if (Array.isArray(parsed)) {
    return parsed;
  }
  const record = normalizeRecord(parsed);
  for (const key of preferredKeys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value;
    }
  }
  return null;
}

export function parseLegacyObject(raw: string | null | undefined): Record<string, unknown> {
  return normalizeRecord(parseLegacyJSON(raw));
}

export function parseAxiomStrings(raw: string | null | undefined): string[] {
  const parsed = safeParseJSON<unknown>(raw, null);
  if (Array.isArray(parsed)) {
    return parsed
      .map((item) => normalizeText(item))
      .filter(Boolean);
  }
  return parseListText(raw);
}

/* ------------------------------------------------------------------ */
/*  Coordinate / enum normalization                                    */
/* ------------------------------------------------------------------ */

export function normalizeMapCoordinate(raw: unknown): number | undefined {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return undefined;
  }
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function normalizeRiskLevel(raw: unknown): number | undefined {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return undefined;
  }
  return Math.max(1, Math.min(5, Math.round(raw)));
}

export function normalizeGeographyDirection(raw: unknown): WorldLocation["directionHint"] {
  if (typeof raw !== "string") {
    return undefined;
  }
  const normalized = raw.trim().toLowerCase();
  const aliases: Record<string, WorldLocation["directionHint"]> = {
    north: "north",
    "北": "north",
    "北方": "north",
    south: "south",
    "南": "south",
    "南方": "south",
    east: "east",
    "东": "east",
    "东方": "east",
    west: "west",
    "西": "west",
    "西方": "west",
    center: "center",
    "中": "center",
    "中央": "center",
    northeast: "northeast",
    "东北": "northeast",
    northwest: "northwest",
    "西北": "northwest",
    southeast: "southeast",
    "东南": "southeast",
    southwest: "southwest",
    "西南": "southwest",
  };
  return aliases[normalized];
}

/* ------------------------------------------------------------------ */
/*  Deduplication                                                      */
/* ------------------------------------------------------------------ */

export function dedupeById<T extends { id: string }>(items: T[]): T[] {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

export function dedupeByName<T extends { name: string }>(items: T[]): T[] {
  return Array.from(new Map(items.map((item) => [item.name, item])).values());
}

/* ------------------------------------------------------------------ */
/*  Rule text formatting                                               */
/* ------------------------------------------------------------------ */

export function formatRuleText(rule: { name: string; summary: string; cost?: string; boundary?: string; enforcement?: string }): string {
  const parts = [rule.summary, rule.cost && `代价：${rule.cost}`, rule.boundary && `边界：${rule.boundary}`, rule.enforcement && `约束：${rule.enforcement}`]
    .filter(Boolean);
  return `${rule.name}${parts.length > 0 ? `：${parts.join("；")}` : ""}`;
}

export function buildRuleFromText(text: string, index: number): WorldRule {
  const normalized = text.trim();
  const [name, summary] = normalized.split(/[：:]/, 2);
  return {
    id: makeId("rule", index, name || normalized),
    name: (summary ? name : `规则 ${index + 1}`).trim(),
    summary: (summary ?? normalized).trim(),
    cost: "",
    boundary: "",
    enforcement: "",
  };
}

export function buildStructuredRulesFromAxiomTexts(axiomTexts: string[]): WorldRule[] {
  return axiomTexts
    .map((text, index) => buildRuleFromText(text, index))
    .filter((item, index, items) => items.findIndex((candidate) => candidate.name === item.name) === index);
}
