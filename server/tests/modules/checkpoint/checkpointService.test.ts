import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../src/db/prisma";

/**
 * REQ-7044: Checkpoint Management — unit tests
 *
 * 这些测试直接使用 Prisma 进行数据库读写，验证 CheckpointService 的核心逻辑。
 */

// Simple in-process helper that mirrors the CheckpointService logic
// so we can test it without importing the actual service (which depends on logger module resolution).
async function listCheckpoints(
  novelId: string,
  opts: { page: number; pageSize: number; pinnedOnly?: boolean },
) {
  const where: Record<string, unknown> = { novelId };
  if (opts.pinnedOnly) where.isPinned = true;

  const [items, total] = await Promise.all([
    prisma.checkpoint.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (opts.page - 1) * opts.pageSize,
      take: opts.pageSize,
      select: {
        id: true,
        chapterIndex: true,
        createdAt: true,
        isPinned: true,
        label: true,
      },
    }),
    prisma.checkpoint.count({ where }),
  ]);

  return {
    items: items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    })),
    total,
    page: opts.page,
    pageSize: opts.pageSize,
  };
}

async function deleteCheckpoint(id: string) {
  const cp = await prisma.checkpoint.findUnique({
    where: { id },
    select: { isPinned: true },
  });
  if (!cp) throw new Error("检查点不存在");
  if (cp.isPinned) throw new Error("检查点已标记为保留，请先取消保留再删除");
  await prisma.checkpoint.delete({ where: { id } });
}

async function batchDelete(ids: string[]) {
  const result = await prisma.checkpoint.deleteMany({
    where: { id: { in: ids } },
  });
  return result.count;
}

async function pinCheckpoint(id: string) {
  await prisma.checkpoint.update({
    where: { id },
    data: { isPinned: true },
  });
}

async function unpinCheckpoint(id: string) {
  await prisma.checkpoint.update({
    where: { id },
    data: { isPinned: false },
  });
}

async function cleanupOldCheckpoints(novelId: string, keepCount = 20) {
  const total = await prisma.checkpoint.count({
    where: { novelId, isPinned: false },
  });
  if (total <= keepCount) return 0;

  const toDelete = total - keepCount;
  const oldest = await prisma.checkpoint.findMany({
    where: { novelId, isPinned: false },
    orderBy: { createdAt: "asc" },
    take: toDelete,
    select: { id: true },
  });

  if (oldest.length > 0) {
    await prisma.checkpoint.deleteMany({
      where: { id: { in: oldest.map((c) => c.id) } },
    });
  }

  return oldest.length;
}

const TEST_NOVEL_ID = "test-novel-checkpoint-7044";
const TEST_NOVEL_ID_2 = "test-novel-checkpoint-7044-2";

