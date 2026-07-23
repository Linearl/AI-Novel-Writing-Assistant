/**
 * NovelPromptMaterialBuilders.ts
 *
 * Builder methods extracted from NovelPromptMaterialExporter.ts.
 * Each method corresponds to a material group and assembles a NovelMaterialBlock.
 *
 * These are extracted as standalone functions that receive the db handle and
 * other parameters. The class delegates to these functions from resolveGroup().
 */

import type { NovelMaterialBlock, NovelMaterialGroupDefinition } from "./types";
import type { ReasoningTrace } from "@ai-novel/shared";
import { prisma } from "../../db/prisma";
import { parseBookFramingJson } from "../../services/novel/novelCoreShared";
import {
  compactLines,
  truncateText,
  jsonArrayPreview,
  block,
  DEFAULT_RECENT_CHAPTER_LIMIT,
} from "./NovelPromptMaterialUtils";

// ---------------------------------------------------------------------------
// findChapter (shared helper)
// ---------------------------------------------------------------------------

async function findChapter(
  novelId: string,
  chapterId?: string,
  options: { includeSummary?: boolean } = {},
) {
  if (!chapterId) {
    return null;
  }
  return prisma.chapter.findFirst({
    where: { id: chapterId, novelId },
    include: options.includeSummary ? { chapterSummary: true } : undefined,
  });
}

// ---------------------------------------------------------------------------
// Builder: novel_basics
// ---------------------------------------------------------------------------

export async function buildNovelBasics(
  group: string,
  definition: NovelMaterialGroupDefinition,
  novelId: string,
): Promise<NovelMaterialBlock | null> {
  const novel = await prisma.novel.findUnique({
    where: { id: novelId },
    include: { genre: true, primaryStoryMode: true, secondaryStoryMode: true },
  });
  if (!novel) {
    return null;
  }
  const bookFraming = parseBookFramingJson(novel.bookFramingJson);
  return block({
    group,
    title: definition.title,
    required: definition.required,
    importance: definition.importance,
    sourceType: definition.sourceType,
    sourceId: novel.id,
    updatedAt: novel.updatedAt,
    content: compactLines([
      `书名：${novel.title}`,
      novel.description ? `简介：${novel.description}` : null,
      novel.genre?.name ? `题材：${novel.genre.name}` : null,
      novel.targetAudience ? `目标读者：${novel.targetAudience}` : null,
      bookFraming.bookSellingPoint ? `核心卖点：${bookFraming.bookSellingPoint}` : null,
      bookFraming.first30ChapterPromise ? `前 30 章承诺：${bookFraming.first30ChapterPromise}` : null,
      novel.estimatedChapterCount ? `预计章节数：${novel.estimatedChapterCount}` : null,
      novel.defaultChapterLength ? `默认章节长度：${novel.defaultChapterLength}` : null,
      novel.primaryStoryMode?.name ? `主推进模式：${novel.primaryStoryMode.name}` : null,
      novel.secondaryStoryMode?.name ? `辅助推进模式：${novel.secondaryStoryMode.name}` : null,
    ]),
  });
}

// ---------------------------------------------------------------------------
// Builder: book_contract
// ---------------------------------------------------------------------------

