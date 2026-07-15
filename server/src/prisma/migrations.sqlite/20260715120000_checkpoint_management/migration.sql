-- AlterTable: Novel（反向关系由 Prisma 自动管理，无需手动 SQL）

-- CreateTable: Checkpoint
CREATE TABLE "Checkpoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelId" TEXT NOT NULL,
    "chapterIndex" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "label" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Checkpoint_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel" ("id") ON DELETE CASCADE
);

-- CreateIndex
CREATE INDEX "Checkpoint_novelId_createdAt_idx" ON "Checkpoint" ("novelId", "createdAt");
