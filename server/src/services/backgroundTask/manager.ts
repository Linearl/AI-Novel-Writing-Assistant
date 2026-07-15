import type {
  TaskRecord,
  TaskStatus,
  TaskType,
  TaskFilter,
  TaskListResponse,
  TaskCheckpointData,
  TaskEvent,
} from "./types.js";
import { isValidTransition } from "./types.js";
import { taskSSEManager } from "./sseManager.js";
import { prisma } from "../../db/prisma.js";
import { logger } from "../logging/LoggerService.js";

// Timestamp for the migration file
const MIGRATION_TIMESTAMP = "20260715223000_background_task_manager";

function recordToExternal(record: {
  id: string;
  novelId: string;
  type: string;
  status: string;
  progress: number;
  params: string;
  result: string | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  pausedAt: Date | null;
  cancelledAt: Date | null;
}): TaskRecord {
  return {
    id: record.id,
    novelId: record.novelId,
    type: record.type as TaskType,
    status: record.status as TaskStatus,
    progress: record.progress,
    params: safeJsonParse(record.params),
    result: record.result ? safeJsonParse(record.result) : null,
    error: record.error ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    startedAt: record.startedAt?.toISOString() ?? null,
    completedAt: record.completedAt?.toISOString() ?? null,
    pausedAt: record.pausedAt?.toISOString() ?? null,
    cancelledAt: record.cancelledAt?.toISOString() ?? null,
  };
}

function checkpointToExternal(record: {
  id: string;
  taskId: string;
  stepIndex: number;
  data: string;
  createdAt: Date;
}): TaskCheckpointData {
  return {
    id: record.id,
    taskId: record.taskId,
    stepIndex: record.stepIndex,
    data: safeJsonParse(record.data),
    createdAt: record.createdAt.toISOString(),
  };
}

