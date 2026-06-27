/**
 * REQ-2022 调试数据类型定义
 *
 * 定义 LLM 调用记录、章节内容快照、修复尝试记录、审计结果记录的接口，
 * 以及缓冲区快照和日志条目类型。
 */

/** 详细级别配置 */
export type DirectorDebugDetailLevel = "minimal" | "standard" | "verbose";

/** LLM 调用记录 */
export interface DirectorDebugLlmCall {
  timestamp: string;
  prompt: string;
  completion: string;
  toolCalls: Array<{
    toolName: string;
    args: unknown;
    result: unknown;
  }>;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  durationMs: number;
}

/** 章节内容快照 */
export interface DirectorDebugContentSnapshot {
  nodeType: "draft" | "repair" | "acceptance";
  content: string;
  reason: string;
  timestamp: string;
  chapterVersion?: number;
}

/** 修复尝试记录 */
export interface DirectorDebugRepairAttempt {
  strategy: string;
  inputSummary: string;
  outputSummary: string;
  success: boolean;
  failureReason?: string;
  timestamp: string;
  durationMs: number;
}

/** 审计结果记录 */
export interface DirectorDebugAuditResult {
  passed: boolean;
  issues: Array<{
    code: string;
    message: string;
    severity: "error" | "warning" | "info";
  }>;
  timestamp: string;
  durationMs: number;
}

/** 缓冲区快照 — flush 操作的返回值 */
export interface DirectorDebugBufferSnapshot {
  llmCalls: DirectorDebugLlmCall[];
  contentSnapshots: DirectorDebugContentSnapshot[];
  repairAttempts: DirectorDebugRepairAttempt[];
  auditResults: DirectorDebugAuditResult[];
}

/** 简要日志条目（写入 *_brief.json） */
export interface DirectorDebugBriefLogEntry {
  // REQ-2021 已有字段
  timestamp: string;
  taskId: string;
  novelId: string;
  chapterId: string | null;
  autoExecution: unknown;
  circuitBreaker: unknown;
  recentLlmUsage: unknown[];
  errorStack: string | null;
  config: unknown;

  // REQ-2022 新增字段
  detailLogPath: string;
  detailLevel: DirectorDebugDetailLevel;
  summary: {
    totalLlmCalls: number;
    totalTokens: number;
    repairAttempts: number;
    lastAuditPassed: boolean;
  };
}

/** 详细日志条目（写入 *_detail.json） */
export interface DirectorDebugDetailLogEntry {
  timestamp: string;
  taskId: string;
  novelId: string;
  chapterId: string | null;
  detailLevel: DirectorDebugDetailLevel;
  llmCallHistory: DirectorDebugLlmCall[];
  contentSnapshots: DirectorDebugContentSnapshot[];
  repairAttempts: DirectorDebugRepairAttempt[];
  auditResults: DirectorDebugAuditResult[];
}
