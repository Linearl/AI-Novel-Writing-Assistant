-- REQ-7057: AI味趋势追踪
-- Create AiSmellScore table for storing per-chapter AI smell scores
CREATE TABLE "AiSmellScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "chapterOrder" INTEGER NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "formulaicScore" INTEGER,
    "mechanicalScore" INTEGER,
    "emotionalScore" INTEGER,
    "originalScore" INTEGER,
    "dimensionsJson" TEXT NOT NULL DEFAULT '{}',
    "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiSmellScore_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AiSmellScore_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AiSmellScore_novelId_chapterId_key" ON "AiSmellScore"("novelId", "chapterId");
CREATE INDEX "AiSmellScore_novelId_chapterOrder_idx" ON "AiSmellScore"("novelId", "chapterOrder");
CREATE INDEX "AiSmellScore_novelId_detectedAt_idx" ON "AiSmellScore"("novelId", "detectedAt");
