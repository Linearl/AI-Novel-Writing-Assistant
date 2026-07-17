/**
 * REQ-7079: Character name repair prompt - migrated from inline prompt in characterPreparationSupplemental.ts.
 *
 * Registers as `character.prepNameRepair@v1` in the prompt registry.
 * Repairs invalid person names referenced in character candidates by replacing them with valid names.
 */
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { PromptAsset } from "../../core/promptTypes";

export interface CharacterPrepNameRepairPromptInput {
  /** Serialized candidates JSON. */
  candidatesJson: string;
  /** Comma-joined valid character names. */
  validNamesText: string;
  /** Comma-joined invalid names to repair. */
  invalidNamesText: string;
  retry?: boolean;
}

export const characterPrepNameRepairPrompt: PromptAsset<CharacterPrepNameRepairPromptInput, unknown> = {
  id: "character.prepNameRepair",
  version: "v1",
  taskType: "planner",
  mode: "structured",
  language: "zh",
  contextPolicy: {
    maxTokensBudget: 0,
  },
  render: (input) => {
    const systemPrompt = [
      "你是角色修正编辑。以下角色候选中引用了不存在的人名，需要修正。",
      "",
      `合法角色名列表：${input.validNamesText}`,
      "",
      `非法人名（必须替换为合法角色名或删除对应描述）：${input.invalidNamesText}`,
      "",
      "修正要求：",
      "1. 将非法人名替换为最合理的合法角色名",
      "2. 如果某个关系的 sourceName 或 targetName 是非法人名，替换为最匹配的合法角色名",
      "3. 如果候选角色的描述中提到了非法人名，替换为合法角色名",
      "4. 不得引入新的非法人名",
      "5. 输出严格 JSON，保持原有结构",
    ].join("\n");
    return [
      new SystemMessage(systemPrompt),
      new HumanMessage(input.candidatesJson),
    ];
  },
};
