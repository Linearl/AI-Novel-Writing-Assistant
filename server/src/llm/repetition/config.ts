/**
 * Environment-based configuration for the repetition detection system.
 *
 * All settings are read from `process.env` with sensible defaults.
 * The system is **disabled by default** (`REPETITION_RECOVERY_ENABLED=false`)
 * to avoid breaking existing streaming behavior.
 */

import type { MonitorConfig } from "./monitor";

export interface RepetitionEnvConfig {
  enabled: boolean;
  windowSize: number;
  threshold: number;
  recoveryEnabled: boolean;
}

/**
 * Read repetition configuration from environment variables.
 */
export function loadRepetitionEnvConfig(): RepetitionEnvConfig {
  return {
    enabled:
      process.env.REPETITION_DETECTION_ENABLED !== "false" &&
      process.env.LOOP_DETECTOR_ENABLED !== "false",
    windowSize:
      Number(process.env.REPETITION_WINDOW_SIZE) || 200,
    threshold:
      Number(process.env.REPETITION_THRESHOLD) || 3,
    recoveryEnabled:
      process.env.REPETITION_RECOVERY_ENABLED !== "false",
  };
}

/**
 * Build a MonitorConfig from the environment.
 * When recovery is disabled, the monitor is effectively a no-op.
 */
export function buildMonitorConfigFromEnv(): Partial<MonitorConfig> {
  const env = loadRepetitionEnvConfig();
  return {
    enabled: env.enabled && env.recoveryEnabled,
    detector: {
      warningThreshold: env.threshold,
      criticalThreshold: env.threshold + 2,
      maxBlockSize: env.windowSize,
      minBlockSize: 2,
    },
    recovery: {
      replanAfter: 2,
      stopAfter: 4,
    },
    maxBufferTokens: Math.max(env.windowSize * 10, 2000),
  };
}