function safeJsonParse(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function buildTaskEvent(task: TaskRecord, eventType: TaskEvent["eventType"]): TaskEvent {
  return {
    taskId: task.id,
    eventType,
    data: task,
    timestamp: new Date().toISOString(),
  };
}

export class BackgroundTaskManager {
  private readonly maxConcurrentPerNovel = 5;
  private runningTaskIds: Set<string> = new Set();

  private getRunningCount(novelId: string): number {
    let count = 0;
    for (const id of this.runningTaskIds) {
      // Simple counting: we count all running tasks for the same novel
      // This is checked against the DB for accuracy
    }
    return count;
  }

  async submit(novelId: string, type: TaskType, params: Record<string, unknown>): Promise<TaskRecord> {
    // Check concurrent task limit
    const runningCount = await prisma.backgroundTask.count({
      where: {
        novelId,
        status: { in: ["pending", "running", "paused"] },
      },
    });

    if (runningCount >= this.maxConcurrentPerNovel) {
      throw new Error(`项目下并发任务已达上限（${this.maxConcurrentPerNovel}个），请等待现有任务完成后再提交`);
    }

    const record = await prisma.backgroundTask.create({
      data: {
        novelId,
        type,
        status: "pending",
        progress: 0,
        params: JSON.stringify(params),
      },
    });

    logger.info("[BackgroundTask] Task submitted", {
      taskId: record.id,
      novelId,
      type,
    });

    const task = recordToExternal(record);

    // Broadcast status change
    taskSSEManager.broadcastToTask(task.id, buildTaskEvent(task, "status_change"));
    taskSSEManager.broadcastToNovel(task.novelId, buildTaskEvent(task, "status_change"));

    return task;
  }

  async getStatus(taskId: string): Promise<TaskRecord | null> {
    const record = await prisma.backgroundTask.findUnique({
      where: { id: taskId },
    });

    if (!record) return null;
    return recordToExternal(record);
  }

  async listByNovel(novelId: string, filter?: TaskFilter): Promise<TaskListResponse> {
    const where: Record<string, unknown> = { novelId };

    if (filter?.status) {
      where.status = filter.status;
    }
    if (filter?.type) {
      where.type = filter.type;
    }

    const [items, total] = await Promise.all([
      prisma.backgroundTask.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: filter?.limit ?? 50,
        skip: filter?.offset ?? 0,
      }),
      prisma.backgroundTask.count({ where }),
    ]);

    return {
      items: items.map(recordToExternal),
      total,
    };
  }

  async updateStatus(taskId: string, status: TaskStatus, extra?: Partial<Pick<TaskRecord, "progress" | "error" | "result">>): Promise<TaskRecord> {
    const current = await prisma.backgroundTask.findUnique({
      where: { id: taskId },
    });

    if (!current) {
      throw new Error(`任务不存在: ${taskId}`);
    }

    const currentStatus = current.status as TaskStatus;
    if (!isValidTransition(currentStatus, status)) {
      throw new Error(`状态转换无效: ${currentStatus} -> ${status}`);
    }

    const now = new Date();
    const data: Record<string, unknown> = {
      status,
      updatedAt: now,
    };

    if (status === "running" && !current.startedAt) {
      data.startedAt = now;
    }
    if (status === "completed" || status === "failed") {
      data.completedAt = now;
    }
    if (status === "paused") {
      data.pausedAt = now;
    }
    if (status === "cancelled") {
      data.cancelledAt = now;
    }
    if (extra?.progress !== undefined) {
      data.progress = extra.progress;
    }
    if (extra?.error !== undefined) {
      data.error = extra.error;
    }
    if (extra?.result !== undefined) {
      data.result = JSON.stringify(extra.result);
    }

    const updated = await prisma.backgroundTask.update({
      where: { id: taskId },
      data,
    });

    // Track running tasks
    if (status === "running") {
      this.runningTaskIds.add(taskId);
    } else if (["completed", "failed", "cancelled"].includes(status)) {
      this.runningTaskIds.delete(taskId);
    }

    logger.info("[BackgroundTask] Status updated", {
      taskId,
      from: currentStatus,
      to: status,
    });

    const task = recordToExternal(updated);

    // Broadcast status change
    taskSSEManager.broadcastToTask(task.id, buildTaskEvent(task, "status_change"));
    taskSSEManager.broadcastToNovel(task.novelId, buildTaskEvent(task, "status_change"));

    return task;
  }

  async updateProgress(taskId: string, progress: number): Promise<TaskRecord> {
    const updated = await prisma.backgroundTask.update({
      where: { id: taskId },
      data: {
        progress: Math.max(0, Math.min(100, progress)),
        updatedAt: new Date(),
      },
    });

    const task = recordToExternal(updated);
    taskSSEManager.broadcastToTask(task.id, buildTaskEvent(task, "progress_update"));
    taskSSEManager.broadcastToNovel(task.novelId, buildTaskEvent(task, "progress_update"));

    return task;
  }

  async pause(taskId: string): Promise<TaskRecord> {
    const current = await this.getStatus(taskId);
    if (!current) {
      throw new Error(`任务不存在: ${taskId}`);
    }

    if (current.status !== "running") {
      throw new Error(`只有运行中的任务可以暂停，当前状态: ${current.status}`);
    }

    return this.updateStatus(taskId, "paused");
  }

  async resume(taskId: string): Promise<TaskRecord> {
    const current = await this.getStatus(taskId);
    if (!current) {
      throw new Error(`任务不存在: ${taskId}`);
    }

    if (current.status !== "paused") {
      throw new Error(`只有已暂停的任务可以恢复，当前状态: ${current.status}`);
    }

    return this.updateStatus(taskId, "running");
  }

  async cancel(taskId: string): Promise<TaskRecord> {
    const current = await this.getStatus(taskId);
    if (!current) {
      throw new Error(`任务不存在: ${taskId}`);
    }

    if (!["running", "paused", "pending"].includes(current.status)) {
      throw new Error(`无法取消当前状态的任务: ${current.status}`);
    }

    const result = await this.updateStatus(taskId, "cancelled");
    this.runningTaskIds.delete(taskId);

    return result;
  }

  // Checkpoint management
  async saveCheckpoint(taskId: string, stepIndex: number, data: Record<string, unknown>): Promise<TaskCheckpointData> {
    const record = await prisma.taskCheckpoint.create({
      data: {
        taskId,
        stepIndex,
        data: JSON.stringify(data),
      },
    });

    return checkpointToExternal(record);
  }

  async getLatestCheckpoint(taskId: string): Promise<TaskCheckpointData | null> {
    const record = await prisma.taskCheckpoint.findFirst({
      where: { taskId },
      orderBy: { stepIndex: "desc" },
    });

    if (!record) return null;
    return checkpointToExternal(record);
  }

  async listCheckpoints(taskId: string): Promise<TaskCheckpointData[]> {
    const records = await prisma.taskCheckpoint.findMany({
      where: { taskId },
      orderBy: { stepIndex: "asc" },
    });

    return records.map(checkpointToExternal);
  }
}

export const backgroundTaskManager = new BackgroundTaskManager();
