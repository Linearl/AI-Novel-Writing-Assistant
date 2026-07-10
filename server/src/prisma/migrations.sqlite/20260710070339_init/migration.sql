-- CreateTable
CREATE TABLE "VocabularyRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "matchType" TEXT NOT NULL DEFAULT 'word',
    "category" TEXT NOT NULL,
    "weight" REAL NOT NULL DEFAULT 0.5,
    "suggestions" TEXT NOT NULL DEFAULT '[]',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "VocabularyRule_key_key" ON "VocabularyRule"("key");

-- CreateIndex
CREATE INDEX "VocabularyRule_category_enabled_idx" ON "VocabularyRule"("category", "enabled");

-- CreateIndex
CREATE INDEX "VocabularyRule_weight_idx" ON "VocabularyRule"("weight");
