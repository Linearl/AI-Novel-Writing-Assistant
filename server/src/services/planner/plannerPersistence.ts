import {
  normalizeChapterScenePlan,
  serializeChapterScenePlan,
} from "@ai-novel/shared";
import { sanitizeCreativeMustAdvanceItems } from "@ai-novel/shared";
import { createHash } from "node:crypto";
import { prisma } from "../../db/prisma";
import { enrichStoryPlan } from "./plannerPlanMetadata";

export const STORY_PLAN_PERSISTENCE_TRANSACTION_TIMEOUT_MS = 60_000;

interface PersistPlanInput {
  novelId: string;
  chapterId?: string;
  sourceStateSnapshotId?: string | null;
  level: "book" | "arc" | "chapter";
  status?: string | null;
  planRole?: string | null;
  phaseLabel?: string | null;
  title: string;
  objective: string;
  targetWordCount?: number | null;
  participants: string[];
  reveals: string[];
  riskNotes: string[];
  mustAdvance: string[];
  mustPreserve: string[];
  sourceIssueIds: string[];
  replannedFromPlanId: string | null;
  hookTarget: string | null;
  baseExecutionContract?: ChapterExecutionContractHashInput | null;
  scenes: Array<{
    title?: string;
    objective?: string;
    conflict?: string;
    reveal?: string;
    emotionBeat?: string;
  }>;
  externalRef?: string;
}

function sanitizePlanText(value?: string | null): string {
  return (value ?? "").trim();
}

export interface ChapterExecutionContractHashInput {
  expectation?: string | null;
  targetWordCount?: number | null;
  conflictLevel?: number | null;
  revealLevel?: number | null;
  mustAvoid?: string | null;
  taskSheet?: string | null;
  sceneCards?: string | null;
  hook?: string | null;
}

function normalizeHashText(value?: string | null): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized || null;
}

export function buildChapterExecutionContractHash(input: ChapterExecutionContractHashInput): string {
  const stablePayload = {
    expectation: normalizeHashText(input.expectation),
    targetWordCount: typeof input.targetWordCount === "number" ? input.targetWordCount : null,
    conflictLevel: typeof input.conflictLevel === "number" ? input.conflictLevel : null,
    revealLevel: typeof input.revealLevel === "number" ? input.revealLevel : null,
    mustAvoid: normalizeHashText(input.mustAvoid),
    taskSheet: normalizeHashText(input.taskSheet),
    sceneCards: normalizeHashText(input.sceneCards),
    hook: normalizeHashText(input.hook),
  };
  return createHash("sha256").update(JSON.stringify(stablePayload)).digest("hex");
}

export function readPlanExecutionContractHash(rawPlanJson: string | null | undefined): string | null {
  if (!rawPlanJson?.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(rawPlanJson) as { executionContractHash?: unknown };
    return typeof parsed.executionContractHash === "string" && parsed.executionContractHash.trim()
      ? parsed.executionContractHash.trim()
      : null;
  } catch {
    return null;
  }
}

function buildPlanTaskSheet(input: PersistPlanInput): string | undefined {
  const lines: string[] = [];
  const objective = sanitizePlanText(input.objective);
  const hookTarget = sanitizePlanText(input.hookTarget);
  const participants = input.participants.map((item) => sanitizePlanText(item)).filter(Boolean);
  const mustAdvance = sanitizeCreativeMustAdvanceItems(input.mustAdvance.map((item) => sanitizePlanText(item)).filter(Boolean));
  const mustPreserve = input.mustPreserve.map((item) => sanitizePlanText(item)).filter(Boolean);
  const riskNotes = input.riskNotes.map((item) => sanitizePlanText(item)).filter(Boolean);

  if (objective) {
    lines.push(`章节目标：${objective}`);
  }
  if (participants.length > 0) {
    lines.push(`关键角色：${participants.join("、")}`);
  }
  if (mustAdvance.length > 0) {
    lines.push("必须推进：");
    lines.push(...mustAdvance.map((item) => `- ${item}`));
  }
  if (mustPreserve.length > 0) {
    lines.push("必须保留：");
    lines.push(...mustPreserve.map((item) => `- ${item}`));
  }
  if (riskNotes.length > 0) {
    lines.push("风险提醒：");
    lines.push(...riskNotes.map((item) => `- ${item}`));
  }
  if (hookTarget) {
    lines.push(`收尾钩子：${hookTarget}`);
  }

  return lines.length > 0 ? lines.join("\n") : undefined;
}

