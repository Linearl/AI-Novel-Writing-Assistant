import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";

export const atmosphereMatchOutputSchema = z.object({
  matched: z.array(z.string()).describe("匹配的氛围卡 key 列表"),
  suggestedNew: z.array(z.string()).describe("建议新增的氛围名称列表"),
});

export interface AtmosphereMatchInput {
  chapterContent: string;
  cardsSummary: string;
}

export const atmosphereMatchPrompt: PromptAsset<
  AtmosphereMatchInput,
  z.infer<typeof atmosphereMatchOutputSchema>
> = {
  id: "atmosphere.match@v1",
  version: "v1",
  taskType: "planner",
  mode: "structured",
  language: "zh",
  contextPolicy: { maxTokensBudget: 0 },
  outputSchema: atmosphereMatchOutputSchema,
  structuredOutputHint: {
    mode: "auto",
    note: "返回一个 JSON，包含 matched 和 suggestedNew 两个数组字段。",
  },
  render: (input) => [
    new SystemMessage([
      "你是专业文学编辑，擅长分析文本的情感氛围走向。",
      "阅读小说章节内容，判断：这段文字需要哪些氛围写作参考卡来辅助改写？",
      "",
      "## 可用氛围卡：",
      input.cardsSummary,
      "",
      "## 规则：",
      "1. 从上面的氛围卡中选择最相关的（0-3张），放入 matched 列表（填 key）",
      "2. 如果章节需要的氛围在上面的列表中不存在，放入 suggestedNew 列表",
      "3. matched 和 suggestedNew 都可以为空",
      "4. 不要选超过 3 张",
      "5. 只选当前这段文字真正需要的氛围",
    ].join("\n")),
    new HumanMessage(input.chapterContent),
  ],
};
