/**
 * 共享的JSON结构对比工具
 * 用于手动对比和自动对比，确保一致性
 */

import type { NovelWorldSyncSection } from "@ai-novel/shared";

export interface FieldDiff {
  field: string;
  worldValue: unknown;
  novelValue: unknown;
  isDifferent: boolean;
}

export interface CompareResult {
  hasDifferences: boolean;
  fieldDiffs: FieldDiff[];
}

/**
 * 递归对比两个对象的所有字段
 */
function compareObjects(
  obj1: Record<string, unknown>,
  obj2: Record<string, unknown>,
  prefix: string,
  diffs: FieldDiff[]
): void {
  const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

  for (const key of allKeys) {
    const fullPath = prefix ? `${prefix}.${key}` : key;

    // 忽略metadata.lastGeneratedAt字段（同步后会自动更新）
    if (fullPath === "metadata.lastGeneratedAt") {
      continue;
    }

    const val1 = obj1[key];
    const val2 = obj2[key];

    // 处理undefined
    if (val1 === undefined && val2 === undefined) {
      continue;
    }

    if (val1 === undefined || val2 === undefined) {
      diffs.push({
        field: fullPath,
        worldValue: val1,
        novelValue: val2,
        isDifferent: true,
      });
      continue;
    }

    // 处理null
    if (val1 === null && val2 === null) {
      continue;
    }

    if (val1 === null || val2 === null) {
      diffs.push({
        field: fullPath,
        worldValue: val1,
        novelValue: val2,
        isDifferent: true,
      });
      continue;
    }

    // 处理对象（递归）
    if (typeof val1 === "object" && typeof val2 === "object" && !Array.isArray(val1) && !Array.isArray(val2)) {
      compareObjects(val1 as Record<string, unknown>, val2 as Record<string, unknown>, fullPath, diffs);
      continue;
    }

    // 处理数组
    if (Array.isArray(val1) && Array.isArray(val2)) {
      const str1 = JSON.stringify(val1);
      const str2 = JSON.stringify(val2);
      if (str1 !== str2) {
        diffs.push({
          field: fullPath,
          worldValue: val1,
          novelValue: val2,
          isDifferent: true,
        });
      }
      continue;
    }

    // 处理基本类型
    if (val1 !== val2) {
      diffs.push({
        field: fullPath,
        worldValue: val1,
        novelValue: val2,
        isDifferent: true,
      });
    }
  }
}

/**
 * 对比两个JSON结构，返回所有差异
 * 复用手动对比的逻辑，确保自动对比和手动对比结果一致
 */
export function compareStructures(
  worldStructure: Record<string, unknown> | null,
  novelStructure: Record<string, unknown> | null,
): CompareResult {
  const diffs: FieldDiff[] = [];

  if (!worldStructure && !novelStructure) {
    return { hasDifferences: false, fieldDiffs: [] };
  }

  if (!worldStructure || !novelStructure) {
    diffs.push({
      field: "root",
      worldValue: worldStructure,
      novelValue: novelStructure,
      isDifferent: true,
    });
    return { hasDifferences: true, fieldDiffs: diffs };
  }

  compareObjects(worldStructure, novelStructure, "", diffs);

  return {
    hasDifferences: diffs.length > 0,
    fieldDiffs: diffs,
  };
}

/**
 * 将FieldDiff转换为NovelWorldSyncDiff的differences格式
 */
export function convertToSyncDifferences(
  compareResult: CompareResult,
  worldName: string,
  novelName: string,
): Array<{
  section: NovelWorldSyncSection;
  label: string;
  status: "changed" | "local_only" | "library_only";
  summary: string;
}> {
  if (!compareResult.hasDifferences) {
    return [];
  }

  // 按顶级字段分组
  const sectionMap = new Map<string, FieldDiff[]>();

  for (const diff of compareResult.fieldDiffs) {
    const topLevelField = diff.field.split(".")[0];
    if (!sectionMap.has(topLevelField)) {
      sectionMap.set(topLevelField, []);
    }
    sectionMap.get(topLevelField)!.push(diff);
  }

  // 支持的sync section类型
  const validSections: NovelWorldSyncSection[] = ["profile", "rules", "factions", "forces", "locations", "relations"];

  // 转换为sync diff格式，只包含有效的section
  return Array.from(sectionMap.entries())
    .filter(([section]) => validSections.includes(section as NovelWorldSyncSection))
    .map(([section, diffs]) => ({
      section: section as NovelWorldSyncSection,
      label: getSectionLabel(section),
      status: "changed" as const,
      summary: `发现 ${diffs.length} 处差异：${diffs.slice(0, 3).map(d => d.field).join("、")}${diffs.length > 3 ? "等" : ""}`,
    }));
}

function getSectionLabel(section: string): string {
  const labels: Record<string, string> = {
    profile: "世界概要",
    rules: "核心规则",
    factions: "阵营",
    forces: "势力",
    locations: "地点",
    relations: "关系网络",
    metadata: "元数据",
  };
  return labels[section] ?? section;
}
