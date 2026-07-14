/**
 * issueGeneration.prompts.ts
 *
 * REQ-3019: 反馈→GitHub Issue 生成 prompt。
 * 将用户反馈描述 + 前端运行时上下文转化为结构化 Issue Markdown。
 */

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";

// ---------------------------------------------------------------------------
// Output schema
// ---------------------------------------------------------------------------

export const issueGenerationOutputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1),
  labels: z.array(z.string().trim().min(1)).default([]),
});

export type IssueGenerationOutput = z.infer<typeof issueGenerationOutputSchema>;

// ---------------------------------------------------------------------------
// Example output
// ---------------------------------------------------------------------------

const ISSUE_GENERATION_EXAMPLE: IssueGenerationOutput = {
  title: "[Bug] 导出 PDF 时中文乱码",
  body: `## 问题描述

导出 PDF 时，中文字符显示为乱码。

## 复现步骤

1. 打开已有小说
2. 点击"导出" → 选择 PDF
3. 下载文件后打开

## 期望行为

中文字符正确显示。

## 环境信息

- 浏览器: Chrome 120
- 操作系统: Windows 11
- 应用版本: v0.1

## 附加信息

- 控制台错误: \`font loading failed\`
- 网络请求: \`/api/export/pdf\` 返回 500`,
  labels: ["bug", "needs-triage"],
};

// ---------------------------------------------------------------------------
// Prompt input type
// ---------------------------------------------------------------------------

export interface IssueGenerationPromptInput {
  description: string;
  contextJson: string;
}

// ---------------------------------------------------------------------------
// PromptAsset
// ---------------------------------------------------------------------------

export const issueGenerationPrompt: PromptAsset<IssueGenerationPromptInput, IssueGenerationOutput> = {
  id: "feedback.issue.generation",
  version: "v1",
  taskType: "planner",
  mode: "structured",
  language: "zh",
  contextPolicy: {
    maxTokensBudget: 8000,
    preferredGroups: [],
  },
  structuredOutputHint: {
    example: ISSUE_GENERATION_EXAMPLE,
    note: "title 控制在 200 字以内，清晰概括问题。body 使用标准 Markdown 格式，包含问题描述、复现步骤、期望行为、环境信息、附加信息等段落。labels 从 [bug, feature, improvement, docs, question, other] 中选择合适的标签。contextJson 中的控制台日志、网络错误、路由变化等信息应摘要后融入 body 的对应段落。",
  },
  outputSchema: issueGenerationOutputSchema,
  render: (input, _context) => {
    return [
      new SystemMessage([
        "你是一个 GitHub Issue 生成助手。",
        "你的任务是将用户反馈描述和前端运行时上下文转化为规范的 GitHub Issue Markdown。",
        "",
        "只输出一个合法 JSON 对象，不要输出 Markdown、解释、注释或额外文本。",
        "",
        "输出字段：",
        "1. title: Issue 标题，200 字以内，格式为 [类型] 简要描述。类型从 bug/feature/improvement 中选择。",
        "2. body: Issue 正文，使用标准 Markdown 格式，包含以下段落：",
        "   - ## 问题描述：总结用户反馈的核心问题",
        '   - ## 复现步骤：如果反馈中包含操作步骤，提炼为编号列表；否则写"用户未提供复现步骤"',
        "   - ## 期望行为：根据描述推断期望行为",
        "   - ## 环境信息：从 contextJson 中提取浏览器、操作系统、视口等信息",
        "   - ## 附加信息：从 contextJson 中提取控制台错误、网络错误等诊断信息",
        "3. labels: 标签数组，从 bug/feature/improvement/docs/question/other 和 needs-triage 中选择",
        "",
        "约束：",
        "- 只根据提供的信息生成，不编造不存在的问题",
        "- body 中的技术信息（控制台日志、网络错误）应摘要呈现，不堆砌原始数据",
        "- 保持中文输出",
      ].join("\n")),
      new HumanMessage([
        "用户反馈描述：",
        input.description || "无描述",
        "",
        "前端运行时上下文（JSON）：",
        input.contextJson || "{}",
      ].join("\n")),
    ];
  },
};
