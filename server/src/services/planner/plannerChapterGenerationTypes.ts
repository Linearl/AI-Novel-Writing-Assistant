/**
 * Types and constants for planner chapter generation.
 *
 * Extracted from plannerChapterGeneration.ts to reduce file size.
 */
import type { StoryPlan } from "@ai-novel/shared";
import type { PlannerLlmOptions } from "./plannerLlm";

export interface PlannerOptions extends PlannerLlmOptions {
  taskStyleProfileId?: string;
}

export interface GenerateChapterPlanOptions extends PlannerOptions {
  replanContext?: {
    reason: string;
    triggerType: string;
    triggerReason?: string;
    windowReason?: string;
    whyTheseChapters?: string;
    sourceIssueIds: string[];
    windowIndex: number;
    windowSize: number;
    affectedChapterOrders: number[];
    anchorChapterOrder?: number | null;
    blockingLedgerKeys?: string[];
    replannedFromPlanId: string | null;
  };
}

export interface ReplanInput extends PlannerOptions {
  chapterId?: string;
  triggerType?: string;
  sourceIssueIds?: string[];
  windowSize?: number;
  reason: string;
}

export const plannerStoryModeSelect = {
  id: true,
  name: true,
  description: true,
  template: true,
  parentId: true,
  profileJson: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** Dependencies injected from PlannerService to avoid circular reference. */
export interface PlannerChapterGenerationDeps {
  getBookPlan: (novelId: string) => Promise<StoryPlan | null>;
  listArcPlans: (novelId: string) => Promise<StoryPlan[]>;
  resolvePlannerStyleEngineSummary: (novelId: string, chapterId?: string, taskStyleProfileId?: string) => Promise<string>;
  getChapterPlan: (novelId: string, chapterId: string) => Promise<StoryPlan | null>;
}
