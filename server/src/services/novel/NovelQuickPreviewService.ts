import type {
  QuickPreviewInput,
  QuickPreviewResult,
} from "@ai-novel/shared/types/novelQuickPreview";
import { runStructuredPrompt } from "../../prompting/core/promptRunner";
import { quickPreviewPrompt } from "../../prompting/prompts/novel/quickPreview.prompts";

export class NovelQuickPreviewService {
  async generate(input: QuickPreviewInput): Promise<QuickPreviewResult> {
    if (!input.inspiration?.trim()) {
      throw new Error("请输入灵感内容后再让 AI 帮你生成预览。");
    }

    const result = await runStructuredPrompt({
      asset: quickPreviewPrompt,
      promptInput: {
        inspiration: input.inspiration.trim(),
      },
      options: {
        provider: input.provider,
        model: input.model,
        temperature: Math.min(input.temperature ?? 0.8, 1.0),
      },
    });
    return result.output;
  }
}

export const novelQuickPreviewService = new NovelQuickPreviewService();
