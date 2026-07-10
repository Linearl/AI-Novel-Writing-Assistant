import type {
  DirectorStepRun,
  DirectorEvent,
} from "@ai-novel/shared";

/**
 * Projection 纯工具函数。
 *
 * 纯数据操作、无领域副作用的工具函数，供 DirectorEventProjectionService 和
 * DirectorEventProjectionHelpers 共用。
 */

export function timestampOf(value?: string | null): number {
  if (!value) {
    return 0;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function latestStep(steps: DirectorStepRun[]): DirectorStepRun | null {
  return steps.reduce<DirectorStepRun | null>((latest, step) => {
    if (!latest) {
      return step;
    }
    const stepTime = Math.max(timestampOf(step.finishedAt), timestampOf(step.startedAt));
    const latestTime = Math.max(timestampOf(latest.finishedAt), timestampOf(latest.startedAt));
    return stepTime >= latestTime ? step : latest;
  }, null);
}

export function latestEvent(events: DirectorEvent[]): DirectorEvent | null {
  return events.reduce<DirectorEvent | null>((latest, event) => {
    if (!latest) {
      return event;
    }
    return timestampOf(event.occurredAt) >= timestampOf(latest.occurredAt) ? event : latest;
  }, null);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function readFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function readNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