export async function buildBookContract(
  group: string,
  definition: NovelMaterialGroupDefinition,
  novelId: string,
): Promise<NovelMaterialBlock | null> {
  const novel = await prisma.novel.findUnique({
    where: { id: novelId },
    include: { bookContract: true, storyMacroPlan: true },
  });
  if (!novel) {
    return null;
  }
  const contract = novel.bookContract;
  return block({
    group,
    title: definition.title,
    required: definition.required,
    importance: definition.importance,
    sourceType: definition.sourceType,
    sourceId: contract?.id ?? novel.storyMacroPlan?.id ?? novel.id,
    updatedAt: contract?.updatedAt ?? novel.storyMacroPlan?.updatedAt ?? novel.updatedAt,
    content: compactLines([
      contract?.readingPromise ? `读者承诺：${contract.readingPromise}` : null,
      contract?.coreSellingPoint ? `核心卖点：${contract.coreSellingPoint}` : null,
      contract?.protagonistFantasy ? `主角爽点：${contract.protagonistFantasy}` : null,
      contract?.relationshipMainline ? `关系主线：${contract.relationshipMainline}` : null,
      contract?.escalationLadder ? `升级阶梯：${contract.escalationLadder}` : null,
      contract?.chapter3Payoff ? `第 3 章回报：${contract.chapter3Payoff}` : null,
      contract?.chapter10Payoff ? `第 10 章回报：${contract.chapter10Payoff}` : null,
      contract?.chapter30Payoff ? `第 30 章回报：${contract.chapter30Payoff}` : null,
      contract?.absoluteRedLinesJson ? `绝对红线：\n${jsonArrayPreview(contract.absoluteRedLinesJson)}` : null,
      novel.storyMacroPlan?.storyInput ? `故事输入：${novel.storyMacroPlan.storyInput}` : null,
      novel.storyMacroPlan?.decompositionJson
        ? `宏观拆解：\n${truncateText(novel.storyMacroPlan.decompositionJson, 1800)}`
        : null,
    ]),
  });
}

// ---------------------------------------------------------------------------
// Builder: chapter_mission
// ---------------------------------------------------------------------------

export async function buildChapterMission(
  group: string,
  definition: NovelMaterialGroupDefinition,
  novelId: string,
  chapterId?: string,
): Promise<NovelMaterialBlock | null> {
  const chapter = await findChapter(novelId, chapterId);
  if (!chapter) {
    return null;
  }
  return block({
    group,
    title: definition.title,
    required: definition.required,
    importance: definition.importance,
    sourceType: definition.sourceType,
    sourceId: chapter.id,
    updatedAt: chapter.updatedAt,
    content: compactLines([
      `章节：第 ${chapter.order} 章《${chapter.title}》`,
      chapter.expectation ? `章节目标：${chapter.expectation}` : null,
      chapter.taskSheet ? `任务单：\n${truncateText(chapter.taskSheet, 2200)}` : null,
      chapter.sceneCards ? `场景卡：\n${truncateText(chapter.sceneCards, 1800)}` : null,
      chapter.targetWordCount ? `目标字数：${chapter.targetWordCount}` : null,
      chapter.mustAvoid ? `必须避免：${chapter.mustAvoid}` : null,
      chapter.hook ? `章节钩子：${chapter.hook}` : null,
    ]),
  });
}

// ---------------------------------------------------------------------------
// Builder: current_chapter
// ---------------------------------------------------------------------------

export async function buildCurrentChapter(
  group: string,
  definition: NovelMaterialGroupDefinition,
  novelId: string,
  chapterId?: string,
): Promise<NovelMaterialBlock | null> {
  const chapter = await findChapter(novelId, chapterId, { includeSummary: true });
  if (!chapter) {
    return null;
  }
  const summary = (chapter as typeof chapter & {
    chapterSummary?: {
      summary?: string | null;
      keyEvents?: string | null;
      characterStates?: string | null;
    } | null;
  }).chapterSummary;
  return block({
    group,
    title: definition.title,
    required: definition.required,
    importance: definition.importance,
    sourceType: definition.sourceType,
    sourceId: chapter.id,
    updatedAt: chapter.updatedAt,
    content: compactLines([
      `章节：第 ${chapter.order} 章《${chapter.title}》`,
      `正文状态：${chapter.content?.trim() ? "已有正文" : "暂无正文"}`,
      chapter.targetWordCount ? `目标字数：${chapter.targetWordCount}` : null,
      summary?.summary ? `章节摘要：${summary.summary}` : null,
      summary?.keyEvents ? `关键事件：${summary.keyEvents}` : null,
      summary?.characterStates ? `角色状态：${summary.characterStates}` : null,
      chapter.content ? `正文片段：\n${truncateText(chapter.content, 2600)}` : null,
    ]),
  });
}

// ---------------------------------------------------------------------------
// Builder: recent_chapters
// ---------------------------------------------------------------------------

