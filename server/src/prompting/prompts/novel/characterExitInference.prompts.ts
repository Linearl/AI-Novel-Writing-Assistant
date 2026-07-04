import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";

export const characterExitInferenceOutputSchema = z.object({
  exitEvents: z.array(
    z.object({
      characterId: z.string(),
      characterName: z.string(),
      exitType: z.enum(["exited", "dead"]),
      confidence: z.number().min(0).max(1),
      evidence: z.string().describe("引用章内文本作为证据"),
    }),
  ),
});

export interface CharacterExitInferenceInput {
  characters: Array<{ id: string; name: string; role: string }>;
  chapterContent: string;
  chapterOutline: string;
}

export const characterExitInferencePrompt: PromptAsset<
  CharacterExitInferenceInput,
  z.infer<typeof characterExitInferenceOutputSchema>
> = {
  id: "novel.character.exit_inference",
  version: "v1",
  taskType: "planner",
  mode: "structured",
  language: "zh",
  contextPolicy: {
    maxTokensBudget: 0,
  },
  outputSchema: characterExitInferenceOutputSchema,
  render: (input) => [
    new SystemMessage([
      "你是一位小说剧情分析师。分析给定章节正文，判断是否有角色在本章中退场或死亡。",
      "",
      "判断标准：",
      "- 退场（exited）：角色完成使命后明确离开、告别、不再参与主线。注意区分\"暂时离开\"和\"永久退出\"",
      "- 死亡（dead）：角色在本章中明确死亡（被杀、牺牲、自然死亡等）",
      "",
      "注意事项：",
      "- 仅关注本章中明确的退场/死亡情节，不要根据推测或模糊暗示判断",
      "- confidence 表示你对判断的确信程度，0-1 之间",
      "- 如果本章没有角色退场或死亡，返回空的 exitEvents 数组",
      "",
      "只输出一个合法 JSON 对象，不要输出 Markdown、解释、注释、代码块或额外文本。",
    ].join("\n")),
    new HumanMessage([
      "## 当前活跃角色列表",
      JSON.stringify(input.characters, null, 2),
      "",
      "## 本章大纲",
      input.chapterOutline || "（无大纲）",
      "",
      "## 本章正文内容",
      input.chapterContent,
      "",
      "请分析本章中是否有角色退场或死亡，返回 JSON 格式的退场事件列表。",
    ].join("\n")),
  ],
};
