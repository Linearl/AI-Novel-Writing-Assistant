/**
 * auditContextBuilder.ts
 *
 * REQ-2050: 全局审校上下文构建器。
 * 负责从数据库拉取全书数据，裁剪 token 预算后注入全局审校 prompt。
 */

import type { PromptContextBlock } from "../../prompting/core/promptTypes";
import { createContextBlock, estimateTextTokens } from "../../prompting/core/contextBudget";
import { prisma } from "../../db/prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GlobalReviewScope {
  mode: "currentVolume" | "range";
  /** 仅 range 模式使用：起始章节 order（含） */
  startChapterOrder?: number;
  /** 仅 range 模式使用：结束章节 order（含） */
  endChapterOrder?: number;
}

interface ChapterSlice {
  id: string;
  title: string;
  order: number;
  content: string | null;
  summary: string | null;
  keyEvents: string | null;
  characterStates: string | null;
}

export interface GlobalReviewContextData {
  novelId: string;
  novelTitle: string;
  bookContract: string;
  storyMacro: string;
  characterArcPlan: string;
  payoffLedger: string;
  volumeOverview: string;
  chapters: ChapterSlice[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** 每章约 8K token，320K budget 可审约 37 章 */
const GLOBAL_REVIEW_TOKEN_BUDGET = 320_000;
const CHAPTER_FULL_TEXT_TOKEN_BUDGET = 8_000;
const CHAPTER_SUMMARY_TOKEN_BUDGET = 800;

// ---------------------------------------------------------------------------
// Data fetchers
// ---------------------------------------------------------------------------

async function fetchBookContract(novelId: string): Promise<string> {
  const contract = await prisma.bookContract.findUnique({
    where: { novelId },
    select: {
      readingPromise: true,
      protagonistFantasy: true,
      coreSellingPoint: true,
      chapter3Payoff: true,
      chapter10Payoff: true,
      chapter30Payoff: true,
      escalationLadder: true,
      relationshipMainline: true,
      absoluteRedLinesJson: true,
    },
  });
  if (!contract) return "";
  return [
    `阅读承诺: ${contract.readingPromise}`,
    `主角幻想: ${contract.protagonistFantasy}`,
    `核心卖点: ${contract.coreSellingPoint}`,
    `第3章回报: ${contract.chapter3Payoff}`,
    `第10章回报: ${contract.chapter10Payoff}`,
    `第30章回报: ${contract.chapter30Payoff}`,
    `升级阶梯: ${contract.escalationLadder}`,
    `关系主线: ${contract.relationshipMainline}`,
    contract.absoluteRedLinesJson
      ? `绝对红线: ${contract.absoluteRedLinesJson}`
      : "",
  ].filter(Boolean).join("\n");
}

async function fetchStoryMacro(novelId: string): Promise<string> {
  const macro = await prisma.storyMacroPlan.findUnique({
    where: { novelId },
    select: {
      decompositionJson: true,
      constraintEngineJson: true,
      stateJson: true,
    },
  });
  if (!macro) return "";
  const parts: string[] = [];
  if (macro.decompositionJson) {
    parts.push(`故事分解:\n${macro.decompositionJson}`);
  }
  if (macro.constraintEngineJson) {
    parts.push(`约束引擎:\n${macro.constraintEngineJson}`);
  }
  if (macro.stateJson) {
    parts.push(`宏观状态:\n${macro.stateJson}`);
  }
  return parts.join("\n\n");
}

async function fetchCharacterArcPlan(novelId: string): Promise<string> {
  const characters = await prisma.character.findMany({
    where: { novelId },
    select: {
      name: true,
      role: true,
      outerGoal: true,
      innerNeed: true,
      currentGoal: true,
      arcStart: true,
      arcMidpoint: true,
      arcClimax: true,
      arcEnd: true,
      development: true,
      currentState: true,
      personality: true,
    },
    orderBy: { name: "asc" },
  });
  if (characters.length === 0) return "";
  return characters.map((c) => {
    const parts: string[] = [`角色: ${c.name} (${c.role ?? "未知"})`];
    if (c.personality) parts.push(`  性格: ${c.personality}`);
    if (c.outerGoal) parts.push(`  外在目标: ${c.outerGoal}`);
    if (c.innerNeed) parts.push(`  内在需求: ${c.innerNeed}`);
    if (c.currentGoal) parts.push(`  当前目标: ${c.currentGoal}`);
    if (c.currentState) parts.push(`  当前状态: ${c.currentState}`);
    if (c.development) parts.push(`  发展: ${c.development}`);
    if (c.arcStart) parts.push(`  弧线起点: ${c.arcStart}`);
    if (c.arcMidpoint) parts.push(`  弧线中点: ${c.arcMidpoint}`);
    if (c.arcClimax) parts.push(`  弧线高潮: ${c.arcClimax}`);
    if (c.arcEnd) parts.push(`  弧线终点: ${c.arcEnd}`);
    return parts.join("\n");
  }).join("\n");
}

async function fetchPayoffLedger(novelId: string): Promise<string> {
  const items = await prisma.payoffLedgerItem.findMany({
    where: { novelId },
    select: {
      title: true,
      summary: true,
      currentStatus: true,
      chaptersElapsed: true,
      firstSeenChapterOrder: true,
      lastTouchedChapterOrder: true,
    },
    orderBy: { firstSeenChapterOrder: "asc" },
  });
  if (items.length === 0) return "";
  return items.map((item) => {
    return [
      `- ${item.title}: ${item.summary}`,
      `  状态: ${item.currentStatus}, 已过${item.chaptersElapsed}章, 首现ch${item.firstSeenChapterOrder ?? "?"}, 最近ch${item.lastTouchedChapterOrder ?? "?"}`,
    ].join("\n");
  }).join("\n");
}

async function fetchVolumeOverview(
  novelId: string,
  currentVolumeOrder?: number,
): Promise<string> {
  const where = currentVolumeOrder
    ? { novelId, sortOrder: currentVolumeOrder }
    : { novelId };
  const volumes = await prisma.volumePlan.findMany({
    where,
    select: {
      sortOrder: true,
      title: true,
      summary: true,
      mainPromise: true,
      escalationMode: true,
      protagonistChange: true,
      climax: true,
    },
    orderBy: { sortOrder: "asc" },
  });
  if (volumes.length === 0) return "";
  return volumes.map((v) => {
    const parts: string[] = [`卷${v.sortOrder}: ${v.title}`];
    if (v.summary) parts.push(`  概要: ${v.summary}`);
    if (v.mainPromise) parts.push(`  主承诺: ${v.mainPromise}`);
    if (v.escalationMode) parts.push(`  升级模式: ${v.escalationMode}`);
    if (v.protagonistChange) parts.push(`  主角变化: ${v.protagonistChange}`);
    if (v.climax) parts.push(`  高潮: ${v.climax}`);
    return parts.join("\n");
  }).join("\n\n");
}

// ---------------------------------------------------------------------------
// Chapter resolution
// ---------------------------------------------------------------------------

type ChapterWithSummary = {
  id: string;
  title: string;
  order: number;
  content: string | null;
  chapterSummary: {
    summary: string;
    keyEvents: string | null;
    characterStates: string | null;
  } | null;
};

function mapChapterRows(rows: ChapterWithSummary[]): ChapterSlice[] {
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    order: r.order,
    content: r.content,
    summary: r.chapterSummary?.summary ?? null,
    keyEvents: r.chapterSummary?.keyEvents ?? null,
    characterStates: r.chapterSummary?.characterStates ?? null,
  }));
}

