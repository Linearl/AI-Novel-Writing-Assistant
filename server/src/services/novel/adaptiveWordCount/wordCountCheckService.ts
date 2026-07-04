/**
 * Post-generation word count check and automatic compress/expand pipeline.
 *
 * Integrates with the chapter writing graph to enforce word count targets
 * and trigger water content detection.
 */
import type { WaterContentAnalysis } from "@ai-novel/shared/types";
import {
  detectWordCountAdjustment,
  type calculateWordCountTarget,
} from "./wordCountCalculator";

/** Maximum rounds of compress/expand before marking warning and moving on. */
const MAX_ADJUSTMENT_ROUNDS = 2;

export interface WordCountCheckResult {
  adjustment: "over" | "under" | "ok";
  actualCount: number;
  target: { min: number; max: number };
  roundsExecuted: number;
  warning?: string;
}

/**
 * Check actual word count against target range and determine if adjustment is needed.
 */
export function checkWordCount(
  actual: number,
  target: { min: number; max: number },
): "over" | "under" | "ok" {
  return detectWordCountAdjustment(actual, target);
}

/**
 * Run the word count adjustment loop: check, adjust, re-check.
 * Returns a result indicating final state after up to MAX_ADJUSTMENT_ROUNDS.
 */
export function runWordCountAdjustmentLoop(
  actual: number,
  target: { min: number; max: number },
  adjustFn: (content: string, action: "over" | "under") => string,
  currentContent: string,
): WordCountCheckResult {
  let content = currentContent;
  let rounds = 0;

  for (let i = 0; i < MAX_ADJUSTMENT_ROUNDS; i++) {
    const adjustment = detectWordCountAdjustment(actual, target);
    if (adjustment === "ok") {
      return { adjustment: "ok", actualCount: actual, target, roundsExecuted: rounds };
    }

    content = adjustFn(content, adjustment);
    rounds++;
    actual = measureWordCount(content);
  }

  const finalAdjustment = detectWordCountAdjustment(actual, target);
  return {
    adjustment: finalAdjustment,
    actualCount: actual,
    target,
    roundsExecuted: rounds,
    warning:
      finalAdjustment !== "ok"
        ? `Word count adjustment exceeded ${MAX_ADJUSTMENT_ROUNDS} rounds. Final: ${actual}, target: ${target.min}-${target.max}`
        : undefined,
  };
}

/**
 * Measure the word count of Chinese text content.
 * Counts CJK characters + alphanumeric words.
 */
export function measureWordCount(text: string): number {
  if (!text) return 0;
  const cjkChars = (text.match(/[一-鿿]/g) ?? []).length;
  const words = text
    .replace(/[一-鿿]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
  return cjkChars + words;
}
