import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";

const LOG_DIR = path.resolve(process.cwd(), "server/logs");

const LOG_FORMAT = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DDTHH:mm:ss.SSSZ" }),
  winston.format.json()
);

const CONSOLE_FORMAT = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DDTHH:mm:ss.SSSZ" }),
  winston.format.printf(({ timestamp, level, message, module: mod, ...meta }) => {
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
    return `[${timestamp}] [${level.toUpperCase()}] [${mod ?? "app"}] ${message}${metaStr}`;
  })
);

const fileTransport = new DailyRotateFile({
  filename: path.join(LOG_DIR, "app-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  maxSize: "100m",
  maxFiles: "30d",
  zippedArchive: true,
  format: LOG_FORMAT,
});

const errorFileTransport = new DailyRotateFile({
  filename: path.join(LOG_DIR, "error-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  maxSize: "50m",
  maxFiles: "30d",
  zippedArchive: true,
  level: "error",
  format: LOG_FORMAT,
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? "info",
  defaultMeta: { module: "app" },
  transports: [
    fileTransport,
    errorFileTransport,
    new winston.transports.Console({
      format: CONSOLE_FORMAT,
    }),
  ],
});

export function createChildLogger(moduleName: string) {
  return logger.child({ module: moduleName });
}
