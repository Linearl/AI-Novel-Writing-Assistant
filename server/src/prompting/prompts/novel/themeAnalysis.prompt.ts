import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
import { NOVEL_PROMPT_BUDGETS } from "./promptBudgetProfiles";

// ─── Input types ────────────────────────────────────────────────────────────

export interface ThemeAnalysisPromptInput {
  themeHierarchy: string;
  chapterSummaries: string;
  analysisTask: string;
}

export interface MotifTrackingPromptInput {
  motifDefinitions: string;
  chapterSummaries: string;
  threshold: number;
}

// ─── Output schemas ─────────────────────────────────────────────────────────

export const themeAnalysisFindingSchema = z.object({
  chapterRef: z.string().describe("章节引用，如 V2-Ch5"),
  evidence: z.string().describe("内容证据描述"),
  severity: z.enum(["low", "medium", "high"]).describe("偏移严重程度"),
});

export const themeAnalysisOutputSchema = z.object({
  verdict: z.enum(["consistent", "deviation", "conflict"]).describe("总体判定"),
  findings: z.array(themeAnalysisFindingSchema).describe("分析发现列表"),
  summary: z.string().describe("分析结论摘要"),
});

export const motifTrackingFindingSchema = z.object({
  motif: z.string().describe("母题名称或描述"),
  definedIn: z.string().describe("母题定义来源章节"),
  lastSeenChapter: z.string().describe("最近出现的章节引用"),
  gapChapters: z.number().int().describe("连续未出现章节数"),
  status: z.enum(["active", "dormant", "dropped"]).describe("母题状态"),
});

export const motifTrackingOutputSchema = z.object({
  motifs: z.array(motifTrackingFindingSchema).describe("各母题追踪结果"),
  summary: z.string().describe("追踪结论摘要"),
});

// ─── PromptAssets ───────────────────────────────────────────────────────────

export const themeAnalysisPrompt: PromptAsset<
  ThemeAnalysisPromptInput,
  z.infer<typeof themeAnalysisOutputSchema>
> = {
  id: "novel.themeAnalysis",
  version: "v1",
  taskType: "summary",
  mode: "structured",
  language: "zh",
  contextPolicy: {
    maxTokensBudget: 2000,
  },
  outputSchema: themeAnalysisOutputSchema,
  render: (input) => [
    new SystemMessage([
      "你是一位资深小说编辑，专长主题分析。",
      "你的任务是判断章节内容是否与声明的主题承诺一致。",
      "",
      "分析维度：",
      "1. 主题偏移：某卷声明了 A 主题，但章节内容实际在讲 B",
      "2. 母题断裂：定义的母题连续多章未出现",
      "3. 主题冲突：相邻卷的主题承诺相互矛盾",
      "",
      "输出规则：",
      "- verdict: \"consistent\" | \"deviation\" | \"conflict\"",
      "- 每个 finding 必须引用具体章节号和内容证据",
      "- deviation 需说明偏移方向和严重程度（low/medium/high）",
      "- 只输出符合 schema 的严格 JSON，不要输出 Markdown 或额外文本",
    ].join("\n")),
    new HumanMessage([
      "## 主题层级",
      "",
      input.themeHierarchy,
      "",
      "## 章节摘要",
      "",
      input.chapterSummaries,
      "",
      "## 分析任务",
      "",
      input.analysisTask,
    ].join("\n")),
  ],
};

export const motifTrackingPrompt: PromptAsset<
  MotifTrackingPromptInput,
  z.infer<typeof motifTrackingOutputSchema>
> = {
  id: "novel.motifTracking",
  version: "v1",
  taskType: "summary",
  mode: "structured",
  language: "zh",
  contextPolicy: {
    maxTokensBudget: 2000,
  },
  outputSchema: motifTrackingOutputSchema,
  render: (input) => [
    new SystemMessage([
      "你是一位资深小说编辑，专长叙事母题追踪。",
      "你的任务是检查写作公式中定义的母题是否在章节中持续出现。",
      "",
      "追踪规则：",
      "1. 根据母题定义和章节摘要，判断各母题在每章的出现情况",
      "2. 计算连续未出现的章节数（gapChapters）",
      "3. gapChapters >= 阈值时标记为 dormant，若从未出现则为 dropped",
      "4. 在摘要中说明哪些母题需要关注",
      "",
      "输出规则：",
      "- 每个 motif 必须有 definedIn（定义来源）和 lastSeenChapter（最近出现）",
      "- dropped 状态需要说明建议",
      "- 只输出符合 schema 的严格 JSON，不要输出 Markdown 或额外文本",
    ].join("\n")),
    new HumanMessage([
      "## 母题定义",
      "",
      input.motifDefinitions,
      "",
      "## 章节摘要",
      "",
      input.chapterSummaries,
      "",
      `## 连续未出现阈值：${input.threshold} 章`,
    ].join("\n")),
  ],
};
