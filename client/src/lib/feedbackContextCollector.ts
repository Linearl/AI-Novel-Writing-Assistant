/**
 * feedbackContextCollector.ts
 *
 * 环形缓冲区收集前端运行时上下文：console 日志、未捕获异常、网络错误、路由变化。
 * 用于反馈提交时自动附带诊断信息。
 */

interface ConsoleEntry {
  level: "log" | "warn" | "error" | "info";
  message: string;
  timestamp: number;
}

interface ErrorEntry {
  message: string;
  stack?: string;
  timestamp: number;
}

interface NetworkEntry {
  url: string;
  method: string;
  status?: number;
  error?: string;
  timestamp: number;
}

interface RouteEntry {
  path: string;
  timestamp: number;
}

export interface FeedbackContext {
  consoleLogs: ConsoleEntry[];
  uncaughtErrors: ErrorEntry[];
  networkErrors: NetworkEntry[];
  routeChanges: RouteEntry[];
  userAgent: string;
  url: string;
  viewport: { width: number; height: number };
  collectedAt: string;
}

const MAX_CONSOLE_ENTRIES = 50;
const MAX_ERROR_ENTRIES = 20;
const MAX_NETWORK_ENTRIES = 30;
const MAX_ROUTE_ENTRIES = 20;
const MAX_CONTEXT_BYTES = 50 * 1024; // 50KB

let installed = false;
let originalConsole: Record<string, (...args: unknown[]) => void> = {};

const consoleRingBuffer: ConsoleEntry[] = [];
const errorRingBuffer: ErrorEntry[] = [];
const networkRingBuffer: NetworkEntry[] = [];
const routeRingBuffer: RouteEntry[] = [];

function pushToRing<T>(buffer: T[], item: T, maxSize: number): void {
  if (buffer.length >= maxSize) {
    buffer.shift();
  }
  buffer.push(item);
}

function safeStringifyArg(arg: unknown): string {
  if (arg === null || arg === undefined) return String(arg);
  if (typeof arg === "string") return arg;
  if (arg instanceof Error) return `${arg.message}`;
  try {
    return JSON.stringify(arg);
  } catch {
    return "[unserializable]";
  }
}

function installConsoleInterception(): void {
  const levels: Array<"log" | "warn" | "error" | "info"> = ["log", "warn", "error", "info"];

  for (const level of levels) {
    const original = console[level];
    originalConsole[level] = original;

    // Use a flag to prevent recursion
    let inInterception = false;

    console[level] = (...args: unknown[]) => {
      // Call original first, outside the guard
      original.apply(console, args);

      if (inInterception) return;
      inInterception = true;
      try {
        const message = args.map(safeStringifyArg).join(" ");
        pushToRing(consoleRingBuffer, {
          level,
          message: message.slice(0, 500),
          timestamp: Date.now(),
        }, MAX_CONSOLE_ENTRIES);
      } finally {
        inInterception = false;
      }
    };
  }
}

function installErrorListeners(): void {
  window.addEventListener("error", (event: ErrorEvent) => {
    pushToRing(errorRingBuffer, {
      message: event.message,
      stack: event.error?.stack?.slice(0, 1000),
      timestamp: Date.now(),
    }, MAX_ERROR_ENTRIES);
  });

  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack?.slice(0, 1000) : undefined;
    pushToRing(errorRingBuffer, { message, stack, timestamp: Date.now() }, MAX_ERROR_ENTRIES);
  });
}

