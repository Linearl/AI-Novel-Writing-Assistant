import path from "node:path";
import { AppError } from "../../middleware/errorHandler";

/**
 * Assert that a resolved path stays within the allowed root directory.
 * Prevents path traversal attacks (e.g. "../../etc/passwd").
 *
 * @throws {AppError} with status 400 if the path escapes the allowed root.
 */
export function assertSafePath(resolvedPath: string, allowedRoot: string): void {
  const normalizedResolved = path.resolve(resolvedPath);
  const normalizedRoot = path.resolve(allowedRoot);

  if (!normalizedResolved.startsWith(normalizedRoot + path.sep) && normalizedResolved !== normalizedRoot) {
    throw new AppError("Invalid file path.", 400);
  }
}
