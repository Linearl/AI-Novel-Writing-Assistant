/**
 * REQ-2022 内存缓冲区管理器
 *
 * 按 taskId 隔离的环形缓冲区，在质量修复流程中实时记录 LLM 调用历史、
 * 章节内容演变、修复尝试和审计结果。断路器触发时 flush 为批量 JSON。
 */

import type {
  DirectorDebugLlmCall,
  DirectorDebugContentSnapshot,
  DirectorDebugRepairAttempt,
  DirectorDebugAuditResult,
  DirectorDebugBufferSnapshot,
} from "./directorDebugTypes";

const LLM_CALL_RING_LIMIT = 50;

interface BufferState {
  llmCalls: DirectorDebugLlmCall[];
  contentSnapshots: DirectorDebugContentSnapshot[];
  repairAttempts: DirectorDebugRepairAttempt[];
  auditResults: DirectorDebugAuditResult[];
}

function createEmptyBuffer(): BufferState {
  return {
    llmCalls: [],
    contentSnapshots: [],
    repairAttempts: [],
    auditResults: [],
  };
}

class DirectorDebugBuffer {
  private buffers = new Map<string, BufferState>();

  private getOrCreate(taskId: string): BufferState {
    let buf = this.buffers.get(taskId);
    if (!buf) {
      buf = createEmptyBuffer();
      this.buffers.set(taskId, buf);
    }
    return buf;
  }

  /** 记录 LLM 调用（环形缓冲，上限 50 条） */
  recordLlmCall(taskId: string, call: DirectorDebugLlmCall): void {
    const buf = this.getOrCreate(taskId);
    buf.llmCalls.push(call);
    if (buf.llmCalls.length > LLM_CALL_RING_LIMIT) {
      buf.llmCalls.shift();
    }
  }

  /** 记录章节内容快照 */
  recordContentSnapshot(taskId: string, snapshot: DirectorDebugContentSnapshot): void {
    this.getOrCreate(taskId).contentSnapshots.push(snapshot);
  }

  /** 记录修复尝试 */
  recordRepairAttempt(taskId: string, attempt: DirectorDebugRepairAttempt): void {
    this.getOrCreate(taskId).repairAttempts.push(attempt);
  }

  /** 记录审计结果 */
  recordAuditResult(taskId: string, result: DirectorDebugAuditResult): void {
    this.getOrCreate(taskId).auditResults.push(result);
  }

  /** 原子提取并清空指定 taskId 的所有缓冲数据 */
  flush(taskId: string): DirectorDebugBufferSnapshot | null {
    const buf = this.buffers.get(taskId);
    if (!buf) return null;

    const snapshot: DirectorDebugBufferSnapshot = {
      llmCalls: [...buf.llmCalls],
      contentSnapshots: [...buf.contentSnapshots],
      repairAttempts: [...buf.repairAttempts],
      auditResults: [...buf.auditResults],
    };
    this.buffers.delete(taskId);
    return snapshot;
  }

  /** 修复成功时清空指定 taskId 的所有缓冲数据 */
  discardOnSuccess(taskId: string): void {
    this.buffers.delete(taskId);
  }
}

/** 全局单例，供整个 director 模块共享 */
export const directorDebugBuffer = new DirectorDebugBuffer();
