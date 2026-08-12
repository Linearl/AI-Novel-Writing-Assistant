-- Novel JSON consolidation: merge B-class fields into 4 JSON columns
-- Phase 1: Add new columns + migrate data + drop old columns
-- NOTE: SQLite cannot DROP COLUMN when the column is still referenced by a
-- foreign key (P3018: unknown column in foreign key definition). The old
-- implementation failed on every clean database. This migration therefore
-- rebuilds the Novel table (12-step rebuild, same pattern as the
-- 20260709094216_init migration) instead of dropping columns in place.

-- 1. Add new JSON columns
ALTER TABLE "Novel" ADD COLUMN "bookFramingJson" TEXT;
ALTER TABLE "Novel" ADD COLUMN "setupProgressJson" TEXT;
ALTER TABLE "Novel" ADD COLUMN "continuationSetupJson" TEXT;
ALTER TABLE "Novel" ADD COLUMN "storyWorldSliceCacheJson" TEXT;

-- 2. Migrate data: serialize individual fields into JSON columns
-- SQLite uses json_object() instead of json_build_object()
UPDATE "Novel" SET "bookFramingJson" = json_object(
  'bookSellingPoint', "bookSellingPoint",
  'competingFeel', "competingFeel",
  'first30ChapterPromise', "first30ChapterPromise"
)
WHERE "bookSellingPoint" IS NOT NULL OR "competingFeel" IS NOT NULL OR "first30ChapterPromise" IS NOT NULL;

UPDATE "Novel" SET "setupProgressJson" = json_object(
  'projectStatus', "projectStatus",
  'storylineStatus', "storylineStatus",
  'outlineStatus', "outlineStatus",
  'resourceReadyScore', "resourceReadyScore"
)
WHERE "projectStatus" IS NOT NULL OR "storylineStatus" IS NOT NULL OR "outlineStatus" IS NOT NULL OR "resourceReadyScore" IS NOT NULL;

UPDATE "Novel" SET "continuationSetupJson" = json_object(
  'sourceKnowledgeDocumentId', "sourceKnowledgeDocumentId",
  'continuationBookAnalysisId', "continuationBookAnalysisId",
  'continuationBookAnalysisSections', "continuationBookAnalysisSections"
)
WHERE "sourceKnowledgeDocumentId" IS NOT NULL OR "continuationBookAnalysisId" IS NOT NULL OR "continuationBookAnalysisSections" IS NOT NULL;

UPDATE "Novel" SET "storyWorldSliceCacheJson" = json_object(
  'storyWorldSliceJson', "storyWorldSliceJson",
  'storyWorldSliceOverridesJson', "storyWorldSliceOverridesJson",
  'storyWorldSliceSchemaVersion', "storyWorldSliceSchemaVersion"
)
WHERE "storyWorldSliceJson" IS NOT NULL OR "storyWorldSliceOverridesJson" IS NOT NULL OR "storyWorldSliceSchemaVersion" != 1;

-- 3. Drop old indexes
DROP INDEX IF EXISTS "Novel_sourceKnowledgeDocumentId_idx";
DROP INDEX IF EXISTS "Novel_continuationBookAnalysisId_idx";

-- 4. Rebuild the Novel table without the 13 consolidated columns.
-- The 4 new JSON columns added in step 1 are carried over by the INSERT SELECT.
CREATE TABLE "new_Novel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetAudience" TEXT,
    "commercialTagsJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "writingMode" TEXT NOT NULL DEFAULT 'original',
    "projectMode" TEXT,
    "narrativePov" TEXT,
    "pacePreference" TEXT,
    "styleTone" TEXT,
    "emotionIntensity" TEXT,
    "aiFreedom" TEXT,
    "postGenerationStyleReviewEnabled" BOOLEAN NOT NULL DEFAULT true,
    "defaultChapterLength" INTEGER,
    "estimatedChapterCount" INTEGER,
    "sourceNovelId" TEXT,
    "outline" TEXT,
    "structuredOutline" TEXT,
    "genreId" TEXT,
    "primaryStoryModeId" TEXT,
    "secondaryStoryModeId" TEXT,
    "worldId" TEXT,
    "payoffExpiryThreshold" INTEGER NOT NULL DEFAULT 20,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "bookFramingJson" TEXT,
    "setupProgressJson" TEXT,
    "continuationSetupJson" TEXT,
    "storyWorldSliceCacheJson" TEXT,
    CONSTRAINT "Novel_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "NovelGenre" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Novel_primaryStoryModeId_fkey" FOREIGN KEY ("primaryStoryModeId") REFERENCES "NovelStoryMode" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Novel_secondaryStoryModeId_fkey" FOREIGN KEY ("secondaryStoryModeId") REFERENCES "NovelStoryMode" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Novel_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Novel_sourceNovelId_fkey" FOREIGN KEY ("sourceNovelId") REFERENCES "Novel" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Novel" ("aiFreedom", "bookFramingJson", "commercialTagsJson", "continuationSetupJson", "createdAt", "defaultChapterLength", "description", "emotionIntensity", "estimatedChapterCount", "genreId", "id", "narrativePov", "outline", "pacePreference", "payoffExpiryThreshold", "postGenerationStyleReviewEnabled", "primaryStoryModeId", "projectMode", "secondaryStoryModeId", "setupProgressJson", "sourceNovelId", "status", "storyWorldSliceCacheJson", "structuredOutline", "styleTone", "targetAudience", "title", "updatedAt", "worldId", "writingMode") SELECT "aiFreedom", "bookFramingJson", "commercialTagsJson", "continuationSetupJson", "createdAt", "defaultChapterLength", "description", "emotionIntensity", "estimatedChapterCount", "genreId", "id", "narrativePov", "outline", "pacePreference", "payoffExpiryThreshold", "postGenerationStyleReviewEnabled", "primaryStoryModeId", "projectMode", "secondaryStoryModeId", "setupProgressJson", "sourceNovelId", "status", "storyWorldSliceCacheJson", "structuredOutline", "styleTone", "targetAudience", "title", "updatedAt", "worldId", "writingMode" FROM "Novel";
DROP TABLE "Novel";
ALTER TABLE "new_Novel" RENAME TO "Novel";
CREATE INDEX "Novel_genreId_idx" ON "Novel"("genreId");
CREATE INDEX "Novel_primaryStoryModeId_idx" ON "Novel"("primaryStoryModeId");
CREATE INDEX "Novel_secondaryStoryModeId_idx" ON "Novel"("secondaryStoryModeId");
CREATE INDEX "Novel_worldId_idx" ON "Novel"("worldId");
CREATE INDEX "Novel_writingMode_idx" ON "Novel"("writingMode");
CREATE INDEX "Novel_sourceNovelId_idx" ON "Novel"("sourceNovelId");