async function resolveChapters(
  novelId: string,
  scope: GlobalReviewScope,
): Promise<ChapterSlice[]> {
  const chapterInclude = {
    chapterSummary: {
      select: { summary: true, keyEvents: true, characterStates: true },
    },
  } as const;

  if (scope.mode === "range" && scope.startChapterOrder != null && scope.endChapterOrder != null) {
    const rows = await prisma.chapter.findMany({
      where: {
        novelId,
        order: { gte: scope.startChapterOrder, lte: scope.endChapterOrder },
      },
      include: chapterInclude,
      orderBy: { order: "asc" },
    }) as unknown as ChapterWithSummary[];
    return mapChapterRows(rows);
  }

  // currentVolume: 找到最新有章节的卷，返回该卷所有章节
  const volume = await prisma.volumePlan.findFirst({
    where: { novelId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true, id: true },
  });
  if (!volume) {
    const rows = await prisma.chapter.findMany({
      where: { novelId },
      include: chapterInclude,
      orderBy: { order: "asc" },
    }) as unknown as ChapterWithSummary[];
    return mapChapterRows(rows);
  }

  const volumeChapters = await prisma.volumeChapterPlan.findMany({
    where: { volumeId: volume.id, chapterId: { not: null } },
    select: { chapterId: true },
  });
  const chapterIds = volumeChapters
    .map((vc) => vc.chapterId)
    .filter((id): id is string => id !== null);
  if (chapterIds.length === 0) return [];

  const rows = await prisma.chapter.findMany({
    where: { id: { in: chapterIds } },
    include: chapterInclude,
    orderBy: { order: "asc" },
  }) as unknown as ChapterWithSummary[];
  return mapChapterRows(rows);
}