function buildPlanSceneCards(input: PersistPlanInput): string | undefined {
  if (input.scenes.length < 3 || input.scenes.length > 8) {
    return undefined;
  }

  const targetWordCount = Math.max(
    Math.round(input.targetWordCount ?? 0),
    input.scenes.length * 600,
  );

  const rawSceneCards = input.scenes.map((scene, index) => {
    const title = sanitizePlanText(scene.title) || `Scene ${index + 1}`;
    const objective = sanitizePlanText(scene.objective);
    const conflict = sanitizePlanText(scene.conflict);
    const reveal = sanitizePlanText(scene.reveal);
    const emotionBeat = sanitizePlanText(scene.emotionBeat);
    const previousScene = index > 0 ? input.scenes[index - 1] : null;
    const entryState = index === 0
      ? sanitizePlanText(input.objective) || `进入${input.title}`
      : sanitizePlanText(previousScene?.reveal)
        || sanitizePlanText(previousScene?.objective)
        || `承接上一场进入${title}`;
    const exitState = reveal || emotionBeat || objective || `完成${title}`;
    return {
      key: `plan_scene_${index + 1}`,
      title,
      purpose: objective || reveal || title,
      mustAdvance: sanitizeCreativeMustAdvanceItems([objective, reveal, conflict].filter(Boolean)),
      mustPreserve: input.mustPreserve.slice(0, 3).map((item) => sanitizePlanText(item)).filter(Boolean),
      entryState,
      exitState,
      forbiddenExpansion: [],
      targetWordCount: Math.max(240, Math.round(targetWordCount / input.scenes.length)),
    };
  });

  const normalized = normalizeChapterScenePlan(rawSceneCards, targetWordCount);
  return serializeChapterScenePlan(normalized);
}

async function findExistingPlanId(
  novelId: string,
  level: PersistPlanInput["level"],
  chapterId?: string,
  externalRef?: string,
): Promise<string | null> {
  if (level === "chapter" && chapterId) {
    const existing = await prisma.storyPlan.findFirst({
      where: { novelId, chapterId, level: "chapter" },
      select: { id: true },
    });
    return existing?.id ?? null;
  }
  if (level === "arc" && externalRef) {
    const existing = await prisma.storyPlan.findFirst({
      where: { novelId, level: "arc", externalRef },
      select: { id: true },
    });
    return existing?.id ?? null;
  }
  if (level === "book") {
    const existing = await prisma.storyPlan.findFirst({
      where: { novelId, level: "book" },
      select: { id: true },
      orderBy: { updatedAt: "desc" },
    });
    return existing?.id ?? null;
  }
  return null;
}

function buildPlanDataFields(input: PersistPlanInput) {
  return {
    chapterId: input.chapterId ?? null,
    sourceStateSnapshotId: input.sourceStateSnapshotId ?? null,
    level: input.level,
    planRole: input.planRole ?? null,
    phaseLabel: input.phaseLabel ?? null,
    title: input.title,
    objective: input.objective,
    participantsJson: JSON.stringify(input.participants),
    revealsJson: JSON.stringify(input.reveals),
    riskNotesJson: JSON.stringify(input.riskNotes),
    mustAdvanceJson: JSON.stringify(sanitizeCreativeMustAdvanceItems(input.mustAdvance)),
    mustPreserveJson: JSON.stringify(input.mustPreserve),
    replannedFromPlanId: input.replannedFromPlanId,
    hookTarget: input.hookTarget,
    status: input.status ?? "draft",
    externalRef: input.externalRef ?? null,
    rawPlanJson: JSON.stringify({
      ...input,
      status: input.status ?? "draft",
      mustAdvance: sanitizeCreativeMustAdvanceItems(input.mustAdvance),
      mustPreserve: input.mustPreserve,
      sourceIssueIds: input.sourceIssueIds,
      replannedFromPlanId: input.replannedFromPlanId,
      planRole: input.planRole,
      phaseLabel: input.phaseLabel,
      executionContractHash: buildPlanExecutionContractHash(input),
    }),
  } as any;
}

