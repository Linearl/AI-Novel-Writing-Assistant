import type { ApiResponse } from "@ai-novel/shared";
import { apiClient } from "./client";

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

export async function queryLogs(params: LogQueryParams) {
  const { data } = await apiClient.get<ApiResponse<LogQueryResult>>("/logs", { params });
  return data;
}
