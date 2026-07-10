-- Novel JSON consolidation: merge B-class fields into 4 JSON columns
-- Phase 1: Add new columns + migrate data + drop old columns

-- 1. Add new JSON columns
ALTER TABLE "Novel" ADD COLUMN "bookFramingJson" TEXT;
ALTER TABLE "Novel" ADD COLUMN "setupProgressJson" TEXT;
ALTER TABLE "Novel" ADD COLUMN "continuationSetupJson" TEXT;
ALTER TABLE "Novel" ADD COLUMN "storyWorldSliceCacheJson" TEXT;

-- 2. Migrate data: serialize individual fields into JSON columns
UPDATE "Novel" SET "bookFramingJson" = json_build_object(
  'bookSellingPoint', "bookSellingPoint",
  'competingFeel', "competingFeel",
  'first30ChapterPromise', "first30ChapterPromise"
)::text
WHERE "bookSellingPoint" IS NOT NULL OR "competingFeel" IS NOT NULL OR "first30ChapterPromise" IS NOT NULL;

UPDATE "Novel" SET "setupProgressJson" = json_build_object(
  'projectStatus', "projectStatus",
  'storylineStatus', "storylineStatus",
  'outlineStatus', "outlineStatus",
  'resourceReadyScore', "resourceReadyScore"
)::text
WHERE "projectStatus" IS NOT NULL OR "storylineStatus" IS NOT NULL OR "outlineStatus" IS NOT NULL OR "resourceReadyScore" IS NOT NULL;

UPDATE "Novel" SET "continuationSetupJson" = json_build_object(
  'sourceKnowledgeDocumentId', "sourceKnowledgeDocumentId",
  'continuationBookAnalysisId', "continuationBookAnalysisId",
  'continuationBookAnalysisSections', "continuationBookAnalysisSections"
)::text
WHERE "sourceKnowledgeDocumentId" IS NOT NULL OR "continuationBookAnalysisId" IS NOT NULL OR "continuationBookAnalysisSections" IS NOT NULL;

UPDATE "Novel" SET "storyWorldSliceCacheJson" = json_build_object(
  'storyWorldSliceJson', "storyWorldSliceJson",
  'storyWorldSliceOverridesJson', "storyWorldSliceOverridesJson",
  'storyWorldSliceSchemaVersion', "storyWorldSliceSchemaVersion"
)::text
WHERE "storyWorldSliceJson" IS NOT NULL OR "storyWorldSliceOverridesJson" IS NOT NULL OR "storyWorldSliceSchemaVersion" != 1;

-- 3. Drop old indexes
DROP INDEX IF EXISTS "Novel_sourceKnowledgeDocumentId_idx";
DROP INDEX IF EXISTS "Novel_continuationBookAnalysisId_idx";

-- 4. Drop foreign key constraints and columns
ALTER TABLE "Novel" DROP CONSTRAINT IF EXISTS "Novel_sourceKnowledgeDocumentId_fkey";
ALTER TABLE "Novel" DROP CONSTRAINT IF EXISTS "Novel_continuationBookAnalysisId_fkey";
ALTER TABLE "Novel" DROP COLUMN IF EXISTS "bookSellingPoint";
ALTER TABLE "Novel" DROP COLUMN IF EXISTS "competingFeel";
ALTER TABLE "Novel" DROP COLUMN IF EXISTS "first30ChapterPromise";
ALTER TABLE "Novel" DROP COLUMN IF EXISTS "projectStatus";
ALTER TABLE "Novel" DROP COLUMN IF EXISTS "storylineStatus";
ALTER TABLE "Novel" DROP COLUMN IF EXISTS "outlineStatus";
ALTER TABLE "Novel" DROP COLUMN IF EXISTS "resourceReadyScore";
ALTER TABLE "Novel" DROP COLUMN IF EXISTS "sourceKnowledgeDocumentId";
ALTER TABLE "Novel" DROP COLUMN IF EXISTS "continuationBookAnalysisId";
ALTER TABLE "Novel" DROP COLUMN IF EXISTS "continuationBookAnalysisSections";
ALTER TABLE "Novel" DROP COLUMN IF EXISTS "storyWorldSliceJson";
ALTER TABLE "Novel" DROP COLUMN IF EXISTS "storyWorldSliceOverridesJson";
ALTER TABLE "Novel" DROP COLUMN IF EXISTS "storyWorldSliceSchemaVersion";
