import "dotenv/config";
import { writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { resolve, join } from "node:path";
import type { Server } from "node:http";
import os from "node:os";
import cors from "cors";
import compression from "compression";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import type { ApiResponse } from "@ai-novel/shared";
import { BIND_ALL_HOST, DEFAULT_HOST, DEFAULT_SERVER_PORT } from "./config/constants";
import { ensureRuntimeDatabaseReady } from "./db/runtimeMigrations";
import { errorHandler } from "./middleware/errorHandler";
import { requestIdMiddleware } from "./middleware/requestId";
import { authMiddleware } from "./middleware/auth";
import { globalLimiter, llmLimiter, feedbackLimiter } from "./middleware/rateLimiter";
import { loadProviderApiKeys } from "./llm/factory";
import feedbackRouter from "./modules/feedback/feedbackRoutes";
import astrologyRouter from "./modules/agent/http/astrology";
import agentCatalogRouter from "./modules/agent/http/agentCatalog";
import agentRunsRouter from "./modules/agent/http/agentRuns";
import autoDirectorChannelCallbacksRouter from "./modules/agent/http/autoDirectorChannelCallbacks";
import autoDirectorFollowUpsRouter from "./modules/agent/http/autoDirectorFollowUps";
import bookAnalysisRouter from "./modules/bookAnalysis/http/bookAnalysis";
import characterRouter from "./modules/novel/characters/http/character";
import chatRouter from "./modules/chat/http/chat";
import creativeHubRouter from "./modules/creativeHub/http/creativeHub";
import genreRouter from "./modules/novel/genre/http/genre";
import healthRouter from "./modules/system/http/health";
import imagesRouter from "./modules/images/http/images";
import knowledgeRouter from "./modules/knowledge/http/knowledge";
import llmRouter from "./modules/llm/http/llm";
import llmTrackingRouter from "./modules/llm/http/llmTracking";
import novelRouter from "./modules/novel/http/novel";
import novelDirectorRouter from "./services/novel/director/http/novelDirector";
import novelExportRouter from "./modules/export/http/novelExport";
import novelWorkflowsRouter from "./services/novel/director/http/novelWorkflows";
import promptWorkbenchRouter from "./modules/promptWorkbench/http/promptWorkbench";
import ragRouter from "./modules/knowledge/http/rag";
import settingsAutoDirectorRouter from "./modules/settings/http/settingsAutoDirector";
import settingsRouter from "./modules/settings/http/settings";
import styleEngineRouter from "./modules/styleEngine/http/styleEngine";
import styleEngineExtractionRouter from "./modules/styleEngine/http/styleEngineExtraction";
import writingTechniquesRouter from "./modules/writing/http/writingTechniques";
import atmosphereCardsRouter from "./modules/writing/http/atmosphereCards";
import storyModeRouter from "./modules/novel/storyMode/http/storyMode";
import tasksRouter from "./modules/tasks/http/tasks";
import titleLibraryRouter from "./modules/novel/titleLibrary/http/titleLibrary";
import worldRouter from "./modules/setup/world/http";
import writingFormulaRouter from "./modules/writing/http/writingFormula";
import { novelEventBus, registerNovelEventHandlers } from "./events";
import { bookAnalysisService } from "./services/bookAnalysis/BookAnalysisService";
import { ragServices } from "./services/rag";
import { getSharedNovelServices } from "./services/novel/application/sharedNovelServices";
import { novelSideEffectWorker } from "./events/sideEffects";
import { NovelPipelineRuntimeService } from "./services/novel/NovelPipelineRuntimeService";
import { recoveryTaskService } from "./services/task/RecoveryTaskService";
import {
  ensureSystemResourceStarterData,
  hasSystemResourceBootstrapChanges,
} from "./services/bootstrap/SystemResourceBootstrapService";
import { initializeRagSettingsCompatibility } from "./services/settings/RagCompatibilityBootstrapService";
import { DirectorWorker } from "./workers/directorWorker";
import { cleanupLogDirectory, resolveLogRetentionConfig } from "./platform/logging/logRetention";
import { resolveLogsRoot } from "./runtime/appPaths";
import { logger } from "./services/logging/LoggerService";

getSharedNovelServices();
registerNovelEventHandlers(novelEventBus);
const novelPipelineRuntimeService = new NovelPipelineRuntimeService();

morgan.token("error-message", (_req, res) => {
  const response = res as typeof res & {
    locals?: {
      requestErrorMessage?: unknown;
    };
  };
  const errorMessage = response.locals?.requestErrorMessage;
  return typeof errorMessage === "string" ? errorMessage.trim() : "";
});

function parseEnvFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value === "true" || value === "1";
}

