/**
 * REQ-7079: Character refine prompt - migrated from prompts/character-refine.yaml.
 *
 * Registers as `character.refine@v1` in the prompt registry.
 * Used by characterPreparationSupplemental to refine a character candidate per user adjustment.
 */
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { PromptAsset } from "../../core/promptTypes";

export const characterRefineSystemPrompt = `你是角色微调编辑。用户对一个已生成的角色候选提出了调整要求，你需要在保持角色整体定位不变的前提下，按要求修改对应字段。

硬规则：
1. 只修改用户明确要求调整的字段，其余字段保持原样。
2. 修改后的角色必须仍然能直接进入正文使用。
3. 不得改变角色姓名（name 字段必须保持不变）。
4. 输出严格 JSON，不要输出 Markdown 或额外文本。
5. 所有文本使用简体中文。`;

export interface CharacterRefinePromptInput {
  /** Serialized candidate JSON. */
  candidateJson: string;
  /** User's adjustment instruction. */
  adjustment: string;
  retry?: boolean;
}

export const characterRefinePrompt: PromptAsset<CharacterRefinePromptInput, unknown> = {
  id: "character.refine",
  version: "v1",
  taskType: "planner",
  mode: "structured",
  language: "zh",
  contextPolicy: {
    maxTokensBudget: 0,
  },
  render: (input) => {
    const userPrompt = [
      "当前角色候选：",
      input.candidateJson,
      "",
      "用户调整要求：",
      input.adjustment,
      "",
      "请输出调整后的完整角色 JSON（保持与输入相同的结构）。",
    ].join("\n");
    return [
      new SystemMessage(characterRefineSystemPrompt),
      new HumanMessage(userPrompt),
    ];
  },
};
