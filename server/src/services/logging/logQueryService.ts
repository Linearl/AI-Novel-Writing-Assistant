import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { resolveLogsRoot } from "../../runtime/appPaths";

export type LogLevel = "error" | "warn" | "info" | "http" | "verbose" | "debug" | "silly";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  errorId?: string;
  service?: string;
  stack?: string;
  method?: string;
  url?: string;
  meta?: Record<string, unknown>;
}

export interface LogQueryParams {
  level?: LogLevel;
  startTime?: string;
  endTime?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface LogQueryResult {
  data: LogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

const MAX_SCAN_DAYS = 30;

async function getLogFiles(): Promise<string[]> {
  const logsDir = path.join(resolveLogsRoot(), "app");
  try {
    await fs.access(logsDir);
  } catch {
    return [];
  }
  const entries = await fs.readdir(logsDir);
  const files = entries
    .filter((f) => f.startsWith("app-") && f.endsWith(".log") && !f.endsWith(".gz"))
    .sort()
    .reverse()
    .slice(0, MAX_SCAN_DAYS);
  return files.map((f) => path.join(logsDir, f));
}

function parseLogLine(line: string): LogEntry | null {
  if (!line.trim()) return null;
  try {
    const parsed = JSON.parse(line) as Record<string, unknown>;
    return {
      timestamp: (typeof parsed.timestamp === "string" ? parsed.timestamp : "") as string,
      level: (typeof parsed.level === "string" ? parsed.level : "info") as LogLevel,
      message: (typeof parsed.message === "string" ? parsed.message : String(parsed.message ?? "")) as string,
      errorId: typeof parsed.errorId === "string" ? parsed.errorId : undefined,
      service: typeof parsed.service === "string" ? parsed.service : undefined,
      stack: typeof parsed.stack === "string" ? parsed.stack : undefined,
      method: typeof parsed.method === "string" ? parsed.method : undefined,
      url: typeof parsed.url === "string" ? parsed.url : undefined,
      meta: extractMeta(parsed),
    };
  } catch {
    return null;
  }
}

function extractMeta(parsed: Record<string, unknown>): Record<string, unknown> | undefined {
  const KNOWN_KEYS = new Set(["timestamp", "level", "message", "errorId", "service", "stack", "method", "url"]);
  const meta: Record<string, unknown> = {};
  let hasMeta = false;
  for (const [key, value] of Object.entries(parsed)) {
    if (!KNOWN_KEYS.has(key) && value !== undefined) {
      meta[key] = value;
      hasMeta = true;
    }
  }
  return hasMeta ? meta : undefined;
}

function matchesFilter(entry: LogEntry, params: LogQueryParams): boolean {
  if (params.level && entry.level !== params.level) return false;
  if (params.startTime && entry.timestamp < params.startTime) return false;
  if (params.endTime && entry.timestamp > params.endTime) return false;
  if (params.keyword) {
    const kw = params.keyword.toLowerCase();
    const haystack = `${entry.message} ${entry.errorId ?? ""} ${entry.url ?? ""}`.toLowerCase();
    if (!haystack.includes(kw)) return false;
  }
  return true;
}

async function readAndFilterEntries(params: LogQueryParams): Promise<LogEntry[]> {
  const files = await getLogFiles();
  const allEntries: LogEntry[] = [];

  for (const filePath of files) {
    const fileStream = createReadStream(filePath, { encoding: "utf-8" });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
      const entry = parseLogLine(line);
      if (entry && matchesFilter(entry, params)) {
        allEntries.push(entry);
      }
    }
  }

  allEntries.sort((a, b) => (b.timestamp > a.timestamp ? 1 : b.timestamp < a.timestamp ? -1 : 0));
  return allEntries;
}

export async function queryLogs(params: LogQueryParams): Promise<LogQueryResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, params.pageSize ?? 50));

  const allEntries = await readAndFilterEntries(params);
  const total = allEntries.length;
  const start = (page - 1) * pageSize;
  const data = allEntries.slice(start, start + pageSize);

  return { data, total, page, pageSize };
}
