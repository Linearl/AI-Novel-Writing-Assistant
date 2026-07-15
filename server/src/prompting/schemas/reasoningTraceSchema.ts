import { z } from "zod";

/**
 * Shared zod schema for ReasoningTrace used across all director step output schemas.
 * This is a compact decision summary that enables downstream steps to understand
 * why prior decisions were made, not just what was decided.
 *
 * REQ-2055: 导演步骤间推理链路传递
 */
export const reasoningTraceSchema = z.object({
  step: z.string().trim().min(1).describe("步骤ID，如 story.macro.plan"),
  summary: z.string().trim().min(1).max(600).describe("关键决策原理的 2-3 句摘要"),
  rejectedAlternatives: z.string().trim().max(600).default("").describe("考虑过但被拒绝的方案及原因"),
  keyAssumptions: z.array(z.string().trim().min(1).max(280)).max(6).default([]),
});

export type ReasoningTraceParsed = z.infer<typeof reasoningTraceSchema>;
