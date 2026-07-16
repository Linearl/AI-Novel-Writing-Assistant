/**
 * Consistency monitoring shared type stubs.
 *
 * REQ-7051 一致性监控框架的共享类型定义。
 * 这些类型被 services/novel/quality/ConsistencyMonitor 和 modules/novel/quality/consistencyMonitor 使用。
 */

/* ── Core types ─────────────────────────────────────────────────────── */

export interface ChapterContent {
  chapterId: string;
  novelId: string;
  order: number;
  title: string;
  content: string;
  summary?: string | null;
  characters?: string[];
  locations?: string[];
  timeReferences?: string[];
}

export interface TimeReference {
  text: string;
  chapterId: string;
  paragraph: number;
  absoluteTime?: string | null;
  relativeTime?: string | null;
}

export interface LocationReference {
  name: string;
  chapterId: string;
  paragraph: number;
  description?: string | null;
}

export interface CharacterBehavior {
  characterId: string;
  characterName: string;
  chapterId: string;
  action: string;
  paragraph: number;
  consistencyNotes?: string | null;
}

/* ── Violation types ────────────────────────────────────────────────── */

export type ConsistencyViolationType =
  | "timeline_conflict"
  | "character_behavior"
  | "spatial_logic"
  | "setting_contradiction"
  | "setting";

export interface ConsistencyViolation {
  id?: string;
  type: ConsistencyViolationType | string;
  severity: "critical" | "warning" | "info" | "error";
  description: string;
  chapterId?: string;
  chapterIds: string[];
  locations: unknown[];
  relatedChapterId?: string | null;
  evidence?: string;
  suggestion?: string | null;
}

export interface ConsistencyViolationRecord extends ConsistencyViolation {
  id: string;
  novelId: string;
  status: "open" | "resolved" | "ignored";
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  resolution?: string | null;
  ignoreReason?: string | null;
  createdAt: string;
  updatedAt?: string;
}

/* ── Checker interface ──────────────────────────────────────────────── */

export interface ConsistencyCheckContext {
  novelId: string;
  chapterId: string;
  lookbackChapters: number;
  recentChapters: ChapterContent[];
  config: ConsistencyConfig;
}

export interface ConsistencyChecker {
  name: string;
  check(context: ConsistencyCheckContext): Promise<ConsistencyViolation[]>;
}

/* ── Config ─────────────────────────────────────────────────────────── */

export interface ConsistencyConfig {
  enabled: boolean;
  lookbackChapters: number;
  timeline: { enabled: boolean; tolerance: number };
  characterBehavior: { enabled: boolean };
  spatialLogic: { enabled: boolean };
}

export const DEFAULT_CONSISTENCY_CONFIG: ConsistencyConfig = {
  enabled: true,
  lookbackChapters: 5,
  timeline: { enabled: true, tolerance: 1 },
  characterBehavior: { enabled: true },
  spatialLogic: { enabled: true },
};

/* ── Reports ────────────────────────────────────────────────────────── */

export interface ConsistencyReport {
  chapterId: string;
  checkedAt: string;
  violations: ConsistencyViolation[];
  passed: boolean;
  overallPassed: boolean;
  summary: string;
}

export interface NovelConsistencyReport {
  novelId: string;
  generatedAt?: string;
  chapterReports?: ConsistencyReport[];
  totalViolations: number;
  openViolations: number;
  criticalCount?: number;
  warningCount?: number;
  typeBreakdown: Record<string, number>;
  severityBreakdown: Record<string, number>;
  recentViolations?: ConsistencyViolationRecord[];
  summary?: string;
}
