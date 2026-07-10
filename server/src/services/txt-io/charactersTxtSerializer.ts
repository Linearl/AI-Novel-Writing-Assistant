/**
 * Characters TXT serializer — serialises / deserialises character profiles
 * and relationships to the pipe-delimited TXT format.
 *
 * Format:
 * ```
 * === 角色档案 ===
 * 林风=主角|男|18岁|孤儿
 *
 * === 关系 ===
 * 林风|师徒|白眉真人|在世
 * ```
 */

import type { Character, CharacterRelation } from "@ai-novel/shared";

/* ------------------------------------------------------------------ */
/*  Export                                                             */
/* ------------------------------------------------------------------ */

const SECTION_PROFILES = "=== 角色档案 ===";
const SECTION_RELATIONS = "=== 关系 ===";

/** Minimal character profile shape for serialisation. */
export interface CharacterProfileExport {
  name: string;
  role?: string | null;
  gender?: string | null;
  castRole?: string | null;
  identityLabel?: string | null;
}

export interface CharacterRelationExport {
  sourceName: string;
  targetName: string;
  surfaceRelation: string;
  status: string;
}

/**
 * Serialise character profiles and relationships to TXT.
 */
export function serializeCharactersTxt(
  profiles: CharacterProfileExport[],
  relations: CharacterRelationExport[],
): string {
  const sections: string[] = [];

  // Profiles section
  sections.push(SECTION_PROFILES);
  for (const p of profiles) {
    const attrs = [p.role, p.gender, p.castRole, p.identityLabel]
      .filter((a): a is string => Boolean(a?.trim()));
    sections.push(`${p.name}=${attrs.join("|")}`);
  }

  // Relations section
  sections.push("");
  sections.push(SECTION_RELATIONS);
  for (const r of relations) {
    const status = r.status || "未知";
    sections.push(`${r.sourceName}|${r.surfaceRelation}|${r.targetName}|${status}`);
  }

  return sections.join("\n") + "\n";
}

/* ------------------------------------------------------------------ */
/*  Import                                                             */
/* ------------------------------------------------------------------ */

export interface ParsedCharacterProfile {
  name: string;
  attributes: string[];
}

export interface ParsedCharacterRelation {
  sourceName: string;
  surfaceRelation: string;
  targetName: string;
  status: string;
}

export interface CharactersParseResult {
  profiles: ParsedCharacterProfile[];
  relations: ParsedCharacterRelation[];
}

/**
 * Parse TXT lines into character profiles and relations.
 * Lines before the first `=== 关系 ===` marker are treated as profiles.
 */
export function parseCharactersTxt(lines: string[]): CharactersParseResult {
  const profiles: ParsedCharacterProfile[] = [];
  const relations: ParsedCharacterRelation[] = [];

  let inRelationsSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip section headers
    if (line === SECTION_RELATIONS) {
      inRelationsSection = true;
      continue;
    }
    if (line === SECTION_PROFILES) {
      inRelationsSection = false;
      continue;
    }

    if (inRelationsSection) {
      const parts = line.split("|");
      if (parts.length < 3) {
        throw new Error(`格式错误`);
      }
      const [sourceName, surfaceRelation, targetName, status] = parts.map((p) => p.trim());
      if (!sourceName || !surfaceRelation || !targetName) {
        throw new Error(`格式错误`);
      }
      relations.push({
        sourceName,
        surfaceRelation,
        targetName,
        status: status || "未知",
      });
    } else {
      // Profile line: 角色名=属性1|属性2|...
      const eqIdx = line.indexOf("=");
      if (eqIdx < 1) {
        throw new Error(`格式错误`);
      }
      const name = line.slice(0, eqIdx).trim();
      const attrsStr = line.slice(eqIdx + 1);
      const attributes = attrsStr ? attrsStr.split("|").map((a) => a.trim()) : [];
      profiles.push({ name, attributes });
    }
  }

  return { profiles, relations };
}

/**
 * Resolve relation source/target names to character IDs using the existing characters list.
 * Returns only relations where both characters exist.
 */
export function resolveRelationIds(
  relations: ParsedCharacterRelation[],
  charactersByName: Map<string, { id: string }>,
): Array<{ sourceCharacterId: string; targetCharacterId: string; surfaceRelation: string; status: string }> {
  const resolved: Array<{ sourceCharacterId: string; targetCharacterId: string; surfaceRelation: string; status: string }> = [];
  for (const r of relations) {
    const source = charactersByName.get(r.sourceName);
    const target = charactersByName.get(r.targetName);
    if (source && target) {
      resolved.push({
        sourceCharacterId: source.id,
        targetCharacterId: target.id,
        surfaceRelation: r.surfaceRelation,
        status: r.status,
      });
    }
  }
  return resolved;
}
