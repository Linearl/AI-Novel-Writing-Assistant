/**
 * REQ-7079: Character name extraction prompt - migrated from inline prompt in characterPreparationSupplemental.ts.
 *
 * Registers as `character.prepNameExtraction@v1` in the prompt registry.
 * Extracts person names from character candidate text (excluding candidate's own names).
 */
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { PromptAsset } from "../../core/promptTypes";

export const characterPrepNameExtractionSystemPrompt =
  '从以下角色候选文本中提取所有人名（不含候选角色自身的名字）。只输出 JSON：{"names": ["人名1", "人名2"]}';

export interface CharacterPrepNameExtractionPromptInput {
  /** Joined candidate text. */
  candidatesText: string;
  retry?: boolean;
}

export const characterPrepNameExtractionPrompt: PromptAsset<CharacterPrepNameExtractionPromptInput, unknown> = {
  id: "character.prepNameExtraction",
  version: "v1",
  taskType: "planner",
  mode: "structured",
  language: "zh",
  contextPolicy: {
    maxTokensBudget: 0,
  },
  render: (input) => [
    new SystemMessage(characterPrepNameExtractionSystemPrompt),
    new HumanMessage(input.candidatesText),
  ],
};
