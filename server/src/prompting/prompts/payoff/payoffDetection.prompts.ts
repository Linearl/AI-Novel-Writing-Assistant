import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
import { payoffDetectionOutputSchema } from "./payoffDetection.promptSchemas";

const PAYOFF_DETECTION_EXAMPLE = {
  detectedPayoffs: [
    {
      title: "龙纹玉佩的真正来历",
      summary: "主角在第三章获得的龙纹玉佩，实际与古代皇族秘辛有关，后续需揭示其来源。",
      scopeType: "chapter" as const,
      confidence: 0.8,
      evidenceSummary: "文中明确描写主角对玉佩来历产生疑问，暗示有隐情。",
    },
  ],
};

export interface PayoffDetectionPromptInput {
  novelTitle: string;
  chapterOrder: number;
  chapterTitle: string;
  chapterContent: string;
  existingLedgerSummaries: string;
}

export const payoffDetectionPrompt: PromptAsset<
  PayoffDetectionPromptInput,
  z.infer<typeof payoffDetectionOutputSchema>
> = {
  id: "novel.payoff_detection",
  version: "v1",
  taskType: "planner",
  mode: "structured",
  language: "zh",
  contextPolicy: {
    maxTokensBudget: 0,
  },
  semanticRetryPolicy: {
    maxAttempts: 1,
  },
  structuredOutputHint: {
    example: PAYOFF_DETECTION_EXAMPLE,
    note: [
      "只检测新埋设的伏笔，不检测已回收的伏笔。",
      "confidence 必须在 0-1 之间，低于 0.5 的不要输出。",
      "title 必须简洁，不超过 20 字。",
    ].join(" "),
  },
  outputSchema: payoffDetectionOutputSchema,
  render: (input) => [
    new SystemMessage([
      "你是小说伏笔检测器，负责分析刚生成的章节内容，提取新埋设的伏笔线索。",
      "只输出合法 JSON，不要输出 Markdown、解释或额外文本。",
      "",
      "任务目标：",
      "1. 从章节内容中识别新埋设的伏笔（悬念、未解之谜、暗示后续发展的情节线索）。",
      "2. 忽略普通的叙事过渡、已知伏笔的简单提及、以及没有留下明显悬念的描写。",
      "3. 只有当 confidence >= 0.5 时才输出，拿不准的不输出。",
      "",
      "判定标准：",
      "- 文中明确描述了一个悬念或未解之谜，且尚未给出答案。",
      "- 暗示了某个角色/事件有隐情，后续需要揭示。",
      "- 设置了一个预期读者会关心其结果的事件或问题。",
      "",
      "排除标准：",
      "- 已在 existingLedgerSummaries 中出现的伏笔（避免重复）。",
      "- 纯粹的背景描写、日常对话，没有设置悬念的部分。",
      "- 只是提到了已知伏笔，没有新增线索的部分。",
      "",
      "输出格式：detectedPayoffs 数组，每个元素包含 title、summary、scopeType、confidence、evidenceSummary。",
      "scopeType 仅在伏笔涉及全书级别主题时用 book，否则默认用 chapter。",
    ].join("\n")),
    new HumanMessage([
      `小说标题：${input.novelTitle}`,
      `当前章节：第${input.chapterOrder}章《${input.chapterTitle}》`,
      "",
      "章节内容：",
      input.chapterContent,
      "",
      "已有伏笔列表（避免重复）：",
      input.existingLedgerSummaries || "无",
      "",
      "请从上述内容中提取新埋设的伏笔。",
    ].join("\n")),
  ],
  postValidate: (output) => {
    // 过滤 confidence < 0.5 的低置信度项
    const filtered = output.detectedPayoffs.filter((item) => item.confidence >= 0.5);
    return { detectedPayoffs: filtered };
  },
};
