/*
  Warnings:

  - You are about to drop the `ComicBatchJob` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ComicCharacter` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ComicEpisode` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ComicExportJob` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ComicFact` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ComicPanel` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ComicProject` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ComicSourceBundle` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ComicUploadAsset` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DramaBatchJob` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DramaCharacter` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DramaCharacterLibrary` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DramaEpisode` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DramaFact` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DramaProject` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DramaShot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DramaSourceBundle` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DramaStoryboard` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DramaVideoPrompt` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `acceptedProposalIdsJson` on the `CanonicalStateVersion` table. All the data in the column will be lost.
  - You are about to drop the column `endedWithIdsJson` on the `ChapterTimeAnchor` table. All the data in the column will be lost.
  - You are about to drop the column `forbiddenEventIdsJson` on the `ChapterTimeAnchor` table. All the data in the column will be lost.
  - You are about to drop the column `nextHookIdsJson` on the `ChapterTimeAnchor` table. All the data in the column will be lost.
  - You are about to drop the column `plannedEventIdsJson` on the `ChapterTimeAnchor` table. All the data in the column will be lost.
  - You are about to drop the column `previousHookIdsJson` on the `ChapterTimeAnchor` table. All the data in the column will be lost.
  - You are about to drop the column `startsAfterIdsJson` on the `ChapterTimeAnchor` table. All the data in the column will be lost.
  - You are about to drop the column `knownByCharacterIdsJson` on the `CharacterResourceLedgerItem` table. All the data in the column will be lost.
  - You are about to drop the column `affectedCharacterIdsJson` on the `OpenConflict` table. All the data in the column will be lost.
  - You are about to drop the column `sourceIssueIdsJson` on the `StoryPlan` table. All the data in the column will be lost.
  - You are about to drop the column `consequenceIdsJson` on the `StoryTimelineEvent` table. All the data in the column will be lost.
  - You are about to drop the column `factionIdsJson` on the `StoryTimelineEvent` table. All the data in the column will be lost.
  - You are about to drop the column `participantIdsJson` on the `StoryTimelineEvent` table. All the data in the column will be lost.
  - You are about to drop the column `prerequisiteIdsJson` on the `StoryTimelineEvent` table. All the data in the column will be lost.
  - You are about to drop the column `relatedCharacterIdsJson` on the `TimelineConstraint` table. All the data in the column will be lost.
  - You are about to drop the column `relatedEventIdsJson` on the `TimelineConstraint` table. All the data in the column will be lost.
  - You are about to drop the column `relatedHookIdsJson` on the `TimelineConstraint` table. All the data in the column will be lost.
  - You are about to drop the column `participantIdsJson` on the `TimelineHook` table. All the data in the column will be lost.
  - You are about to drop the column `relatedEventIdsJson` on the `TimelineHook` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "ComicBatchJob_type_status_idx";

-- DropIndex
DROP INDEX "ComicBatchJob_episodeId_status_idx";

-- DropIndex
DROP INDEX "ComicBatchJob_projectId_createdAt_idx";

-- DropIndex
DROP INDEX "ComicCharacter_projectId_idx";

-- DropIndex
DROP INDEX "ComicEpisode_projectId_status_idx";

-- DropIndex
DROP INDEX "ComicEpisode_projectId_order_key";

-- DropIndex
DROP INDEX "ComicExportJob_format_status_idx";

-- DropIndex
DROP INDEX "ComicExportJob_projectId_createdAt_idx";

-- DropIndex
DROP INDEX "ComicFact_projectId_idx";

-- DropIndex
DROP INDEX "ComicPanel_episodeId_idx";

-- DropIndex
DROP INDEX "ComicPanel_episodeId_order_key";

-- DropIndex
DROP INDEX "ComicProject_status_idx";

-- DropIndex
DROP INDEX "ComicProject_sourceType_idx";

-- DropIndex
DROP INDEX "ComicSourceBundle_projectId_key";

-- DropIndex
DROP INDEX "ComicUploadAsset_projectId_kind_idx";

-- DropIndex
DROP INDEX "DramaBatchJob_type_status_idx";

-- DropIndex
DROP INDEX "DramaBatchJob_episodeId_status_idx";

-- DropIndex
DROP INDEX "DramaBatchJob_projectId_createdAt_idx";

-- DropIndex
DROP INDEX "DramaCharacter_projectId_idx";

-- DropIndex
DROP INDEX "DramaCharacterLibrary_name_idx";

-- DropIndex
DROP INDEX "DramaCharacterLibrary_projectId_idx";

-- DropIndex
DROP INDEX "DramaEpisode_projectId_status_idx";

-- DropIndex
DROP INDEX "DramaEpisode_projectId_order_key";

-- DropIndex
DROP INDEX "DramaFact_projectId_category_idx";

-- DropIndex
DROP INDEX "DramaFact_projectId_episodeOrder_idx";

-- DropIndex
DROP INDEX "DramaProject_status_idx";

-- DropIndex
DROP INDEX "DramaProject_source_idx";

-- DropIndex
DROP INDEX "DramaShot_storyboardId_idx";

-- DropIndex
DROP INDEX "DramaShot_storyboardId_order_key";

-- DropIndex
DROP INDEX "DramaSourceBundle_projectId_key";

-- DropIndex
DROP INDEX "DramaStoryboard_episodeId_idx";

-- DropIndex
DROP INDEX "DramaStoryboard_projectId_idx";

-- DropIndex
DROP INDEX "DramaVideoPrompt_projectId_shotId_version_idx";

-- DropIndex
DROP INDEX "DramaVideoPrompt_provider_status_idx";

-- DropIndex
DROP INDEX "DramaVideoPrompt_episodeId_idx";

-- DropIndex
DROP INDEX "DramaVideoPrompt_projectId_idx";

-- AlterTable
ALTER TABLE "ModelRouteConfig" ADD COLUMN "contextWindow" INTEGER;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ComicBatchJob";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ComicCharacter";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ComicEpisode";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ComicExportJob";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ComicFact";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ComicPanel";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ComicProject";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ComicSourceBundle";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ComicUploadAsset";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "DramaBatchJob";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "DramaCharacter";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "DramaCharacterLibrary";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "DramaEpisode";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "DramaFact";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "DramaProject";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "DramaShot";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "DramaSourceBundle";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "DramaStoryboard";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "DramaVideoPrompt";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "PromptSlotOverride" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scope" TEXT NOT NULL,
    "novelId" TEXT,
    "promptId" TEXT NOT NULL,
    "baseVersion" TEXT NOT NULL,
    "slots" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PromptSlotOverride_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WritingTechnique" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "filePath" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WritingTechniqueProfileBinding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "styleProfileId" TEXT NOT NULL,
    "writingTechniqueId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WritingTechniqueProfileBinding_styleProfileId_fkey" FOREIGN KEY ("styleProfileId") REFERENCES "StyleProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WritingTechniqueProfileBinding_writingTechniqueId_fkey" FOREIGN KEY ("writingTechniqueId") REFERENCES "WritingTechnique" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WritingTechniqueNovelBinding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelId" TEXT NOT NULL,
    "writingTechniqueId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WritingTechniqueNovelBinding_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WritingTechniqueNovelBinding_writingTechniqueId_fkey" FOREIGN KEY ("writingTechniqueId") REFERENCES "WritingTechnique" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OpenConflictCharacter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelId" TEXT NOT NULL,
    "conflictId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OpenConflictCharacter_conflictId_fkey" FOREIGN KEY ("conflictId") REFERENCES "OpenConflict" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OpenConflictCharacter_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CharacterResourceKnownBy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CharacterResourceKnownBy_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "CharacterResourceLedgerItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CharacterResourceKnownBy_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StoryPlanIssue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "issueId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StoryPlanIssue_planId_fkey" FOREIGN KEY ("planId") REFERENCES "StoryPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StoryPlanIssue_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "ConsistencyFact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StateVersionProposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StateVersionProposal_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "CanonicalStateVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StateVersionProposal_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "StateChangeProposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimelineEventEdge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "edgeType" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimelineEventEdge_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "StoryTimelineEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimelineEventEdge_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "StoryTimelineEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimelineEventParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimelineEventParticipant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "StoryTimelineEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimelineEventParticipant_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimelineEventFaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "factionId" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimelineEventFaction_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "StoryTimelineEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimelineAnchorEventLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "anchorId" TEXT NOT NULL,
    "linkType" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimelineAnchorEventLink_anchorId_fkey" FOREIGN KEY ("anchorId") REFERENCES "ChapterTimeAnchor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimelineHookEventLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hookId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimelineHookEventLink_hookId_fkey" FOREIGN KEY ("hookId") REFERENCES "TimelineHook" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimelineHookParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hookId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimelineHookParticipant_hookId_fkey" FOREIGN KEY ("hookId") REFERENCES "TimelineHook" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimelineHookParticipant_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimelineConstraintLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "constraintId" TEXT NOT NULL,
    "refType" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimelineConstraintLink_constraintId_fkey" FOREIGN KEY ("constraintId") REFERENCES "TimelineConstraint" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NovelFactEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelId" TEXT NOT NULL,
    "chapterOrder" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'completed',
    "source" TEXT NOT NULL DEFAULT 'auto',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NovelFactEntry_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NovelRisk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'quality',
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'open',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "chapterId" TEXT,
    "chapterRange" TEXT,
    "volumeId" TEXT,
    "impactAssessment" TEXT,
    "triggerSource" TEXT,
    "sourceMetadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "resolvedAt" DATETIME,
    "reopenedAt" DATETIME,
    "reopenedCount" INTEGER NOT NULL DEFAULT 0,
    "exportedAt" DATETIME,
    CONSTRAINT "NovelRisk_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NovelRisk_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RiskAuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "riskId" TEXT NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'created',
    "actor" TEXT NOT NULL DEFAULT 'system',
    "comment" TEXT,
    "prevStatus" TEXT,
    "newStatus" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RiskAuditLog_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "NovelRisk" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorldForceRelation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "worldId" TEXT NOT NULL,
    "sourceForceId" TEXT NOT NULL,
    "targetForceId" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "tension" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorldForceRelation_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorldLocationControl" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "worldId" TEXT NOT NULL,
    "forceId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorldLocationControl_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorldLocationConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "worldId" TEXT NOT NULL,
    "sourceLocationId" TEXT NOT NULL,
    "targetLocationId" TEXT NOT NULL,
    "connectionType" TEXT NOT NULL,
    "distanceHint" TEXT NOT NULL,
    "narrativeUse" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorldLocationConnection_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CanonicalStateVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelId" TEXT NOT NULL,
    "chapterId" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceStage" TEXT,
    "version" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "snapshotJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CanonicalStateVersion_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CanonicalStateVersion_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CanonicalStateVersion" ("chapterId", "createdAt", "id", "novelId", "snapshotJson", "sourceStage", "sourceType", "summary", "version") SELECT "chapterId", "createdAt", "id", "novelId", "snapshotJson", "sourceStage", "sourceType", "summary", "version" FROM "CanonicalStateVersion";
DROP TABLE "CanonicalStateVersion";
ALTER TABLE "new_CanonicalStateVersion" RENAME TO "CanonicalStateVersion";
CREATE INDEX "CanonicalStateVersion_novelId_createdAt_idx" ON "CanonicalStateVersion"("novelId", "createdAt");
CREATE INDEX "CanonicalStateVersion_chapterId_idx" ON "CanonicalStateVersion"("chapterId");
CREATE UNIQUE INDEX "CanonicalStateVersion_novelId_version_key" ON "CanonicalStateVersion"("novelId", "version");
CREATE TABLE "new_Chapter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT DEFAULT '',
    "order" INTEGER NOT NULL,
    "generationState" TEXT NOT NULL DEFAULT 'planned',
    "chapterStatus" TEXT DEFAULT 'unplanned',
    "targetWordCount" INTEGER,
    "conflictLevel" INTEGER,
    "revealLevel" INTEGER,
    "mustAvoid" TEXT,
    "taskSheet" TEXT,
    "sceneCards" TEXT,
    "repairHistory" TEXT,
    "qualityScore" INTEGER,
    "continuityScore" INTEGER,
    "characterScore" INTEGER,
    "pacingScore" INTEGER,
    "riskFlags" TEXT,
    "hook" TEXT,
    "expectation" TEXT,
    "tensionLevel" TEXT DEFAULT 'medium',
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "novelId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Chapter_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Chapter" ("chapterStatus", "characterScore", "conflictLevel", "content", "continuityScore", "createdAt", "expectation", "generationState", "hook", "id", "mustAvoid", "novelId", "order", "pacingScore", "qualityScore", "repairHistory", "revealLevel", "riskFlags", "sceneCards", "targetWordCount", "taskSheet", "title", "updatedAt") SELECT "chapterStatus", "characterScore", "conflictLevel", "content", "continuityScore", "createdAt", "expectation", "generationState", "hook", "id", "mustAvoid", "novelId", "order", "pacingScore", "qualityScore", "repairHistory", "revealLevel", "riskFlags", "sceneCards", "targetWordCount", "taskSheet", "title", "updatedAt" FROM "Chapter";
DROP TABLE "Chapter";
ALTER TABLE "new_Chapter" RENAME TO "Chapter";
CREATE INDEX "Chapter_novelId_order_idx" ON "Chapter"("novelId", "order");
CREATE TABLE "new_ChapterTimeAnchor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "chapterIndex" INTEGER NOT NULL,
    "storyDayIndex" INTEGER,
    "timeLabel" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ChapterTimeAnchor" ("chapterId", "chapterIndex", "createdAt", "id", "novelId", "storyDayIndex", "timeLabel", "updatedAt") SELECT "chapterId", "chapterIndex", "createdAt", "id", "novelId", "storyDayIndex", "timeLabel", "updatedAt" FROM "ChapterTimeAnchor";
DROP TABLE "ChapterTimeAnchor";
ALTER TABLE "new_ChapterTimeAnchor" RENAME TO "ChapterTimeAnchor";
CREATE INDEX "ChapterTimeAnchor_novelId_chapterIndex_idx" ON "ChapterTimeAnchor"("novelId", "chapterIndex");
CREATE UNIQUE INDEX "ChapterTimeAnchor_novelId_chapterId_key" ON "ChapterTimeAnchor"("novelId", "chapterId");
CREATE TABLE "new_Character" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "gender" TEXT NOT NULL DEFAULT 'unknown',
    "castRole" TEXT,
    "storyFunction" TEXT,
    "relationToProtagonist" TEXT,
    "personality" TEXT,
    "background" TEXT,
    "development" TEXT,
    "identityLabel" TEXT,
    "factionLabel" TEXT,
    "stanceLabel" TEXT,
    "powerLevel" TEXT,
    "realm" TEXT,
    "currentLocation" TEXT,
    "availability" TEXT,
    "prohibitionsJson" TEXT NOT NULL DEFAULT '[]',
    "outerGoal" TEXT,
    "innerNeed" TEXT,
    "fear" TEXT,
    "wound" TEXT,
    "misbelief" TEXT,
    "secret" TEXT,
    "moralLine" TEXT,
    "firstImpression" TEXT,
    "appearance" TEXT,
    "physique" TEXT,
    "attireStyle" TEXT,
    "signatureDetail" TEXT,
    "voiceTexture" TEXT,
    "presenceImpression" TEXT,
    "arcStart" TEXT,
    "arcMidpoint" TEXT,
    "arcClimax" TEXT,
    "arcEnd" TEXT,
    "currentState" TEXT,
    "currentGoal" TEXT,
    "exitStatus" TEXT NOT NULL DEFAULT 'active',
    "exitNote" TEXT,
    "exitChapterId" TEXT,
    "lastEvolvedAt" DATETIME,
    "novelId" TEXT NOT NULL,
    "baseCharacterId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Character_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Character" ("appearance", "arcClimax", "arcEnd", "arcMidpoint", "arcStart", "attireStyle", "availability", "background", "baseCharacterId", "castRole", "createdAt", "currentGoal", "currentLocation", "currentState", "development", "factionLabel", "fear", "firstImpression", "gender", "id", "identityLabel", "innerNeed", "lastEvolvedAt", "misbelief", "moralLine", "name", "novelId", "outerGoal", "personality", "physique", "powerLevel", "presenceImpression", "prohibitionsJson", "realm", "relationToProtagonist", "role", "secret", "signatureDetail", "stanceLabel", "storyFunction", "updatedAt", "voiceTexture", "wound") SELECT "appearance", "arcClimax", "arcEnd", "arcMidpoint", "arcStart", "attireStyle", "availability", "background", "baseCharacterId", "castRole", "createdAt", "currentGoal", "currentLocation", "currentState", "development", "factionLabel", "fear", "firstImpression", "gender", "id", "identityLabel", "innerNeed", "lastEvolvedAt", "misbelief", "moralLine", "name", "novelId", "outerGoal", "personality", "physique", "powerLevel", "presenceImpression", "prohibitionsJson", "realm", "relationToProtagonist", "role", "secret", "signatureDetail", "stanceLabel", "storyFunction", "updatedAt", "voiceTexture", "wound" FROM "Character";
DROP TABLE "Character";
ALTER TABLE "new_Character" RENAME TO "Character";
CREATE INDEX "Character_novelId_idx" ON "Character"("novelId");
CREATE INDEX "Character_baseCharacterId_idx" ON "Character"("baseCharacterId");
CREATE TABLE "new_CharacterResourceLedgerItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelId" TEXT NOT NULL,
    "resourceKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "narrativeFunction" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT,
    "ownerName" TEXT,
    "ownerCharacterId" TEXT,
    "holderCharacterId" TEXT,
    "holderCharacterName" TEXT,
    "status" TEXT NOT NULL,
    "readerKnows" BOOLEAN NOT NULL DEFAULT false,
    "holderKnows" BOOLEAN NOT NULL DEFAULT true,
    "introducedChapterId" TEXT,
    "introducedChapterOrder" INTEGER,
    "lastTouchedChapterId" TEXT,
    "lastTouchedChapterOrder" INTEGER,
    "expectedUseStartChapterOrder" INTEGER,
    "expectedUseEndChapterOrder" INTEGER,
    "constraintsJson" TEXT,
    "riskSignalsJson" TEXT,
    "sourceRefsJson" TEXT,
    "evidenceJson" TEXT,
    "confidence" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CharacterResourceLedgerItem_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CharacterResourceLedgerItem_ownerCharacterId_fkey" FOREIGN KEY ("ownerCharacterId") REFERENCES "Character" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CharacterResourceLedgerItem_holderCharacterId_fkey" FOREIGN KEY ("holderCharacterId") REFERENCES "Character" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CharacterResourceLedgerItem_introducedChapterId_fkey" FOREIGN KEY ("introducedChapterId") REFERENCES "Chapter" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CharacterResourceLedgerItem_lastTouchedChapterId_fkey" FOREIGN KEY ("lastTouchedChapterId") REFERENCES "Chapter" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CharacterResourceLedgerItem" ("confidence", "constraintsJson", "createdAt", "evidenceJson", "expectedUseEndChapterOrder", "expectedUseStartChapterOrder", "holderCharacterId", "holderCharacterName", "holderKnows", "id", "introducedChapterId", "introducedChapterOrder", "lastTouchedChapterId", "lastTouchedChapterOrder", "name", "narrativeFunction", "novelId", "ownerCharacterId", "ownerId", "ownerName", "ownerType", "readerKnows", "resourceKey", "resourceType", "riskSignalsJson", "sourceRefsJson", "status", "summary", "updatedAt") SELECT "confidence", "constraintsJson", "createdAt", "evidenceJson", "expectedUseEndChapterOrder", "expectedUseStartChapterOrder", "holderCharacterId", "holderCharacterName", "holderKnows", "id", "introducedChapterId", "introducedChapterOrder", "lastTouchedChapterId", "lastTouchedChapterOrder", "name", "narrativeFunction", "novelId", "ownerCharacterId", "ownerId", "ownerName", "ownerType", "readerKnows", "resourceKey", "resourceType", "riskSignalsJson", "sourceRefsJson", "status", "summary", "updatedAt" FROM "CharacterResourceLedgerItem";
DROP TABLE "CharacterResourceLedgerItem";
ALTER TABLE "new_CharacterResourceLedgerItem" RENAME TO "CharacterResourceLedgerItem";
CREATE INDEX "CharacterResourceLedgerItem_novelId_status_updatedAt_idx" ON "CharacterResourceLedgerItem"("novelId", "status", "updatedAt");
CREATE INDEX "CharacterResourceLedgerItem_holderCharacterId_status_idx" ON "CharacterResourceLedgerItem"("holderCharacterId", "status");
CREATE INDEX "CharacterResourceLedgerItem_ownerCharacterId_idx" ON "CharacterResourceLedgerItem"("ownerCharacterId");
CREATE INDEX "CharacterResourceLedgerItem_novelId_lastTouchedChapterOrder_idx" ON "CharacterResourceLedgerItem"("novelId", "lastTouchedChapterOrder");
CREATE INDEX "CharacterResourceLedgerItem_introducedChapterId_idx" ON "CharacterResourceLedgerItem"("introducedChapterId");
CREATE INDEX "CharacterResourceLedgerItem_lastTouchedChapterId_idx" ON "CharacterResourceLedgerItem"("lastTouchedChapterId");
CREATE UNIQUE INDEX "CharacterResourceLedgerItem_novelId_resourceKey_key" ON "CharacterResourceLedgerItem"("novelId", "resourceKey");
CREATE TABLE "new_DirectorRuntimeCommand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runtimeId" TEXT NOT NULL,
    "workflowTaskId" TEXT,
    "novelId" TEXT,
    "legacyCommandId" TEXT,
    "commandType" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "priority" INTEGER NOT NULL DEFAULT 50,
    "runAfter" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseOwner" TEXT,
    "leaseExpiresAt" DATETIME,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "payloadJson" TEXT,
    "errorMessage" TEXT,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DirectorRuntimeCommand_runtimeId_fkey" FOREIGN KEY ("runtimeId") REFERENCES "DirectorRuntimeInstance" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DirectorRuntimeCommand" ("attempt", "commandType", "createdAt", "errorMessage", "finishedAt", "id", "idempotencyKey", "leaseExpiresAt", "leaseOwner", "legacyCommandId", "novelId", "payloadJson", "priority", "runAfter", "runtimeId", "startedAt", "status", "updatedAt", "workflowTaskId") SELECT "attempt", "commandType", "createdAt", "errorMessage", "finishedAt", "id", "idempotencyKey", "leaseExpiresAt", "leaseOwner", "legacyCommandId", "novelId", "payloadJson", "priority", "runAfter", "runtimeId", "startedAt", "status", "updatedAt", "workflowTaskId" FROM "DirectorRuntimeCommand";
DROP TABLE "DirectorRuntimeCommand";
ALTER TABLE "new_DirectorRuntimeCommand" RENAME TO "DirectorRuntimeCommand";
CREATE UNIQUE INDEX "DirectorRuntimeCommand_legacyCommandId_key" ON "DirectorRuntimeCommand"("legacyCommandId");
CREATE INDEX "DirectorRuntimeCommand_runtimeId_status_updatedAt_idx" ON "DirectorRuntimeCommand"("runtimeId", "status", "updatedAt");
CREATE INDEX "DirectorRuntimeCommand_status_priority_runAfter_createdAt_idx" ON "DirectorRuntimeCommand"("status", "priority", "runAfter", "createdAt");
CREATE INDEX "DirectorRuntimeCommand_workflowTaskId_status_updatedAt_idx" ON "DirectorRuntimeCommand"("workflowTaskId", "status", "updatedAt");
CREATE INDEX "DirectorRuntimeCommand_novelId_status_updatedAt_idx" ON "DirectorRuntimeCommand"("novelId", "status", "updatedAt");
CREATE INDEX "DirectorRuntimeCommand_leaseOwner_leaseExpiresAt_idx" ON "DirectorRuntimeCommand"("leaseOwner", "leaseExpiresAt");
CREATE UNIQUE INDEX "DirectorRuntimeCommand_runtimeId_commandType_idempotencyKey_key" ON "DirectorRuntimeCommand"("runtimeId", "commandType", "idempotencyKey");
CREATE TABLE "new_DirectorRuntimeEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runtimeId" TEXT NOT NULL,
    "commandId" TEXT,
    "executionId" TEXT,
    "workflowTaskId" TEXT,
    "novelId" TEXT,
    "type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "severity" TEXT,
    "metadataJson" TEXT,
    "occurredAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DirectorRuntimeEvent_runtimeId_fkey" FOREIGN KEY ("runtimeId") REFERENCES "DirectorRuntimeInstance" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DirectorRuntimeEvent_commandId_fkey" FOREIGN KEY ("commandId") REFERENCES "DirectorRuntimeCommand" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DirectorRuntimeEvent_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "DirectorRuntimeExecution" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DirectorRuntimeEvent" ("commandId", "createdAt", "executionId", "id", "metadataJson", "novelId", "occurredAt", "runtimeId", "severity", "summary", "type", "workflowTaskId") SELECT "commandId", "createdAt", "executionId", "id", "metadataJson", "novelId", "occurredAt", "runtimeId", "severity", "summary", "type", "workflowTaskId" FROM "DirectorRuntimeEvent";
DROP TABLE "DirectorRuntimeEvent";
ALTER TABLE "new_DirectorRuntimeEvent" RENAME TO "DirectorRuntimeEvent";
CREATE INDEX "DirectorRuntimeEvent_runtimeId_occurredAt_idx" ON "DirectorRuntimeEvent"("runtimeId", "occurredAt");
CREATE INDEX "DirectorRuntimeEvent_commandId_occurredAt_idx" ON "DirectorRuntimeEvent"("commandId", "occurredAt");
CREATE INDEX "DirectorRuntimeEvent_executionId_occurredAt_idx" ON "DirectorRuntimeEvent"("executionId", "occurredAt");
CREATE INDEX "DirectorRuntimeEvent_workflowTaskId_occurredAt_idx" ON "DirectorRuntimeEvent"("workflowTaskId", "occurredAt");
CREATE INDEX "DirectorRuntimeEvent_novelId_occurredAt_idx" ON "DirectorRuntimeEvent"("novelId", "occurredAt");
CREATE INDEX "DirectorRuntimeEvent_type_occurredAt_idx" ON "DirectorRuntimeEvent"("type", "occurredAt");
CREATE TABLE "new_DirectorRuntimeExecution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runtimeId" TEXT NOT NULL,
    "commandId" TEXT,
    "workflowTaskId" TEXT,
    "novelId" TEXT,
    "legacyCommandId" TEXT,
    "activeLockKey" TEXT,
    "workerId" TEXT,
    "slotId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'leased',
    "stepType" TEXT NOT NULL,
    "resourceClass" TEXT,
    "leaseExpiresAt" DATETIME,
    "heartbeatAt" DATETIME,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "errorClass" TEXT,
    "errorMessage" TEXT,
    "inputHash" TEXT,
    "checkpointVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DirectorRuntimeExecution_runtimeId_fkey" FOREIGN KEY ("runtimeId") REFERENCES "DirectorRuntimeInstance" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DirectorRuntimeExecution_commandId_fkey" FOREIGN KEY ("commandId") REFERENCES "DirectorRuntimeCommand" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DirectorRuntimeExecution" ("activeLockKey", "checkpointVersion", "commandId", "createdAt", "errorClass", "errorMessage", "finishedAt", "heartbeatAt", "id", "inputHash", "leaseExpiresAt", "legacyCommandId", "novelId", "resourceClass", "runtimeId", "slotId", "startedAt", "status", "stepType", "updatedAt", "workerId", "workflowTaskId") SELECT "activeLockKey", "checkpointVersion", "commandId", "createdAt", "errorClass", "errorMessage", "finishedAt", "heartbeatAt", "id", "inputHash", "leaseExpiresAt", "legacyCommandId", "novelId", "resourceClass", "runtimeId", "slotId", "startedAt", "status", "stepType", "updatedAt", "workerId", "workflowTaskId" FROM "DirectorRuntimeExecution";
DROP TABLE "DirectorRuntimeExecution";
ALTER TABLE "new_DirectorRuntimeExecution" RENAME TO "DirectorRuntimeExecution";
CREATE UNIQUE INDEX "DirectorRuntimeExecution_activeLockKey_key" ON "DirectorRuntimeExecution"("activeLockKey");
CREATE INDEX "DirectorRuntimeExecution_runtimeId_status_updatedAt_idx" ON "DirectorRuntimeExecution"("runtimeId", "status", "updatedAt");
CREATE INDEX "DirectorRuntimeExecution_status_leaseExpiresAt_idx" ON "DirectorRuntimeExecution"("status", "leaseExpiresAt");
CREATE INDEX "DirectorRuntimeExecution_workflowTaskId_status_updatedAt_idx" ON "DirectorRuntimeExecution"("workflowTaskId", "status", "updatedAt");
CREATE INDEX "DirectorRuntimeExecution_novelId_status_updatedAt_idx" ON "DirectorRuntimeExecution"("novelId", "status", "updatedAt");
CREATE INDEX "DirectorRuntimeExecution_workerId_status_updatedAt_idx" ON "DirectorRuntimeExecution"("workerId", "status", "updatedAt");
CREATE TABLE "new_DirectorRuntimeInstance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelId" TEXT,
    "workflowTaskId" TEXT,
    "runId" TEXT,
    "runMode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'waiting_worker',
    "currentStep" TEXT,
    "currentChapterId" TEXT,
    "checkpointVersion" INTEGER NOT NULL DEFAULT 0,
    "cancelRequestedAt" DATETIME,
    "lastHeartbeatAt" DATETIME,
    "lastErrorClass" TEXT,
    "lastErrorMessage" TEXT,
    "workerMessage" TEXT,
    "metadataJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_DirectorRuntimeInstance" ("cancelRequestedAt", "checkpointVersion", "createdAt", "currentChapterId", "currentStep", "id", "lastErrorClass", "lastErrorMessage", "lastHeartbeatAt", "metadataJson", "novelId", "runId", "runMode", "status", "updatedAt", "workerMessage", "workflowTaskId") SELECT "cancelRequestedAt", "checkpointVersion", "createdAt", "currentChapterId", "currentStep", "id", "lastErrorClass", "lastErrorMessage", "lastHeartbeatAt", "metadataJson", "novelId", "runId", "runMode", "status", "updatedAt", "workerMessage", "workflowTaskId" FROM "DirectorRuntimeInstance";
DROP TABLE "DirectorRuntimeInstance";
ALTER TABLE "new_DirectorRuntimeInstance" RENAME TO "DirectorRuntimeInstance";
CREATE INDEX "DirectorRuntimeInstance_novelId_status_updatedAt_idx" ON "DirectorRuntimeInstance"("novelId", "status", "updatedAt");
CREATE INDEX "DirectorRuntimeInstance_workflowTaskId_idx" ON "DirectorRuntimeInstance"("workflowTaskId");
CREATE INDEX "DirectorRuntimeInstance_runId_idx" ON "DirectorRuntimeInstance"("runId");
CREATE INDEX "DirectorRuntimeInstance_status_updatedAt_idx" ON "DirectorRuntimeInstance"("status", "updatedAt");
CREATE TABLE "new_Novel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetAudience" TEXT,
    "bookSellingPoint" TEXT,
    "competingFeel" TEXT,
    "first30ChapterPromise" TEXT,
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
    "projectStatus" TEXT DEFAULT 'not_started',
    "storylineStatus" TEXT DEFAULT 'not_started',
    "outlineStatus" TEXT DEFAULT 'not_started',
    "resourceReadyScore" INTEGER,
    "sourceNovelId" TEXT,
    "sourceKnowledgeDocumentId" TEXT,
    "continuationBookAnalysisId" TEXT,
    "continuationBookAnalysisSections" TEXT,
    "outline" TEXT,
    "structuredOutline" TEXT,
    "storyWorldSliceJson" TEXT,
    "storyWorldSliceOverridesJson" TEXT,
    "storyWorldSliceSchemaVersion" INTEGER NOT NULL DEFAULT 1,
    "genreId" TEXT,
    "primaryStoryModeId" TEXT,
    "secondaryStoryModeId" TEXT,
    "worldId" TEXT,
    "payoffExpiryThreshold" INTEGER NOT NULL DEFAULT 20,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Novel_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "NovelGenre" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Novel_primaryStoryModeId_fkey" FOREIGN KEY ("primaryStoryModeId") REFERENCES "NovelStoryMode" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Novel_secondaryStoryModeId_fkey" FOREIGN KEY ("secondaryStoryModeId") REFERENCES "NovelStoryMode" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Novel_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Novel_sourceNovelId_fkey" FOREIGN KEY ("sourceNovelId") REFERENCES "Novel" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Novel_sourceKnowledgeDocumentId_fkey" FOREIGN KEY ("sourceKnowledgeDocumentId") REFERENCES "KnowledgeDocument" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Novel_continuationBookAnalysisId_fkey" FOREIGN KEY ("continuationBookAnalysisId") REFERENCES "BookAnalysis" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Novel" ("aiFreedom", "bookSellingPoint", "commercialTagsJson", "competingFeel", "continuationBookAnalysisId", "continuationBookAnalysisSections", "createdAt", "defaultChapterLength", "description", "emotionIntensity", "estimatedChapterCount", "first30ChapterPromise", "genreId", "id", "narrativePov", "outline", "outlineStatus", "pacePreference", "postGenerationStyleReviewEnabled", "primaryStoryModeId", "projectMode", "projectStatus", "resourceReadyScore", "secondaryStoryModeId", "sourceKnowledgeDocumentId", "sourceNovelId", "status", "storyWorldSliceJson", "storyWorldSliceOverridesJson", "storyWorldSliceSchemaVersion", "storylineStatus", "structuredOutline", "styleTone", "targetAudience", "title", "updatedAt", "worldId", "writingMode") SELECT "aiFreedom", "bookSellingPoint", "commercialTagsJson", "competingFeel", "continuationBookAnalysisId", "continuationBookAnalysisSections", "createdAt", "defaultChapterLength", "description", "emotionIntensity", "estimatedChapterCount", "first30ChapterPromise", "genreId", "id", "narrativePov", "outline", "outlineStatus", "pacePreference", "postGenerationStyleReviewEnabled", "primaryStoryModeId", "projectMode", "projectStatus", "resourceReadyScore", "secondaryStoryModeId", "sourceKnowledgeDocumentId", "sourceNovelId", "status", "storyWorldSliceJson", "storyWorldSliceOverridesJson", "storyWorldSliceSchemaVersion", "storylineStatus", "structuredOutline", "styleTone", "targetAudience", "title", "updatedAt", "worldId", "writingMode" FROM "Novel";
DROP TABLE "Novel";
ALTER TABLE "new_Novel" RENAME TO "Novel";
CREATE INDEX "Novel_genreId_idx" ON "Novel"("genreId");
CREATE INDEX "Novel_primaryStoryModeId_idx" ON "Novel"("primaryStoryModeId");
CREATE INDEX "Novel_secondaryStoryModeId_idx" ON "Novel"("secondaryStoryModeId");
CREATE INDEX "Novel_worldId_idx" ON "Novel"("worldId");
CREATE INDEX "Novel_writingMode_idx" ON "Novel"("writingMode");
CREATE INDEX "Novel_sourceNovelId_idx" ON "Novel"("sourceNovelId");
CREATE INDEX "Novel_sourceKnowledgeDocumentId_idx" ON "Novel"("sourceKnowledgeDocumentId");
CREATE INDEX "Novel_continuationBookAnalysisId_idx" ON "Novel"("continuationBookAnalysisId");
CREATE TABLE "new_NovelSideEffectJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelId" TEXT,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "idempotencyKey" TEXT NOT NULL,
    "payloadVersion" INTEGER NOT NULL DEFAULT 1,
    "payloadJson" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "runAfter" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseOwner" TEXT,
    "leaseExpiresAt" DATETIME,
    "lastError" TEXT,
    "finishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NovelSideEffectJob_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_NovelSideEffectJob" ("attempts", "createdAt", "finishedAt", "id", "idempotencyKey", "jobType", "lastError", "leaseExpiresAt", "leaseOwner", "maxAttempts", "novelId", "payloadJson", "payloadVersion", "runAfter", "status", "updatedAt") SELECT "attempts", "createdAt", "finishedAt", "id", "idempotencyKey", "jobType", "lastError", "leaseExpiresAt", "leaseOwner", "maxAttempts", "novelId", "payloadJson", "payloadVersion", "runAfter", "status", "updatedAt" FROM "NovelSideEffectJob";
DROP TABLE "NovelSideEffectJob";
ALTER TABLE "new_NovelSideEffectJob" RENAME TO "NovelSideEffectJob";
CREATE UNIQUE INDEX "NovelSideEffectJob_idempotencyKey_key" ON "NovelSideEffectJob"("idempotencyKey");
CREATE INDEX "NovelSideEffectJob_status_runAfter_idx" ON "NovelSideEffectJob"("status", "runAfter");
CREATE INDEX "NovelSideEffectJob_novelId_status_updatedAt_idx" ON "NovelSideEffectJob"("novelId", "status", "updatedAt");
CREATE INDEX "NovelSideEffectJob_leaseOwner_leaseExpiresAt_idx" ON "NovelSideEffectJob"("leaseOwner", "leaseExpiresAt");
CREATE INDEX "NovelSideEffectJob_jobType_status_runAfter_idx" ON "NovelSideEffectJob"("jobType", "status", "runAfter");
CREATE TABLE "new_NovelWorld" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelId" TEXT NOT NULL,
    "sourceWorldId" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'manual',
    "title" TEXT,
    "coverSummary" TEXT,
    "structuredDataJson" TEXT,
    "bindingContractJson" TEXT,
    "storySliceJson" TEXT,
    "storySliceOverridesJson" TEXT,
    "storySliceSchemaVersion" INTEGER NOT NULL DEFAULT 1,
    "storySliceBuiltAt" DATETIME,
    "storySliceDigest" TEXT,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "syncDirection" TEXT NOT NULL DEFAULT 'none',
    "syncBaseVersion" INTEGER,
    "syncPendingChangesJson" TEXT,
    "lastSyncedAt" DATETIME,
    "generationPolicyJson" TEXT,
    "generatedFromThemeJson" TEXT,
    "savedToLibraryAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NovelWorld_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NovelWorld_sourceWorldId_fkey" FOREIGN KEY ("sourceWorldId") REFERENCES "World" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_NovelWorld" ("bindingContractJson", "coverSummary", "createdAt", "generatedFromThemeJson", "generationPolicyJson", "id", "lastSyncedAt", "novelId", "savedToLibraryAt", "sourceType", "sourceWorldId", "storySliceBuiltAt", "storySliceDigest", "storySliceJson", "storySliceOverridesJson", "storySliceSchemaVersion", "structuredDataJson", "syncBaseVersion", "syncDirection", "syncEnabled", "syncPendingChangesJson", "title", "updatedAt") SELECT "bindingContractJson", "coverSummary", "createdAt", "generatedFromThemeJson", "generationPolicyJson", "id", "lastSyncedAt", "novelId", "savedToLibraryAt", "sourceType", "sourceWorldId", "storySliceBuiltAt", "storySliceDigest", "storySliceJson", "storySliceOverridesJson", "storySliceSchemaVersion", "structuredDataJson", "syncBaseVersion", "syncDirection", "syncEnabled", "syncPendingChangesJson", "title", "updatedAt" FROM "NovelWorld";
DROP TABLE "NovelWorld";
ALTER TABLE "new_NovelWorld" RENAME TO "NovelWorld";
CREATE UNIQUE INDEX "NovelWorld_novelId_key" ON "NovelWorld"("novelId");
CREATE INDEX "NovelWorld_sourceWorldId_idx" ON "NovelWorld"("sourceWorldId");
CREATE INDEX "NovelWorld_sourceType_idx" ON "NovelWorld"("sourceType");
CREATE TABLE "new_OpenConflict" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelId" TEXT NOT NULL,
    "chapterId" TEXT,
    "sourceSnapshotId" TEXT,
    "sourceIssueId" TEXT,
    "sourceType" TEXT NOT NULL,
    "conflictType" TEXT NOT NULL,
    "conflictKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'open',
    "evidenceJson" TEXT,
    "resolutionHint" TEXT,
    "lastSeenChapterOrder" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OpenConflict_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OpenConflict_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OpenConflict_sourceSnapshotId_fkey" FOREIGN KEY ("sourceSnapshotId") REFERENCES "StoryStateSnapshot" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_OpenConflict" ("chapterId", "conflictKey", "conflictType", "createdAt", "evidenceJson", "id", "lastSeenChapterOrder", "novelId", "resolutionHint", "severity", "sourceIssueId", "sourceSnapshotId", "sourceType", "status", "summary", "title", "updatedAt") SELECT "chapterId", "conflictKey", "conflictType", "createdAt", "evidenceJson", "id", "lastSeenChapterOrder", "novelId", "resolutionHint", "severity", "sourceIssueId", "sourceSnapshotId", "sourceType", "status", "summary", "title", "updatedAt" FROM "OpenConflict";
DROP TABLE "OpenConflict";
ALTER TABLE "new_OpenConflict" RENAME TO "OpenConflict";
CREATE INDEX "OpenConflict_novelId_status_updatedAt_idx" ON "OpenConflict"("novelId", "status", "updatedAt");
CREATE INDEX "OpenConflict_chapterId_status_idx" ON "OpenConflict"("chapterId", "status");
CREATE INDEX "OpenConflict_sourceSnapshotId_idx" ON "OpenConflict"("sourceSnapshotId");
CREATE INDEX "OpenConflict_sourceIssueId_idx" ON "OpenConflict"("sourceIssueId");
CREATE UNIQUE INDEX "OpenConflict_novelId_chapterId_sourceType_conflictKey_key" ON "OpenConflict"("novelId", "chapterId", "sourceType", "conflictKey");
CREATE TABLE "new_PayoffLedgerItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelId" TEXT NOT NULL,
    "ledgerKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "scopeType" TEXT NOT NULL,
    "currentStatus" TEXT NOT NULL,
    "normalizedStatus" TEXT,
    "chaptersElapsed" INTEGER NOT NULL DEFAULT 0,
    "targetStartChapterOrder" INTEGER,
    "targetEndChapterOrder" INTEGER,
    "firstSeenChapterOrder" INTEGER,
    "lastTouchedChapterOrder" INTEGER,
    "lastTouchedChapterId" TEXT,
    "setupChapterId" TEXT,
    "payoffChapterId" TEXT,
    "lastSnapshotId" TEXT,
    "sourceRefsJson" TEXT,
    "evidenceJson" TEXT,
    "riskSignalsJson" TEXT,
    "statusReason" TEXT,
    "confidence" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PayoffLedgerItem_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PayoffLedgerItem_lastTouchedChapterId_fkey" FOREIGN KEY ("lastTouchedChapterId") REFERENCES "Chapter" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PayoffLedgerItem_setupChapterId_fkey" FOREIGN KEY ("setupChapterId") REFERENCES "Chapter" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PayoffLedgerItem_payoffChapterId_fkey" FOREIGN KEY ("payoffChapterId") REFERENCES "Chapter" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PayoffLedgerItem_lastSnapshotId_fkey" FOREIGN KEY ("lastSnapshotId") REFERENCES "StoryStateSnapshot" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PayoffLedgerItem" ("confidence", "createdAt", "currentStatus", "evidenceJson", "firstSeenChapterOrder", "id", "lastSnapshotId", "lastTouchedChapterId", "lastTouchedChapterOrder", "ledgerKey", "novelId", "payoffChapterId", "riskSignalsJson", "scopeType", "setupChapterId", "sourceRefsJson", "statusReason", "summary", "targetEndChapterOrder", "targetStartChapterOrder", "title", "updatedAt") SELECT "confidence", "createdAt", "currentStatus", "evidenceJson", "firstSeenChapterOrder", "id", "lastSnapshotId", "lastTouchedChapterId", "lastTouchedChapterOrder", "ledgerKey", "novelId", "payoffChapterId", "riskSignalsJson", "scopeType", "setupChapterId", "sourceRefsJson", "statusReason", "summary", "targetEndChapterOrder", "targetStartChapterOrder", "title", "updatedAt" FROM "PayoffLedgerItem";
DROP TABLE "PayoffLedgerItem";
ALTER TABLE "new_PayoffLedgerItem" RENAME TO "PayoffLedgerItem";
CREATE INDEX "PayoffLedgerItem_novelId_currentStatus_updatedAt_idx" ON "PayoffLedgerItem"("novelId", "currentStatus", "updatedAt");
CREATE INDEX "PayoffLedgerItem_novelId_normalizedStatus_idx" ON "PayoffLedgerItem"("novelId", "normalizedStatus");
CREATE INDEX "PayoffLedgerItem_novelId_targetEndChapterOrder_idx" ON "PayoffLedgerItem"("novelId", "targetEndChapterOrder");
CREATE INDEX "PayoffLedgerItem_lastTouchedChapterId_idx" ON "PayoffLedgerItem"("lastTouchedChapterId");
CREATE INDEX "PayoffLedgerItem_setupChapterId_idx" ON "PayoffLedgerItem"("setupChapterId");
CREATE INDEX "PayoffLedgerItem_payoffChapterId_idx" ON "PayoffLedgerItem"("payoffChapterId");
CREATE INDEX "PayoffLedgerItem_lastSnapshotId_idx" ON "PayoffLedgerItem"("lastSnapshotId");
CREATE UNIQUE INDEX "PayoffLedgerItem_novelId_ledgerKey_key" ON "PayoffLedgerItem"("novelId", "ledgerKey");
CREATE TABLE "new_StoryPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelId" TEXT NOT NULL,
    "chapterId" TEXT,
    "parentId" TEXT,
    "sourceStateSnapshotId" TEXT,
    "level" TEXT NOT NULL,
    "planRole" TEXT,
    "phaseLabel" TEXT,
    "title" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "participantsJson" TEXT,
    "revealsJson" TEXT,
    "riskNotesJson" TEXT,
    "mustAdvanceJson" TEXT,
    "mustPreserveJson" TEXT,
    "replannedFromPlanId" TEXT,
    "hookTarget" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "externalRef" TEXT,
    "rawPlanJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StoryPlan_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StoryPlan_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StoryPlan_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "StoryPlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StoryPlan_sourceStateSnapshotId_fkey" FOREIGN KEY ("sourceStateSnapshotId") REFERENCES "StoryStateSnapshot" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_StoryPlan" ("chapterId", "createdAt", "externalRef", "hookTarget", "id", "level", "mustAdvanceJson", "mustPreserveJson", "novelId", "objective", "parentId", "participantsJson", "phaseLabel", "planRole", "rawPlanJson", "replannedFromPlanId", "revealsJson", "riskNotesJson", "sourceStateSnapshotId", "status", "title", "updatedAt") SELECT "chapterId", "createdAt", "externalRef", "hookTarget", "id", "level", "mustAdvanceJson", "mustPreserveJson", "novelId", "objective", "parentId", "participantsJson", "phaseLabel", "planRole", "rawPlanJson", "replannedFromPlanId", "revealsJson", "riskNotesJson", "sourceStateSnapshotId", "status", "title", "updatedAt" FROM "StoryPlan";
DROP TABLE "StoryPlan";
ALTER TABLE "new_StoryPlan" RENAME TO "StoryPlan";
CREATE INDEX "StoryPlan_novelId_level_createdAt_idx" ON "StoryPlan"("novelId", "level", "createdAt");
CREATE INDEX "StoryPlan_novelId_level_externalRef_idx" ON "StoryPlan"("novelId", "level", "externalRef");
CREATE INDEX "StoryPlan_novelId_level_chapterId_idx" ON "StoryPlan"("novelId", "level", "chapterId");
CREATE INDEX "StoryPlan_chapterId_createdAt_idx" ON "StoryPlan"("chapterId", "createdAt");
CREATE INDEX "StoryPlan_externalRef_idx" ON "StoryPlan"("externalRef");
CREATE INDEX "StoryPlan_sourceStateSnapshotId_idx" ON "StoryPlan"("sourceStateSnapshotId");
CREATE TABLE "new_StoryTimelineEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelId" TEXT NOT NULL,
    "chapterId" TEXT,
    "chapterIndex" INTEGER,
    "eventOrder" INTEGER NOT NULL,
    "storyDayIndex" INTEGER,
    "storyTimeLabel" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "visibility" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "locationId" TEXT,
    "stateChangesJson" TEXT NOT NULL DEFAULT '[]',
    "eventKey" TEXT,
    "confidence" REAL NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_StoryTimelineEvent" ("chapterId", "chapterIndex", "confidence", "createdAt", "eventKey", "eventOrder", "id", "locationId", "novelId", "source", "stateChangesJson", "status", "storyDayIndex", "storyTimeLabel", "summary", "title", "type", "updatedAt", "visibility") SELECT "chapterId", "chapterIndex", "confidence", "createdAt", "eventKey", "eventOrder", "id", "locationId", "novelId", "source", "stateChangesJson", "status", "storyDayIndex", "storyTimeLabel", "summary", "title", "type", "updatedAt", "visibility" FROM "StoryTimelineEvent";
DROP TABLE "StoryTimelineEvent";
ALTER TABLE "new_StoryTimelineEvent" RENAME TO "StoryTimelineEvent";
CREATE INDEX "StoryTimelineEvent_novelId_chapterIndex_idx" ON "StoryTimelineEvent"("novelId", "chapterIndex");
CREATE INDEX "StoryTimelineEvent_novelId_eventOrder_idx" ON "StoryTimelineEvent"("novelId", "eventOrder");
CREATE INDEX "StoryTimelineEvent_novelId_status_idx" ON "StoryTimelineEvent"("novelId", "status");
CREATE INDEX "StoryTimelineEvent_novelId_eventKey_idx" ON "StoryTimelineEvent"("novelId", "eventKey");
CREATE TABLE "new_TimelineConstraint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelId" TEXT NOT NULL,
    "chapterId" TEXT,
    "chapterIndex" INTEGER,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_TimelineConstraint" ("active", "chapterId", "chapterIndex", "createdAt", "description", "id", "novelId", "severity", "type", "updatedAt") SELECT "active", "chapterId", "chapterIndex", "createdAt", "description", "id", "novelId", "severity", "type", "updatedAt" FROM "TimelineConstraint";
DROP TABLE "TimelineConstraint";
ALTER TABLE "new_TimelineConstraint" RENAME TO "TimelineConstraint";
CREATE INDEX "TimelineConstraint_novelId_chapterIndex_idx" ON "TimelineConstraint"("novelId", "chapterIndex");
CREATE INDEX "TimelineConstraint_novelId_active_idx" ON "TimelineConstraint"("novelId", "active");
CREATE TABLE "new_TimelineHook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelId" TEXT NOT NULL,
    "createdInChapterId" TEXT NOT NULL,
    "createdInChapterIndex" INTEGER NOT NULL,
    "expectedResolveByChapterIndex" INTEGER,
    "resolveMode" TEXT NOT NULL DEFAULT 'long_arc',
    "blocking" BOOLEAN NOT NULL DEFAULT false,
    "resolvedInChapterId" TEXT,
    "resolvedInChapterIndex" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_TimelineHook" ("blocking", "createdAt", "createdInChapterId", "createdInChapterIndex", "description", "expectedResolveByChapterIndex", "id", "novelId", "priority", "resolveMode", "resolvedInChapterId", "resolvedInChapterIndex", "status", "title", "updatedAt") SELECT "blocking", "createdAt", "createdInChapterId", "createdInChapterIndex", "description", "expectedResolveByChapterIndex", "id", "novelId", "priority", "resolveMode", "resolvedInChapterId", "resolvedInChapterIndex", "status", "title", "updatedAt" FROM "TimelineHook";
DROP TABLE "TimelineHook";
ALTER TABLE "new_TimelineHook" RENAME TO "TimelineHook";
CREATE INDEX "TimelineHook_novelId_status_idx" ON "TimelineHook"("novelId", "status");
CREATE INDEX "TimelineHook_novelId_resolveMode_blocking_idx" ON "TimelineHook"("novelId", "resolveMode", "blocking");
CREATE INDEX "TimelineHook_novelId_createdInChapterIndex_idx" ON "TimelineHook"("novelId", "createdInChapterIndex");
CREATE INDEX "TimelineHook_novelId_expectedResolveByChapterIndex_idx" ON "TimelineHook"("novelId", "expectedResolveByChapterIndex");
CREATE TABLE "new_VolumeChapterPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "volumeId" TEXT NOT NULL,
    "chapterId" TEXT,
    "chapterOrder" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "purpose" TEXT,
    "conflictLevel" INTEGER,
    "revealLevel" INTEGER,
    "targetWordCount" INTEGER,
    "mustAvoid" TEXT,
    "taskSheet" TEXT,
    "sceneCards" TEXT,
    "payoffRefsJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VolumeChapterPlan_volumeId_fkey" FOREIGN KEY ("volumeId") REFERENCES "VolumePlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VolumeChapterPlan_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_VolumeChapterPlan" ("chapterId", "chapterOrder", "conflictLevel", "createdAt", "id", "mustAvoid", "payoffRefsJson", "purpose", "revealLevel", "sceneCards", "summary", "targetWordCount", "taskSheet", "title", "updatedAt", "volumeId") SELECT "chapterId", "chapterOrder", "conflictLevel", "createdAt", "id", "mustAvoid", "payoffRefsJson", "purpose", "revealLevel", "sceneCards", "summary", "targetWordCount", "taskSheet", "title", "updatedAt", "volumeId" FROM "VolumeChapterPlan";
DROP TABLE "VolumeChapterPlan";
ALTER TABLE "new_VolumeChapterPlan" RENAME TO "VolumeChapterPlan";
CREATE INDEX "VolumeChapterPlan_volumeId_chapterOrder_idx" ON "VolumeChapterPlan"("volumeId", "chapterOrder");
CREATE INDEX "VolumeChapterPlan_chapterId_idx" ON "VolumeChapterPlan"("chapterId");
CREATE UNIQUE INDEX "VolumeChapterPlan_volumeId_chapterOrder_key" ON "VolumeChapterPlan"("volumeId", "chapterOrder");
CREATE TABLE "new_WorldAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "worldId" TEXT,
    "novelWorldId" TEXT,
    "assetType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "generationPrompt" TEXT,
    "renderDataJson" TEXT,
    "thumbnailUrl" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'placeholder',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorldAsset_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorldAsset_novelWorldId_fkey" FOREIGN KEY ("novelWorldId") REFERENCES "NovelWorld" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_WorldAsset" ("assetType", "createdAt", "description", "generationPrompt", "id", "novelWorldId", "renderDataJson", "status", "thumbnailUrl", "title", "updatedAt", "version", "worldId") SELECT "assetType", "createdAt", "description", "generationPrompt", "id", "novelWorldId", "renderDataJson", "status", "thumbnailUrl", "title", "updatedAt", "version", "worldId" FROM "WorldAsset";
DROP TABLE "WorldAsset";
ALTER TABLE "new_WorldAsset" RENAME TO "WorldAsset";
CREATE INDEX "WorldAsset_worldId_assetType_idx" ON "WorldAsset"("worldId", "assetType");
CREATE INDEX "WorldAsset_novelWorldId_assetType_idx" ON "WorldAsset"("novelWorldId", "assetType");
CREATE INDEX "WorldAsset_assetType_idx" ON "WorldAsset"("assetType");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "PromptSlotOverride_promptId_idx" ON "PromptSlotOverride"("promptId");

-- CreateIndex
CREATE INDEX "PromptSlotOverride_novelId_promptId_idx" ON "PromptSlotOverride"("novelId", "promptId");

-- CreateIndex
CREATE UNIQUE INDEX "PromptSlotOverride_scope_novelId_promptId_key" ON "PromptSlotOverride"("scope", "novelId", "promptId");

-- CreateIndex
CREATE UNIQUE INDEX "WritingTechnique_key_key" ON "WritingTechnique"("key");

-- CreateIndex
CREATE INDEX "WritingTechnique_category_enabled_idx" ON "WritingTechnique"("category", "enabled");

-- CreateIndex
CREATE INDEX "WritingTechniqueProfileBinding_writingTechniqueId_idx" ON "WritingTechniqueProfileBinding"("writingTechniqueId");

-- CreateIndex
CREATE UNIQUE INDEX "WritingTechniqueProfileBinding_styleProfileId_writingTechniqueId_key" ON "WritingTechniqueProfileBinding"("styleProfileId", "writingTechniqueId");

-- CreateIndex
CREATE INDEX "WritingTechniqueNovelBinding_writingTechniqueId_idx" ON "WritingTechniqueNovelBinding"("writingTechniqueId");

-- CreateIndex
CREATE UNIQUE INDEX "WritingTechniqueNovelBinding_novelId_writingTechniqueId_key" ON "WritingTechniqueNovelBinding"("novelId", "writingTechniqueId");

-- CreateIndex
CREATE INDEX "OpenConflictCharacter_novelId_idx" ON "OpenConflictCharacter"("novelId");

-- CreateIndex
CREATE INDEX "OpenConflictCharacter_characterId_idx" ON "OpenConflictCharacter"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "OpenConflictCharacter_conflictId_characterId_key" ON "OpenConflictCharacter"("conflictId", "characterId");

-- CreateIndex
CREATE INDEX "CharacterResourceKnownBy_novelId_idx" ON "CharacterResourceKnownBy"("novelId");

-- CreateIndex
CREATE INDEX "CharacterResourceKnownBy_characterId_idx" ON "CharacterResourceKnownBy"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterResourceKnownBy_resourceId_characterId_key" ON "CharacterResourceKnownBy"("resourceId", "characterId");

-- CreateIndex
CREATE INDEX "StoryPlanIssue_novelId_idx" ON "StoryPlanIssue"("novelId");

-- CreateIndex
CREATE INDEX "StoryPlanIssue_issueId_idx" ON "StoryPlanIssue"("issueId");

-- CreateIndex
CREATE UNIQUE INDEX "StoryPlanIssue_planId_issueId_key" ON "StoryPlanIssue"("planId", "issueId");

-- CreateIndex
CREATE INDEX "StateVersionProposal_novelId_idx" ON "StateVersionProposal"("novelId");

-- CreateIndex
CREATE INDEX "StateVersionProposal_proposalId_idx" ON "StateVersionProposal"("proposalId");

-- CreateIndex
CREATE UNIQUE INDEX "StateVersionProposal_versionId_proposalId_key" ON "StateVersionProposal"("versionId", "proposalId");

-- CreateIndex
CREATE INDEX "TimelineEventEdge_novelId_idx" ON "TimelineEventEdge"("novelId");

-- CreateIndex
CREATE INDEX "TimelineEventEdge_sourceId_idx" ON "TimelineEventEdge"("sourceId");

-- CreateIndex
CREATE INDEX "TimelineEventEdge_targetId_idx" ON "TimelineEventEdge"("targetId");

-- CreateIndex
CREATE UNIQUE INDEX "TimelineEventEdge_sourceId_targetId_edgeType_key" ON "TimelineEventEdge"("sourceId", "targetId", "edgeType");

-- CreateIndex
CREATE INDEX "TimelineEventParticipant_novelId_idx" ON "TimelineEventParticipant"("novelId");

-- CreateIndex
CREATE UNIQUE INDEX "TimelineEventParticipant_eventId_characterId_key" ON "TimelineEventParticipant"("eventId", "characterId");

-- CreateIndex
CREATE INDEX "TimelineEventFaction_novelId_idx" ON "TimelineEventFaction"("novelId");

-- CreateIndex
CREATE UNIQUE INDEX "TimelineEventFaction_eventId_factionId_key" ON "TimelineEventFaction"("eventId", "factionId");

-- CreateIndex
CREATE INDEX "TimelineAnchorEventLink_novelId_idx" ON "TimelineAnchorEventLink"("novelId");

-- CreateIndex
CREATE UNIQUE INDEX "TimelineAnchorEventLink_anchorId_linkType_eventId_key" ON "TimelineAnchorEventLink"("anchorId", "linkType", "eventId");

-- CreateIndex
CREATE INDEX "TimelineHookEventLink_novelId_idx" ON "TimelineHookEventLink"("novelId");

-- CreateIndex
CREATE UNIQUE INDEX "TimelineHookEventLink_hookId_eventId_key" ON "TimelineHookEventLink"("hookId", "eventId");

-- CreateIndex
CREATE INDEX "TimelineHookParticipant_novelId_idx" ON "TimelineHookParticipant"("novelId");

-- CreateIndex
CREATE UNIQUE INDEX "TimelineHookParticipant_hookId_characterId_key" ON "TimelineHookParticipant"("hookId", "characterId");

-- CreateIndex
CREATE INDEX "TimelineConstraintLink_novelId_idx" ON "TimelineConstraintLink"("novelId");

-- CreateIndex
CREATE UNIQUE INDEX "TimelineConstraintLink_constraintId_refType_refId_key" ON "TimelineConstraintLink"("constraintId", "refType", "refId");

-- CreateIndex
CREATE INDEX "NovelFactEntry_novelId_chapterOrder_idx" ON "NovelFactEntry"("novelId", "chapterOrder");

-- CreateIndex
CREATE INDEX "NovelFactEntry_novelId_category_idx" ON "NovelFactEntry"("novelId", "category");

-- CreateIndex
CREATE INDEX "NovelRisk_novelId_status_idx" ON "NovelRisk"("novelId", "status");

-- CreateIndex
CREATE INDEX "NovelRisk_novelId_type_idx" ON "NovelRisk"("novelId", "type");

-- CreateIndex
CREATE INDEX "NovelRisk_chapterId_idx" ON "NovelRisk"("chapterId");

-- CreateIndex
CREATE INDEX "RiskAuditLog_riskId_idx" ON "RiskAuditLog"("riskId");

-- CreateIndex
CREATE INDEX "WorldForceRelation_worldId_idx" ON "WorldForceRelation"("worldId");

-- CreateIndex
CREATE UNIQUE INDEX "WorldForceRelation_worldId_sourceForceId_targetForceId_key" ON "WorldForceRelation"("worldId", "sourceForceId", "targetForceId");

-- CreateIndex
CREATE INDEX "WorldLocationControl_worldId_idx" ON "WorldLocationControl"("worldId");

-- CreateIndex
CREATE UNIQUE INDEX "WorldLocationControl_worldId_forceId_locationId_key" ON "WorldLocationControl"("worldId", "forceId", "locationId");

-- CreateIndex
CREATE INDEX "WorldLocationConnection_worldId_idx" ON "WorldLocationConnection"("worldId");

-- CreateIndex
CREATE UNIQUE INDEX "WorldLocationConnection_worldId_sourceLocationId_targetLocationId_key" ON "WorldLocationConnection"("worldId", "sourceLocationId", "targetLocationId");
