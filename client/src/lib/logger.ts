/**
 * 前端日志系统
 * 提供结构化日志记录，便于调试和问题定位
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: unknown;
  error?: Error;
}

interface LoggerOptions {
  context?: string;
  enableConsole?: boolean;
  enableStorage?: boolean;
  maxStorageEntries?: number;
}

const STORAGE_KEY = "ai-novel-logs";
const DEFAULT_MAX_ENTRIES = 500;

class FrontendLogger {
  private context: string;
  private enableConsole: boolean;
  private enableStorage: boolean;
  private maxStorageEntries: number;

  constructor(options: LoggerOptions = {}) {
    this.context = options.context ?? "app";
    this.enableConsole = options.enableConsole ?? true;
    this.enableStorage = options.enableStorage ?? true;
    this.maxStorageEntries = options.maxStorageEntries ?? DEFAULT_MAX_ENTRIES;
  }

  private createEntry(level: LogLevel, message: string, data?: unknown, error?: Error): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
      data,
      error,
    };
  }

  private formatMessage(entry: LogEntry): string {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.context}]`;
    return `${prefix} ${entry.message}`;
  }

  private logToConsole(entry: LogEntry): void {
    if (!this.enableConsole) return;

    const message = this.formatMessage(entry);
    const args: unknown[] = [message];

    if (entry.data) {
      args.push(entry.data);
    }
    if (entry.error) {
      args.push(entry.error);
    }

    switch (entry.level) {
      case "debug":
        console.debug(...args);
        break;
      case "info":
        console.info(...args);
        break;
      case "warn":
        console.warn(...args);
        break;
      case "error":
        console.error(...args);
        break;
    }
  }

  private saveToStorage(entry: LogEntry): void {
    if (!this.enableStorage || typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const logs: LogEntry[] = stored ? JSON.parse(stored) : [];

      logs.push(entry);

      // 限制存储数量
      if (logs.length > this.maxStorageEntries) {
        logs.splice(0, logs.length - this.maxStorageEntries);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    } catch {
      // 静默失败，避免日志系统本身导致错误
    }
  }

  private log(level: LogLevel, message: string, data?: unknown, error?: Error): void {
    const entry = this.createEntry(level, message, data, error);
    this.logToConsole(entry);
    this.saveToStorage(entry);
  }

  debug(message: string, data?: unknown): void {
    this.log("debug", message, data);
  }

  info(message: string, data?: unknown): void {
    this.log("info", message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log("warn", message, data);
  }

  error(message: string, data?: unknown, error?: Error): void {
    this.log("error", message, data, error);
  }

  /** 创建子日志器 */
  child(context: string): FrontendLogger {
    return new FrontendLogger({
      context: `${this.context}:${context}`,
      enableConsole: this.enableConsole,
      enableStorage: this.enableStorage,
      maxStorageEntries: this.maxStorageEntries,
    });
  }

  /** 获取存储的日志 */
  getLogs(): LogEntry[] {
    if (typeof window === "undefined") return [];

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /** 清除存储的日志 */
  clearLogs(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  }

  /** 导出日志为文本 */
  exportLogs(): string {
    const logs = this.getLogs();
    return logs.map((entry) => {
      const dataStr = entry.data ? ` | data: ${JSON.stringify(entry.data)}` : "";
      const errorStr = entry.error ? ` | error: ${entry.error.message}\n${entry.error.stack}` : "";
      return `${entry.timestamp} [${entry.level.toUpperCase()}] [${entry.context}] ${entry.message}${dataStr}${errorStr}`;
    }).join("\n");
  }
}

/** 全局日志器实例 */
export const logger = new FrontendLogger({ context: "app" });

/** API 请求日志器 */
export const apiLogger = new FrontendLogger({ context: "api" });

/** 组件日志器工厂 */
export function createComponentLogger(componentName: string): FrontendLogger {
  return new FrontendLogger({ context: `component:${componentName}` });
}

/** 全局错误捕获 */
export function setupGlobalErrorHandlers(): void {
  if (typeof window === "undefined") return;

  // 捕获未处理的 Promise 错误
  window.addEventListener("unhandledrejection", (event) => {
    logger.error("Unhandled Promise Rejection", {
      reason: event.reason,
    }, event.reason instanceof Error ? event.reason : new Error(String(event.reason)));
  });

  // 捕获全局错误
  window.addEventListener("error", (event) => {
    logger.error("Global Error", {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    }, event.error);
  });

  logger.info("Global error handlers initialized");
}