export function createApp() {
  getSharedNovelServices();
  const app = express();
  const jsonBodyLimit = process.env.API_JSON_LIMIT ?? "20mb";
  const corsOriginEnv = process.env.CORS_ORIGIN;
  const corsAllowList = corsOriginEnv
    ? corsOriginEnv
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
    : [];

  app.use(compression({ threshold: 1024 }));

  const allowLan = parseEnvFlag(process.env.ALLOW_LAN, process.env.NODE_ENV !== "production");
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }
        const isListedOrigin = corsAllowList.includes(origin);
        const isLocalhostDevOrigin = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
        const isLanOrigin = allowLan && /^https?:\/\/(?:\d{1,3}\.){3}\d{1,3}:\d+$/.test(origin);
        callback(null, isListedOrigin || isLocalhostDevOrigin || isLanOrigin);
      },
      credentials: true,
    }),
  );
  app.use(helmet());
  app.use(requestIdMiddleware);
  app.use(morgan((tokens, req, res) => {
    const method = tokens.method(req, res) ?? "-";
    const url = tokens.url(req, res) ?? "-";
    const status = tokens.status(req, res) ?? "-";
    const responseTime = tokens["response-time"](req, res) ?? "0";
    const contentLength = tokens.res(req, res, "content-length") ?? "0";
    const errorMessage = tokens["error-message"](req, res);
    const ip = req.ip || req.socket.remoteAddress || "-";
    const referer = req.get("referer") || req.get("referrer") || "-";
    const userAgent = req.get("user-agent") || "-";
    const errorSuffix = errorMessage ? ` | error: ${errorMessage}` : "";
    return `${method} ${url} ${status} ${responseTime}ms ${contentLength}B | ip=${ip} referer=${referer} ua=${userAgent}${errorSuffix}`;
  }));
  app.use(express.json({ limit: jsonBodyLimit }));

  // 全局速率限制
  app.use(globalLimiter);

  // API Token 认证中间件
  app.use("/api", authMiddleware);

  // LLM 端点速率限制
  app.use("/api/llm", llmLimiter);

  // Feedback 端点速率限制
  app.use("/api/feedback", feedbackLimiter);

  app.use("/api/health", healthRouter);
  app.use("/api/agent-catalog", agentCatalogRouter);
  app.use("/api/agent-runs", agentRunsRouter);
  app.use("/api/book-analysis", bookAnalysisRouter);
  app.use("/api/genres", genreRouter);
  app.use("/api/story-modes", storyModeRouter);
  app.use("/api/knowledge", knowledgeRouter);
  app.use("/api/llm", llmRouter);
  app.use("/api/llm-tracking", llmTrackingRouter);
  app.use("/api/title-library", titleLibraryRouter);
  app.use("/api", styleEngineRouter);
  app.use("/api", styleEngineExtractionRouter);
  app.use("/api/writing-techniques", writingTechniquesRouter);
  app.use("/api/atmosphere-cards", atmosphereCardsRouter);
  app.use("/api/novels", novelRouter);
  app.use("/api/novels/director", novelDirectorRouter);
  app.use("/api/novel-workflows", novelWorkflowsRouter);
  app.use("/api/novels", novelExportRouter);
  app.use("/api/worlds", worldRouter);
  app.use("/api/rag", ragRouter);
  app.use("/api/base-characters", characterRouter);
  app.use("/api/writing-formula", writingFormulaRouter);
  app.use("/api/chat", chatRouter);
  app.use("/api/creative-hub", creativeHubRouter);
  app.use("/api/prompt-workbench", promptWorkbenchRouter);
  app.use("/api/images", imagesRouter);
  app.use("/api/tasks", tasksRouter);
  app.use("/api/auto-director/follow-ups", autoDirectorFollowUpsRouter);
  app.use("/api/settings/auto-director", settingsAutoDirectorRouter);
  app.use("/api/auto-director/channel-callbacks", autoDirectorChannelCallbacksRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/feedback", feedbackRouter);
  app.use("/api/astrology", astrologyRouter);

  app.use((req, res) => {
    const requestLogger = req.id ? logger.child({ requestId: req.id }) : logger;
    requestLogger.warn("[404] 接口不存在", {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.socket.remoteAddress,
      referer: req.get("referer") || req.get("referrer"),
      origin: req.get("origin"),
      userAgent: req.get("user-agent"),
    });

    const response: ApiResponse<null> = {
      success: false,
      error: "接口不存在。",
    };
    res.status(404).json(response);
  });

  app.use(errorHandler);

  return app;
}

