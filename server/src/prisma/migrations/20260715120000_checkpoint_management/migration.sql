-- CreateTable: Checkpoint
CREATE TABLE "Checkpoint" (
    "id" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "chapterIndex" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Checkpoint_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Checkpoint_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel" ("id") ON DELETE CASCADE
);

-- CreateIndex
CREATE INDEX "Checkpoint_novelId_createdAt_idx" ON "Checkpoint" ("novelId", "createdAt");
