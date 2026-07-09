import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";

export interface QuickPreviewChapterPromptInput {
  title: string;
  synopsis: string;
  previewText: string;
  inspiration: string;
}

const previewChapterSchema = z.object({
  title: z.string().trim().min(1),
  wordCount: z.number().int().min(100),
  content: z.string().trim().min(100),
});

export const quickPreviewChapterOutputSchema = z.object({
  chapters: z.array(previewChapterSchema).min(3).max(3),
});

export type QuickPreviewChapterRawOutput = z.infer<typeof quickPreviewChapterOutputSchema>;

export const quickPreviewChapterPrompt: PromptAsset<
  QuickPreviewChapterPromptInput,
  QuickPreviewChapterRawOutput,
  QuickPreviewChapterRawOutput
> = {
  id: "novel.quick_preview.generate_chapters",
  version: "v1",
  taskType: "writer",
  mode: "structured",
  language: "zh",
  contextPolicy: {
    maxTokensBudget: 0,
  },
  semanticRetryPolicy: {
    maxAttempts: 1,
  },
  outputSchema: quickPreviewChapterOutputSchema,
  render: (input) => [
    new SystemMessage([
      "你是一位中文网络小说写作助手，正在进行「快速预览模式」的前 3 章生成。",
      "快速预览模式的目标是让作者快速感受这本书的风格、节奏和故事走向，因此要求：",
      "1. 每章约 1500-2000 字，不必达到正式章节的完整度，但必须有可读的故事内容。",
      "2. 必须有场景、人物、对话和冲突，不要写成大纲或摘要。",
      "3. 三章之间要有连贯的故事推进，不能是三个独立片段。",
      "4. 第一章必须抓住读者注意力，建立核心悬念或冲突。",
      "5. 保持与预览正文一致的风格和基调。",
      "",
      "只输出一个合法 JSON 对象，不要输出 Markdown、解释、注释、代码块或额外文本。",
      "固定输出字段必须且只能是：",
      "{\"chapters\":[{\"title\":\"...\",\"wordCount\":1500,\"content\":\"...\"},{...},{...}]}",
      "",
      "硬规则：",
      "1. 必须且只能输出恰好 3 个章节。",
      "2. 所有内容必须使用简体中文。",
      "3. wordCount 填写实际生成的中文字数（不含标点和空格的大致估算）。",
      "4. 每章正文不得少于 1000 字。",
      "5. 不要留空字段，不允许 null。",
      "",
      "输出要求：",
      "1. 每章的 title 是本章标题，简短有力。",
      "2. content 是完整可读的正文，不是提纲。",
      "3. 第一章正文必须与 previewText 的开头段落自然衔接或重写为更完整的版本。",
      "4. 三章之间用叙事逻辑推进，让读者能看到故事在发展。",
    ].join("\n")),
    new HumanMessage([
      "请为以下小说快速生成前 3 章正文（快速预览模式）：",
      "",
      `小说标题：${input.title}`,
      `故事梗概：${input.synopsis}`,
      `开头预览：${input.previewText}`,
      `原始灵感：${input.inspiration}`,
      "",
      "要求：",
      "1. 第一章必须与开头预览衔接或基于它展开，让读者能直接感受这本书的风格。",
      "2. 三章内容要形成连贯的故事推进，不能是三个独立片段。",
      "3. 每章约 1500-2000 字，以实际可读的故事正文为主。",
      "4. 输出合法 JSON，只包含 chapters 数组，恰好 3 个章节。",
    ].join("\n")),
  ],
  postValidate: (output) => {
    return {
      chapters: output.chapters.map((chapter) => ({
        title: chapter.title.trim(),
        wordCount: chapter.wordCount,
        content: chapter.content.trim(),
      })),
    };
  },
};
