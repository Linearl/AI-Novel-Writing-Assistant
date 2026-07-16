import { useEffect, useRef, useCallback } from "react";
import type { UnifiedTaskDetail } from "@ai-novel/shared";
import { notificationService } from "@/services/notification";
import type { NotificationEventType } from "@/services/notification/types";
import { toast } from "@/components/ui/toast";

/**
 * Polling interval (ms) when the page is visible.
 * Matches the requirement of 15-second polling for active director tasks.
 */
const VISIBLE_POLL_INTERVAL = 15_000;

/**
 * Reduced polling interval (ms) when the page is hidden (tab switched away).
 * Requirement: reduce polling frequency when page is not visible.
 */
const HIDDEN_POLL_INTERVAL = 60_000;

/**
 * Statuses that indicate the auto-director task is actively executing.
 * Only tasks in these states are monitored for changes.
 */
const ACTIVE_STATUSES = new Set(["queued", "running", "waiting_approval"]);

/**
 * Maps a task status to the appropriate notification event type for state transitions.
 */
function resolveNotificationEvent(
  prevStatus: string | undefined,
  nextStatus: string,
): NotificationEventType | null {
  // running → waiting_approval = paused / needs attention
  if (
    prevStatus === "running" &&
    nextStatus === "waiting_approval"
  ) {
    return "directorPaused";
  }

  // waiting_approval → running = resumed
  if (
    prevStatus === "waiting_approval" &&
    nextStatus === "running"
  ) {
    return "directorResumed";
  }

  // Any active status → succeeded = task completed
  if (
    nextStatus === "succeeded" &&
    prevStatus &&
    ACTIVE_STATUSES.has(prevStatus)
  ) {
    return "taskCompleted";
  }

  // Any active status → failed = task failed
  if (
    nextStatus === "failed" &&
    prevStatus &&
    ACTIVE_STATUSES.has(prevStatus)
  ) {
    return "taskFailed";
  }

  return null;
}

/**
 * Creates a human-readable message for the notification based on the event type
 * and task context.
 */
function resolveNotificationMessage(
  eventType: NotificationEventType,
  task: UnifiedTaskDetail,
  novelTitle: string,
): string {
  const taskTitle = task.title?.trim() || novelTitle || "当前项目";

  switch (eventType) {
    case "directorPaused": {
      const reason = task.checkpointType === "candidate_selection_required"
        ? "需要选择候选方案"
        : task.currentItemLabel?.trim()
          ? `等待处理：${task.currentItemLabel}`
          : "需要手动处理";
      return `《${taskTitle}》自动导演已暂停 — ${reason}`;
    }
    case "directorResumed": {
      const label = task.currentItemLabel?.trim()
        ? `当前步骤：${task.currentItemLabel}`
        : "任务已恢复执行";
      return `《${taskTitle}》自动导演已恢复 — ${label}`;
    }
    case "taskCompleted":
      return `《${taskTitle}》自动导演任务已完成`;
    case "taskFailed": {
      const err = task.lastError?.trim() || "任务执行失败";
      return `《${taskTitle}》自动导演任务失败 — ${err}`;
    }
    default:
      return "";
  }
}

export interface UseAutoDirectorNotificationsInput {
  /** The current active director task (from polling query). */
  task: UnifiedTaskDetail | null;
  /** The novel ID for building notification data. */
  novelId: string;
  /** The novel title for notification display. */
  novelTitle: string;
}

/**
 * React hook that monitors auto-director task status changes and triggers
 * desktop notifications (or in-page toast fallback).
 *
 * Features:
 * - 15-second polling when page is visible, reduced to 60s when hidden
 * - Detects pause/resume/complete/fail transitions
 * - Uses NotificationManager for desktop notifications (with config gates)
 * - Falls back to toast when Notification API is unsupported
 * - Respects visibilitychange for frequency adjustment
 */
export function useAutoDirectorNotifications({
  task,
  novelId,
  novelTitle,
}: UseAutoDirectorNotificationsInput) {
  const prevStatusRef = useRef<string | undefined>(undefined);
  const notifiedTransitionRef = useRef<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Detect state transitions and send notifications
  const checkAndNotify = useCallback(
    (currentTask: UnifiedTaskDetail | null) => {
      if (!currentTask) return;

      const nextStatus = currentTask.status;
      const currentKey = `${currentTask.id}:${currentTask.status}`;

      // Skip if we've already notified for this exact state
      if (currentKey === notifiedTransitionRef.current) return;

      const prevStatus = prevStatusRef.current;
      const eventType = resolveNotificationEvent(prevStatus, nextStatus);

      if (eventType) {
        const message = resolveNotificationMessage(eventType, currentTask, novelTitle);

        if (notificationService.supported) {
          // Try desktop notification first
          notificationService.send(eventType, eventType === "directorPaused" ? "自动导演暂停" : eventType === "directorResumed" ? "自动导演恢复" : eventType === "taskCompleted" ? "任务完成" : "任务失败", message, currentTask.id);
        } else {
          // Fallback to toast
          switch (eventType) {
            case "directorPaused":
              toast.warning(message);
              break;
            case "directorResumed":
              toast.info(message);
              break;
            case "taskCompleted":
              toast.success(message);
              break;
            case "taskFailed":
              toast.error(message);
              break;
          }
        }

        notifiedTransitionRef.current = currentKey;
      }

      prevStatusRef.current = nextStatus;
    },
    [novelTitle],
  );

  // Reactively detect transitions whenever task prop changes.
  // Parent (NovelEdit) polls at 4s for active tasks, this effect
  // detects state transitions between consecutive updates.
  useEffect(() => {
    checkAndNotify(task);
  }, [task, checkAndNotify]);

  // Reset prevStatus when task ID changes (new task)
  useEffect(() => {
    if (task) {
      // First time seeing this task, seed prevStatus
      if (prevStatusRef.current === undefined || `${task.id}:${task.status}` !== `${task.id}:${prevStatusRef.current}`) {
        notifiedTransitionRef.current = `${task.id}:${task.status}`;
        prevStatusRef.current = task.status;
      }
    } else {
      prevStatusRef.current = undefined;
      notifiedTransitionRef.current = null;
    }
  }, [task?.id]);

  // Separate 15-second polling when page is visible, 60s when hidden.
  // This is a secondary safety net in case the React Query 4s refresh
  // is throttled by the browser when the tab is in the background.
  useEffect(() => {
    let interval = VISIBLE_POLL_INTERVAL;

    const updateInterval = () => {
      const next = document.visibilityState === "visible" ? VISIBLE_POLL_INTERVAL : HIDDEN_POLL_INTERVAL;
      if (interval !== next) {
        interval = next;
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = setInterval(() => checkAndNotify(task), interval);
        }
      }
    };

    const handleVisibilityChange = () => {
      updateInterval();
      // When page becomes visible, trigger an immediate check
      if (document.visibilityState === "visible" && task) {
        checkAndNotify(task);
      }
    };

    // Start polling timer
    pollTimerRef.current = setInterval(() => checkAndNotify(task), interval);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [task, checkAndNotify]);
}
