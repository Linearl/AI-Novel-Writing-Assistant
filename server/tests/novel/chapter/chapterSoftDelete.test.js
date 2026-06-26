const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");

require("../../../dist/app.js");
const { prisma } = require("../../../dist/db/prisma.js");
const { NovelCoreCrudService } = require("../../../dist/services/novel/novelCoreCrudService.js");

describe("Chapter soft delete and restore", () => {
  let novelId;
  let chapterId;
  const service = new NovelCoreCrudService();

  before(async () => {
    // Create a test novel
    const novel = await prisma.novel.create({
      data: {
        title: "软删除测试小说",
        status: "draft",
      },
    });
    novelId = novel.id;

    // Create a test chapter
    const chapter = await prisma.chapter.create({
      data: {
        novelId,
        title: "测试章节",
        order: 1,
        content: "测试内容",
      },
    });
    chapterId = chapter.id;
  });

  after(async () => {
    // Cleanup
    await prisma.chapter.deleteMany({ where: { novelId } });
    await prisma.novel.deleteMany({ where: { id: novelId } });
  });

  test("softDeleteChapter sets deletedAt", async () => {
    const result = await service.softDeleteChapter(novelId, chapterId);
    assert.ok(result.success);
    assert.ok(result.deletedAt instanceof Date);
  });

  test("soft-deleted chapter is excluded from list", async () => {
    const chapters = await prisma.chapter.findMany({
      where: { novelId, deletedAt: null },
    });
    assert.strictEqual(chapters.length, 0);
  });

  test("restoreChapter clears deletedAt", async () => {
    const restored = await service.restoreChapter(novelId, chapterId);
    assert.strictEqual(restored.deletedAt, null);
  });

  test("restored chapter reappears in list", async () => {
    const chapters = await prisma.chapter.findMany({
      where: { novelId, deletedAt: null },
    });
    assert.strictEqual(chapters.length, 1);
  });

  test("softDeleteChapter throws on already-deleted", async () => {
    await service.softDeleteChapter(novelId, chapterId);
    await assert.rejects(() => service.softDeleteChapter(novelId, chapterId));
  });

  test("restoreChapter throws on not-deleted", async () => {
    await service.restoreChapter(novelId, chapterId);
    await assert.rejects(() => service.restoreChapter(novelId, chapterId));
  });
});
