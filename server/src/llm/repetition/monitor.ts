/**
 * RepetitionMonitor — integrates tokenizer, detector, and recovery into
 * a streaming-oriented API.
 *
 * Usage:
 *   const monitor = new RepetitionMonitor(config);
 *   for each chunk: monitor.processChunk(chunk);
 *   if (monitor.shouldRecover()) { ... }
 *   const action = monitor.getRecoveryAction();
 */

import { tokenizeForNgram } from "./tokenizer";
import { detectConsecutiveRepeat, type Severity, type RepeatDetectionResult, type DetectorConfig } from "./detector";
import {
  determineRecoveryAction,
  createRecoveryState,
  buildRecoveryMessage,
  type RecoveryAction,
  type RecoveryState,
  type GradedRecoveryConfig,
  RECOVERY_REMIND,
  RECOVERY_REPLAN,
  RECOVERY_STOP,
} from "./recovery";

export { RECOVERY_REMIND, RECOVERY_REPLAN, RECOVERY_STOP } from "./recovery";

export interface MonitorConfig {
  detector: Partial<DetectorConfig>;
  recovery: GradedRecoveryConfig;
  enabled: boolean;
  /** Max token buffer before compaction. Default: 2000 */
  maxBufferTokens: number;
}

const DEFAULT_MONITOR_CONFIG: MonitorConfig = {
  detector: {},
  recovery: { replanAfter: 2, stopAfter: 4 },
  enabled: true,
  maxBufferTokens: 2000,
};

export function createMonitorConfig(overrides: Partial<MonitorConfig> = {}): MonitorConfig {
  return {
    ...DEFAULT_MONITOR_CONFIG,
    ...overrides,
    detector: { ...DEFAULT_MONITOR_CONFIG.detector, ...overrides.detector },
    recovery: { ...DEFAULT_MONITOR_CONFIG.recovery, ...overrides.recovery },
  };
}

export class RepetitionMonitor {
  private buffer = "";
  private tokens: string[] = [];
  private recoveryState: RecoveryState;
  private config: MonitorConfig;
  private lastDetection: RepeatDetectionResult | null = null;
  private prevDetectionSeverity: Severity = "none";
  private recoveredAction: RecoveryAction | null = null;

  constructor(configOverrides: Partial<MonitorConfig> = {}) {
    this.config = createMonitorConfig(configOverrides);
    this.recoveryState = createRecoveryState();
  }

  /**
   * Process a streaming chunk. Accumulates text and runs detection.
   * Returns the latest detection result (may be severity "none").
   */
  processChunk(chunk: string): RepeatDetectionResult {
    if (!this.config.enabled) {
      return { severity: "none", repeatCount: 0, blockTokens: [], blockText: "", totalTokensChecked: 0 };
    }

    this.buffer += chunk;
    this.tokens = tokenizeForNgram(this.buffer);

    // Compact buffer if it grows too large (keep last N tokens worth of text).
    if (this.tokens.length > this.config.maxBufferTokens) {
      this.compactBuffer();
    }

    const detection = detectConsecutiveRepeat(this.tokens, this.config.detector);
    this.lastDetection = detection;

    if (detection.severity !== "none") {
      // Only escalate on a fresh detection (first time severity is non-none),
      // not when the same persistent loop continues across chunks.
      if (this.prevDetectionSeverity === "none") {
        const { action, state } = determineRecoveryAction(
          this.recoveryState,
          detection.severity,
          this.config.recovery,
        );
        this.recoveryState = state;
        this.recoveredAction = action;
      }
      // If detection persists, keep current recovery action unchanged.
    } else {
      // Clear recovery action when no repetition detected,
      // but preserve escalation state across segments.
      this.recoveredAction = null;
    }

    this.prevDetectionSeverity = detection.severity;
    return detection;
  }

  /**
   * Whether a recovery action should be taken.
   */
  shouldRecover(): boolean {
    return this.recoveredAction !== null;
  }

  /**
   * Get the recovery action. null if no recovery needed.
   */
  getRecoveryAction(): RecoveryAction | null {
    return this.recoveredAction;
  }

  /**
   * Get the user-facing message for the current recovery action.
   * Empty string if no recovery needed.
   */
  getRecoveryMessage(): string {
    if (!this.recoveredAction) return "";
    return buildRecoveryMessage(this.recoveredAction);
  }

  /**
   * Whether the stream should be stopped entirely.
   */
  shouldStop(): boolean {
    return this.recoveredAction === RECOVERY_STOP;
  }

  /**
   * Get the latest detection result.
   */
  getLastDetection(): RepeatDetectionResult | null {
    return this.lastDetection;
  }

  /**
   * Get the current escalation count.
   */
  getEscalationCount(): number {
    return this.recoveryState.escalationCount;
  }

  /**
   * Reset all state for a new stream.
   */
  /**
   * Reset text accumulation for a new stream segment.
   * Preserves escalation state so that repeated recoveries across segments
   * continue to escalate.
   */
  reset(): void {
    this.buffer = "";
    this.tokens = [];
    this.lastDetection = null;
    this.prevDetectionSeverity = "none";
    this.recoveredAction = null;
  }

  /**
   * Full reset including escalation state.
   */
  resetAll(): void {
    this.buffer = "";
    this.tokens = [];
    this.recoveryState = createRecoveryState();
    this.lastDetection = null;
    this.prevDetectionSeverity = "none";
    this.recoveredAction = null;
  }

  /**
   * Compact the buffer by keeping only the last maxBufferTokens worth of
   * text. This prevents memory growth during long streams.
   */
  private compactBuffer(): void {
    const keep = Math.floor(this.config.maxBufferTokens * 0.75);
    this.tokens = this.tokens.slice(-keep);
    this.buffer = this.tokens.join("");
  }

  /**
   * Whether the monitor is enabled.
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
}
