import { novelEventBus, type EventBus } from "../../../events/EventBus";
import type { NovelEvent } from "../../../events/types";

/**
 * Director 内部事件标识。
 * 与 DirectorEventProjectionService 中的 DirectorEvent.type 保持对齐，
 * 但此处仅覆盖需要桥接到 EventBus 全局广播的子集。
 */
export type DirectorInternalEventType =
  | "chapter_updated"
  | "chapter_reviewed"
  | "character_changed"
  | "volume_updated"
  | "world_updated"
  | "outline_revised"
  | "pipeline_completed";

/** Director 事件的最小公共载荷。各字段按需填入，Bridge 负责映射。 */
export interface DirectorInternalEventPayload {
  novelId: string;
  chapterId?: string;
  chapterOrder?: number;
  qualityScore?: number;
  characterId?: string;
  worldId?: string;
  stage?: "outline" | "structured_outline";
  jobId?: string;
  status?: string;
  reason?: string;
}

interface BridgeMappingEntry {
  eventType: DirectorInternalEventType;
  mapToNovelEvent: (payload: DirectorInternalEventPayload) => NovelEvent | null;
}

/**
 * Director 内部事件 → NovelEvent 映射规则。
 * 不在此列表中的 Director 事件不会升级为全局事件。
 */
const BRIDGE_MAP: Record<DirectorInternalEventType, BridgeMappingEntry> = {
  chapter_updated: {
    eventType: "chapter_updated",
    mapToNovelEvent: (p) =>
      p.chapterId && p.chapterOrder != null
        ? { type: "chapter:updated", payload: { novelId: p.novelId, chapterId: p.chapterId, chapterOrder: p.chapterOrder } }
        : null,
  },
  chapter_reviewed: {
    eventType: "chapter_reviewed",
    mapToNovelEvent: (p) =>
      p.chapterId
        ? { type: "chapter:reviewed", payload: { novelId: p.novelId, chapterId: p.chapterId, qualityScore: p.qualityScore } }
        : null,
  },
  character_changed: {
    eventType: "character_changed",
    mapToNovelEvent: (p) =>
      p.characterId
        ? { type: "character:changed", payload: { novelId: p.novelId, characterId: p.characterId } }
        : null,
  },
  volume_updated: {
    eventType: "volume_updated",
    mapToNovelEvent: (p) =>
      p.reason
        ? { type: "volume:updated", payload: { novelId: p.novelId, reason: p.reason as NovelEvent extends { type: "volume:updated"; payload: { reason: infer R } } ? R : never } }
        : null,
  },
  world_updated: {
    eventType: "world_updated",
    mapToNovelEvent: (p) =>
      p.worldId
        ? { type: "world:updated", payload: { worldId: p.worldId } }
        : null,
  },
  outline_revised: {
    eventType: "outline_revised",
    mapToNovelEvent: (p) =>
      p.stage
        ? { type: "outline:revised", payload: { novelId: p.novelId, stage: p.stage } }
        : null,
  },
  pipeline_completed: {
    eventType: "pipeline_completed",
    mapToNovelEvent: (p) =>
      p.jobId && p.status
        ? { type: "pipeline:completed", payload: { novelId: p.novelId, jobId: p.jobId, status: p.status } }
        : null,
  },
};

/**
 * Director 事件桥接层。
 *
 * 职责：将 Director 子系统内部事件选择性升级为全局 EventBus 广播。
 * - Director 内部事件优先由 DirectorEventProjectionService 消费，用于状态投影。
 * - 需要通知外部模块（如 workflow 副作用、UI 更新）的事件，通过此 Bridge 升级为 NovelEvent 并广播。
 *
 * 使用方式：
 * ```ts
 * const bridge = new DirectorEventBridge();
 * bridge.emitAndMaybeBroadcast("chapter_updated", { novelId, chapterId, chapterOrder });
 * ```
 */
export class DirectorEventBridge {
  private readonly bus: EventBus;

  constructor(bus: EventBus = novelEventBus) {
    this.bus = bus;
  }

  /**
   * 尝试将 Director 内部事件升级为全局 NovelEvent 并广播。
   *
   * @returns 映射成功并广播时返回 true；事件不在映射表或载荷不完整时静默跳过并返回 false。
   */
  emitAndMaybeBroadcast(
    eventType: DirectorInternalEventType,
    payload: DirectorInternalEventPayload,
  ): boolean {
    const mapping = BRIDGE_MAP[eventType];
    if (!mapping) {
      return false;
    }
    const novelEvent = mapping.mapToNovelEvent(payload);
    if (!novelEvent) {
      return false;
    }
    // fire-and-forget；EventBus.emit 内部已捕获异常
    void this.bus.emit(novelEvent);
    return true;
  }
}
