import { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared";
import { prisma } from "../../../db/prisma";

const router = Router();

// 不挂载 authMiddleware — 全局层已在 /api 跳过 /health 认证

const startedAt = Date.now();

interface HealthData {
  status: string;
  timestamp: string;
  uptime: number;
  version: string;
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
  };
  database: {
    status: "ok" | "error";
    latencyMs?: number;
    error?: string;
  };
}

router.get("/", async (_req, res) => {
  const [database, memory] = await Promise.all([
    checkDatabase(),
    Promise.resolve(process.memoryUsage()),
  ]);

  const overallStatus = database.status === "ok" ? "ok" : "degraded";

  const response: ApiResponse<HealthData> = {
    success: true,
    data: {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startedAt) / 1000),
      version: getVersion(),
      memory: {
        rss: memory.rss,
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
      },
      database,
    },
    message: overallStatus === "ok" ? "服务运行正常。" : "服务运行异常。",
  };
  res.status(overallStatus === "ok" ? 200 : 503).json(response);
});

async function checkDatabase(): Promise<HealthData["database"]> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: "error",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function getVersion(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require("../../package.json") as { version?: string };
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

export default router;
