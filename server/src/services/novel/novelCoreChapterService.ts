import { prisma } from "../../db/prisma";
import { logger } from "../logging/LoggerService";
import { NovelVolumeService } from "./volume/NovelVolumeService";
import { syncChapterArtifacts } from "./novelChapterArtifacts";
import { ChapterEditDiffService } from "../styleEngine/ChapterEditDiffService";
import type { ChapterInput } from "./novelCoreShared";
import { queueRagDelete, queueRagUpsert } from "./novelCoreSupport";

export class NovelCoreChapterService {
  private readonly volumeService = new NovelVolumeService();
  private readonly chapterEditDiffService = new ChapterEditDiffService();

  async listChapters(novelId: string) {
    return prisma.chapter.findMany({
      where: { novelId },
      orderBy: { order: "asc" },
      include: { chapterSummary: true },
    });
  }

  async createChapter(novelId: string, input: ChapterInput) {
    const chapter = await prisma.chapter.create({
      data: {
        novelId,
        title: input.title,
        order: input.order,
        content: input.content ?? "",
        expectation: input.expectation,
        chapterStatus: input.chapterStatus,
        tensionLevel: input.tensionLevel ?? "medium",
        targetWordCount: input.targetWordCount ?? null,
        conflictLevel: input.conflictLevel ?? null,
        revealLevel: input.revealLevel ?? null,
        mustAvoid: input.mustAvoid ?? null,
        taskSheet: input.taskSheet ?? null,
        sceneCards: input.sceneCards ?? null,
        repairHistory: input.repairHistory ?? null,
        qualityScore: input.qualityScore ?? null,
        continuityScore: input.continuityScore ?? null,
        characterScore: input.characterScore ?? null,
        pacingScore: input.pacingScore ?? null,
        riskFlags: input.riskFlags ?? null,
        generationState: "planned",
      },
    });

    if (chapter.content) {
      await syncChapterArtifacts(novelId, chapter.id, chapter.content);
    }
    await this.volumeService.mirrorChapterIntoWorkspace(novelId, {
      id: chapter.id,
      order: chapter.order,
      title: chapter.title,
      expectation: chapter.expectation,
      tensionLevel: chapter.tensionLevel,
      targetWordCount: chapter.targetWordCount,
      conflictLevel: chapter.conflictLevel,
      revealLevel: chapter.revealLevel,
      mustAvoid: chapter.mustAvoid,
      taskSheet: chapter.taskSheet,
      sceneCards: chapter.sceneCards,
    }).catch(() => null);
    queueRagUpsert("chapter", chapter.id);
    return chapter;
  }

  async updateChapter(novelId: string, chapterId: string, input: Partial<ChapterInput>) {
    const exists = await prisma.chapter.findFirst({ where: { id: chapterId, novelId }, select: { id: true } });
    if (!exists) {
      throw new Error("章节不存在");
    }

    // 捕获更新前的内容，用于判断是否有实质变更
    let beforeContent: string | null = null;
    if (typeof input.content === "string") {
      const beforeChapter = await prisma.chapter.findUnique({
        where: { id: chapterId },
        select: { content: true },
      });
      beforeContent = beforeChapter?.content ?? null;
    }

    const chapter = await prisma.chapter.update({
      where: { id: chapterId },
      data: {
        title: input.title,
        order: input.order,
        content: input.content,
        expectation: input.expectation,
        chapterStatus: input.chapterStatus,
        targetWordCount: input.targetWordCount,
        conflictLevel: input.conflictLevel,
        revealLevel: input.revealLevel,
        mustAvoid: input.mustAvoid,
        taskSheet: input.taskSheet,
        sceneCards: input.sceneCards,
        repairHistory: input.repairHistory,
        qualityScore: input.qualityScore,
        continuityScore: input.continuityScore,
        characterScore: input.characterScore,
        pacingScore: input.pacingScore,
        riskFlags: input.riskFlags,
        tensionLevel: input.tensionLevel,
      },
    });

    if (typeof input.content === "string") {
      await syncChapterArtifacts(novelId, chapterId, input.content);
    }
    await this.volumeService.mirrorChapterIntoWorkspace(novelId, {
      id: chapter.id,
      order: chapter.order,
      title: chapter.title,
      expectation: chapter.expectation,
      tensionLevel: chapter.tensionLevel,
      targetWordCount: chapter.targetWordCount,
      conflictLevel: chapter.conflictLevel,
      revealLevel: chapter.revealLevel,
      mustAvoid: chapter.mustAvoid,
      taskSheet: chapter.taskSheet,
      sceneCards: chapter.sceneCards,
    }).catch(() => null);
    queueRagUpsert("chapter", chapterId);

    // 异步触发风格提取：仅在内容有实质变更时触发
    if (typeof input.content === "string" && beforeContent !== input.content) {
      this.triggerAutoStyleExtraction(novelId, beforeContent ?? "", input.content);
    }

    return chapter;
  }

