import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import { z } from "zod";

const router = Router();
const LOG_DIR = path.resolve(process.cwd(), "server/logs");

const querySchema = z.object({
  level: z.enum(["error", "warn", "info", "debug"]).optional(),
  since: z.string().datetime().optional(),
  until: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(1000).default(100),
  offset: z.coerce.number().min(0).default(0),
  keyword: z.string().optional(),
  module: z.string().optional(),
});

interface LogEntry {
  timestamp: string;
  level: string;
  module: string;
  message: string;
  [key: string]: unknown;
}

async function readLogFile(
  filePath: string,
  filters: {
    level?: string;
    since?: Date;
    until?: Date;
    keyword?: string;
    module?: string;
  }
): Promise<LogEntry[]> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const lines = content.split("\n").filter((line) => line.trim());
    const entries: LogEntry[] = [];

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as LogEntry;

        if (filters.level && entry.level !== filters.level) {
          continue;
        }

        if (filters.since && new Date(entry.timestamp) < filters.since) {
          continue;
        }

        if (filters.until && new Date(entry.timestamp) > filters.until) {
          continue;
        }

        if (filters.module && entry.module !== filters.module) {
          continue;
        }

        if (filters.keyword && !entry.message.toLowerCase().includes(filters.keyword.toLowerCase())) {
          continue;
        }

        entries.push(entry);
      } catch {
        // Skip invalid JSON lines
      }
    }

    return entries;
  } catch {
    return [];
  }
}

router.get("/", async (req, res) => {
  try {
    const params = querySchema.parse(req.query);

    const files = await fs.readdir(LOG_DIR);
    const logFiles = files
      .filter((f) => f.startsWith("app-") && f.endsWith(".log"))
      .sort()
      .reverse();

    const filters = {
      level: params.level,
      since: params.since ? new Date(params.since) : undefined,
      until: params.until ? new Date(params.until) : undefined,
      keyword: params.keyword,
      module: params.module,
    };

    let allEntries: LogEntry[] = [];
    for (const file of logFiles) {
      const entries = await readLogFile(path.join(LOG_DIR, file), filters);
      allEntries = allEntries.concat(entries);
    }

    allEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const total = allEntries.length;
    const paginatedEntries = allEntries.slice(params.offset, params.offset + params.limit);

    res.json({
      data: {
        items: paginatedEntries,
        total,
        hasMore: params.offset + params.limit < total,
      },
    });
  } catch (error) {
    console.error("Failed to query logs:", error);
    res.status(500).json({ error: "Failed to query logs" });
  }
});

export default router;
