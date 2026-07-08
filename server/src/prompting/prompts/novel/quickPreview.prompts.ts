import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";

export interface QuickPreviewPromptInput {
  inspiration: string;
}

const quickPreviewCandidateSchema = z.object({
  title: z.string().trim().min(1),
  synopsis: z.string().trim().min(1),
  previewText: z.string().trim().min(1),
});

export const quickPreviewOutputSchema = z.object({
  candidates: z.array(quickPreviewCandidateSchema).min(3).max(3),
});

export type QuickPreviewRawOutput = z.infer<typeof quickPreviewOutputSchema>;

export const quickPreviewPrompt: PromptAsset<
  QuickPreviewPromptInput,
  QuickPreviewRawOutput,
  QuickPreviewRawOutput
> = {
  id: "novel.quick_preview.generate",
  version: "v1",
  taskType: "planner",
  mode: "structured",
  language: "zh",
  contextPolicy: {
    maxTokensBudget: 0,
  },
  semanticRetryPolicy: {
    maxAttempts: 1,
  },
  outputSchema: quickPreviewOutputSchema,
  render: (input) => [
    new SystemMessage([
      "你是一位小说创意快速发散助手，服务对象是有灵感但还没想好怎么写的作者。",
      "你的任务是根据用户给出的一句话灵感（或一段简短描述），快速生成 3 个不同方向的小说候选方案。",
      "",
      "只输出一个合法 JSON 对象，不要输出 Markdown、解释、注释、代码块或额外文本。",
      "固定输出字段必须且只能是：",
      "{\"candidates\":[{\"title\":\"...\",\"synopsis\":\"...\",\"previewText\":\"...\"},{...},{...}]}",
      "",
      "硬规则：",
      "1. 必须且只能输出恰好 3 个候选方案。",
      "2. 所有内容必须使用简体中文。",
      "3. 3 个方向必须有明显差异，包括但不限于题材类型、叙事基调、主角设定、世界观。",
      "4. 不要围绕同一设定做微调，必须真正发散出 3 条不同路径。",
      "",
      "字段要求：",
      "1. title：简短有力的小说标题，10 字以内，能直接传达风格或核心卖点。",
      "2. synopsis：100 字左右的故事梗概，说清楚核心设定、主要冲突和吸引力，不要写抽象口号。",
      "3. previewText：约 500 字的正文预览，必须是可读的故事开头段落，有场景、有人物、有冲突钩子，让读者能直观感受这本书的风格和节奏。",
      "",
      "质量要求：",
      '1. 标题要有辨识度，不要用”XX之XX”之类的烂大街句式。',
      "2. 梗概要像一句话推荐，能让人读完就想看下去。",
      "3. 预览正文要有画面感和节奏感，不要写成大纲摘要。",
      "4. 三个方案之间的风格差异要足够大，让读者能明确区分。",
      "",
      "缺口处理规则：",
      "1. 灵感信息较少时，大胆补全世界观和角色细节，但要保持整体一致性。",
      "2. 不要留空字段，不允许 null。",
    ].join("\n")),
    new HumanMessage([
      "请根据下面的灵感，快速生成 3 个不同方向的小说候选方案：",
      "",
      `灵感：${input.inspiration}`,
    ].join("\n")),
  ],
  postValidate: (output) => {
    return {
      candidates: output.candidates.map((candidate) => ({
        title: candidate.title.trim(),
        synopsis: candidate.synopsis.trim(),
        previewText: candidate.previewText.trim(),
      })),
    };
  },
};
