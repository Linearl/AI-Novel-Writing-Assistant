/**
 * audit.global.prompts.ts
 *
 * REQ-2050: 全局审校 prompt — 从全书视角检测跨章节问题。
 * 维度：character_consistency | plot_continuity | foreshadowing | pacing | worldbuilding
 */

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
import { renderSelectedContextBlocks } from "../../core/renderContextBlocks";

// ---------------------------------------------------------------------------
// Output schema
// ---------------------------------------------------------------------------

const crossChapterIssueSchema = z.object({
  severity: z.enum(["critical", "major", "minor"]),
  category: z.enum([
    "character_consistency",
    "plot_continuity",
    "foreshadowing",
    "pacing",
    "worldbuilding",
  ]),
  description: z.string().trim().min(1),
  fixDirection: z.string().trim().min(1),
  affectedChapters: z.array(z.string().trim().min(1)).min(1),
  primaryFixChapter: z.string().trim().min(1).optional(),
});

export const globalReviewOutputSchema = z.object({
  crossChapterIssues: z.array(crossChapterIssueSchema).default([]),
  summary: z.string().trim().optional(),
});

export type GlobalReviewOutput = z.infer<typeof globalReviewOutputSchema>;

// ---------------------------------------------------------------------------
// Example output
// ---------------------------------------------------------------------------

const GLOBAL_REVIEW_EXAMPLE = {
  crossChapterIssues: [
    {
      severity: "major",
      category: "character_consistency",
      description: "主角在第3章表现出极度恐惧，但第7章面对更强威胁时毫无畏惧，性格转变缺乏铺垫。",
      fixDirection: "在第4-6章间增加渐进式心理成长线索，或在第7章开头补一段内心独白解释心态变化。",
      affectedChapters: ["ch_3", "ch_7"],
      primaryFixChapter: "ch_7",
    },
    {
      severity: "critical",
      category: "plot_continuity",
      description: "第5章提到的关键道具「玉佩」在后续章节中完全消失，未再被提及或使用。",
      fixDirection: "在后续章节中安排玉佩再次出现的场景，或在第5章中降低其重要性。",
      affectedChapters: ["ch_5", "ch_8", "ch_12"],
      primaryFixChapter: "ch_12",
    },
    {
      severity: "minor",
      category: "foreshadowing",
      description: "第2章暗示的家族秘密伏笔在当前审校范围内未有呼应。",
      fixDirection: "在后续章节中安排至少一次对家族秘密的呼应或推进。",
      affectedChapters: ["ch_2"],
      primaryFixChapter: "ch_10",
    },
  ],
  summary: "共发现3个跨章节问题，其中1个关键（情节连贯性）、1个重要（角色一致性）、1个轻微（伏笔呼应）。",
};

// ---------------------------------------------------------------------------
// Prompt input type
// ---------------------------------------------------------------------------

export interface GlobalReviewPromptInput {
  novelTitle: string;
  bookContract: string;
  storyMacro: string;
  chapterSummaries: string;
  fullTexts: string;
  characterArcPlan: string;
  payoffLedger: string;
  volumeOverview: string;
}

// ---------------------------------------------------------------------------
// PromptAsset
// ---------------------------------------------------------------------------

export const globalReviewPrompt: PromptAsset<GlobalReviewPromptInput, GlobalReviewOutput> = {
  id: "audit.global.review",
  version: "v1",
  taskType: "critical_review",
  mode: "structured",
  language: "zh",
  contextPolicy: {
    maxTokensBudget: 30000,
    preferredGroups: [
      "book_contract",
      "story_macro",
      "character_arc_plan",
      "payoff_ledger",
      "volume_overview",
      "chapter_summaries",
      "chapter_full_texts",
    ],
    dropOrder: [
      "chapter_full_texts",
      "chapter_summaries",
      "volume_overview",
    ],
  },
  contextRequirements: [
    { group: "book_contract", priority: 104 },
    { group: "story_macro", priority: 102 },
    { group: "character_arc_plan", priority: 100 },
    { group: "payoff_ledger", priority: 98 },
    { group: "volume_overview", priority: 95 },
    { group: "chapter_summaries", priority: 90 },
    { group: "chapter_full_texts", priority: 80 },
  ],
  slots: [
    {
      kind: "replace" as const,
      key: "audit.global.focus",
      label: "全局审校侧重",
      description: "调整全局审校的关注重点和判断偏向。",
      default: "重点关注跨章节的角色一致性、情节连贯性、伏笔呼应，兼顾节奏和设定自洽。",
      maxLength: 500,
    },
  ],
  structuredOutputHint: {
    example: GLOBAL_REVIEW_EXAMPLE,
    note: "severity 只能是 critical/major/minor；category 只能是 character_consistency/plot_continuity/foreshadowing/pacing/worldbuilding。affectedChapters 必须填写章节 ID。primaryFixChapter 指明主要修复应在哪个章节进行。",
  },
  outputSchema: globalReviewOutputSchema,
  render: (input, context) => {
    const focus = context.slots?.text("audit.global.focus")
      ?? "重点关注跨章节的角色一致性、情节连贯性、伏笔呼应，兼顾节奏和设定自洽。";
    return [
      new SystemMessage([
        "你是中文长篇小说全局审校助手。",
        "你的任务是从全书视角检测跨章节问题，而非单章内部问题。",
        "",
        "只输出一个合法 JSON 对象，不要输出 Markdown、解释、注释或额外文本。",
        "",
        "审校维度：",
        "1. character_consistency（角色一致性）：角色性格、动机、能力、外貌在不同章节间是否自洽。",
        "2. plot_continuity（情节连贯性）：事件因果链、时间线、信息流动在章节间是否连贯。",
        "3. foreshadowing（伏笔呼应）：已埋伏笔是否有回应，回应是否自然合理。",
        "4. pacing（节奏）：跨章节的张力曲线是否合理，是否有连续高潮或连续低谷。",
        "5. worldbuilding（设定自洽）：世界观规则、势力关系、地理设定在不同章节间是否一致。",
        "",
        "审校原则：",
        "1. 只根据提供的上下文判断，不得脑补未提供的剧情或设定。",
        "2. " + focus,
        "3. 每个问题必须指出具体涉及的章节（用章节 ID 标识），并给出修复方向。",
        "4. 不报告单章内部的写作风格或语法问题，只报告跨章节的结构性问题。",
        "5. 如果某维度没有发现问题，不要强行凑数。",
        "",
        "输出必须严格符合 globalReviewOutputSchema。",
      ].join("\n")),
      new HumanMessage([
        `小说：${input.novelTitle}`,
        "",
        "分层上下文：",
        renderSelectedContextBlocks(context),
        "",
        "=== 以下为审校所需数据 ===",
        "",
        "故事合同：",
        input.bookContract || "none",
        "",
        "故事宏观规划：",
        input.storyMacro || "none",
        "",
        "角色弧线规划：",
        input.characterArcPlan || "none",
        "",
        "伏笔总账：",
        input.payoffLedger || "none",
        "",
        "当前卷概览：",
        input.volumeOverview || "none",
        "",
        "各章结构化摘要：",
        input.chapterSummaries || "none",
        "",
        "各章正文：",
        input.fullTexts || "none",
      ].join("\n")),
    ];
  },
};
