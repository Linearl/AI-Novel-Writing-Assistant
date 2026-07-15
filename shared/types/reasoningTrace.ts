/**
 * Director step reasoning trace — a compact decision summary produced
 * alongside each key director step's structured output, enabling downstream
 * steps to understand why prior decisions were made, not just what was decided.
 *
 * REQ-2055: 导演步骤间推理链路传递
 */
export interface ReasoningTrace {
  /** The step ID that produced this trace (e.g. "story.macro.plan") */
  step: string;
  /** 2-3 sentence summary of the key decision rationale */
  summary: string;
  /** Alternatives considered but rejected, and why */
  rejectedAlternatives: string;
  /** Key assumptions that may affect downstream decisions */
  keyAssumptions: string[];
}

/**
 * A map from step ID to its reasoning trace, used for bulk lookups
 * when assembling the reasoning_trace context group.
 */
export type ReasoningTraceMap = Record<string, ReasoningTrace>;
