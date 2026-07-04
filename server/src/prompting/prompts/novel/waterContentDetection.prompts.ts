import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
import { NOVEL_PROMPT_BUDGETS } from "./promptBudgetProfiles";

export interface WaterContentDetectionPromptInput {
  novelTitle: string;
  chapterTitle: string;
  chapterContent: string;
}

export const waterContentDetectionOutputSchema = z.object({
  paragraphs: z.array(
    z.object({
      index: z.number().int().min(0),
      isWater: z.boolean(),
      reason: z.string().min(1),
    }),
  ),
  waterScore: z.number().min(0).max(100),
  summary: z.string().min(1),
});

export const waterContentDetectionPrompt: PromptAsset<
  WaterContentDetectionPromptInput,
  z.infer<typeof waterContentDetectionOutputSchema>
> = {
  id: "novel.water_content.detect",
  version: "v1",
  taskType: "critical_review",
  mode: "structured",
  language: "zh",
  contextPolicy: {
    maxTokensBudget: NOVEL_PROMPT_BUDGETS.chapterReview,
  },
  outputSchema: waterContentDetectionOutputSchema,
  render: (input) => [
    new SystemMessage([
      "你是中文网络小说水文检测专家。",
      "你的任务是对章节正文进行段落级分析，识别无效描写（水文），计算无效描写密度。",
      "",
      "【任务边界】",
      "只输出符合 schema 的严格 JSON。",
      "不要输出 Markdown、解释、注释、代码块或任何额外文本。",
      "",
      "【水文判定标准】",
      "以下情况判定为水文（isWater = true）：",
      "1. 重复描写：对同一事件、情绪、场景的重复表达，无新增信息。",
      "2. 无关对话：不推进情节、不塑造角色、不建立世界观的对话。",
      "3. 过度铺陈：无信息增量的环境描写、氛围渲染，超过叙事需要。",
      "4. 空泛心理：无决策推进的内心独白、反复自问。",
      "5. 注水过渡：纯粹为了填充字数的过渡段，无实际内容推进。",
      "",
      "以下情况不判定为水文：",
      "1. 推进情节的关键事件描写。",
      "2. 塑造角色性格或情感的核心对话。",
      "3. 建立世界观、规则体系的必要铺垫。",
      "4. 营造紧张氛围的关键节奏段。",
      "5. 为后续情节埋设的必要伏笔。",
      "",
      "【输出格式】",
      "{",
      '  "paragraphs": [{"index": 0, "isWater": false, "reason": "推进关键情节"}],',
      '  "waterScore": 15,',
      '  "summary": "本章水文密度约 15%，主要集中在第 3、7 段的重复描写。"',
      "}",
      "",
      "【注意事项】",
      "- 按自然段落分割，逐段判断。",
      "- waterScore = 水文段落数 / 总段落数 * 100，四舍五入到整数。",
      "- summary 控制在 80 字以内。",
    ].join("\n")),
    new HumanMessage([
      `小说：${input.novelTitle}`,
      `章节：${input.chapterTitle}`,
      "",
      "【需要检测的章节正文】",
      input.chapterContent,
      "",
      "请逐段分析上述章节正文，识别水文段落并计算水文密度。",
    ].join("\n")),
  ],
};
