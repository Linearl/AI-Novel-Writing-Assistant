import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
import { techniqueRecommendOutputSchema } from "./techniqueRecommend.schema";

export interface TechniqueRecommendInput {
  profileName: string;
  profileDescription?: string;
  techniques: Array<{ key: string; name: string; description: string; category: string }>;
}

export const techniqueRecommendPrompt: PromptAsset<
  TechniqueRecommendInput,
  z.infer<typeof techniqueRecommendOutputSchema>
> = {
  id: "writing_technique.recommend",
  version: "v1",
  taskType: "planner",
  mode: "structured",
  language: "zh",
  contextPolicy: {
    maxTokensBudget: 0,
  },
  outputSchema: techniqueRecommendOutputSchema,
  structuredOutputHint: {
    mode: "auto",
    note: "推荐 5-10 个最适合当前画像的写作技法，每个技法附带推荐理由。",
  },
  render: (input) => [
    new SystemMessage([
      "你是小说写作助手的文笔技法推荐器。",
      "你的任务是根据写法画像的信息，从可用技法库中挑选最适合的 5-10 个技法。",
      "",
      "只输出一个合法 JSON 对象，不要输出 Markdown、解释或额外文本。",
      "输出字段必须且只能包括：recommendations（数组，每项含 key、name、description、category、reason）。",
      "",
      "选择标准：",
      "1. 认真分析画像的风格方向，理解它追求什么样的叙述效果。",
      "2. 从技法池中选择能强化该风格方向的技法。",
      "3. 尽量覆盖不同分类，避免集中在单一类别。",
      "4. 优先选择描述精确、效果明确的技法。",
      "5. reason 用 1-2 句中文说明为什么这个技法适合此画像，指出画像特点与技法的契合点。",
      "6. 推荐数量控制在 5-10 个之间。如果可用技法不足 5 个，有多少推多少。",
      "",
      "匹配示例：",
      '- 画像强调“情绪渲染” → 推荐情绪克制、情绪外化、镜头句、冷笔触等',
      '- 画像强调“节奏紧凑” → 推荐短句切割、落差句、涟漪句、冰山对话法等',
      '- 画像强调“细节丰富” → 推荐慢镜头观察、物候描写、日常故事感、陌生化等',
      '- 画像强调“文笔优美” → 推荐留白、空镜、逆喻、无痕转场等',
    ].join("\n")),
    new HumanMessage([
      "图像信息：",
      `- 名称：${input.profileName}`,
      input.profileDescription ? `- 描述：${input.profileDescription}` : "",
      "",
      "可用技法列表：",
      input.techniques.map((t) => `- [${t.key}] ${t.name}（${t.category}）：${t.description}`).join("\n"),
      "",
      `请推荐 5-10 个最适合此画像的技法，返回 JSON。`,
    ].filter(Boolean).join("\n")),
  ],
};