export async function buildRecentChapters(
  group: string,
  definition: NovelMaterialGroupDefinition,
  novelId: string,
  chapterId?: string,
): Promise<NovelMaterialBlock | null> {
  const chapter = await findChapter(novelId, chapterId);
  if (!chapter) {
    return null;
  }
  const recent = await prisma.chapter.findMany({
    where: {
      novelId,
      order: { lt: chapter.order },
    },
    orderBy: { order: "desc" },
    take: DEFAULT_RECENT_CHAPTER_LIMIT,
    include: { chapterSummary: true },
  });
  if (recent.length === 0) {
    return null;
  }
  const rows = recent.reverse().map((item) => compactLines([
    `第 ${item.order} 章《${item.title}》`,
    item.chapterSummary?.summary ? `摘要：${item.chapterSummary.summary}` : null,
    item.chapterSummary?.keyEvents ? `关键事件：${item.chapterSummary.keyEvents}` : null,
    !item.chapterSummary?.summary && item.content ? `正文片段：${truncateText(item.content, 500)}` : null,
  ]));
  return block({
    group,
    title: definition.title,
    required: definition.required,
    importance: definition.importance,
    sourceType: definition.sourceType,
    sourceId: chapter.id,
    updatedAt: chapter.updatedAt,
    content: rows.join("\n\n"),
  });
}

// ---------------------------------------------------------------------------
// Builder: character_state
// ---------------------------------------------------------------------------

