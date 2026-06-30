import path from "node:path";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — winston types resolve after pnpm install
import winston from "winston";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — winston-daily-rotate-file types resolve after pnpm install
import DailyRotateFile from "winston-daily-rotate-file";
import { resolveLogsRoot } from "../../runtime/appPaths";

const LOGS_DIR = path.join(resolveLogsRoot(), "app");

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }: Record<string, unknown>) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} ${level}: ${message}${metaStr}`;
  }),
);

const fileRotateTransport = new DailyRotateFile({
  filename: path.join(LOGS_DIR, "app-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  maxSize: "10m",
  maxFiles: "14d",
  format: jsonFormat,
  zippedArchive: true,
});

const errorFileRotateTransport = new DailyRotateFile({
  filename: path.join(LOGS_DIR, "error-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  maxSize: "10m",
  maxFiles: "14d",
  level: "error",
  format: jsonFormat,
  zippedArchive: true,
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? "info",
  defaultMeta: { service: "ai-novel-server" },
  transports: [
    fileRotateTransport,
    errorFileRotateTransport,
    new winston.transports.Console({
      format: process.env.NODE_ENV === "production" ? jsonFormat : consoleFormat,
    }),
  ],
});
