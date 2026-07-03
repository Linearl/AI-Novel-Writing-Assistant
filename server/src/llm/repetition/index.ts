/**
 * Repetition detection system — CJK-aware loop detection with graded recovery.
 *
 * Usage:
 *   import { RepetitionMonitor, buildMonitorConfigFromEnv } from "./llm/repetition";
 *   const monitor = new RepetitionMonitor(buildMonitorConfigFromEnv());
 */

export { tokenizeForNgram } from "./tokenizer";
export { detectConsecutiveRepeat, detectRepeatInText, createDetectorConfig } from "./detector";
export type { Severity, RepeatDetectionResult, DetectorConfig } from "./detector";
export {
  determineRecoveryAction,
  createRecoveryState,
  buildRecoveryMessage,
  RECOVERY_REMIND,
  RECOVERY_REPLAN,
  RECOVERY_STOP,
} from "./recovery";
export type { RecoveryAction, RecoveryState, GradedRecoveryConfig } from "./recovery";
export { RepetitionMonitor, createMonitorConfig } from "./monitor";
export type { MonitorConfig } from "./monitor";
export { loadRepetitionEnvConfig, buildMonitorConfigFromEnv } from "./config";
export type { RepetitionEnvConfig } from "./config";
