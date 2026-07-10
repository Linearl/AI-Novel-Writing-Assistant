import type { GenerationContextPackage } from "@ai-novel/shared";
import type {
  ExtractedTimelineEvent,
  TimelineCheckResult,
  TimelineContextForChapter,
  TimelineHookDraft,
} from "@ai-novel/shared";
import type { LLMProvider } from "@ai-novel/shared";

export type ChapterTimelineFinalizationMode = "stable" | "degraded";
export type TimelineFinalizationClaimStatus = "claimed" | "already_done" | "running";

export interface ChapterTimelineGateResult {
  result: TimelineCheckResult;
  extractedEvents: ExtractedTimelineEvent[];
  extractedHooks: TimelineHookDraft[];
  timeAnchor?: { storyDayIndex?: number | null; label?: string | null } | null;
  addressedHookIds: string[];
  resolvedHookIds: string[];
  extractorSucceeded: boolean;
  extractorError?: string | null;
  timelineContext: TimelineContextForChapter | null;
}

export interface ChapterTimelineFinalizationResult {
  syncMode: ChapterTimelineFinalizationMode;
  contentHash: string;
  extractorSucceeded: boolean;
  eventCount: number;
  hookCount: number;
  checkpointWritten: boolean;
}

export interface TimelineFinalizationRequestOptions {
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
}

export interface FinalizeCurrentContentInput {
  novelId: string;
  chapterId: string;
  content: string;
  contextPackage?: GenerationContextPackage | null;
  request?: TimelineFinalizationRequestOptions;
  timelineGate?: ChapterTimelineGateResult | null;
  mode?: ChapterTimelineFinalizationMode;
  reason?: string;
  sourceStage: string;
  qualityDebt?: boolean;
}

