import { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared";
import {
  getLlmOperationSummary,
  getActiveOperations,
  getRecentOperations,
  onLlmOperationUpdate,
} from "../../../llm/llmOperationTracker";
import { writeSSEFrame } from "../../../llm/streaming";
import { authMiddleware } from "../../../middleware/auth";

const router = Router();
router.use(authMiddleware);

// ---------------------------------------------------------------------------
// GET /api/llm-tracking/status
// Summary of current LLM operations + cumulative token totals
// ---------------------------------------------------------------------------
router.get("/status", (_req, res, next) => {
  try {
    const summary = getLlmOperationSummary();
    const response: ApiResponse<typeof summary> = {
      success: true,
      data: summary,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// GET /api/llm-tracking/active
// Currently running LLM operations
// ---------------------------------------------------------------------------
router.get("/active", (_req, res, next) => {
  try {
    const operations = getActiveOperations();
    const response: ApiResponse<typeof operations> = {
      success: true,
      data: operations,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// GET /api/llm-tracking/recent
// Recently completed LLM operations (newest first)
// Query param: ?limit=50 (default 50, max 128)
// ---------------------------------------------------------------------------
router.get("/recent", (req, res, next) => {
  try {
    const rawLimit = Number.parseInt(req.query.limit as string, 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 128) : 50;
    const operations = getRecentOperations(limit);
    const response: ApiResponse<typeof operations> = {
      success: true,
      data: operations,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// GET /api/llm-tracking/stream (SSE)
// Real-time stream of LLM operation start/end events.
// Client receives frames: { type: "llm_op_start", operation } | { type: "llm_op_end", operation } | { type: "ping" }
// ---------------------------------------------------------------------------
router.get("/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  // Send initial snapshot
  const initialSnapshot = getLlmOperationSummary();
  writeSSEFrame(res, {
    type: "chunk",
    content: JSON.stringify({
      frameType: "llm_op_snapshot",
      active: initialSnapshot.active,
      totals: initialSnapshot.totals,
    }),
  });

  // Keep connection alive with heartbeat
  const heartbeat = setInterval(() => {
    writeSSEFrame(res, { type: "ping" });
  }, 15_000);
  heartbeat.unref();

  // Subscribe to live updates
  const unsubscribe = onLlmOperationUpdate((event) => {
    if (res.writableEnded) {
      return;
    }
    const frameType = event.type === "start" ? "llm_op_start" : "llm_op_end";
    writeSSEFrame(res, {
      type: "chunk",
      content: JSON.stringify({ frameType, operation: event.operation }),
    });
  });

  // Cleanup on client disconnect
  const cleanup = () => {
    clearInterval(heartbeat);
    unsubscribe();
    if (!res.writableEnded) {
      res.end();
    }
  };

  req.on("close", cleanup);
});

export default router;
