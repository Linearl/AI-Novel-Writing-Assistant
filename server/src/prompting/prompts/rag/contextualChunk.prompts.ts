/**
 * REQ-7055: 上下文分块 Prompt
 *
 * 参考 Anthropic contextual retrieval 方法，为每个 chunk 生成简短上下文前缀（<=260 字符）。
 * 前缀拼接到 chunk 文本前面用于 embedding，提升相似度匹配精度。
 */

import type { PromptAsset } from "../../core/promptTypes";

// ---------------------------------------------------------------------------
// 输入/输出类型
// ---------------------------------------------------------------------------

export interface ContextualChunkInput {
  documentTitle: string;
  documentSummary: string;
  chunkText: string;
  chunkContext: string;
}

// ---------------------------------------------------------------------------
// PromptAsset
// ---------------------------------------------------------------------------

export const ragContextualChunkPrefixPrompt: PromptAsset<ContextualChunkInput, string, string> = {
  id: "rag.contextual_chunk.prefix",
  version: "v1",
  taskType: "fact_extraction",
  mode: "text",
  language: "zh",
  contextPolicy: {
    maxTokensBudget: 4096,
  },
  render: (input) => {
    const userPrompt = [
      "为下方文档片段生成一个简短的上下文前缀（最多 260 字符）。",
      "",
      "前缀应包含：",
      "1. 文档标题或来源名称",
      "2. 该片段在整体文档中的位置或主题",
      "3. 与该片段直接相关的核心实体（角色、地点、事件等）",
      "",
      "仅输出前缀文本，无需额外说明或格式标记。",
      "",
      `文档标题：${input.documentTitle}`,
      `文档摘要：${input.documentSummary}`,
      `片段上下文：${input.chunkContext}`,
      "",
      `待生成前缀的文档片段：`,
      `${input.chunkText.slice(0, 800)}`,
    ].join("\n");

    return [{ _getType: () => "system", content: "你是一个专业的文档片段上下文分析助手。请生成简洁准确的上下文前缀。" }, { _getType: () => "human", content: userPrompt }] as any;
  },
};
