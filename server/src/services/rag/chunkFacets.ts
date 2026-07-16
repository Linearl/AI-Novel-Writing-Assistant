/**
 * REQ-7055: 分面检索 — 7 维 facet 类型定义和归一化工具
 *
 * 为 RAG chunk 附加 7 维 facet 元数据，支持 facet 感知的检索过滤和加权提升。
 * 参考上游 chunkFacets.ts。
 */

export const RAG_CHUNK_FACET_KEYS = [
  "genreTags",
  "sellingPointTags",
  "targetReaders",
  "strengths",
  "weaknesses",
  "characterRole",
  "chapterAnchor",
] as const;

export type RagChunkFacetKey = (typeof RAG_CHUNK_FACET_KEYS)[number];

export type RagChunkFacets = Partial<Record<RagChunkFacetKey, string[]>>;

/** 每个 facet 维度最大值数量上限 */
export const RAG_FACET_MAX_ENTRIES = 12;

/** facet 过滤模式 */
export type FacetMode = "strict" | "boost";

/** facet 感知的检索选项 */
export interface FacetedSearchOptions {
  facets?: RagChunkFacets;
  facetMode?: FacetMode;
}

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

/** 去掉空白和重复项，截断到 maxEntries */
export function normalizeRagFacetValues(
  raw: unknown,
  maxEntries: number = RAG_FACET_MAX_ENTRIES,
): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const seen = new Set<string>();
  return raw
    .flat()
    .map((item) => {
      if (typeof item !== "string") {
        return "";
      }
      return item.trim();
    })
    .filter((item) => item.length > 0)
    .filter((item) => {
      if (seen.has(item)) {
        return false;
      }
      seen.add(item);
      return true;
    })
    .slice(0, maxEntries);
}

/** 归一化完整的 facet 对象 */
export function normalizeRagFacets(raw: unknown): RagChunkFacets {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const result: RagChunkFacets = {};
  for (const key of RAG_CHUNK_FACET_KEYS) {
    const value = (raw as Record<string, unknown>)[key];
    const normalized = normalizeRagFacetValues(value);
    if (normalized.length > 0) {
      result[key] = normalized;
    }
  }
  return result;
}

/** 检查是否有任意 facet 数据 */
export function hasRagFacets(facets: unknown): boolean {
  if (!facets || typeof facets !== "object" || Array.isArray(facets)) {
    return false;
  }
  return RAG_CHUNK_FACET_KEYS.some((key) => {
    const value = (facets as Record<string, unknown>)[key];
    return Array.isArray(value) && value.length > 0;
  });
}

/** 检查请求的 facet 与 chunk 的 facet 是否匹配 */
export function matchRagFacets(
  chunkFacets: RagChunkFacets | undefined,
  queryFacets: RagChunkFacets | undefined,
): boolean {
  if (!queryFacets || Object.keys(queryFacets).length === 0) {
    return true; // 没有 facet 过滤条件，全部通过
  }
  if (!chunkFacets || Object.keys(chunkFacets).length === 0) {
    return false; // 有过滤条件但 chunk 没有 facet，不通过
  }
  // 所有查询维度都必须至少有一个交集
  return RAG_CHUNK_FACET_KEYS.every((key) => {
    const queryValues = queryFacets[key];
    if (!queryValues || queryValues.length === 0) {
      return true; // 该维度未指定过滤，通过
    }
    const chunkValues = chunkFacets[key];
    if (!chunkValues || chunkValues.length === 0) {
      return false; // 查询指定了该维度但 chunk 没有，不通过
    }
    return queryValues.some((qv) => chunkValues.includes(qv));
  });
}

/** 计算 chunk facet 与查询 facet 的匹配分（用于 boost 模式加权） */
export function computeFacetBoostScore(
  chunkFacets: RagChunkFacets | undefined,
  queryFacets: RagChunkFacets | undefined,
): number {
  if (!queryFacets || Object.keys(queryFacets).length === 0) {
    return 0;
  }
  if (!chunkFacets || Object.keys(chunkFacets).length === 0) {
    return 0;
  }
  let matchCount = 0;
  let totalDims = 0;
  for (const key of RAG_CHUNK_FACET_KEYS) {
    const queryValues = queryFacets[key];
    if (!queryValues || queryValues.length === 0) {
      continue;
    }
    totalDims += 1;
    const chunkValues = chunkFacets[key];
    if (!chunkValues || chunkValues.length === 0) {
      continue;
    }
    const overlapCount = queryValues.filter((qv) => chunkValues.includes(qv)).length;
    if (overlapCount > 0) {
      matchCount += 1;
    }
  }
  if (totalDims === 0) {
    return 0;
  }
  return matchCount / totalDims;
}
