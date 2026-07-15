import { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared";
import { networkMonitor } from "../../../llm/networkMonitor";

const router = Router();

/**
 * GET /api/network/status
 * 返回当前网络状态和最近心跳历史。
 */
router.get("/api/network/status", (_req, res) => {
  const state = networkMonitor.getState();
  const response: ApiResponse<typeof state> = {
    success: true,
    data: state,
    message: "当前网络状态。",
  };
  res.json(response);
});

export default router;
