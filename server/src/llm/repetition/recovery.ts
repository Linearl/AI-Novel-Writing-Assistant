/**
 * Graded recovery strategies for detected repetition loops.
 *
 * Recovery escalates through three levels based on how many times
 * the detector has fired in succession:
 *
 *   RECOVERY_REMIND  – first escalation; inject a reminder into the prompt.
 *   RECOVERY_REPLAN  – second escalation; force the LLM to replan.
 *   RECOVERY_STOP    – final escalation; halt generation.
 */

import type { Severity } from "./detector";

export const RECOVERY_REMIND = "RECOVERY_REMIND" as const;
export const RECOVERY_REPLAN = "RECOVERY_REPLAN" as const;
export const RECOVERY_STOP = "RECOVERY_STOP" as const;

export type RecoveryAction =
  | typeof RECOVERY_REMIND
  | typeof RECOVERY_REPLAN
  | typeof RECOVERY_STOP;

export interface RecoveryState {
  escalationCount: number;
  lastAction: RecoveryAction | null;
}

/**
 * The prompt injected when we want the LLM to vary its output.
 */
export const REMIND_PROMPT =
  "Please continue writing in a fresh, varied way. Avoid repeating yourself.";

/**
 * The prompt injected when we want the LLM to replan from a different angle.
 */
export const REPLAN_PROMPT =
  "The previous output entered a repetitive loop. Please replan your approach and continue from a different angle.";

export interface GradedRecoveryConfig {
  /** Escalation count at which to switch from REMIND to REPLAN. Default: 2 */
  replanAfter: number;
  /** Escalation count at which to switch from REPLAN to STOP. Default: 4 */
  stopAfter: number;
}

const DEFAULT_RECOVERY_CONFIG: GradedRecoveryConfig = {
  replanAfter: 2,
  stopAfter: 4,
};

/**
 * Create a recovery state tracker.
 */
export function createRecoveryState(): RecoveryState {
  return { escalationCount: 0, lastAction: null };
}

/**
 * Given the current state and the severity of the latest detection,
 * determine the next recovery action.
 *
 * Escalation logic:
 *  - severity "none" resets the state.
 *  - severity "warning" or "critical" increments the escalation counter
 *    and maps it to a recovery action based on the config thresholds.
 */
export function determineRecoveryAction(
  state: RecoveryState,
  severity: Severity,
  config: GradedRecoveryConfig = DEFAULT_RECOVERY_CONFIG,
): { action: RecoveryAction; state: RecoveryState } {
  if (severity === "none") {
    return {
      action: RECOVERY_REMIND, // default; caller should check shouldRecover()
      state: { escalationCount: 0, lastAction: null },
    };
  }

  const newCount = state.escalationCount + 1;
  let action: RecoveryAction;

  if (newCount >= config.stopAfter) {
    action = RECOVERY_STOP;
  } else if (newCount >= config.replanAfter) {
    action = RECOVERY_REPLAN;
  } else {
    action = RECOVERY_REMIND;
  }

  return {
    action,
    state: { escalationCount: newCount, lastAction: action },
  };
}

/**
 * Build the user-facing message to inject into the streaming context
 * when a recovery action is triggered.
 */
export function buildRecoveryMessage(action: RecoveryAction): string {
  switch (action) {
    case RECOVERY_REMIND:
      return REMIND_PROMPT;
    case RECOVERY_REPLAN:
      return REPLAN_PROMPT;
    case RECOVERY_STOP:
      return "Repetition loop detected. Generation stopped.";
  }
}
