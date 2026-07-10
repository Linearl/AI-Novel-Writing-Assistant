-- Novel JSON consolidation: merge B-class fields into 4 JSON columns
-- Phase 1: Add new columns + migrate data + drop old columns

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

-- 4. Drop columns (SQLite does not support DROP CONSTRAINT for FK, but FK was implicit via column)
ALTER TABLE "Novel" DROP COLUMN "bookSellingPoint";
ALTER TABLE "Novel" DROP COLUMN "competingFeel";
ALTER TABLE "Novel" DROP COLUMN "first30ChapterPromise";
ALTER TABLE "Novel" DROP COLUMN "projectStatus";
ALTER TABLE "Novel" DROP COLUMN "storylineStatus";
ALTER TABLE "Novel" DROP COLUMN "outlineStatus";
ALTER TABLE "Novel" DROP COLUMN "resourceReadyScore";
ALTER TABLE "Novel" DROP COLUMN "sourceKnowledgeDocumentId";
ALTER TABLE "Novel" DROP COLUMN "continuationBookAnalysisId";
ALTER TABLE "Novel" DROP COLUMN "continuationBookAnalysisSections";
ALTER TABLE "Novel" DROP COLUMN "storyWorldSliceJson";
ALTER TABLE "Novel" DROP COLUMN "storyWorldSliceOverridesJson";
ALTER TABLE "Novel" DROP COLUMN "storyWorldSliceSchemaVersion";
