const test = require("node:test");
const assert = require("node:assert/strict");

const {
  collectTitleChangedChapters,
  regenerateChaptersForTitleChanges,
} = require("../../dist/services/novel/volume/ChapterTitleSyncRegeneration.js");

test("collectTitleChangedChapters returns chapters with title changes that have content", () => {
  const baseChapters = [
    { id: "ch-1", title: "旧标题一", content: "已有正文内容", chapterStatus: "completed", order: 1 },
    { id: "ch-2", title: "旧标题二", content: "已有正文内容", chapterStatus: "completed", order: 2 },
  ];
  const preview = {
    items: [
      { action: "update", volumeTitle: "卷一", chapterOrder: 1, nextTitle: "新标题一", previousTitle: "旧标题一", hasContent: true, changedFields: ["标题"] },
      { action: "update", volumeTitle: "卷一", chapterOrder: 2, nextTitle: "旧标题二", previousTitle: "旧标题二", hasContent: true, changedFields: [] },
    ],
    createCount: 0, updateCount: 2, keepCount: 0, moveCount: 0, deleteCount: 0, deleteCandidateCount: 0, affectedGeneratedCount: 0, clearContentCount: 0, affectedVolumeCount: 1,
  };
  const result = collectTitleChangedChapters(preview, "novel-1", baseChapters);
  assert.equal(result.length, 1);
  assert.equal(result[0].chapterId, "ch-1");
  assert.equal(result[0].oldTitle, "旧标题一");
  assert.equal(result[0].newTitle, "新标题一");
});

test("collectTitleChangedChapters skips chapters without content", () => {
  const chapters = [
    { id: "ch-3", title: "旧标题三", content: "", chapterStatus: "planned", order: 3 },
  ];
  const preview = {
    items: [
      { action: "update", volumeTitle: "卷一", chapterOrder: 3, nextTitle: "新标题三", previousTitle: "旧标题三", hasContent: true, changedFields: ["标题"] },
    ],
    createCount: 0, updateCount: 1, keepCount: 0, moveCount: 0, deleteCount: 0, deleteCandidateCount: 0, affectedGeneratedCount: 0, clearContentCount: 0, affectedVolumeCount: 1,
  };
  const result = collectTitleChangedChapters(preview, "novel-1", chapters);
  assert.equal(result.length, 0);
});

test("collectTitleChangedChapters skips chapters currently generating", () => {
  const chapters = [
    { id: "ch-4", title: "旧", content: "正文", chapterStatus: "generating", order: 4 },
  ];
  const preview = {
    items: [
      { action: "update", volumeTitle: "卷一", chapterOrder: 4, nextTitle: "新", previousTitle: "旧", hasContent: true, changedFields: ["标题"] },
    ],
    createCount: 0, updateCount: 1, keepCount: 0, moveCount: 0, deleteCount: 0, deleteCandidateCount: 0, affectedGeneratedCount: 0, clearContentCount: 0, affectedVolumeCount: 1,
  };
  const result = collectTitleChangedChapters(preview, "novel-1", chapters);
  assert.equal(result.length, 0);
});

test("collectTitleChangedChapters skips non-update actions", () => {
  const chapters = [
    { id: "ch-1", title: "旧", content: "正文", chapterStatus: "completed", order: 1 },
  ];
  const preview = {
    items: [
      { action: "create", volumeTitle: "卷一", chapterOrder: 1, nextTitle: "新", previousTitle: null, hasContent: false, changedFields: ["标题"] },
      { action: "keep", volumeTitle: "卷一", chapterOrder: 1, nextTitle: "新", previousTitle: null, hasContent: true, changedFields: ["标题"] },
    ],
    createCount: 1, updateCount: 0, keepCount: 1, moveCount: 0, deleteCount: 0, deleteCandidateCount: 0, affectedGeneratedCount: 0, clearContentCount: 0, affectedVolumeCount: 1,
  };
  const result = collectTitleChangedChapters(preview, "novel-1", chapters);
  assert.equal(result.length, 0);
});

test("collectTitleChangedChapters returns empty for no changes", () => {
  const preview = {
    items: [],
    createCount: 0, updateCount: 0, keepCount: 0, moveCount: 0, deleteCount: 0, deleteCandidateCount: 0, affectedGeneratedCount: 0, clearContentCount: 0, affectedVolumeCount: 0,
  };
  const result = collectTitleChangedChapters(preview, "novel-1", []);
  assert.equal(result.length, 0);
});

test("regenerateChaptersForTitleChanges calls runPipelineChapter for each chapter", async () => {
  const called = [];
  await regenerateChaptersForTitleChanges(
    [
      { chapterId: "ch-1", novelId: "n1", oldTitle: "旧", newTitle: "新", order: 1 },
      { chapterId: "ch-2", novelId: "n1", oldTitle: "旧", newTitle: "新", order: 2 },
    ],
    { runPipelineChapter: async (_novelId, chapterId) => { called.push(chapterId); } },
  );
  assert.deepEqual(called, ["ch-1", "ch-2"]);
});

test("regenerateChaptersForTitleChanges does nothing for empty array", async () => {
  let called = false;
  await regenerateChaptersForTitleChanges([], {
    runPipelineChapter: async () => { called = true; },
  });
  assert.equal(called, false);
});

test("regenerateChaptersForTitleChanges continues after individual chapter failure", async () => {
  const called = [];
  await regenerateChaptersForTitleChanges(
    [
      { chapterId: "ch-1", novelId: "n1", oldTitle: "旧", newTitle: "新", order: 1 },
      { chapterId: "ch-2", novelId: "n1", oldTitle: "旧", newTitle: "新", order: 2 },
    ],
    {
      runPipelineChapter: async (_novelId, chapterId) => {
        if (chapterId === "ch-1") throw new Error("LLM failed");
        called.push(chapterId);
      },
    },
  );
  assert.deepEqual(called, ["ch-2"]);
});
