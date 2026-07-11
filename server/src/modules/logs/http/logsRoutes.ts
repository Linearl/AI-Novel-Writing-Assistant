import { Router } from "express";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { z } from "zod";
import { validate } from "../../../middleware/validate";
import { resolveLogsRoot } from "../../../runtime/appPaths";
import type { ApiResponse } from "@ai-novel/shared";

const router = Router();

const LOGS_DIR = join(resolveLogsRoot(), "app");

const logQuerySchema = z.object({
  level: z.enum(["error", "warn", "info", "http", "verbose", "debug", "silly"]).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  keyword: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).optional().default(50),
});

interface ParsedLogEntry {
  timestamp: string;
  level: string;
  message: string;
  errorId?: string;
  service?: string;
  stack?: string;
  method?: string;
  url?: string;
  meta?: Record<string, unknown>;
}

function parseLogLine(line: string): ParsedLogEntry | null {
  try {
    const obj = JSON.parse(line);
    return {
      timestamp: obj.timestamp ?? obj.ts ?? "",
      level: obj.level ?? "info",
      message: typeof obj.message === "string" ? obj.message : JSON.stringify(obj.message),
      errorId: obj.errorId ?? undefined,
      service: obj.service ?? undefined,
      stack: obj.stack ?? undefined,
      method: obj.method ?? obj.req?.method ?? undefined,
      url: obj.url ?? obj.req?.url ?? undefined,
      meta: Object.keys(obj).length > 0
        ? Object.fromEntries(
          Object.entries(obj).filter(([k]) =>
            !["timestamp", "ts", "level", "message", "errorId", "service", "stack", "method", "url"].includes(k),
          ),
        )
        : undefined,
    };
  } catch {
    return null;
  }
}

function getLogFiles(): string[] {
  if (!existsSync(LOGS_DIR)) return [];
  return readdirSync(LOGS_DIR)
    .filter((f) => extname(f) === ".log" && f.startsWith("app-"))
    .sort()
    .reverse()
    .slice(0, 7); // 最多读最近 7 天
}

router.get("/", validate({ query: logQuerySchema }), async (req, res, next) => {
  try {
    const query = logQuerySchema.parse(req.query);

    const files = getLogFiles();
    const allEntries: ParsedLogEntry[] = [];

    for (const file of files) {
      const filePath = join(LOGS_DIR, file);
      try {
        const content = readFileSync(filePath, "utf-8");
        for (const line of content.split("\n")) {
          if (!line.trim()) continue;
          const entry = parseLogLine(line);
          if (entry) allEntries.push(entry);
        }
      } catch {
        // 跳过不可读的文件
      }
    }

    // 按时间倒序
    allEntries.sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1));

    // 过滤
    let filtered = allEntries;

    if (query.level) {
      filtered = filtered.filter((e) => e.level === query.level);
    }
    if (query.startTime) {
      filtered = filtered.filter((e) => e.timestamp >= query.startTime!);
    }
    if (query.endTime) {
      filtered = filtered.filter((e) => e.timestamp <= query.endTime!);
    }
    if (query.keyword) {
      const kw = query.keyword.toLowerCase();
      filtered = filtered.filter((e) =>
        e.message.toLowerCase().includes(kw)
        || (e.url?.toLowerCase().includes(kw) ?? false)
        || (e.method?.toLowerCase().includes(kw) ?? false)
      );
    }

    // 分页
    const total = filtered.length;
    const start = (query.page - 1) * query.pageSize;
    const data = filtered.slice(start, start + query.pageSize);

    const response: ApiResponse<{ data: ParsedLogEntry[]; total: number; page: number; pageSize: number }> = {
      success: true,
      data: { data, total, page: query.page, pageSize: query.pageSize },
    };
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