export async function buildCharacterState(
  group: string,
  definition: NovelMaterialGroupDefinition,
  novelId: string,
): Promise<NovelMaterialBlock | null> {
  const [characters, resources] = await Promise.all([
    prisma.character.findMany({
      where: { novelId },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    prisma.characterResourceLedgerItem.findMany({
      where: { novelId },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
  ]);
  if (characters.length === 0 && resources.length === 0) {
    return null;
  }
  return block({
    group,
    title: definition.title,
    required: definition.required,
    importance: definition.importance,
    sourceType: definition.sourceType,
    sourceId: novelId,
    content: compactLines([
      characters.length > 0
        ? `角色：\n${characters.map((character) => compactLines([
          `- ${character.name}${character.role ? `（${character.role}）` : ""}`,
          character.currentState ? `  当前状态：${character.currentState}` : null,
          character.currentGoal ? `  当前目标：${character.currentGoal}` : null,
          character.development ? `  成长线：${truncateText(character.development, 180)}` : null,
        ])).join("\n")}`
        : null,
      resources.length > 0
        ? `资源：\n${resources.map((item) => `- ${item.name}：${item.status}；${item.summary}`).join("\n")}`
        : null,
    ]),
  });
}

// ---------------------------------------------------------------------------
// Builder: world_rules
// ---------------------------------------------------------------------------

export async function buildWorldRules(
  group: string,
  definition: NovelMaterialGroupDefinition,
  novelId: string,
): Promise<NovelMaterialBlock | null> {
  const novel = await prisma.novel.findUnique({
    where: { id: novelId },
    include: { world: true },
  });
  const world = novel?.world;
  if (!world) {
    return null;
  }
  return block({
    group,
    title: definition.title,
    required: definition.required,
    importance: definition.importance,
    sourceType: definition.sourceType,
    sourceId: world.id,
    updatedAt: world.updatedAt,
    content: compactLines([
      `世界观：${world.name}`,
      world.description ? `简介：${world.description}` : null,
      world.axioms ? `硬规则：${world.axioms}` : null,
      world.background ? `背景：${truncateText(world.background, 900)}` : null,
      world.magicSystem ? `能力/魔法体系：${truncateText(world.magicSystem, 900)}` : null,
      world.politics ? `政治/秩序：${truncateText(world.politics, 700)}` : null,
      world.factions ? `势力：${truncateText(world.factions, 700)}` : null,
      world.conflicts ? `核心冲突：${truncateText(world.conflicts, 700)}` : null,
    ]),
  });
}

// ---------------------------------------------------------------------------
// Builder: style_contract
// ---------------------------------------------------------------------------

export async function buildStyleContract(
  group: string,
  definition: NovelMaterialGroupDefinition,
  novelId: string,
  chapterId?: string,
): Promise<NovelMaterialBlock | null> {
  const bindings = await prisma.styleBinding.findMany({
    where: {
      enabled: true,
      OR: [
        { targetType: "novel", targetId: novelId },
        ...(chapterId ? [{ targetType: "chapter" as const, targetId: chapterId }] : []),
      ],
    },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    take: 3,
    include: {
      styleProfile: {
        include: {
          antiAiBindings: {
            where: { enabled: true },
            include: { antiAiRule: true },
            take: 8,
          },
        },
      },
    },
  });
  if (bindings.length === 0) {
    return null;
  }
  const rows = bindings.map((binding) => {
    const profile = binding.styleProfile;
    const antiAiRules = profile.antiAiBindings
      .map((item) => item.antiAiRule.promptInstruction || item.antiAiRule.description)
      .filter(Boolean)
      .slice(0, 6);
    return compactLines([
      `写法资产：${profile.name}`,
      profile.description ? `说明：${profile.description}` : null,
      profile.narrativeRulesJson ? `叙事规则：${jsonArrayPreview(profile.narrativeRulesJson)}` : null,
      profile.languageRulesJson ? `语言规则：${jsonArrayPreview(profile.languageRulesJson)}` : null,
      antiAiRules.length > 0 ? `反 AI 味规则：\n${antiAiRules.map((item) => `- ${item}`).join("\n")}` : null,
    ]);
  });
  return block({
    group,
    title: definition.title,
    required: definition.required,
    importance: definition.importance,
    sourceType: definition.sourceType,
    sourceId: bindings[0]?.styleProfileId,
    updatedAt: bindings[0]?.updatedAt,
    content: rows.join("\n\n"),
  });
}

// ---------------------------------------------------------------------------
// Builder: open_issues
// ---------------------------------------------------------------------------

export async function buildOpenIssues(
  group: string,
  definition: NovelMaterialGroupDefinition,
  novelId: string,
  chapterId?: string,
): Promise<NovelMaterialBlock | null> {
  const [reports, conflicts] = await Promise.all([
    prisma.auditReport.findMany({
      where: { novelId, chapterId },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: {
        issues: {
          where: { status: "open" },
          orderBy: { createdAt: "desc" },
          take: 8,
        },
      },
    }),
    prisma.openConflict.findMany({
      where: { novelId, status: "open" },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
  ]);
  const issues = reports.flatMap((report) => report.issues);
  if (issues.length === 0 && conflicts.length === 0) {
    return null;
  }
  return block({
    group,
    title: definition.title,
    required: definition.required,
    importance: definition.importance,
    sourceType: definition.sourceType,
    sourceId: chapterId,
    content: compactLines([
      issues.length > 0
        ? `审校问题：\n${issues.map((issue) => `- [${issue.severity}/${issue.code}] ${issue.evidence}；建议：${issue.fixSuggestion}`).join("\n")}`
        : null,
      conflicts.length > 0
        ? `开放冲突：\n${conflicts.map((conflict) => `- [${conflict.severity}] ${conflict.title}：${conflict.summary}`).join("\n")}`
        : null,
    ]),
  });
}

// ---------------------------------------------------------------------------
// Builder: director_workspace
// ---------------------------------------------------------------------------

export async function buildDirectorWorkspace(
  group: string,
  definition: NovelMaterialGroupDefinition,
  novelId: string,
  taskId?: string,
): Promise<NovelMaterialBlock | null> {
  const task = taskId
    ? await prisma.novelWorkflowTask.findUnique({ where: { id: taskId } })
    : await prisma.novelWorkflowTask.findFirst({
      where: { novelId },
      orderBy: { updatedAt: "desc" },
    });
  if (!task) {
    return null;
  }
  return block({
    group,
    title: definition.title,
    required: definition.required,
    importance: definition.importance,
    sourceType: definition.sourceType,
    sourceId: task.id,
    updatedAt: task.updatedAt,
    content: compactLines([
      `任务：${task.title}`,
      `状态：${task.status}`,
      `进度：${Math.round(task.progress * 100)}%`,
      task.currentStage ? `当前阶段：${task.currentStage}` : null,
      task.currentItemLabel ? `当前事项：${task.currentItemLabel}` : null,
      task.checkpointSummary ? `检查点：${task.checkpointSummary}` : null,
      task.lastError ? `最近错误：${task.lastError}` : null,
    ]),
  });
}

// ---------------------------------------------------------------------------
// Builder: material_index (REQ-2054)
// ---------------------------------------------------------------------------

export async function buildMaterialIndex(
  group: string,
  definition: NovelMaterialGroupDefinition,
  novelId: string,
): Promise<NovelMaterialBlock | null> {
  const materials = await prisma.novelMaterial.findMany({
    where: { novelId, enabled: true },
    orderBy: { sortOrder: "asc" },
  });
  if (materials.length === 0) {
    return null;
  }
  const lines: string[] = [];
  lines.push("以下是你可以在写作中参考的材料列表。如需某篇材料的全文，请在输出中声明其 ID。");
  lines.push("");
  for (const m of materials) {
    const desc = m.description || "暂无摘要";
    const wordInfo = m.wordCount > 0 ? ` | 字数: 约${m.wordCount}字` : "";
    lines.push(`- [材料ID: ${m.id}] ${m.title}${wordInfo}`);
    lines.push(`  ${desc}`);
    lines.push("");
  }
  return block({
    group,
    title: definition.title,
    required: definition.required,
    importance: definition.importance,
    sourceType: definition.sourceType,
    sourceId: novelId,
    content: lines.join("\n"),
  });
}

// ---------------------------------------------------------------------------
// Builder: reasoning_trace (REQ-2055)
// ---------------------------------------------------------------------------

export async function buildReasoningTrace(
  group: string,
  definition: NovelMaterialGroupDefinition,
  novelId: string,
): Promise<NovelMaterialBlock | null> {
  const novel = await prisma.novel.findUnique({
    where: { id: novelId },
    include: {
      storyMacroPlan: {
        select: { reasoningTraceJson: true, updatedAt: true },
      },
      bookContract: {
        select: { reasoningTraceJson: true, updatedAt: true },
      },
      characterCastOptions: {
        select: { reasoningTraceJson: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
      volumePlans: {
        select: { reasoningTraceJson: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!novel) {
    return null;
  }

  const traces: Array<{ step: string; summary: string; rejectedAlternatives: string; keyAssumptions: string[] }> = [];
  const parseTrace = (json: string | null | undefined): ReasoningTrace | null => {
    if (!json?.trim()) return null;
    try {
      const parsed = JSON.parse(json) as ReasoningTrace;
      if (parsed?.step && parsed?.summary?.trim()) return parsed;
      return null;
    } catch {
      return null;
    }
  };

  const storyTrace = parseTrace(novel.storyMacroPlan?.reasoningTraceJson ?? null);
  if (storyTrace) {
    traces.push(storyTrace);
  }

  const contractTrace = parseTrace(novel.bookContract?.reasoningTraceJson ?? null);
  if (contractTrace) {
    traces.push(contractTrace);
  }

  const castTrace = parseTrace(novel.characterCastOptions?.[0]?.reasoningTraceJson ?? null);
  if (castTrace) {
    traces.push(castTrace);
  }

  const volumeTrace = parseTrace(novel.volumePlans?.[0]?.reasoningTraceJson ?? null);
  if (volumeTrace) {
    traces.push(volumeTrace);
  }

  if (traces.length === 0) {
    return null;
  }

  const content = compactLines([
    "【前序推理摘要】",
    ...traces.map((trace) => {
      const assumptionText = trace.keyAssumptions.length > 0
        ? `\n  关键假设：${trace.keyAssumptions.map((item) => `· ${item}`).join("；")}`
        : "";
      const rejectedText = trace.rejectedAlternatives.trim()
        ? `\n  被拒绝的方案：${trace.rejectedAlternatives}`
        : "";
      return `- [${trace.step}] ${trace.summary}${rejectedText}${assumptionText}`;
    }),
  ]);

  return block({
    group,
    title: definition.title,
    required: definition.required,
    importance: definition.importance,
    sourceType: definition.sourceType,
    sourceId: novelId,
    content,
  });
}