function getLanIp(): string | null {
  const ifaces = os.networkInterfaces();
  for (const list of Object.values(ifaces)) {
    if (!list) continue;
    for (const info of list) {
      if (info.family === "IPv4" && !info.internal) {
        return info.address;
      }
    }
  }
  return null;
}

function createServerUrl(host: string, port: number): string {
  if (host === BIND_ALL_HOST || host === "::") {
    return `http://localhost:${port}`;
  }
  return host.includes(":") ? `http://[${host}]:${port}` : `http://${host}:${port}`;
}

export interface ServerStartOptions {
  host?: string;
  port?: number;
  allowLan?: boolean;
}

export interface StartedServer {
  app: express.Express;
  server: Server;
  host: string;
  port: number;
  allowLan: boolean;
  url: string;
  close: () => Promise<void>;
}

interface BackgroundServicesHandle {
  stop: () => Promise<void>;
}

function resolveServerStartOptions(options?: ServerStartOptions): {
  host: string;
  port: number;
  allowLan: boolean;
} {
  const allowLan = options?.allowLan ?? parseEnvFlag(process.env.ALLOW_LAN, process.env.NODE_ENV !== "production");
  return {
    allowLan,
    port: options?.port ?? Number(process.env.AI_NOVEL_SERVER_PORT ?? process.env.PORT ?? DEFAULT_SERVER_PORT),
    host: options?.host ?? process.env.HOST ?? (allowLan ? BIND_ALL_HOST : DEFAULT_HOST),
  };
}

function logServerReady(host: string, port: number): void {
  logger.info(`[server] listening on http://localhost:${port}`);
  if (host === BIND_ALL_HOST || host === "::") {
    const lanIp = getLanIp();
    if (lanIp) {
      logger.info(`[server] LAN: http://${lanIp}:${port}`);
    }
  }
}

function scheduleLogRetentionCleanup(): void {
  setImmediate(() => {
    try {
      const summary = cleanupLogDirectory(resolveLogsRoot(), resolveLogRetentionConfig());
      if (summary.deletedFiles > 0 || summary.failedFiles > 0) {
        logger.info("[server.logs] cleanup completed.", {
          deletedFiles: summary.deletedFiles,
          deletedBytes: summary.deletedBytes,
          failedFiles: summary.failedFiles,
        });
      }
      for (const failure of summary.failures.slice(0, 5)) {
        logger.warn("[server.logs] cleanup failed for file.", failure);
      }
    } catch (error) {
      logger.warn("[server.logs] cleanup skipped.", error);
    }
  });
}

