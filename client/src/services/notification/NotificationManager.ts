import type { NotificationConfig, NotificationPermissionState } from "./types";

const STORAGE_KEY = "ai_novel_notification_config";

const DEFAULT_CONFIG: NotificationConfig = {
  enabled: true,
  events: {
    taskCompleted: true,
    taskFailed: true,
    taskNeedsReview: false,
    qualityCheckResult: false,
  },
};

function loadConfig(): NotificationConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_CONFIG, events: { ...DEFAULT_CONFIG.events } };
    const parsed = JSON.parse(stored);
    return {
      enabled: parsed.enabled ?? DEFAULT_CONFIG.enabled,
      events: {
        taskCompleted: parsed.events?.taskCompleted ?? DEFAULT_CONFIG.events.taskCompleted,
        taskFailed: parsed.events?.taskFailed ?? DEFAULT_CONFIG.events.taskFailed,
        taskNeedsReview: parsed.events?.taskNeedsReview ?? DEFAULT_CONFIG.events.taskNeedsReview,
        qualityCheckResult: parsed.events?.qualityCheckResult ?? DEFAULT_CONFIG.events.qualityCheckResult,
      },
      quietHours: parsed.quietHours ?? undefined,
    };
  } catch {
    return { ...DEFAULT_CONFIG, events: { ...DEFAULT_CONFIG.events } };
  }
}

function saveConfig(config: NotificationConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function isBrowserSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * NotificationManager manages browser notification permissions, configuration,
 * and message dispatch. All notification logic is centralized here.
 */
export class NotificationManager {
  private permission: NotificationPermissionState;
  private config: NotificationConfig;

  constructor() {
    this.config = loadConfig();
    this.permission = isBrowserSupported()
      ? (Notification.permission as NotificationPermissionState)
      : "denied";
  }

  /** Returns whether the browser supports the Notifications API. */
  get supported(): boolean {
    return isBrowserSupported();
  }

  /** Current permission state. */
  get currentPermission(): NotificationPermissionState {
    return this.permission;
  }

  /** Request notification permission from the user. */
  async requestPermission(): Promise<NotificationPermissionState> {
    if (!isBrowserSupported()) {
      return "denied";
    }
    const result = await Notification.requestPermission();
    this.permission = result as NotificationPermissionState;
    return this.permission;
  }

  /**
   * Send a browser notification.
   * Respects global toggle, event-type toggle, quiet hours, and permission.
   * Fails silently if any check prevents sending.
   */
  send(
    eventType: NotificationConfig["events"] extends Record<infer K, boolean> ? K : string,
    title: string,
    body: string,
    options?: { tag?: string; data?: Record<string, string> },
  ): void {
    // Guard: browser support
    if (!isBrowserSupported()) {
      return;
    }

    // Guard: permission
    if (this.permission !== "granted") {
      return;
    }

    // Guard: global toggle
    if (!this.config.enabled) {
      return;
    }

    // Guard: event-type toggle
    const eventKey = eventType as keyof typeof this.config.events;
    if (this.config.events[eventKey] === false) {
      return;
    }

    // Guard: quiet hours
    if (this.isInQuietHours()) {
      return;
    }

    try {
      const notification = new Notification(title, {
        body,
        icon: "/logo.png",
        tag: options?.tag,
        data: options?.data,
      });

      notification.onclick = () => {
        window.focus();
        if (options?.data?.url) {
          window.location.href = options.data.url;
        }
        notification.close();
      };
    } catch {
      // Silently fail — notification failure should not disrupt the app
    }
  }

  /** Check if the current time falls within configured quiet hours. */
  isInQuietHours(): boolean {
    const quietHours = this.config.quietHours;
    if (!quietHours) {
      return false;
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = quietHours.start.split(":").map(Number);
    const [endHour, endMin] = quietHours.end.split(":").map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (startMinutes <= endMinutes) {
      // Same-day range, e.g. 22:00 - 23:59
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }

    // Overnight range, e.g. 22:00 - 08:00 (spans midnight)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  /** Get a copy of the current notification config. */
  getConfig(): Readonly<NotificationConfig> {
    return { ...this.config, events: { ...this.config.events } };
  }

  /** Update notification config and persist. */
  updateConfig(patch: Partial<NotificationConfig>): NotificationConfig {
    this.config = {
      ...this.config,
      ...patch,
      events: patch.events
        ? { ...this.config.events, ...patch.events }
        : this.config.events,
    };
    // Handle quietHours explicitly: "quietHours" in patch means caller
    // explicitly set it — even to undefined (clearing it).
    if ("quietHours" in patch) {
      this.config.quietHours = patch.quietHours
        ? { ...patch.quietHours }
        : undefined;
    }
    saveConfig(this.config);
    return this.getConfig();
  }
}

/** Singleton instance used across the client app. */
export const notificationManager = new NotificationManager();
