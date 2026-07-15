import type { NotificationEvent, NotificationEventType } from "./types";

/** Renders a notification event into title + body strings for display. */
export type NotificationTemplate = (
  event: NotificationEvent,
) => { title: string; body: string };

/**
 * Registry of notification content templates keyed by event type.
 * Each template receives a NotificationEvent and returns user-facing
 * title and body strings following the project's UI-copy rules.
 */
export const NOTIFICATION_TEMPLATES: Record<NotificationEventType, NotificationTemplate> = {
  taskCompleted: (event: NotificationEvent) => ({
    title: `${event.novelTitle} 生成完成`,
    body: event.chapterNumber
      ? `第${event.chapterNumber}章已生成完成，点击查看`
      : "任务已完成，点击查看",
  }),

  taskFailed: (event: NotificationEvent) => ({
    title: `${event.novelTitle} 生成失败`,
    body: event.chapterNumber
      ? `第${event.chapterNumber}章生成失败：${event.message}`
      : `任务执行失败：${event.message}`,
  }),

  taskNeedsReview: (event: NotificationEvent) => ({
    title: `${event.novelTitle} 等待审核`,
    body: event.chapterNumber
      ? `第${event.chapterNumber}章等待人工审核`
      : "任务等待人工审核",
  }),

  qualityCheckResult: (event: NotificationEvent) => ({
    title: `${event.novelTitle} 质量检查完成`,
    body: event.message,
  }),
};
