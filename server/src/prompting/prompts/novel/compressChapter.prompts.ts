import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
import { NOVEL_PROMPT_BUDGETS } from "./promptBudgetProfiles";

export interface CompressChapterPromptInput {
  novelTitle: string;
  chapterTitle: string;
  chapterContent: string;
  currentWordCount: number;
  targetMaxWordCount: number;
  wordCountTarget?: { min: number; max: number; role: string } | null;
}

export const compressChapterOutputSchema = z.object({
  compressedContent: z.string().min(1),
  removedSummary: z.string().min(1),
});

export const compressChapterPrompt: PromptAsset<
  CompressChapterPromptInput,
  z.infer<typeof compressChapterOutputSchema>
> = {
  id: "novel.chapter.compress",
  version: "v1",
  taskType: "writer",
  mode: "structured",
  language: "zh",
  contextPolicy: {
    maxTokensBudget: NOVEL_PROMPT_BUDGETS.chapterWriter,
  },
  outputSchema: compressChapterOutputSchema,
  render: (input) => [
    new SystemMessage([
      "你是中文网络小说章节精简助手。",
      "你的任务是在保持叙事连贯性和角色声音一致性的前提下，将章节正文精简到目标字数范围内。",
      "",
      "【任务边界】",
      "只输出符合 schema 的严格 JSON。",
      "不要输出 Markdown、解释、注释、代码块或任何额外文本。",
      "",
      "【精简策略】",
      "1. 优先保留核心情节推进段落，保留关键冲突、转折、对话和决策。",
      "2. 精简重复描写、过度环境铺陈、无信息增量的过渡段。",
      "3. 合并表达相近的段落，去除冗余修饰。",
      "4. 保留角色的标志性语言风格和关键对话。",
      "5. 删除不影响情节走向的背景铺垫和心理重复描写。",
      "6. 保持章节开头的吸引力和结尾的钩子。",
      "",
      "【质量红线】",
      "1. 不得删除推动情节发展的关键事件或对话。",
      "2. 不得改变人物关系走向或已确立的硬事实。",
      "3. 不得改变叙事视角或时态。",
      "4. 精简后的字数不得超过 targetMaxWordCount。",
      "",
      "【输出格式】",
      '{"compressedContent":"精简后的完整章节正文","removedSummary":"简述精简了哪些内容（50字内）"}',
    ].join("\n")),
    new HumanMessage([
      `小说：${input.novelTitle}`,
      `章节：${input.chapterTitle}`,
      `当前字数：${input.currentWordCount} 字`,
      `目标上限：${input.targetMaxWordCount} 字`,
      input.wordCountTarget
        ? `字数目标范围：${input.wordCountTarget.min}-${input.wordCountTarget.max} 字（${input.wordCountTarget.role}）`
        : "",
      "",
      "【需要精简的章节正文】",
      input.chapterContent,
      "",
      "请精简上述章节正文，使其不超过目标上限字数。输出压缩后的完整正文和精简摘要。",
    ].join("\n")),
  ],
};
