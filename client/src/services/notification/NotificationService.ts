import type { NotificationConfig, NotificationEvent, NotificationEventType } from "./types";
import { NOTIFICATION_TEMPLATES } from "./templates.ts";
import { notificationManager } from "./NotificationManager.ts";

/**
 * High-level notification service that wraps NotificationManager with template
 * rendering and event-type dispatch. This is the primary entry point for
 * application code that wants to trigger notifications.
 */
export const notificationService = {
  /** Request browser notification permission. Call once on user gesture. */
  requestPermission: () => notificationManager.requestPermission(),

  /**
   * Send a notification using a typed event. Templates provide automatic
   * title/body rendering from the event payload.
   */
  sendEvent(event: NotificationEvent): void {
    const template = NOTIFICATION_TEMPLATES[event.type];
    if (!template) return;

    const { title, body } = template(event);
    notificationManager.send(event.type, title, body, {
      tag: event.taskId,
      data: {
        url: event.novelId ? `/novels/${event.novelId}/edit` : "",
        taskId: event.taskId,
      },
    });
  },

  /**
   * Send a raw notification bypassing templates. Use sparingly when the
   * event type is known but no structured NotificationEvent is available.
   */
  send(
    eventType: NotificationEventType,
    title: string,
    body: string,
    tag?: string,
  ): void {
    notificationManager.send(eventType, title, body, { tag });
  },

  /** Whether the browser supports notifications. */
  get supported(): boolean {
    return notificationManager.supported;
  },

  /** Current notification permission state. */
  get permission() {
    return notificationManager.currentPermission;
  },

  /** Get the current notification config (readonly copy). */
  getConfig: () => notificationManager.getConfig(),

  /** Update notification config and persist. */
  updateConfig: (patch: Partial<NotificationConfig>) =>
    notificationManager.updateConfig(patch),

  /** Check whether quiet hours are currently active. */
  isInQuietHours: () => notificationManager.isInQuietHours(),
};
