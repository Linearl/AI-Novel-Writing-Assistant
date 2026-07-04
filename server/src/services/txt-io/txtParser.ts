/**
 * Shared TXT parsing utilities for asset import endpoints.
 *
 * Handles UTF-8 decode, BOM strip, \r removal, and empty line filtering.
 */

/** Normalise raw TXT input into clean lines. */
export function normaliseTxtLines(raw: string): string[] {
  return raw
    .replace(/^﻿/, "") // strip UTF-8 BOM
    .split(/\r?\n/)
    .map((l) => l.trim());
}

/** Filter out blank lines from pre-normalised lines. */
export function filterBlankLines(lines: string[]): string[] {
  return lines.filter((l) => l.length > 0);
}

/**
 * Parse the full content and return non-empty, trimmed lines.
 * Throws on empty content.
 */
export function parseTxtContent(raw: string): string[] {
  const lines = filterBlankLines(normaliseTxtLines(raw));
  if (lines.length === 0) {
    throw new TxtParseError("文件内容为空");
  }
  return lines;
}

/** Sentinel error class carrying line-number context. */
export class TxtParseError extends Error {
  readonly line?: number;
  readonly detail?: string;

  constructor(message: string, line?: number, detail?: string) {
    super(message);
    this.name = "TxtParseError";
    this.line = line;
    this.detail = detail;
  }
}
