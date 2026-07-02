/**
 * Shared JSON parsing helpers.
 *
 * Canonical definitions — all other files should import from here
 * instead of re-defining private copies.
 */

/**
 * Try to parse a JSON string, returning `fallback` on failure or empty input.
 */
export function safeParseJSON<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw?.trim()) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Alias kept for backward compatibility with drama module consumers.
 */
export const safeJsonParse = safeParseJSON;