function buildPlanExecutionContractHash(input: PersistPlanInput): string | null {
  if (input.level !== "chapter") return null;
  const taskSheet = buildPlanTaskSheet(input);
  const sceneCards = buildPlanSceneCards(input);
  return buildChapterExecutionContractHash({
    ...(input.baseExecutionContract ?? {}),
    expectation: sanitizePlanText(input.objective) || null,
    targetWordCount: input.targetWordCount ?? input.baseExecutionContract?.targetWordCount ?? null,
    taskSheet: taskSheet ?? input.baseExecutionContract?.taskSheet ?? null,
    sceneCards: sceneCards ?? input.baseExecutionContract?.sceneCards ?? null,
    hook: sanitizePlanText(input.hookTarget) || null,
  });
}

async function updateChapterFromPlan(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  input: PersistPlanInput,
): Promise<void> {
  if (input.level !== "chapter" || !input.chapterId) return;
  const chapter = await tx.chapter.findUnique({
    where: { id: input.chapterId },
    select: { content: true, chapterStatus: true },
  });
  if (!chapter) return;
  const hasContent = Boolean(chapter.content?.trim());
  const nextChapterStatus = !hasContent && (!chapter.chapterStatus || chapter.chapterStatus === "unplanned")
    ? "pending_generation"
    : undefined;
  await tx.chapter.update({
    where: { id: input.chapterId },
    data: {
      expectation: sanitizePlanText(input.objective) || undefined,
      taskSheet: buildPlanTaskSheet(input),
      sceneCards: buildPlanSceneCards(input),
      hook: sanitizePlanText(input.hookTarget) || undefined,
      chapterStatus: nextChapterStatus,
    },
  });
}

export async function persistStoryPlan(input: PersistPlanInput) {
  const existingId = await findExistingPlanId(input.novelId, input.level, input.chapterId, input.externalRef);
  const planData = buildPlanDataFields(input);

  const planId = await prisma.$transaction(async (tx) => {
    const plan = existingId
      ? await tx.storyPlan.update({
          where: { id: existingId },
          data: planData,
          select: { id: true },
        })
      : await tx.storyPlan.create({
          data: { novelId: input.novelId, ...planData },
          select: { id: true },
        });

    await tx.chapterPlanScene.deleteMany({ where: { planId: plan.id } });
    if (input.scenes.length > 0) {
      await tx.chapterPlanScene.createMany({
        data: input.scenes.map((scene, index) => ({
          planId: plan.id,
          sortOrder: index + 1,
          title: scene.title?.trim() || `Scene ${index + 1}`,
          objective: scene.objective?.trim() || null,
          conflict: scene.conflict?.trim() || null,
          reveal: scene.reveal?.trim() || null,
          emotionBeat: scene.emotionBeat?.trim() || null,
        })),
      });
    }

    if (input.sourceIssueIds.length > 0) {
      await tx.storyPlanIssue.deleteMany({ where: { planId: plan.id } });
      await tx.storyPlanIssue.createMany({
        data: input.sourceIssueIds.map((issueId) => ({
          novelId: input.novelId,
          planId: plan.id,
          issueId,
        })),
      });
    }

    await updateChapterFromPlan(tx, input);
    return plan.id;
  }, {
    timeout: STORY_PLAN_PERSISTENCE_TRANSACTION_TIMEOUT_MS,
  });

  const persistedPlan = await prisma.storyPlan.findUnique({
    where: { id: planId },
    include: { scenes: { orderBy: { sortOrder: "asc" } } },
  });
  if (!persistedPlan) {
    throw new Error("章节规划持久化失败。");
  }
  const planIssueRows = await prisma.storyPlanIssue.findMany({
    where: { planId: persistedPlan.id },
    select: { issueId: true },
  });
  const edgeIssueIds = planIssueRows.map((r) => r.issueId).filter((id): id is string => id != null);
  return enrichStoryPlan({ ...persistedPlan, edgeIssueIds } as any);
}
