/**
 * operations/ — 导导演操作统一入口
 *
 * barrel export，从 debug/ 和 commands/ 目录重新导出。
 */

// ─── Debug ────────────────────────────────────────────────────
export { directorDebugBuffer } from "../debug/directorDebugBuffer";
export {
  saveDirectorDebugBrief,
  saveDirectorDebugDetail,
  saveDirectorDebugLog,
  enforceRetention,
  type DirectorDebugLogEntry,
} from "../debug/directorDebugLogger";
export type {
  DirectorDebugDetailLevel,
  DirectorDebugLlmCall,
  DirectorDebugContentSnapshot,
  DirectorDebugRepairAttempt,
  DirectorDebugAuditResult,
  DirectorDebugBufferSnapshot,
  DirectorDebugBriefLogEntry,
  DirectorDebugDetailLogEntry,
} from "../debug/directorDebugTypes";

// ─── Commands ─────────────────────────────────────────────────
export { DirectorCommandService } from "../commands/DirectorCommandService";
export { DirectorCommandExecutor } from "../commands/DirectorCommandExecutor";
export { DirectorCommandInterpreter } from "../commands/DirectorCommandInterpreter";
export {
  buildAcceptedTaskState,
  hashPayload,
  isUniqueConstraintError,
  parsePayload,
  resourceClassForCommand,
  stableJson,
  toAcceptedResponse,
  type DirectorCommandPayload,
} from "../commands/DirectorCommandServiceHelpers";
export {
  recoverStaleLeases,
  leaseNextCommand,
  markCommandRunning,
  renewLease,
  markCommandSucceeded,
  markCommandCancelled,
  markCommandFailed,
  closeCancelledTaskRuntimeState,
  ACTIVE_COMMAND_STATUSES,
} from "../commands/DirectorCommandServiceLeaseManager";
