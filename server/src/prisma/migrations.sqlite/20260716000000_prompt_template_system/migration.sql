-- CreateTable
CREATE TABLE "PromptTemplateOverride" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scope" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "basePromptVersion" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'official',
    "activeVersionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PromptTemplateVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "overrideId" TEXT NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "templateJson" TEXT NOT NULL,
    "contextRefsJson" TEXT NOT NULL,
    "compiledHash" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PromptTemplateVersion_overrideId_fkey" FOREIGN KEY ("overrideId") REFERENCES "PromptTemplateOverride" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PromptTemplateOverride_scope_novelId_promptId_key" ON "PromptTemplateOverride"("scope", "novelId", "promptId");

-- CreateIndex
CREATE INDEX "PromptTemplateOverride_novelId_idx" ON "PromptTemplateOverride"("novelId");

-- CreateIndex
CREATE INDEX "PromptTemplateVersion_overrideId_versionNo_idx" ON "PromptTemplateVersion"("overrideId", "versionNo");