// ---------------------------------------------------------------------------
// Token budget trimming
// ---------------------------------------------------------------------------

function trimChaptersToBudget(chapters: ChapterSlice[]): {
  summaries: ChapterSlice[];
  fullTexts: ChapterSlice[];
} {
  let usedTokens = 0;
  const summaries: ChapterSlice[] = [];
  const fullTexts: ChapterSlice[] = [];

  for (const ch of chapters) {
    const summaryText = ch.summary ?? ch.content?.slice(0, 500) ?? "";
    const summaryTokens = estimateTextTokens(summaryText);
    if (usedTokens + summaryTokens > GLOBAL_REVIEW_TOKEN_BUDGET) break;
    usedTokens += summaryTokens;
    summaries.push(ch);
  }

  // 为 summary 范围内的章节中能容纳的章节添加全文
  let fullTextTokens = 0;
  for (const ch of summaries) {
    const content = ch.content ?? "";
    const contentTokens = estimateTextTokens(content);
    if (contentTokens > CHAPTER_FULL_TEXT_TOKEN_BUDGET * 1.5) {
      // 章节过长，截断到 budget 上限
      const maxChars = CHAPTER_FULL_TEXT_TOKEN_BUDGET * 4;
      fullTexts.push({ ...ch, content: content.slice(0, maxChars) });
      fullTextTokens += CHAPTER_FULL_TEXT_TOKEN_BUDGET;
    } else if (fullTextTokens + contentTokens > GLOBAL_REVIEW_TOKEN_BUDGET * 0.5) {
      break;
    } else {
      fullTexts.push(ch);
      fullTextTokens += contentTokens;
    }
  }

  return { summaries, fullTexts };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function buildGlobalReviewContextData(
  novelId: string,
  scope: GlobalReviewScope,
): Promise<GlobalReviewContextData> {
  const [novel, chapters] = await Promise.all([
    prisma.novel.findUnique({
      where: { id: novelId },
      select: { title: true },
    }),
    resolveChapters(novelId, scope),
  ]);

  if (!novel) {
    throw new Error("小说不存在");
  }

  // 获取当前卷号用于 volumeOverview
  const currentVolume = scope.mode === "currentVolume"
    ? await prisma.volumePlan.findFirst({
        where: { novelId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      })
    : null;

  // 并行获取所有宏观数据
  const [bookContract, storyMacro, characterArcPlan, payoffLedger, volumeOverview] =
    await Promise.all([
      fetchBookContract(novelId),
      fetchStoryMacro(novelId),
      fetchCharacterArcPlan(novelId),
      fetchPayoffLedger(novelId),
      fetchVolumeOverview(novelId, currentVolume?.sortOrder),
    ]);

  // 裁剪章节到 token 预算
  const { summaries, fullTexts } = trimChaptersToBudget(chapters);

  return {
    novelId,
    novelTitle: novel.title,
    bookContract,
    storyMacro,
    characterArcPlan,
    payoffLedger,
    volumeOverview,
    chapters: summaries.length > 0 ? summaries : chapters,
  };
}

// ---------------------------------------------------------------------------
// Context block builder (for prompt injection)
// ---------------------------------------------------------------------------

export function buildGlobalReviewContextBlocks(
  data: GlobalReviewContextData,
): PromptContextBlock[] {
  const blocks: PromptContextBlock[] = [];

  if (data.bookContract) {
    blocks.push(createContextBlock({
      id: "global_book_contract",
      group: "book_contract",
      priority: 104,
      content: `=== 故事合同 ===\n${data.bookContract}`,
    }));
  }

  if (data.storyMacro) {
    blocks.push(createContextBlock({
      id: "global_story_macro",
      group: "story_macro",
      priority: 102,
      content: `=== 故事宏观规划 ===\n${data.storyMacro}`,
    }));
  }

  if (data.characterArcPlan) {
    blocks.push(createContextBlock({
      id: "global_character_arc",
      group: "character_arc_plan",
      priority: 100,
      content: `=== 角色弧线规划 ===\n${data.characterArcPlan}`,
    }));
  }

  if (data.payoffLedger) {
    blocks.push(createContextBlock({
      id: "global_payoff_ledger",
      group: "payoff_ledger",
      priority: 98,
      content: `=== 伏笔总账 ===\n${data.payoffLedger}`,
    }));
  }

  if (data.volumeOverview) {
    blocks.push(createContextBlock({
      id: "global_volume_overview",
      group: "volume_overview",
      priority: 95,
      content: `=== 当前卷概览 ===\n${data.volumeOverview}`,
    }));
  }

  // 章节摘要
  const summaryText = data.chapters.map((ch) => {
    const parts: string[] = [`[第${ch.order}章 ${ch.title}]`];
    if (ch.summary) parts.push(ch.summary);
    if (ch.keyEvents) parts.push(`关键事件: ${ch.keyEvents}`);
    if (ch.characterStates) parts.push(`角色状态: ${ch.characterStates}`);
    return parts.join("\n");
  }).join("\n\n");

  if (summaryText) {
    blocks.push(createContextBlock({
      id: "global_chapter_summaries",
      group: "chapter_summaries",
      priority: 90,
      content: `=== 各章结构化摘要 ===\n${summaryText}`,
    }));
  }

  // 章节全文（如果有的话，已按 budget 裁剪）
  const fullTextContent = data.chapters.map((ch) => {
    return `=== 第${ch.order}章 ${ch.title} ===\n${ch.content ?? "(无正文)"}`;
  }).join("\n\n");

  if (fullTextContent) {
    blocks.push(createContextBlock({
      id: "global_chapter_full_texts",
      group: "chapter_full_texts",
      priority: 80,
      content: fullTextContent,
    }));
  }

  return blocks;
}

// ---------------------------------------------------------------------------
// Chapter review feedback: 查询 pending 全局问题回灌到逐章审校
// ---------------------------------------------------------------------------

export async function fetchGlobalReviewFeedbackForChapter(
  novelId: string,
  chapterId: string,
  maxItems = 10,
): Promise<PromptContextBlock[]> {
  const issues = await prisma.globalReviewIssue.findMany({
    where: {
      novelId,
      status: "pending",
      affectedChapters: { contains: chapterId },
    },
    orderBy: [
      { severity: "asc" }, // critical < major < minor 字典序
      { createdAt: "desc" },
    ],
    take: maxItems,
  });

  if (issues.length === 0) return [];

  const content = [
    "=== 全局审校反馈（跨章节问题，需要在本章修复或注意） ===",
    ...issues.map((issue, index) => {
      const parts: string[] = [
        `${index + 1}. [${issue.severity}] ${issue.category}`,
        `   问题: ${issue.description}`,
        `   修复方向: ${issue.fixDirection}`,
      ];
      if (issue.primaryFixChapter === chapterId) {
        parts.push("   ** 本章为主修复章节 **");
      }
      return parts.join("\n");
    }),
  ].join("\n");

  return [
    createContextBlock({
      id: "global_review_feedback",
      group: "global_review_feedback",
      priority: 105,
      required: false,
      content,
    }),
  ];
}
