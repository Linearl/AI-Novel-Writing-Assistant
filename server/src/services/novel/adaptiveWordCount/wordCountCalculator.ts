/**
 * Adaptive word count calculation for chapter generation.
 *
 * Uses chapter role and base word count settings to compute
 * per-chapter min/max word count targets.
 */
import type { ChapterRole } from "@ai-novel/shared/types";

/** Word count coefficient table — per-role min/max multipliers applied to base range. */
const ROLE_COEFFICIENTS: Record<ChapterRole, { min: number; max: number }> = {
  normal: { min: 1.0, max: 1.25 },
  transition: { min: 1.0, max: 1.25 },
  climax: { min: 1.0, max: 2.5 },
  turning_point: { min: 1.0, max: 2.5 },
};

/** Default base word count range when no novel-level config exists. */
const DEFAULT_BASE_MIN = 3000;
const DEFAULT_BASE_MAX = 4000;

/**
 * Calculate the adaptive word count target for a chapter based on its role.
 *
 * @param baseMin - Novel-level minimum word count (default 3000)
 * @param baseMax - Novel-level maximum word count (default 4000)
 * @param role - Chapter narrative role
 * @returns Computed { min, max } word count target
 */
export function calculateWordCountTarget(
  baseMin: number = DEFAULT_BASE_MIN,
  baseMax: number = DEFAULT_BASE_MAX,
  role: ChapterRole = "normal",
): { min: number; max: number } {
  const coeff = ROLE_COEFFICIENTS[role] ?? ROLE_COEFFICIENTS.normal;
  return {
    min: Math.round(baseMin * coeff.min),
    max: Math.round(baseMax * coeff.max),
  };
}

/**
 * Compute word count targets for an array of roles.
 * Useful for batch annotation during volume planning.
 */
export function calculateWordCountTargets(
  roles: ChapterRole[],
  baseMin: number = DEFAULT_BASE_MIN,
  baseMax: number = DEFAULT_BASE_MAX,
): Array<{ min: number; max: number }> {
  return roles.map((role) => calculateWordCountTarget(baseMin, baseMax, role));
}

/**
 * Detect the adjustment action needed based on actual vs target word count.
 *
 * @param actual - Actual word count of the chapter
 * @param target - Target range { min, max }
 * @returns "over" | "under" | "ok"
 */
export function detectWordCountAdjustment(
  actual: number,
  target: { min: number; max: number },
): "over" | "under" | "ok" {
  if (actual > target.max) return "over";
  if (actual < target.min) return "under";
  return "ok";
}
