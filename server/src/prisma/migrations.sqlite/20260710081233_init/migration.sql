-- CreateTable
CREATE TABLE "AtmosphereCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "filePath" TEXT NOT NULL,
    "applicableEmotions" TEXT NOT NULL DEFAULT '[]',
    "triggerKeywords" TEXT NOT NULL DEFAULT '[]',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AtmosphereCard_key_key" ON "AtmosphereCard"("key");

-- CreateIndex
CREATE INDEX "AtmosphereCard_category_enabled_idx" ON "AtmosphereCard"("category", "enabled");
