/**
 * REQ-7055: 上下文分块服务
 *
 * 参考 Anthropic 的 contextual retrieval 方法，为每个 chunk 生成上下文前缀：
 * 1. 基于文档全局上下文为 chunk 生成简短前缀（最多 260 字符）
 * 2. 前缀拼接到 chunk 文本前面用于 embedding
 * 3. 上下文来源哈希用于去重
 *
 * 适配本项目 LLM 调用方式（PromptAsset + runTextPrompt）。
 */

import { createHash } from "crypto";
import { ragConfig } from "../../config/rag";
import { runTextPrompt } from "../../prompting/core/promptRunner";
import { getRegisteredPromptAsset } from "../../prompting/registry";
import type { ContextualChunkInput } from "../../prompting/prompts/rag/contextualChunk.prompts";
import type { PromptAsset } from "../../prompting/core/promptTypes";
import type { RagSourceDocument } from "./types";

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

export interface RagContextualChunkDocument {
  title: string;
  summary: string;
  sourceHash: string;
  chunks: string[];
}

export interface RagContextualChunkInputSpec {
  document: RagContextualChunkDocument;
  chunkOrder: number;
  chunkText: string;
  metadata?: Record<string, unknown>;
}

export interface RagContextualChunkOutput {
  chunkText: string;
  prefix: string;
  sourceHash: string;
  used: boolean;
}

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

/** 用 SHA-256 构建上下文来源哈希 */
export function buildContextSourceHash(document: Pick<RagSourceDocument, "ownerType" | "ownerId" | "title">): string {
  const payload = `${document.ownerType}|${document.ownerId}|${document.title ?? ""}`;
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

/** 归一化上下文前缀：去空白、截断到 maxChars */
export function normalizeContextPrefix(raw: string, maxChars: number = ragConfig.contextPrefixMaxChars): string {
  const cleaned = raw
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= maxChars) {
    return cleaned;
  }
  // 尝试在词边界截断
  const truncated = cleaned.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > maxChars * 0.5) {
    return truncated.slice(0, lastSpace);
  }
  return truncated;
}

/** 将前缀拼接到 chunkText 前面 */
export function prependChunkPrefix(chunkText: string, prefix: string): string {
  if (!prefix) {
    return chunkText;
  }
  return `[${prefix}] ${chunkText}`;
}

// ---------------------------------------------------------------------------
// 上下文分块服务
// ---------------------------------------------------------------------------

export class RagContextualChunkService {
  /** 生成单个 chunk 的上下文前缀 */
  async generateChunkPrefix(input: RagContextualChunkInputSpec): Promise<RagContextualChunkOutput> {
    const sourceHash = buildContextSourceHash({
      ownerType: "knowledge_document",
      ownerId: input.document.sourceHash,
      title: input.document.title,
    });

    try {
      const promptAsset = getRegisteredPromptAsset("rag.contextual_chunk.prefix", "v1") as unknown as PromptAsset<ContextualChunkInput, string, string> | null;
      if (!promptAsset) {
        return {
          chunkText: input.chunkText,
          prefix: "",
          sourceHash,
          used: false,
        };
      }

      const promptInput: ContextualChunkInput = {
        documentTitle: input.document.title,
        documentSummary: input.document.summary,
        chunkText: input.chunkText,
        chunkContext: `第 ${input.chunkOrder + 1}/${input.document.chunks.length} 个片段`,
      };

      // 使用 runTextPrompt 调用 LLM 生成前缀
      const result = await runTextPrompt({
        asset: promptAsset,
        promptInput,
      });

      const prefix = normalizeContextPrefix(result.output);

      return {
        chunkText: prependChunkPrefix(input.chunkText, prefix),
        prefix,
        sourceHash,
        used: prefix.length > 0,
      };
    } catch {
      // LLM 调用失败时返回去前缀的 chunkText
      return {
        chunkText: input.chunkText,
        prefix: "",
        sourceHash,
        used: false,
      };
    }
  }

  /** 批量生成上下文前缀 */
  async generatePrefixesForChunks(
    document: RagContextualChunkDocument,
    chunks: Array<{ chunkText: string; metadata?: Record<string, unknown> }>,
  ): Promise<RagContextualChunkOutput[]> {
    const results: RagContextualChunkOutput[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const result = await this.generateChunkPrefix({
        document,
        chunkOrder: i,
        chunkText: chunks[i].chunkText,
        metadata: chunks[i].metadata,
      });
      results.push(result);
    }
    return results;
  }

  /**
   * 判断是否需要对文档启用上下文分块
   *
   * 规则：
   * - 文档 chunk 数 >= 3 时自动启用
   * - 可通过 metadata 中的 contextualRetrieval 字段覆盖
   */
  shouldEnableContextualChunks(
    totalChunks: number,
    metadata?: Record<string, unknown>,
  ): boolean {
    if (metadata?.contextualRetrieval === false) {
      return false;
    }
    if (metadata?.contextualRetrieval === true) {
      return true;
    }
    return totalChunks >= 3;
  }
}
