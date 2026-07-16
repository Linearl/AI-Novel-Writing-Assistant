/**
 * REQ-7055: 交叉编码重排服务
 *
 * 使用 cross-encoder 模型对初始检索结果进行重排序。
 * - 支持外部 reranker API 调用
 * - 处理多种返回格式（relevance_score, relevanceScore, score, rank_score）
 * - 当 reranker 不可用时优雅降级
 * - 重排后保留 topK 结果
 */

import { ragConfig } from "../../config/rag";

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

export interface RagRerankerDocument {
  text: string;
  index: number;
  [key: string]: unknown;
}

export interface RagRerankerInput {
  query: string;
  documents: RagRerankerDocument[];
  topK: number;
  model?: string;
}

export interface RagRerankerResult {
  index: number;
  score: number;
  text: string;
}

export interface RagRerankerOutput {
  used: boolean;
  results: RagRerankerResult[];
  error?: string;
}

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

/** 从 reranker API 返回中归一化 relevance 分数 */
function extractRelevanceScore(
  item: Record<string, unknown>,
  index: number,
): { index: number; score: number } {
  // 多种返回格式
  const rawScore =
    item.relevance_score ??
    item.relevanceScore ??
    item.score ??
    item.rank_score;
  const score = typeof rawScore === "number" ? rawScore : 1 / (index + 1);
  return { index: extractDocumentIndex(item, index), score };
}

/** 提取文档索引 */
function extractDocumentIndex(
  item: Record<string, unknown>,
  fallback: number,
): number {
  if (typeof item.index === "number") return item.index;
  if (typeof item.document_index === "number") return item.document_index;
  if (typeof item.documentIndex === "number") return item.documentIndex;
  return fallback;
}

/** 归一化 raw API 结果 */
function normalizeRerankerResults(
  raw: unknown,
  inputDocuments: RagRerankerDocument[],
): RagRerankerResult[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((item, i) => {
      if (typeof item !== "object" || item === null) {
        return null;
      }
      const { index, score } = extractRelevanceScore(item as Record<string, unknown>, i);
      const text = inputDocuments[index]?.text ?? "";
      return { index, score, text } as RagRerankerResult;
    })
    .filter((item): item is RagRerankerResult => item !== null)
    .sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// Reranker 服务
// ---------------------------------------------------------------------------

export class RagRerankerService {
  private getRerankerEndpoint(): string | null {
    const endpoint = ragConfig.rerankerModel;
    if (!endpoint) {
      return null;
    }
    return endpoint;
  }

  /**
   * 调用 reranker API 对文档进行重排序。
   *
   * 请求格式：
   * POST {endpoint}
   * Body: { query, documents: [{ text, index }], model? }
   *
   * 响应格式（任意一种均可）：
   * { results: [{ index, relevance_score|relevanceScore|score|rank_score }] }
   */
  async rerank(input: RagRerankerInput): Promise<RagRerankerOutput> {
    const endpoint = this.getRerankerEndpoint();
    if (!endpoint) {
      return {
        used: false,
        results: input.documents.map((d, i) => ({
          index: d.index,
          score: 1,
          text: d.text,
        })),
        error: "Reranker endpoint not configured",
      };
    }

    if (input.documents.length === 0) {
      return { used: false, results: [] };
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ragConfig.rerankerTimeoutMs);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: input.query,
          documents: input.documents.map((d) => ({ text: d.text, index: d.index })),
          model: input.model,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        return {
          used: false,
          results: input.documents.map((d, i) => ({
            index: d.index,
            score: 1,
            text: d.text,
          })),
          error: `Reranker API returned ${response.status}`,
        };
      }

      const payload = await response.json() as Record<string, unknown>;
      const rawResults = Array.isArray(payload.results) ? payload.results : payload;
      const normalized = normalizeRerankerResults(rawResults, input.documents);
      const topResults = normalized.slice(0, input.topK);

      return {
        used: true,
        results: topResults,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Reranker request failed";
      return {
        used: false,
        results: input.documents.map((d, i) => ({
          index: d.index,
          score: 1,
          text: d.text,
        })),
        error: errorMsg,
      };
    }
  }
}
