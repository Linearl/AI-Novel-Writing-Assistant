/**
 * REQ-2038: Setting consistency check — PromptAsset.
 *
 * Registers as `setting.consistency.check@v1` in the prompt registry.
 * Input: novel settings JSON (world settings, characters, timeline, etc.)
 * Output: structured SettingConsistencyCheckOutput with contradictions array.
 */
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { PromptAsset } from "../../core/promptTypes";
import {
  settingConsistencyCheckOutputSchema,
  type SettingConsistencyCheckOutput,
} from "./settingConsistencyCheck.promptSchemas";

export interface SettingConsistencyCheckPromptInput {
  novelId: string;
  settingsJson: string;
  retry?: boolean;
}

export const settingConsistencyCheckPrompt: PromptAsset<
  SettingConsistencyCheckPromptInput,
  SettingConsistencyCheckOutput
> = {
  id: "setting.consistency.check",
  version: "v1",
  taskType: "review",
  mode: "structured",
  language: "zh",
  contextPolicy: {
    maxTokensBudget: 0,
  },
  outputSchema: settingConsistencyCheckOutputSchema,
  render: (input) => {
    const retryInstruction = input.retry
      ? "\n你上一次没有输出合法 JSON。这一次只能返回一个 JSON 对象本体，禁止附带解释、Markdown、注释、代码块或任何额外文本。"
      : "";

    return [
      new SystemMessage([
        "你是一位专业的小说设定一致性审查员。你的任务是检查给定的小说设定数据中是否存在内部矛盾。",
        "",
        "检查维度：",
        "1. **字段间矛盾**：同一设定体系内不同字段的逻辑冲突。",
        "   例如：「科技水平 = 原始社会」但「武器 = 激光枪」",
        "   例如：「气候 = 热带沙漠」但「植被 = 冰雪覆盖的针叶林」",
        "2. **时间线冲突**：时间相关字段的矛盾。",
        "   例如：「建国于 2000 年」但「历史记载 3000 年文明」",
        "   例如：「角色年龄 25 岁」但「出生于 3000 年」但「当前时间线 3020 年」",
        "3. **世界观逻辑不自洽**：世界观层面的逻辑不通。",
        "   例如：「魔法世界」但「科技水平 = 赛博朋克」（未说明魔导科技融合）",
        "   例如：「封闭大陆」但「存在跨大陆贸易路线」",
        "",
        "输出要求：",
        "- 返回严格的 JSON 对象，符合指定的输出结构。",
        "- 每个矛盾项包含 id、severity、category、涉及字段、描述和修复建议。",
        "- id 使用简洁稳定的英文编码，格式为 c-001、c-002 ...",
        "- severity 规则：",
        "  - critical：存在明确冲突、无法同时成立、或会直接破坏世界运行逻辑的问题。",
        "  - warning：当前未必绝对冲突，但存在明显高风险或解释缺口。",
        "  - info：轻微不一致，建议关注但不影响核心逻辑。",
        "- category 规则：",
        "  - field_conflict：同一设定体系内不同字段的逻辑冲突。",
        "  - timeline_conflict：时间相关字段的矛盾。",
        "  - worldview_inconsistency：世界观层面的逻辑不通。",
        "- 如果没有矛盾，contradictions 数组为空，overallScore 为 \"pass\"。",
        "- summary 用简洁中文描述校验结果。",
        "",
        "硬规则：",
        "1. 所有 description、suggestion、summary 必须使用简体中文。",
        "2. 只能基于给定的设定数据进行判断，不得凭空编造未提供的设定。",
        "3. 只指出真正的冲突或明显风险，不要泛泛而谈，不要为了凑数量制造问题。",
        "4. 如果证据不足，不要强行判定为问题。",
        "5. 多个问题本质相同应合并，不要重复报同一类风险。",
        "",
        "只返回一个 JSON 对象，不要输出 Markdown、解释、注释、代码块或额外文本。",
        retryInstruction,
      ].join("\n")),
      new HumanMessage([
        "请检查以下小说设定的一致性：",
        "",
        input.settingsJson,
      ].join("\n")),
    ];
  },
};
