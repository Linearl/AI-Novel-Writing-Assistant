export type TaskStatus = "pending" | "running" | "completed" | "failed" | "paused" | "cancelled";

export type TaskType = "chapter_generation" | "character_setup" | "world_building" | "full_execution";

export interface TaskRecord {
  id: string;
  novelId: string;
  type: TaskType;
  status: TaskStatus;
  progress: number;
  params: Record<string, unknown>;
  result?: Record<string, unknown> | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  pausedAt?: string | null;
  cancelledAt?: string | null;
}

export interface TaskCheckpointData {
  id: string;
  taskId: string;
  stepIndex: number;
  data: Record<string, unknown>;
  createdAt: string;
}

export interface TaskFilter {
  status?: TaskStatus;
  type?: TaskType;
  limit?: number;
  offset?: number;
}

export interface TaskListResponse {
  items: TaskRecord[];
  total: number;
}

export type TaskEventType = "status_change" | "progress_update" | "error" | "checkpoint_saved";

export interface TaskEvent {
  taskId: string;
  eventType: TaskEventType;
  data: Partial<TaskRecord>;
  timestamp: string;
}

export interface SubmitTaskParams {
  novelId: string;
  type: TaskType;
  params: Record<string, unknown>;
}

// State machine valid transitions
export const STATE_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  pending: ["running", "cancelled"],
  running: ["completed", "failed", "paused", "cancelled"],
  completed: [],
  failed: [],
  paused: ["running", "cancelled"],
  cancelled: [],
};

export function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
  const allowed = STATE_TRANSITIONS[from];
  return allowed?.includes(to) ?? false;
}