function initializeBackgroundServices(): BackgroundServicesHandle {
  void ragServices.ragWorker.start();
  novelSideEffectWorker.start();
  const directorWorker = new DirectorWorker();
  void directorWorker.start().catch((error) => {
    logger.error("[director.worker] unexpected stop", error);
  });
  const recoveryInitialization = recoveryTaskService.initializePendingRecoveries();

  void loadProviderApiKeys().catch((error) => {
    logger.warn("数据库中的模型密钥加载失败，已回退到环境变量。", error);
  });

  void ensureSystemResourceStarterData()
    .then((systemResourceReport) => {
      if (hasSystemResourceBootstrapChanges(systemResourceReport)) {
        logger.info("[server] built-in creative resources bootstrapped.", systemResourceReport);
      }
    })
    .catch((error) => {
      logger.warn("Failed to bootstrap built-in creative resources.", error);
    });

  void recoveryInitialization
    .then(() => {
      bookAnalysisService.startWatchdog();
      novelPipelineRuntimeService.startWatchdog();
    })
    .catch((error) => {
      logger.warn("Failed to prepare pending recovery candidates.", error);
      bookAnalysisService.startWatchdog();
      novelPipelineRuntimeService.startWatchdog();
    });

  return {
    stop: async () => {
      directorWorker.stop();
      novelSideEffectWorker.stop();
      ragServices.ragWorker.stop();
      bookAnalysisService.stopWatchdog();
      novelPipelineRuntimeService.stopWatchdog();
    },
  };
}

export async function startServer(options?: ServerStartOptions): Promise<StartedServer> {
  scheduleLogRetentionCleanup();
  await ensureRuntimeDatabaseReady();

  const ragCompatibilityReport = await initializeRagSettingsCompatibility();
  if (
    ragCompatibilityReport.importedSettingKeys.length > 0
    || ragCompatibilityReport.importedProviderRecords.length > 0
  ) {
    logger.info("[server] imported legacy RAG env settings.", ragCompatibilityReport);
  }

  const app = createApp();
  const { host, port, allowLan } = resolveServerStartOptions(options);

  const server = await new Promise<Server>((resolve, reject) => {
    const listeningServer = app.listen(port, host, () => resolve(listeningServer));
    listeningServer.once("error", reject);
  });
  const backgroundServices = initializeBackgroundServices();

  logServerReady(host, port);

  // 写入 PID 文件，供僵尸进程清理脚本使用
  const repoRoot = resolve(process.cwd(), "..");
  const pidDir = join(repoRoot, ".logs", ".pids");
  const pidFile = join(pidDir, "server.pid");
  try {
    mkdirSync(pidDir, { recursive: true });
    writeFileSync(pidFile, JSON.stringify({
      name: "server",
      pid: process.pid,
      port,
      repoRoot,
      host,
      startedAt: new Date().toISOString(),
    }, null, 2) + "\n", "utf8");
    logger.info(`[pid] server (PID=${process.pid}, PORT=${port}) → ${pidFile}`);
  } catch (err) {
    logger.warn("[pid] failed to write server.pid", err);
  }

  return {
    app,
    server,
    host,
    port,
    allowLan,
    url: createServerUrl(host, port),
    close: async () => {
      await backgroundServices.stop();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          try { unlinkSync(pidFile); } catch {}
          resolve();
        });
      });
    },
  };
}

async function bootstrap(): Promise<void> {
  const { server } = await startServer();

  // 进程保护：未捕获异常处理
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('[server] Unhandled Rejection:', reason);
    process.exit(1);
  });

  process.on('uncaughtException', (error) => {
    logger.error('[server] Uncaught Exception:', error.message, error.stack);
    process.exit(1);
  });

  // 优雅关闭
  process.on('SIGTERM', () => {
    logger.info('[server] SIGTERM received, shutting down gracefully');
    server.close(() => process.exit(0));
  });

  process.on('SIGINT', () => {
    logger.info('[server] SIGINT received, shutting down gracefully');
    server.close(() => process.exit(0));
  });
}

if (require.main === module) {
  void bootstrap().catch((error) => {
    logger.error("[server] bootstrap failed.", error);
    process.exit(1);
  });
}
