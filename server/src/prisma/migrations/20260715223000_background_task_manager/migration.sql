-- REQ-7052: Background Task Manager
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    CONSTRAINT "BackgroundTask_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create task_checkpoints table
CREATE TABLE "TaskCheckpoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "data" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskCheckpoint_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "BackgroundTask"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Indexes
CREATE INDEX "BackgroundTask_novelId_status_updatedAt_idx" ON "BackgroundTask"("novelId", "status", "updatedAt");
CREATE INDEX "BackgroundTask_status_updatedAt_idx" ON "BackgroundTask"("status", "updatedAt");
CREATE INDEX "TaskCheckpoint_taskId_stepIndex_idx" ON "TaskCheckpoint"("taskId", "stepIndex");