  /**
   * 章节内容保存后异步触发风格提取。
   * - extractAntiAiRules：从 diff 中提取反 AI 规则
   * - forkStyleFromDiff：基于编辑偏好 fork 新写法画像
   *
   * 仅做 fire-and-forget 调用，失败时仅记录日志，不影响主流程。
   */
  private triggerAutoStyleExtraction(novelId: string, beforeText: string, afterText: string): void {
    setImmediate(() => {
      const input = { novelId, beforeText, afterText };
      this.chapterEditDiffService.extractAntiAiRules(input)
        .then((result) => {
          const draftCount = result.drafts?.length ?? 0;
          if (draftCount > 0) {
            logger.info("[auto-style-extract] extractAntiAiRules succeeded", {
              novelId,
              draftCount,
              intentSummary: result.intentSummary,
            });
          }
        })
        .catch((err) => {
          logger.warn("[auto-style-extract] extractAntiAiRules failed", {
            novelId,
            error: err instanceof Error ? err.message : String(err),
          });
        });

      this.chapterEditDiffService.forkStyleFromDiff(input)
        .then((result) => {
          logger.info("[auto-style-extract] forkStyleFromDiff succeeded", {
            novelId,
            newProfileId: result.newProfile.id,
            suggestedName: result.suggestedName,
          });
        })
        .catch((err) => {
          logger.warn("[auto-style-extract] forkStyleFromDiff failed", {
            novelId,
            error: err instanceof Error ? err.message : String(err),
          });
        });
    });
  }

  async deleteChapter(novelId: string, chapterId: string) {
    queueRagDelete("chapter", chapterId);
    queueRagDelete("chapter_summary", chapterId);
    const deleted = await prisma.chapter.deleteMany({ where: { id: chapterId, novelId } });
    if (deleted.count === 0) {
      throw new Error("章节不存在");
    }
  }

  /** 软删除：设置 deletedAt 时间戳 */
  async softDeleteChapter(novelId: string, chapterId: string) {
    const chapter = await prisma.chapter.findFirst({
      where: { id: chapterId, novelId, deletedAt: null },
      select: { id: true, title: true, order: true, content: true },
    });
    if (!chapter) {
      throw new Error("章节不存在或已被删除。");
    }
    const updated = await prisma.chapter.update({
      where: { id: chapterId },
      data: { deletedAt: new Date() },
      select: { deletedAt: true },
    });
    return { success: true, deletedAt: updated.deletedAt, chapter };
  }

  /** 恢复已软删除的章节 */
  async restoreChapter(novelId: string, chapterId: string) {
    const found = await prisma.chapter.findFirst({
      where: { id: chapterId, novelId, deletedAt: { not: null } },
      select: { id: true },
    });
    if (!found) {
      throw new Error("未找到已删除的章节。");
    }
    return prisma.chapter.update({
      where: { id: chapterId },
      data: { deletedAt: null },
    });
  }

  async toggleChapterLock(novelId: string, chapterId: string, locked: boolean) {
    const found = await prisma.chapter.findFirst({
      where: { id: chapterId, novelId },
      select: { id: true },
    });
    if (!found) {
      throw new Error("章节不存在。");
    }
    return prisma.chapter.update({
      where: { id: chapterId },
      data: { locked },
      select: { id: true, locked: true },
    });
  }
}
