-- CreateTable
CREATE TABLE "ChapterRepairVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "versionIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "repairMode" TEXT,
    "issuesJson" TEXT,
    "tokenUsageJson" TEXT,
    "userInstruction" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChapterRepairVersion_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChapterRepairVersion_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ChapterRepairVersion_novelId_chapterId_versionIndex_key" ON "ChapterRepairVersion"("novelId", "chapterId", "versionIndex");

-- CreateIndex
CREATE INDEX "ChapterRepairVersion_novelId_chapterId_createdAt_idx" ON "ChapterRepairVersion"("novelId", "chapterId", "createdAt");
