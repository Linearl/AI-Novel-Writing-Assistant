import { useCallback } from "react";
import { notificationService } from "../services/notification/index";
import type { NotificationEvent, NotificationEventType } from "../services/notification/types";

/**
 * React hook wrapping the notificationService.
 * Provides typed send methods and permission management for components.
 */
export function useNotification() {
  const requestPermission = useCallback(async () => {
    return notificationService.requestPermission();
  }, []);

  const sendEvent = useCallback((event: NotificationEvent) => {
    notificationService.sendEvent(event);
  }, []);

  const send = useCallback(
    (eventType: NotificationEventType, title: string, body: string, tag?: string) => {
      notificationService.send(eventType, title, body, tag);
    },
    [],
  );

  return {
    supported: notificationService.supported,
    permission: notificationService.permission,
    requestPermission,
    sendEvent,
    send,
    config: notificationService.getConfig(),
    updateConfig: notificationService.updateConfig,
    isInQuietHours: notificationService.isInQuietHours,
  };
}
