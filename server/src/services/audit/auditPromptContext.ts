import type { GenerationContextPackage } from "@ai-novel/shared";
import type { PromptAsset, PromptContextBlock } from "../../prompting/core/promptTypes";
import { resolvePromptContextBlocksForAsset } from "../../prompting/context/promptContextResolution";
import {
  type AuditChapterPromptInput,
} from "../../prompting/prompts/audit/audit.prompts";
import { buildChapterReviewContextBlocks } from "../../prompting/prompts/novel/chapterLayeredContext";
import { fetchGlobalReviewFeedbackForChapter } from "./auditContextBuilder";

export async function resolveAuditChapterContextBlocks<O, R = O>(input: {
  asset: PromptAsset<AuditChapterPromptInput, O, R>;
  novelId: string;
  contextPackage?: GenerationContextPackage;
  ragContext: string;
}): Promise<PromptContextBlock[] | undefined> {
  const reviewContext = input.contextPackage?.chapterReviewContext;
  if (!reviewContext) {
    return undefined;
  }

  const fallbackContextBlocks = buildChapterReviewContextBlocks(reviewContext);

  // REQ-2050: 注入全局审校反馈（跨章节问题回灌到逐章审校）
  let globalReviewFeedbackBlocks: PromptContextBlock[] = [];
  try {
    const chapterId = input.contextPackage?.chapter.id;
    if (chapterId) {
      globalReviewFeedbackBlocks = await fetchGlobalReviewFeedbackForChapter(
        input.novelId,
        chapterId,
        10,
      );
    }
  } catch {
    // 全局审校反馈获取失败不阻断逐章审校
  }

  const mergedFallbackBlocks = [
    ...globalReviewFeedbackBlocks,
    ...fallbackContextBlocks,
  ];

  const resolvedContext = await resolvePromptContextBlocksForAsset({
    asset: input.asset,
    executionContext: {
      entrypoint: "chapter_pipeline",
      novelId: input.novelId,
      chapterId: input.contextPackage?.chapter.id,
      metadata: {
        chapterReviewContext: reviewContext,
        ragContext: input.ragContext,
      },
    },
    fallbackBlocks: mergedFallbackBlocks,
  });
  return resolvedContext.blocks;
}
