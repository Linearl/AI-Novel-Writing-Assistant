import { prisma } from "../../db/prisma";

interface ChapterWriteInput {
  title?: string;
  content?: string;
  order?: number;
}

export class ChapterService {
  async listChapters(novelId: string, opts?: { includeDeleted?: boolean }) {
    return prisma.chapter.findMany({
      where: {
        novelId,
        ...(opts?.includeDeleted ? {} : { deletedAt: null }),
      },
      orderBy: { order: "asc" },
    });
  }

  async createChapter(novelId: string, input: Required<Pick<ChapterWriteInput, "title" | "order">> & ChapterWriteInput) {
    return prisma.chapter.create({
      data: {
        novelId,
        title: input.title,
        order: input.order,
        content: input.content ?? "",
      },
    });
  }

  async updateChapter(novelId: string, chapterId: string, input: ChapterWriteInput) {
    const exists = await prisma.chapter.findFirst({
      where: { id: chapterId, novelId, deletedAt: null },
      select: { id: true },
    });
    if (!exists) {
      throw new Error("章节不存在。");
    }
    return prisma.chapter.update({
      where: { id: chapterId },
      data: input,
    });
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
    });
    return { success: true, deletedAt: updated.deletedAt, chapter };
  }

  /** 恢复已软删除的章节 */
  async restoreChapter(novelId: string, chapterId: string) {
    const chapter = await prisma.chapter.findFirst({
      where: { id: chapterId, novelId, deletedAt: { not: null } },
      select: { id: true, deletedAt: true },
    });
    if (!chapter) {
      throw new Error("未找到已删除的章节。");
    }
    return prisma.chapter.update({
      where: { id: chapterId },
      data: { deletedAt: null },
    });
  }

  /** 物理删除（保留原有行为，用于清理等场景） */
  async deleteChapter(novelId: string, chapterId: string) {
    const deleted = await prisma.chapter.deleteMany({
      where: { id: chapterId, novelId },
    });
    if (deleted.count === 0) {
      throw new Error("章节不存在。");
    }
  }
}
