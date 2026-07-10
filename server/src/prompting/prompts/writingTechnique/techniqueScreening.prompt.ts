import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
import { techniqueScreeningOutputSchema } from "./techniqueScreening.schema";

export interface TechniqueScreeningInput {
  candidates: Array<{ key: string; name: string; description: string }>;
  selectedText: string;
  chapterContext: string;
}

export const techniqueScreeningPrompt: PromptAsset<
  TechniqueScreeningInput,
  z.infer<typeof techniqueScreeningOutputSchema>
> = {
  id: "writing_technique.screening",
  version: "v1",
  taskType: "planner",
  mode: "structured",
  language: "zh",
  contextPolicy: {
    maxTokensBudget: 0,
  },
  outputSchema: techniqueScreeningOutputSchema,
  structuredOutputHint: {
    mode: "auto",
    note: "返回最多 5 个适用技法的 key 和理由。",
  },
  render: (input) => [
    new SystemMessage([
      "你是小说写作助手的文笔技法筛选器。",
      "你的任务是从候选技法列表中，选出最适合当前文本改写场景的技法。",
      "",
      "只输出一个合法 JSON 对象，不要输出 Markdown、解释或额外文本。",
      "输出字段必须且只能包括：selected（数组，每项含 key 和 reason）。",
      "",
      "筛选规则：",
      "1. 只从候选列表中选择，不要自创技法。",
      "2. 最多选择 5 个技法。如果都不适用，返回空数组。",
      '3. 选择标准：这个技法是否能明显提升当前文本的质量？不是"能用"，而是"用了会更好"。',
      "4. 优先选择与当前文本的薄弱环节直接对应的技法。",
      '5. 不要选择功能重叠的技法（比如同时选"留白"和"情绪留白"）。',
      "6. reason 用一句话说明选这个技法的理由，指出当前文本的具体问题。",
      "",
      "常见匹配模式：",
      "- 直白陈述情绪 → 镜头句、情绪克制、情绪外化",
      "- 对话缺乏张力 → 冰山对话法",
      "- 节奏单调 → 短句切割、落差句、涟漪句",
      "- 描写空洞 → 留白、空镜、物候、冷笔触",
      "- 转场生硬 → 无痕转场",
      "- 缺乏细节 → 慢镜头观察、日常故事感",
      "- 比喻陈旧 → 陌生化、逆喻",
      "- 段落尾部总结 → 删除即可，不需要技法",
    ].join("\n")),
    new HumanMessage([
      "候选技法列表：",
      input.candidates.map((c) => `- [${c.key}] ${c.name}：${c.description}`).join("\n"),
      "",
      "当前选中的文本：",
      input.selectedText,
      "",
      input.chapterContext
        ? ["章节上下文：", input.chapterContext].join("\n")
        : "",
      "",
      "请筛选适用的技法，返回 JSON。",
    ].filter(Boolean).join("\n")),
  ],
};
