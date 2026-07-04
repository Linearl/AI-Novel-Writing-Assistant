/**
 * Water content detection service — LLM-based paragraph analysis
 * to identify "water content" (filler/low-value descriptions).
 */
import type { WaterContentAnalysis } from "@ai-novel/shared/types";

export interface WaterContentDetectionInput {
  chapterContent: string;
  chapterTitle: string;
  novelTitle: string;
  threshold?: number;
}

export interface WaterContentDetectionResult extends WaterContentAnalysis {
  flaggedParagraphs: string[];
  details?: string;
}

/**
 * Placeholder for LLM-based water content detection.
 * This service will be wired to the water-content-detection prompt asset
 * and the LLM invoke pipeline in a subsequent integration step.
 */
export async function detectWaterContent(
  _input: WaterContentDetectionInput,
): Promise<WaterContentDetectionResult> {
  // TODO: Wire to LLM pipeline with prompt asset "novel.water_content.detect"
  // For now, return a safe default indicating detection was skipped
  return {
    score: 0,
    flagged: false,
    analyzedAt: new Date().toISOString(),
    flaggedParagraphs: [],
    details: "Water content detection not yet wired to LLM pipeline",
  };
}

/**
 * Apply threshold to a water content analysis result.
 * If score exceeds the configured threshold, mark as flagged.
 */
export function applyWaterContentThreshold(
  result: WaterContentDetectionResult,
  threshold: number = 30,
): WaterContentDetectionResult {
  const flagged = result.score > threshold;
  return {
    ...result,
    flagged,
  };
}
