import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
import { NOVEL_PROMPT_BUDGETS } from "./promptBudgetProfiles";

export interface ExpandChapterPromptInput {
  novelTitle: string;
  chapterTitle: string;
  chapterContent: string;
  currentWordCount: number;
  targetMinWordCount: number;
  wordCountTarget?: { min: number; max: number; role: string } | null;
}

export const expandChapterOutputSchema = z.object({
  expandedContent: z.string().min(1),
  addedSummary: z.string().min(1),
});

export const expandChapterPrompt: PromptAsset<
  ExpandChapterPromptInput,
  z.infer<typeof expandChapterOutputSchema>
> = {
  id: "novel.chapter.expand",
  version: "v1",
  taskType: "writer",
  mode: "structured",
  language: "zh",
  contextPolicy: {
    maxTokensBudget: NOVEL_PROMPT_BUDGETS.chapterWriter,
  },
  outputSchema: expandChapterOutputSchema,
  render: (input) => [
    new SystemMessage([
      "你是中文网络小说章节扩写助手。",
      "你的任务是在保持叙事连贯性和角色声音一致性的前提下，将章节正文扩充到目标字数范围内。",
      "",
      "【任务边界】",
      "只输出符合 schema 的严格 JSON。",
      "不要输出 Markdown、解释、注释、代码块或任何额外文本。",
      "",
      "【扩写策略】",
      "1. 补充角色内心活动、情绪变化、决策过程。",
      "2. 丰富关键对话的交互层次和情绪张力。",
      "3. 增加环境细节、氛围渲染和感官描写，服务于叙事而非堆砌。",
      "4. 加强冲突场面的节奏感和紧张度。",
      "5. 适当展开人物关系的微妙变化和互动细节。",
      "6. 保持与上下文风格一致，不引入新的剧情线。",
      "",
      "【质量红线】",
      "1. 不得引入新的剧情线、新角色或改变已有事件走向。",
      "2. 不得改变人物关系走向或已确立的硬事实。",
      "3. 不得改变叙事视角或时态。",
      "4. 扩写后字数不得少于 targetMinWordCount。",
      "5. 不得通过重复回顾、空泛心理独白或无意义对话硬凑字数。",
      "",
      "【输出格式】",
      '{"expandedContent":"扩写后的完整章节正文","addedSummary":"简述扩写了哪些内容（50字内）"}',
    ].join("\n")),
    new HumanMessage([
      `小说：${input.novelTitle}`,
      `章节：${input.chapterTitle}`,
      `当前字数：${input.currentWordCount} 字`,
      `目标下限：${input.targetMinWordCount} 字`,
      input.wordCountTarget
        ? `字数目标范围：${input.wordCountTarget.min}-${input.wordCountTarget.max} 字（${input.wordCountTarget.role}）`
        : "",
      "",
      "【需要扩写的章节正文】",
      input.chapterContent,
      "",
      "请扩写上述章节正文，使其达到目标下限字数以上。输出扩写后的完整正文和扩写摘要。",
    ].join("\n")),
  ],
};
