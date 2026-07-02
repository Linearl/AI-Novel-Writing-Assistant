/**
 * Shared Prisma / database error type guards.
 *
 * Canonical definitions — all other files should import from here
 * instead of re-defining private copies.
 */

/** Prisma error code for "table or view does not exist" */
export function isMissingTableError(error: unknown): boolean {
  return (
    typeof error === "object"
    && error !== null
    && "code" in error
    && (error as { code?: string }).code === "P2021"
  );
}

/** Prisma P1001 ("can't reach database server") or similar connectivity failures */
export function isDbUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const code = "code" in error ? (error as { code?: string }).code : undefined;
  const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  return code === "P1001" || /can't reach database server/i.test(message);
}