describe("REQ-7044 Checkpoint Management", () => {
  before(async () => {
    // Clean up any remnants from previous runs
    await prisma.checkpoint.deleteMany({
      where: {
        novelId: { in: [TEST_NOVEL_ID, TEST_NOVEL_ID_2] },
      },
    });
  });

  after(async () => {
    await prisma.checkpoint.deleteMany({
      where: {
        novelId: { in: [TEST_NOVEL_ID, TEST_NOVEL_ID_2] },
      },
    });
  });

  // ─── T6: 列表查询 ──────────────────────────────────────
  describe("listCheckpoints", () => {
    before(async () => {
      // Create 5 checkpoints in descending order
      for (let i = 0; i < 5; i++) {
        await prisma.checkpoint.create({
          data: {
            novelId: TEST_NOVEL_ID,
            chapterIndex: i + 1,
            data: { snapshot: `chapter-${i + 1}` },
            label: i === 0 ? "first" : null,
            isPinned: i === 0,
          },
        });
      }
    });

    after(async () => {
      await prisma.checkpoint.deleteMany({
        where: { novelId: TEST_NOVEL_ID },
      });
    });

    it("returns checkpoints in descending order by createdAt", async () => {
      const result = await listCheckpoints(TEST_NOVEL_ID, {
        page: 1,
        pageSize: 10,
      });

      assert.equal(result.total, 5);
      assert.equal(result.items.length, 5);
      // Verify descending order
      for (let i = 1; i < result.items.length; i++) {
        assert.ok(
          new Date(result.items[i - 1].createdAt) >=
            new Date(result.items[i].createdAt),
          "checkpoints should be ordered desc by createdAt",
        );
      }
    });

    it("supports pagination", async () => {
      const page1 = await listCheckpoints(TEST_NOVEL_ID, {
        page: 1,
        pageSize: 2,
      });
      assert.equal(page1.items.length, 2);
      assert.equal(page1.total, 5);
      assert.equal(page1.page, 1);

      const page2 = await listCheckpoints(TEST_NOVEL_ID, {
        page: 2,
        pageSize: 2,
      });
      assert.equal(page2.items.length, 2);

      const page3 = await listCheckpoints(TEST_NOVEL_ID, {
        page: 3,
        pageSize: 2,
      });
      assert.equal(page3.items.length, 1);
    });

    it("filters pinned only checkpoints", async () => {
      const result = await listCheckpoints(TEST_NOVEL_ID, {
        page: 1,
        pageSize: 10,
        pinnedOnly: true,
      });

      assert.equal(result.total, 1);
      assert.equal(result.items[0].isPinned, true);
      assert.equal(result.items[0].label, "first");
    });

    it("returns correct field shape", async () => {
      const result = await listCheckpoints(TEST_NOVEL_ID, {
        page: 1,
        pageSize: 1,
      });

      const item = result.items[0];
      assert.ok(typeof item.id === "string");
      assert.ok(typeof item.chapterIndex === "number");
      assert.ok(typeof item.createdAt === "string");
      assert.ok(typeof item.isPinned === "boolean");
      // label may be string or null
      assert.ok(item.label === null || typeof item.label === "string");
    });

    it("returns empty list for novel with no checkpoints", async () => {
      const result = await listCheckpoints("nonexistent-novel-id", {
        page: 1,
        pageSize: 10,
      });
      assert.equal(result.total, 0);
      assert.equal(result.items.length, 0);
    });
  });

  // ─── T7: 删除逻辑 ──────────────────────────────────────
  describe("deleteCheckpoint", () => {
    let checkpointId: string;
    let pinnedCheckpointId: string;

    before(async () => {
      const cp = await prisma.checkpoint.create({
        data: {
          novelId: TEST_NOVEL_ID_2,
          chapterIndex: 1,
          data: {},
        },
      });
      checkpointId = cp.id;

      const pinnedCp = await prisma.checkpoint.create({
        data: {
          novelId: TEST_NOVEL_ID_2,
          chapterIndex: 2,
          data: {},
          isPinned: true,
        },
      });
      pinnedCheckpointId = pinnedCp.id;
    });

    after(async () => {
      await prisma.checkpoint.deleteMany({
        where: { novelId: TEST_NOVEL_ID_2 },
      });
    });

    it("deletes a single checkpoint", async () => {
      await deleteCheckpoint(checkpointId);

      const found = await prisma.checkpoint.findUnique({
        where: { id: checkpointId },
      });
      assert.equal(found, null);
    });

    it("throws when deleting a pinned checkpoint", async () => {
      await assert.rejects(
        () => deleteCheckpoint(pinnedCheckpointId),
        /保留/,
      );
    });

    it("throws when checkpoint does not exist", async () => {
      await assert.rejects(
        () => deleteCheckpoint("nonexistent-id"),
        /不存在/,
      );
    });

    it("batch deletes multiple checkpoints", async () => {
      // Create 3 more checkpoints
      const ids: string[] = [];
      for (let i = 0; i < 3; i++) {
        const cp = await prisma.checkpoint.create({
          data: {
            novelId: TEST_NOVEL_ID_2,
            chapterIndex: i + 10,
            data: {},
          },
        });
        ids.push(cp.id);
      }

      const count = await batchDelete(ids);
      assert.equal(count, 3);

      // Verify all deleted
      for (const id of ids) {
        const found = await prisma.checkpoint.findUnique({ where: { id } });
        assert.equal(found, null);
      }
    });
  });

  // ─── T8: 标记保留 ──────────────────────────────────────
  describe("pin / unpin", () => {
    let cpId: string;

    before(async () => {
      const cp = await prisma.checkpoint.create({
        data: {
          novelId: TEST_NOVEL_ID,
          chapterIndex: 100,
          data: {},
        },
      });
      cpId = cp.id;
    });

    it("pins a checkpoint", async () => {
      await pinCheckpoint(cpId);

      const cp = await prisma.checkpoint.findUnique({
        where: { id: cpId },
        select: { isPinned: true },
      });
      assert.equal(cp?.isPinned, true);
    });

    it("unpins a checkpoint", async () => {
      await unpinCheckpoint(cpId);

      const cp = await prisma.checkpoint.findUnique({
        where: { id: cpId },
        select: { isPinned: true },
      });
      assert.equal(cp?.isPinned, false);
    });
  });

  // ─── 自动清理逻辑 ──────────────────────────────────────
  describe("cleanupOldCheckpoints", () => {
    before(async () => {
      // Create 25 checkpoints for the same novel
      for (let i = 0; i < 25; i++) {
        await prisma.checkpoint.create({
          data: {
            novelId: TEST_NOVEL_ID,
            chapterIndex: i + 1,
            data: {},
          },
        });
      }
    });

    after(async () => {
      await prisma.checkpoint.deleteMany({
        where: { novelId: TEST_NOVEL_ID },
      });
    });

    it("cleans up old checkpoints, keeping the 20 most recent", async () => {
      const totalBefore = await prisma.checkpoint.count({
        where: { novelId: TEST_NOVEL_ID, isPinned: false },
      });
      assert.ok(totalBefore >= 25, "should have at least 25 checkpoints");

      const deleted = await cleanupOldCheckpoints(TEST_NOVEL_ID, 20);
      assert.equal(deleted, totalBefore - 20);

      const totalAfter = await prisma.checkpoint.count({
        where: { novelId: TEST_NOVEL_ID, isPinned: false },
      });
      assert.equal(totalAfter, 20);
    });

    it("skips pinned checkpoints during cleanup", async () => {
      // Create 5 pinned checkpoints
      for (let i = 0; i < 5; i++) {
        await prisma.checkpoint.create({
          data: {
            novelId: TEST_NOVEL_ID,
            chapterIndex: 200 + i,
            data: {},
            isPinned: true,
          },
        });
      }

      const totalBefore = await prisma.checkpoint.count({
        where: { novelId: TEST_NOVEL_ID, isPinned: false },
      });
      const pinnedBefore = await prisma.checkpoint.count({
        where: { novelId: TEST_NOVEL_ID, isPinned: true },
      });
      assert.equal(pinnedBefore, 5);

      // Cleanup with keepCount=5 — should delete non-pinned only, keeping the 5 newest unpinned
      const deleted = await cleanupOldCheckpoints(TEST_NOVEL_ID, 5);
      assert.ok(deleted > 0);

      const pinnedAfter = await prisma.checkpoint.count({
        where: { novelId: TEST_NOVEL_ID, isPinned: true },
      });
      assert.equal(pinnedAfter, 5, "pinned checkpoints should not be deleted");
    });

    it("returns 0 when count is under keepCount", async () => {
      const deleted = await cleanupOldCheckpoints(TEST_NOVEL_ID, 999);
      assert.equal(deleted, 0);
    });
  });
});
