import type { BaseMessage } from "@langchain/core/messages";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { PromptAsset } from "../../core/promptTypes";
import type { MaterialParseOutput } from "./materialParse.promptSchemas";
import { materialParseOutputSchema } from "./materialParse.promptSchemas";

export interface MaterialParsePromptInput {
  material: string;
  forceJson: boolean;
  retryReason: string | null;
}

function buildMaterialParseMessages(
  input: MaterialParsePromptInput,
  options: {
    forceJson?: boolean;
    retryReason?: string | null;
  } = {},
): BaseMessage[] {
  const forceJsonInstruction = options.forceJson
    ? "\n当前模型支持稳定 JSON 输出，请直接返回 JSON 对象本体。"
    : "";

  const retryInstruction = options.retryReason
    ? `\n上一次输出存在问题：${options.retryReason}。这一次必须先修正问题，再返回最终 JSON。`
    : "";

  return [
    new SystemMessage(`你是一个专业的小说创作助手，擅长从非结构化文本中提取小说创作素材并结构化。

【唯一任务】
分析用户粘贴的创作素材，识别其中包含的所有小说创作信息，按字段拆分并填充到结构化 JSON 输出中。

【分析规则】
1. 仔细阅读素材全文，不要遗漏任何有价值的信息。
2. 每个字段只提取与该字段直接相关的内容，不要强塞不匹配的信息。
3. 保持原文的表述风格，不要大幅改写或添加素材中没有的信息。
4. 如果素材中没有某个字段的信息，该字段返回 undefined（不要输出空字符串）。
5. worldSetting：提取世界观相关信息（时代背景、力量体系、社会结构、核心规则等），整理为简洁的结构化描述。
6. characters：提取角色相关信息（姓名、身份、性格、能力、关系等），整理为简洁的角色列表式描述。
7. outline：提取剧情相关信息（主线脉络、关键转折、故事走向等），整理为简洁的大纲式描述。
8. genreHint：如果能从素材判断题材方向（如修仙、都市、悬疑、科幻、历史等），给出 1-3 个关键词。
9. commercialTagsText：提取或推导 3-6 个适合网文平台的商业标签，逗号分隔。
10. styleTone：提取或推导 2-4 个风格关键词。
11. chapterCountHint：如果素材中明确提到总章节数或预计章节数（如"30章"、"共30章"、"约30章"、"预计30章"、"前30章"等），提取该数字。注意区分"前30章承诺"和"全书共30章"——只有明确表示全书总章节数时才提取。

【字段映射指南】
- 标题、书名 → title
- 人物小传、角色设定、人物介绍 → characters
- 世界观、设定、背景、力量体系、魔法系统 → worldSetting
- 大纲、故事线、主线、剧情 → outline
- 一句话简介、故事梗概、核心冲突 → description
- 目标读者、受众 → targetAudience
- 卖点、核心看点、吸引力 → bookSellingPoint
- 竞品、类似作品、阅读感 → competingFeel
- 前 30 章承诺、前期看点 → first30ChapterPromise
- 风格、文风、基调 → styleTone
- 标签、分类、类型 → commercialTagsText
- 题材、类型倾向 → genreHint
- 总章节数、预计章节数 → chapterCountHint（数字，如30）

【输出格式】
只返回一个 JSON 对象，结构固定如下：
{
  "title": "字符串或undefined",
  "description": "字符串或undefined",
  "targetAudience": "字符串或undefined",
  "bookSellingPoint": "字符串或undefined",
  "competingFeel": "字符串或undefined",
  "first30ChapterPromise": "字符串或undefined",
  "styleTone": "字符串或undefined",
  "commercialTagsText": "字符串或undefined",
  "worldSetting": "字符串或undefined",
  "characters": "字符串或undefined",
  "outline": "字符串或undefined",
  "genreHint": "字符串或undefined",
  "chapterCountHint": 数字或undefined
}

只返回 JSON，不解释分析过程，不输出 Markdown，不输出代码块。${retryInstruction}${forceJsonInstruction}`),
    new HumanMessage(`请分析以下创作素材并拆分到对应字段：

---
${input.material}
---`),
  ];
}

export const materialParsePrompt: PromptAsset<
  MaterialParsePromptInput,
  MaterialParseOutput
> = {
  id: "novel.material.parse",
  version: "v1",
  taskType: "planner",
  mode: "structured",
  language: "zh",
  contextPolicy: {
    maxTokensBudget: 0,
  },
  outputSchema: materialParseOutputSchema,
  render: (input) => buildMaterialParseMessages(input, {
    forceJson: input.forceJson,
    retryReason: input.retryReason,
  }),
};
