import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../../prompting/core/promptTypes";
import {
  characterStateExtractionOutputSchema,
  contradictionDetectionOutputSchema,
  type CharacterStateExtractionInput,
  type CharacterStateExtractionOutput,
  type ContradictionDetectionInput,
  type ContradictionDetectionOutput,
} from "./schemas";

// ─── Character State Extraction Prompt ────────────────────────────────────

export interface CharacterStateExtractPromptInput extends CharacterStateExtractionInput {}

export const characterStateExtractPrompt: PromptAsset<
  CharacterStateExtractPromptInput,
  CharacterStateExtractionOutput
> = {
  id: "character.consistency.state.extract",
  version: "v1",
  taskType: "planner",
  mode: "structured",
  language: "zh",
  contextPolicy: {
    maxTokensBudget: 8000,
  },
  outputSchema: characterStateExtractionOutputSchema,
  render: (input) => [
    new SystemMessage([
      "你是资深小说编辑，擅长从章节内容中提取角色的结构化状态信息。",
      "",
      "任务：基于给定章节内容，分析并提取指定角色的当前状态。",
      "",
      "提取规则：",
      "1. 只提取章节中**明确描述**的信息，不要推断或编造",
      "2. 如果章节中没有新变化，返回与 previous state 一致的描述",
      "3. 外貌、性格、能力、关系需要分别提取",
      "4. 每个字段都包含 rawDescription（从章节中提取的原文证据）",
      "",
      "输出格式：",
      "- 只输出一个合法 JSON 对象，不要 Markdown 包裹",
      "- 所有字段都是必需的",
      "- 如果字段缺失，使用空字符串或空数组",
    ].join("\n")),
    new HumanMessage([
      `角色名称：${input.characterName}`,
      `角色性格设定：${input.characterPersonality}`,
      `角色背景：${input.characterBackground}`,
      `角色外貌设定：${input.characterAppearance}`,
      ``,
      `=== 上一章节状态 ===`,
      `外貌：${input.previousAppearance || "（无历史记录）"}`,
      `性格：${input.previousPersonality || "（无历史记录）"}`,
      ``,
      `=== 当前章节内容 ===`,
      input.chapterContent,
      ``,
      "请提取该角色在当前章节中的结构化状态信息。",
    ].join("\n")),
  ],
};

// ─── Contradiction Detection Prompt ───────────────────────────────────────

export interface ContradictionDetectPromptInput extends ContradictionDetectionInput {}

export const contradictionDetectPrompt: PromptAsset<
  ContradictionDetectPromptInput,
  ContradictionDetectionOutput
> = {
  id: "character.consistency.contradiction.detect",
  version: "v1",
  taskType: "planner",
  mode: "structured",
  language: "zh",
  contextPolicy: {
    maxTokensBudget: 8000,
  },
  outputSchema: contradictionDetectionOutputSchema,
  render: (input) => [
    new SystemMessage([
      "你是资深小说审校专家，专门检测长篇小说中的人物设定矛盾。",
      "",
      "任务：对比角色历史状态和新章节状态，检测是否存在人物设定矛盾。",
      "",
      "检测维度：",
      "- appearance: 外貌矛盾（身高、体型、发色、瞳色等）",
      "- personality: 性格矛盾（特质、动机、恐惧出现无铺垫的重大转变）",
      "- ability: 能力矛盾（技能等级、能力范围突然变化）",
      "- relationship: 关系矛盾（人际关系无铺垫变化）",
      "- location: 位置矛盾（同时出现在不可能的地方）",
      "",
      "严重度标准：",
      "- hard: 直接冲突矛盾（如上一章黑发、这一章金发；上一章死亡、这一章复活无说明）",
      "- soft: 模糊不一致（如性格轻微偏移、关系亲密度变化不够自然）",
      "",
      "注意事项：",
      "1. 只报告真正存在矛盾的问题，不要过度敏感",
      "2. 如果状态变化有合理叙述铺垫，不应视为矛盾",
      "3. confidence 表示你对矛盾判断的确信度（0-1）",
      "4. 每个矛盾必须提供 existingState（旧状态）和 newState（新状态）的具体描述",
      "5. 尽可能提供 suggestion（修复建议）",
      "",
      "输出格式：",
      "- 只输出一个合法 JSON 对象，不要 Markdown 包裹",
      "- 如果没有发现矛盾，返回空的 contradictions 数组",
    ].join("\n")),
    new HumanMessage([
      `角色：${input.characterName}`,
      `章节号：${input.chapterNumber}`,
      ``,
      `=== 新章节状态 ===`,
      input.newStateDescription,
      ``,
      `=== 历史状态摘要 ===`,
      input.historicalStatesSummary || "（无历史记录）",
      ``,
      "请检测该角色在新章节中的描写与历史状态之间是否存在矛盾。",
    ].join("\n")),
  ],
};
