/**
 * REQ-7055: 检索追踪
 *
 * 记录完整的检索过程，用于调试和优化：
 * - 6 阶段时间快照（vector, keyword, fusion, fallback, reranker, decay, hits）
 * - 候选数量变化
 * - 查询摘要（SHA-256）
 * - 异步持久化到 Prisma
 */

import { createHash } from "crypto";
import { prisma } from "../../db/prisma";
import { ragConfig } from "../../config/rag";
import type { RagSearchOptions, RetrievedChunk } from "./types";

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

export type TraceStage =
  | "vector"
  | "keyword"
  | "fusion"
  | "fallback"
  | "reranker"
  | "decay"
  | "hits";

export interface TraceTimingSnapshot {
  vectorMs: number;
  keywordMs: number;
  fusionMs: number;
  rerankerMs: number;
  decayMs: number;
  totalMs: number;
}

export interface TraceCandidateCounts {
  vector: number;
  keyword: number;
  fused: number;
  rerankerInput: number;
  rerankerOutput: number;
  final: number;
}

export interface RetrievalTraceRecord {
  query: string;
  queryHash: string;
  tenantId: string;
  novelId?: string;
  worldId?: string;
  timing: TraceTimingSnapshot;
  counts: TraceCandidateCounts;
  hits?: RetrievedChunk[];
  options?: RagSearchOptions;
}

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

/** 查询摘要：SHA-256(query).slice(0, 24) */
export function digestQuery(query: string): string {
  return createHash("sha256").update(query).digest("hex").slice(0, 24);
}

/** 创建空的 timing 快照 */
export function createEmptyTimingSnapshot(): TraceTimingSnapshot {
  return {
    vectorMs: 0,
    keywordMs: 0,
    fusionMs: 0,
    rerankerMs: 0,
    decayMs: 0,
    totalMs: 0,
  };
}

/** 创建空的候选计数 */
export function createEmptyCountsSnapshot(): TraceCandidateCounts {
  return {
    vector: 0,
    keyword: 0,
    fused: 0,
    rerankerInput: 0,
    rerankerOutput: 0,
    final: 0,
  };
}

// ---------------------------------------------------------------------------
// RagRetrievalTracer
// ---------------------------------------------------------------------------

export class RagRetrievalTracer {
  private enabled: boolean;

  constructor(enabled: boolean = ragConfig.enabled) {
    this.enabled = enabled;
  }

  /** 持久化追踪记录（异步，不阻塞检索响应） */
  private async persistTrace(record: RetrievalTraceRecord): Promise<void> {
    try {
      await prisma.ragRetrievalTrace.create({
        data: {
          queryHash: record.queryHash,
          tenantId: record.tenantId,
          novelId: record.novelId ?? null,
          worldId: record.worldId ?? null,
          timingJson: JSON.stringify(record.timing),
          countsJson: JSON.stringify(record.counts),
          hitsJson: record.hits ? JSON.stringify(record.hits.slice(0, 20).map((h) => ({
            id: h.id,
            ownerType: h.ownerType,
            ownerId: h.ownerId,
            score: h.score,
            source: h.source,
            chunkOrder: h.chunkOrder,
          }))) : null,
          optionsJson: record.options ? JSON.stringify({
            novelId: record.options.novelId,
            worldId: record.options.worldId,
            ownerTypes: record.options.ownerTypes,
            finalTopK: record.options.finalTopK,
          }) : null,
        },
      });
    } catch {
      // 追踪写入失败不阻断检索
    }
  }

  /**
   * 记录检索追踪。
   * 异步持久化，不 await，不阻塞检索返回。
   */
  recordTrace(record: RetrievalTraceRecord): void {
    if (!this.enabled) {
      return;
    }
    // 异步持久化，不阻塞
    void this.persistTrace(record).catch(() => {
      // 静默处理
    });
  }

  /** 查询追踪记录 */
  async queryTraces(params: {
    tenantId?: string;
    limit?: number;
    before?: Date;
  }): Promise<RetrievalTraceRecord[]> {
    const limit = Math.min(params.limit ?? 50, 200);
    const rows = await prisma.ragRetrievalTrace.findMany({
      where: {
        ...(params.tenantId ? { tenantId: params.tenantId } : {}),
        ...(params.before ? { createdAt: { lt: params.before } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((row) => ({
      query: "",
      queryHash: row.queryHash,
      tenantId: row.tenantId,
      novelId: row.novelId ?? undefined,
      worldId: row.worldId ?? undefined,
      timing: JSON.parse(row.timingJson) as TraceTimingSnapshot,
      counts: JSON.parse(row.countsJson) as TraceCandidateCounts,
    }));
  }
}
