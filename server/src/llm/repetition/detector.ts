/**
 * Consecutive repeat detector for tokenized text.
 *
 * Finds blocks of tokens that repeat back-to-back N times, returning
 * a severity level (none / warning / critical) based on the repetition count.
 */

import { tokenizeForNgram } from "./tokenizer";

export type Severity = "none" | "warning" | "critical";

export interface RepeatDetectionResult {
  severity: Severity;
  repeatCount: number;
  blockTokens: string[];
  blockText: string;
  totalTokensChecked: number;
}

export interface DetectorConfig {
  /** Number of consecutive repeats before warning. Default: 3 */
  warningThreshold: number;
  /** Number of consecutive repeats before critical. Default: 5 */
  criticalThreshold: number;
  /** Maximum block size (tokens) to search for. Default: 20 */
  maxBlockSize: number;
  /** Minimum block size (tokens). Default: 2 */
  minBlockSize: number;
}

const DEFAULT_DETECTOR_CONFIG: DetectorConfig = {
  warningThreshold: 3,
  criticalThreshold: 5,
  maxBlockSize: 20,
  minBlockSize: 2,
};

export function createDetectorConfig(overrides: Partial<DetectorConfig> = {}): DetectorConfig {
  return { ...DEFAULT_DETECTOR_CONFIG, ...overrides };
}

/**
 * Check if two token windows match exactly.
 */
function windowsMatch(tokens: string[], startA: number, startB: number, length: number): boolean {
  for (let i = 0; i < length; i++) {
    if (tokens[startA + i] !== tokens[startB + i]) return false;
  }
  return true;
}

/**
 * Detect consecutive repeated blocks in a token array.
 *
 * Scans from the end of the token list backwards, trying block sizes from
 * maxBlockSize down to minBlockSize, to find the largest repeating block.
 */
export function detectConsecutiveRepeat(
  tokens: string[],
  configOverrides: Partial<DetectorConfig> = {},
): RepeatDetectionResult {
  const config = createDetectorConfig(configOverrides);
  const empty: RepeatDetectionResult = {
    severity: "none",
    repeatCount: 0,
    blockTokens: [],
    blockText: "",
    totalTokensChecked: tokens.length,
  };

  if (tokens.length < config.minBlockSize * config.warningThreshold) {
    return empty;
  }

  let bestRepeatCount = 0;
  let bestBlockSize = 0;
  let bestBlockStart = 0;

  // Try block sizes from largest to smallest.
  for (let blockSize = config.maxBlockSize; blockSize >= config.minBlockSize; blockSize--) {
    // Scan for consecutive repeats ending at the end of the token list.
    let count = 1;
    let blockStart = tokens.length - blockSize * count;

    while (blockStart >= 0 && windowsMatch(tokens, blockStart, tokens.length - blockSize, blockSize)) {
      count++;
      blockStart = tokens.length - blockSize * count;
    }

    // The `count - 1` because the last iteration decremented one too many.
    const actualCount = count - 1;
    if (actualCount >= config.warningThreshold && actualCount > bestRepeatCount) {
      bestRepeatCount = actualCount;
      bestBlockSize = blockSize;
      bestBlockStart = tokens.length - blockSize * actualCount;
    }
  }

  if (bestRepeatCount < config.warningThreshold) {
    return empty;
  }

  const blockTokens = tokens.slice(bestBlockStart, bestBlockStart + bestBlockSize);
  const severity: Severity =
    bestRepeatCount >= config.criticalThreshold ? "critical" : "warning";

  return {
    severity,
    repeatCount: bestRepeatCount,
    blockTokens,
    blockText: blockTokens.join(""),
    totalTokensChecked: tokens.length,
  };
}

/**
 * Convenience wrapper: tokenize then detect.
 */
export function detectRepeatInText(
  text: string,
  configOverrides: Partial<DetectorConfig> = {},
): RepeatDetectionResult {
  const tokens = tokenizeForNgram(text);
  return detectConsecutiveRepeat(tokens, configOverrides);
}
