/**
 * REQ-7051: Consistency monitor shared types for cross-novel consistency checking.
 */

// ── Configuration ──────────────────────────────────────────────────────

export interface ConsistencyConfig {
  enabled: boolean;
  lookbackChapters: number;
  thresholds: {
    timeline: number;
    character: number;
    spatial: number;
  };
  autoReport: boolean;
  async: boolean;
}

export const DEFAULT_CONSISTENCY_CONFIG: ConsistencyConfig = {
  enabled: true,
  lookbackChapters: 3,
  thresholds: {
    timeline: 0.5,
    character: 0.5,
    spatial: 0.5,
  },
  autoReport: true,
  async: true,
};

// ── Violation ──────────────────────────────────────────────────────────

export type ConsistencyViolationType = "timeline" | "character" | "spatial" | "setting";
export type ConsistencyViolationSeverity = "error" | "warning" | "info";
export type ConsistencyViolationStatus = "open" | "resolved" | "ignored";

export interface ConsistencyLocation {
  chapterId: string;
  paragraph?: number;
  sentence?: number;
}

export interface ConsistencyViolation {
  type: ConsistencyViolationType;
  severity: ConsistencyViolationSeverity;
  description: string;
  chapterIds: string[];
  locations: ConsistencyLocation[];
  suggestion: string;
  evidence: string;
}

export interface ConsistencyViolationRecord extends ConsistencyViolation {
  id: string;
  novelId: string;
  chapterId: string;
  status: ConsistencyViolationStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  resolution: string | null;
}

// ── Report ─────────────────────────────────────────────────────────────

export interface TimelineEvent {
  chapterId: string;
  description: string;
  timeReference: string;
  order: number;
}

export interface TimelineData {
  events: TimelineEvent[];
}

export interface ConsistencyReport {
  chapterId: string;
  checkedAt: string;
  violations: ConsistencyViolation[];
  overallPassed: boolean;
  summary: string;
  timelineData?: TimelineData;
}

export interface NovelConsistencyReport {
  novelId: string;
  totalViolations: number;
  openViolations: number;
  typeBreakdown: Record<string, number>;
  severityBreakdown: Record<string, number>;
  recentViolations: ConsistencyViolationRecord[];
}

// ── Checker Interface ──────────────────────────────────────────────────

export interface ChapterContent {
  id: string;
  title: string;
  content: string;
  order: number;
}

export interface ConsistencyChecker {
  readonly type: ConsistencyViolationType;
  check(
    currentChapter: ChapterContent,
    previousChapters: ChapterContent[],
    context?: ConsistencyCheckContext,
  ): Promise<ConsistencyViolation[]>;
}

export interface ConsistencyCheckContext {
  novelId?: string;
  characters?: Array<{ id: string; name: string; personality?: string; background?: string }>;
  config?: Partial<ConsistencyConfig>;
}

// ── Time reference parsing ─────────────────────────────────────────────

export interface TimeReference {
  type: string;
  text: string;
  position: number;
  normalizedTime: number;
}

export interface LocationReference {
  characterName?: string;
  place: string;
  paragraph: number;
  sceneTransition: boolean;
}

export interface CharacterBehavior {
  characterName: string;
  actions: string[];
  emotion: string | null;
  description: string;
  paragraph: number;
}

export interface PersonalityShift {
  description: string;
  prevChapterId: string;
  prevBehavior: string;
  paragraph: number;
}
