-- REQ-7056: Character Consistency — Database Migration
-- Creates three tables: CharacterConsistencyState, CharacterConsistencyContradiction, CharacterConsistencyScore

-- Character consistency state history (per-chapter character attribute tracking)
CREATE TABLE "CharacterConsistencyState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "chapterNumber" INTEGER NOT NULL,
    "appearance" TEXT NOT NULL DEFAULT '{}',
    "personality" TEXT NOT NULL DEFAULT '{}',
    "abilities" TEXT NOT NULL DEFAULT '{}',
    "relationships" TEXT NOT NULL DEFAULT '{}',
    "currentStatus" TEXT,
    "location" TEXT,
    "sourceChapter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CharacterConsistencyState_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CharacterConsistencyState_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Contradiction records
CREATE TABLE "CharacterConsistencyContradiction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelId" TEXT NOT NULL,
    "chapterNumber" INTEGER NOT NULL,
    "characterId" TEXT NOT NULL,
    "characterName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "existingState" TEXT,
    "newState" TEXT,
    "suggestion" TEXT,
    "confidence" REAL DEFAULT 0,
    "resolved" BOOLEAN NOT NULL DEFAULT FALSE,
    "resolvedNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CharacterConsistencyContradiction_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Consistency scores
CREATE TABLE "CharacterConsistencyScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelId" TEXT NOT NULL,
    "chapterNumber" INTEGER NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "appearanceScore" INTEGER,
    "personalityScore" INTEGER,
    "abilityScore" INTEGER,
    "relationshipScore" INTEGER,
    "contradictionCount" INTEGER NOT NULL DEFAULT 0,
    "hardCount" INTEGER NOT NULL DEFAULT 0,
    "softCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CharacterConsistencyScore_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Indexes
CREATE INDEX "CharacterConsistencyState_novelId_characterId_idx" ON "CharacterConsistencyState"("novelId", "characterId");
CREATE INDEX "CharacterConsistencyState_novelId_chapterNumber_idx" ON "CharacterConsistencyState"("novelId", "chapterNumber");
CREATE INDEX "CharacterConsistencyState_characterId_createdAt_idx" ON "CharacterConsistencyState"("characterId", "createdAt");

CREATE INDEX "CharacterConsistencyContradiction_novelId_chapterNumber_idx" ON "CharacterConsistencyContradiction"("novelId", "chapterNumber");
CREATE INDEX "CharacterConsistencyContradiction_novelId_severity_idx" ON "CharacterConsistencyContradiction"("novelId", "severity");
CREATE INDEX "CharacterConsistencyContradiction_characterId_idx" ON "CharacterConsistencyContradiction"("characterId");
CREATE INDEX "CharacterConsistencyContradiction_type_idx" ON "CharacterConsistencyContradiction"("type");

CREATE INDEX "CharacterConsistencyScore_novelId_chapterNumber_idx" ON "CharacterConsistencyScore"("novelId", "chapterNumber");
CREATE INDEX "CharacterConsistencyScore_novelId_createdAt_idx" ON "CharacterConsistencyScore"("novelId", "createdAt");
