/**
 * Shared text utilities — 消除 server 层各模块中重复定义的 compactText / truncateText。
 *
 * 设计决策：
 * - compactText：字符串规范化 + 空值降级（替代各处 private function compactText）。
 * - truncateText：compactText 基础上截断到 maxChars，末尾追加 "..."。
 * - 两者均为纯函数，无副作用，可在 shared 包安全导出。
 */

/**
 * 将字符串标准化：去除多余空白，返回 trimmed 结果；
 * 若值为空或纯空白，返回 fallback。
 */
export function compactText(value: string | null | undefined, fallback = ""): string {
  const trimmed = value?.trim();
  return trimmed || fallback;
}

/**
 * 在 compactText 基础上截断到 maxChars。
 * 超长时截断并追加 "..."（不计入 maxChars）。
 */
export function truncateText(value: string | null | undefined, maxChars = 240): string {
  const text = compactText(value);
  if (text.length <= maxChars) {
    return text;
  }
  return text.slice(0, maxChars) + "...";
}
