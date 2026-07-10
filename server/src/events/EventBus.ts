import { logger } from "../services/logging/LoggerService";

import type { NovelEvent, NovelEventType, EventHandler } from "./types";

interface HandlerEntry {
  handler: EventHandler;
  priority: number;
}

function summarizePayload(event: NovelEvent): string {
  switch (event.type) {
    case "chapter:updated":
      return `novelId=${event.payload.novelId} chapterId=${event.payload.chapterId} order=${event.payload.chapterOrder}`;
    case "chapter:reviewed":
      return `novelId=${event.payload.novelId} chapterId=${event.payload.chapterId} score=${event.payload.qualityScore ?? "n/a"}`;
    case "character:changed":
      return `novelId=${event.payload.novelId} characterId=${event.payload.characterId}`;
    case "volume:updated":
      return `novelId=${event.payload.novelId} reason=${event.payload.reason}`;
    case "world:updated":
      return `worldId=${event.payload.worldId}`;
    case "outline:revised":
      return `novelId=${event.payload.novelId} stage=${event.payload.stage}`;
    case "pipeline:completed":
      return `novelId=${event.payload.novelId} jobId=${event.payload.jobId} status=${event.payload.status}`;
    default:
      return JSON.stringify(event);
  }
}

/**
 * 跨模块事件广播总线。
 *
 * 职责：在 Director 子系统之外的模块间传递事件（如章节更新、角色变更、流水线完成等）。
 * 不用于 Director 内部状态持久化或状态投影——Director 内部使用 {@link DirectorEventProjectionService}。
 */
export class EventBus {
  private handlers = new Map<NovelEventType, HandlerEntry[]>();

  on<T extends NovelEvent>(eventType: T["type"], handler: EventHandler<T>, priority = 0): void {
    const list = this.handlers.get(eventType) ?? [];
    list.push({ handler: handler as EventHandler, priority });
    list.sort((a, b) => a.priority - b.priority);
    this.handlers.set(eventType, list);
  }

  off(eventType: NovelEventType, handler: EventHandler): void {
    const list = this.handlers.get(eventType) ?? [];
    const next = list.filter((e) => e.handler !== handler);
    if (next.length > 0) this.handlers.set(eventType, next);
    else this.handlers.delete(eventType);
  }

  async emit(event: NovelEvent): Promise<void> {
    const list = this.handlers.get(event.type) ?? [];
    for (const { handler } of list) {
      try {
        await handler(event);
      } catch (err) {
        const handlerLabel = handler.name || "anonymous";
        logger.error(`[EventBus] handler "${handlerLabel}" failed for ${event.type}`, {
          eventType: event.type,
          payload: summarizePayload(event),
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        });
      }
    }
  }
}

export const novelEventBus = new EventBus();
