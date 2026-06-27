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
