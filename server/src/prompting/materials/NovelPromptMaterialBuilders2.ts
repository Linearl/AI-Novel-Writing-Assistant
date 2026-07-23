/**
 * NovelPromptMaterialBuilders2.ts
 *
 * Second half of builder methods split from NovelPromptMaterialBuilders.ts (REQ-7137).
 * Contains: buildWorldRules, buildStyleContract, buildOpenIssues,
 *           buildDirectorWorkspace, buildMaterialIndex, buildReasoningTrace
 *
 * Re-exported through NovelPromptMaterialBuilders.ts for backward compatibility.
 */

import type { NovelMaterialBlock, NovelMaterialGroupDefinition } from "./types";
import type { ReasoningTrace } from "@ai-novel/shared";
import { prisma } from "../../db/prisma";
import {
  compactLines,
  truncateText,
  jsonArrayPreview,
  block,
} from "./NovelPromptMaterialUtils";

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
