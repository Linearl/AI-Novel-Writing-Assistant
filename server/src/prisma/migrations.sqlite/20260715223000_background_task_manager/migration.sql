-- REQ-7052: Background Task Manager (SQLite)
-- Create background_tasks table
CREATE TABLE "BackgroundTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "params" TEXT NOT NULL DEFAULT '{}',
    "result" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "pausedAt" DATETIME,
    "cancelledAt" DATETIME,
    FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create task_checkpoints table
CREATE TABLE "TaskCheckpoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "data" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("taskId") REFERENCES "BackgroundTask"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Indexes
CREATE INDEX "BackgroundTask_novelId_status_updatedAt_idx" ON "BackgroundTask"("novelId", "status", "updatedAt");
CREATE INDEX "BackgroundTask_status_updatedAt_idx" ON "BackgroundTask"("status", "updatedAt");
CREATE INDEX "TaskCheckpoint_taskId_stepIndex_idx" ON "TaskCheckpoint"("taskId", "stepIndex");
