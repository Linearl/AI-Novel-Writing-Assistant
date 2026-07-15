/** Notification permission states matching the Web Notifications API. */
export type NotificationPermissionState = "default" | "granted" | "denied";

/** Configuration for notification behavior, persisted to localStorage. */
export interface NotificationConfig {
  /** Global on/off switch. When false, no notifications are shown. */
  enabled: boolean;

  /** Per-event-type toggles for finer-grained control. */
  events: {
    taskCompleted: boolean;
    taskFailed: boolean;
    taskNeedsReview: boolean;
    qualityCheckResult: boolean;
  };

  /**
   * Optional time window during which notifications are suppressed.
   * Times are in 24-hour "HH:mm" format. When start > end, the range spans midnight.
   */
  quietHours?: {
    start: string;
    end: string;
  };
}

/** Known event types that can trigger a notification. */
export type NotificationEventType =
  | "taskCompleted"
  | "taskFailed"
  | "taskNeedsReview"
  | "qualityCheckResult";

/** Structured payload carried through the notification pipeline. */
export interface NotificationEvent {
  type: NotificationEventType;
  novelId: string;
  novelTitle: string;
  chapterNumber?: number;
  message: string;
  taskId: string;
}

// Runtime marker so the module survives --experimental-strip-types
// (which removes type-only exports, leaving an empty module).
export const __TYPES_MODULE__ = true;
