/**
 * 读取 DIRECTOR_DEBUG_LOG_ENABLED 环境变量。
 * 未设置或空值时默认返回 true（开启）。
 * 仅 "true" 或 "1" 返回 true，其余返回 false。
 */
export function isDirectorDebugLogEnabled(): boolean {
  const value = process.env.DIRECTOR_DEBUG_LOG_ENABLED?.toLowerCase();
  if (value === undefined || value === "") return true;
  return value === "true" || value === "1";
}

/** 调试日志详细级别 */
export type DirectorDebugDetailLevel = "minimal" | "standard" | "verbose";

/**
 * 读取 DIRECTOR_DEBUG_LOG_DETAIL_LEVEL 环境变量。
 * 支持 "minimal" | "standard" | "verbose"，默认 "standard"。
 */
export function getDirectorDebugDetailLevel(): DirectorDebugDetailLevel {
  const value = process.env.DIRECTOR_DEBUG_LOG_DETAIL_LEVEL?.toLowerCase();
  if (value === "minimal" || value === "verbose") return value;
  return "standard";
}

/**
 * 读取 DIRECTOR_DEBUG_LOG_RETENTION_HOURS 环境变量。
 * 返回正整数小时数，默认 168（7 天）。
 */
export function getDirectorDebugRetentionHours(): number {
  const value = parseInt(process.env.DIRECTOR_DEBUG_LOG_RETENTION_HOURS ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : 168;
}