function installNetworkInterception(): void {
  const originalFetch = window.fetch;

  window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
    const [input, init] = args;
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method ?? "GET";

    try {
      const response = await originalFetch.apply(window, args);
      if (!response.ok) {
        pushToRing(networkRingBuffer, {
          url: url.slice(0, 300),
          method,
          status: response.status,
          timestamp: Date.now(),
        }, MAX_NETWORK_ENTRIES);
      }
      return response;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      pushToRing(networkRingBuffer, {
        url: url.slice(0, 300),
        method,
        error: errorMsg.slice(0, 300),
        timestamp: Date.now(),
      }, MAX_NETWORK_ENTRIES);
      throw error;
    }
  };

  // Intercept XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: unknown[]) {
    (this as unknown as Record<string, unknown>).__feedbackMethod = method;
    (this as unknown as Record<string, unknown>).__feedbackUrl = String(url).slice(0, 300);
    return originalXHROpen.apply(this, [method, url, ...rest] as Parameters<typeof originalXHROpen>);
  };

  XMLHttpRequest.prototype.send = function (...args: unknown[]) {
    this.addEventListener("load", function () {
      const method = (this as unknown as Record<string, unknown>).__feedbackMethod as string;
      const url = (this as unknown as Record<string, unknown>).__feedbackUrl as string;
      if (this.status >= 400) {
        pushToRing(networkRingBuffer, {
          url,
          method,
          status: this.status,
          timestamp: Date.now(),
        }, MAX_NETWORK_ENTRIES);
      }
    });
    this.addEventListener("error", function () {
      const method = (this as unknown as Record<string, unknown>).__feedbackMethod as string;
      const url = (this as unknown as Record<string, unknown>).__feedbackUrl as string;
      pushToRing(networkRingBuffer, {
        url,
        method,
        error: "network error",
        timestamp: Date.now(),
      }, MAX_NETWORK_ENTRIES);
    });
    return originalXHRSend.apply(this, args as Parameters<typeof originalXHRSend>);
  };
}

function installRouteTracking(): void {
  let currentPath = window.location.pathname;

  // Track popstate
  window.addEventListener("popstate", () => {
    const newPath = window.location.pathname;
    if (newPath !== currentPath) {
      currentPath = newPath;
      pushToRing(routeRingBuffer, { path: newPath, timestamp: Date.now() }, MAX_ROUTE_ENTRIES);
    }
  });

  // Track pushState / replaceState
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function (...args: [data: any, unused: string, url?: string | URL | null | undefined]) {
    originalPushState.apply(this, args);
    const newPath = window.location.pathname;
    if (newPath !== currentPath) {
      currentPath = newPath;
      pushToRing(routeRingBuffer, { path: newPath, timestamp: Date.now() }, MAX_ROUTE_ENTRIES);
    }
  };

  history.replaceState = function (...args: [data: any, unused: string, url?: string | URL | null | undefined]) {
    originalReplaceState.apply(this, args);
    const newPath = window.location.pathname;
    if (newPath !== currentPath) {
      currentPath = newPath;
      pushToRing(routeRingBuffer, { path: newPath, timestamp: Date.now() }, MAX_ROUTE_ENTRIES);
    }
  };
}

/**
 * 安装全局反馈上下文收集器。多次调用安全（幂等）。
 */
export function installFeedbackCollector(): void {
  if (installed) return;
  installed = true;

  installConsoleInterception();
  installErrorListeners();
  installNetworkInterception();
  installRouteTracking();
}

/**
 * 收集当前上下文，返回序列化 JSON 字符串（总量 < 50KB）。
 */
export function collectFeedbackContext(): string {
  const context: FeedbackContext = {
    consoleLogs: [...consoleRingBuffer],
    uncaughtErrors: [...errorRingBuffer],
    networkErrors: [...networkRingBuffer],
    routeChanges: [...routeRingBuffer],
    userAgent: navigator.userAgent,
    url: window.location.href,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    collectedAt: new Date().toISOString(),
  };

  let serialized = JSON.stringify(context);

  // Enforce size limit by trimming oldest entries if needed
  if (new TextEncoder().encode(serialized).length > MAX_CONTEXT_BYTES) {
    // Progressively trim to fit
    const trimmed = { ...context };
    trimmed.consoleLogs = trimmed.consoleLogs.slice(-Math.floor(MAX_CONSOLE_ENTRIES / 2));
    trimmed.networkErrors = trimmed.networkErrors.slice(-Math.floor(MAX_NETWORK_ENTRIES / 2));
    trimmed.routeChanges = trimmed.routeChanges.slice(-Math.floor(MAX_ROUTE_ENTRIES / 2));
    serialized = JSON.stringify(trimmed);

    if (new TextEncoder().encode(serialized).length > MAX_CONTEXT_BYTES) {
      trimmed.uncaughtErrors = trimmed.uncaughtErrors.slice(-Math.floor(MAX_ERROR_ENTRIES / 2));
      serialized = JSON.stringify(trimmed);
    }
  }

  return serialized;
}
