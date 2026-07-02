import { EventEmitter } from "node:events";
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import type { TaskType } from "./modelRouter";
import type { PromptInvocationMeta } from "../prompting/core/promptTypes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LlmOperationStatus = "pending" | "running" | "completed" | "failed";

export interface LlmOperationSnapshot {
  requestId: string;
  method: "invoke" | "stream" | "batch";
  provider: LLMProvider;
  model: string;
  taskType?: TaskType;
  promptId?: string;
  promptVersion?: string;
  novelId?: string;
  chapterId?: string;
  stage?: string;
  status: LlmOperationStatus;
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_ACTIVE = 32;
const MAX_HISTORY = 128;
const HISTORY_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// Singleton state
// ---------------------------------------------------------------------------

const active = new Map<string, LlmOperationSnapshot>();
const history: LlmOperationSnapshot[] = [];
const emitter = new EventEmitter();
emitter.setMaxListeners(64);

// ---------------------------------------------------------------------------
// Pruning
// ---------------------------------------------------------------------------

function pruneHistory(): void {
  const cutoff = Date.now() - HISTORY_TTL_MS;
  while (history.length > 0 && (history[0].completedAt ?? history[0].startedAt) < cutoff) {
    history.shift();
  }
}

function pruneActive(): void {
  // Force-complete operations stuck for >10 minutes
  const stale = Date.now() - 10 * 60 * 1000;
  for (const [id, op] of active) {
    if (op.startedAt < stale) {
      op.status = "failed";
      op.completedAt = Date.now();
      op.durationMs = op.completedAt - op.startedAt;
      op.error = "Operation timed out (tracker TTL)";
      moveToHistory(op);
      active.delete(id);
    }
  }
}

function moveToHistory(op: LlmOperationSnapshot): void {
  history.push(op);
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function trackLlmOperationStart(input: {
  requestId: string;
  method: "invoke" | "stream" | "batch";
  provider: LLMProvider;
  model: string;
  taskType?: TaskType;
  promptMeta?: PromptInvocationMeta;
}): void {
  pruneActive();
  pruneHistory();

  const snapshot: LlmOperationSnapshot = {
    requestId: input.requestId,
    method: input.method,
    provider: input.provider,
    model: input.model,
    taskType: input.taskType,
    promptId: input.promptMeta?.promptId,
    promptVersion: input.promptMeta?.promptVersion,
    novelId: input.promptMeta?.novelId,
    chapterId: input.promptMeta?.chapterId,
    stage: input.promptMeta?.stage,
    status: "running",
    startedAt: Date.now(),
  };

  // Evict oldest active if at capacity
  if (active.size >= MAX_ACTIVE) {
    const oldest = active.values().next().value;
    if (oldest) {
      oldest.status = "failed";
      oldest.completedAt = Date.now();
      oldest.durationMs = oldest.completedAt - oldest.startedAt;
      oldest.error = "Evicted by capacity limit";
      moveToHistory(oldest);
      active.delete(oldest.requestId);
    }
  }

  active.set(snapshot.requestId, snapshot);
  emitter.emit("update", { type: "start", operation: { ...snapshot } });
}

export function trackLlmOperationEnd(input: {
  requestId: string;
  status: "completed" | "failed";
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  error?: string;
}): void {
  const op = active.get(input.requestId);
  if (!op) {
    // Operation not tracked (tracker was off or pruned) - create a minimal history entry
    return;
  }

  op.status = input.status;
  op.completedAt = Date.now();
  op.durationMs = input.latencyMs;
  op.promptTokens = input.promptTokens;
  op.completionTokens = input.completionTokens;
  op.totalTokens = input.totalTokens;
  op.error = input.error;

  active.delete(op.requestId);
  moveToHistory(op);

  emitter.emit("update", { type: "end", operation: { ...op } });
}

export function getActiveOperations(): LlmOperationSnapshot[] {
  return Array.from(active.values()).map((op) => ({
    ...op,
    durationMs: Date.now() - op.startedAt,
  }));
}

export function getRecentOperations(limit = 50): LlmOperationSnapshot[] {
  pruneHistory();
  return history.slice(-Math.min(limit, MAX_HISTORY)).reverse();
}

export function getLlmOperationSummary(): {
  activeCount: number;
  recentCount: number;
  active: LlmOperationSnapshot[];
  recent: LlmOperationSnapshot[];
  totals: { promptTokens: number; completionTokens: number; totalTokens: number; callCount: number };
} {
  const activeOps = getActiveOperations();
  const recentOps = getRecentOperations(20);

  const totals = { promptTokens: 0, completionTokens: 0, totalTokens: 0, callCount: 0 };
  for (const op of history) {
    totals.callCount += 1;
    totals.promptTokens += op.promptTokens ?? 0;
    totals.completionTokens += op.completionTokens ?? 0;
    totals.totalTokens += op.totalTokens ?? 0;
  }

  return {
    activeCount: activeOps.length,
    recentCount: history.length,
    active: activeOps,
    recent: recentOps,
    totals,
  };
}

export function onLlmOperationUpdate(
  listener: (event: { type: "start" | "end"; operation: LlmOperationSnapshot }) => void,
): () => void {
  emitter.on("update", listener);
  return () => {
    emitter.off("update", listener);
  };
}
