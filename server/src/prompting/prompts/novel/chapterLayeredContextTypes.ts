/**
 * chapterLayeredContextTypes.ts
 *
 * 分层上下文共享类型定义。独立文件以便多处引用而不会产生循环依赖。
 *
 * 重构自 REQ-8704：从 chapterLayeredContextShared.ts / chapterLayeredContextHelpers.ts 中提取纯类型/常量。
 */

import type {
  ChapterExecutionObligationContract,
} from "@ai-novel/shared";
import type { PromptContextBlock } from "../../core/promptTypes";

// ---------------------------------------------------------------------------
// 禁止组合安全过滤
// ---------------------------------------------------------------------------

export const WRITER_FORBIDDEN_GROUPS = [
  "full_outline",
  "full_bible",
  "all_characters",
  "all_audit_issues",
  "anti_copy_corpus",
  "raw_rag_dump",
] as const;

// ---------------------------------------------------------------------------
// 模式类型
// ---------------------------------------------------------------------------

export type ChapterWriterBlockMode = "full" | "incremental" | "review" | "repair";

// ---------------------------------------------------------------------------
// 块构建选项
// ---------------------------------------------------------------------------

export interface ChapterWriterBlockOptions {
  mode?: ChapterWriterBlockMode;
  incrementalContext?: {
    previousRoundSummary?: string | null;
    roundInstruction?: string | null;
    currentSceneProgress?: string | null;
  } | null;
}

// ---------------------------------------------------------------------------
// 卷种子
// ---------------------------------------------------------------------------

export type RuntimeVolumeSeed = {
  currentVolume?: {
    id?: string | null;
    sortOrder?: number | null;
    title?: string | null;
    summary?: string | null;
    mainPromise?: string | null;
    openPayoffs?: string[];
  } | null;
  previousVolume?: {
    title?: string | null;
    summary?: string | null;
  } | null;
  nextVolume?: {
    title?: string | null;
    summary?: string | null;
  } | null;
  softFutureSummary?: string;
};

// ---------------------------------------------------------------------------
// 默认空义务合约
// ---------------------------------------------------------------------------

export const EMPTY_OBLIGATION_CONTRACT: ChapterExecutionObligationContract = {
  mustHitNow: [],
  mustPreserve: [],
  requiredPayoffTouches: [],
  requiredCharacterAppearances: [],
  requiredGoalChanges: [],
  canDefer: [],
  forbiddenCrossings: [],
};

// ---------------------------------------------------------------------------
// 角色动态类型
// ---------------------------------------------------------------------------

import type {
  DynamicCharacterOverviewItem,
  CharacterRelationStage,
  RuntimeCharacterCandidate,
} from "@ai-novel/shared";

export interface CharacterDynamicsOverview {
  novelId: string;
  currentVolume: {
    id: string;
    title: string;
    startChapterOrder: number | null;
    endChapterOrder: number | null;
    currentChapterOrder: number | null;
  } | null;
  summary: string;
  pendingCandidateCount: number;
  characters: DynamicCharacterOverviewItem[];
  relations: CharacterRelationStage[];
  candidates: RuntimeCharacterCandidate[];
  factionTracks: unknown[];
  assignments: unknown[];
}

// ---------------------------------------------------------------------------
// 便利重导出
// ---------------------------------------------------------------------------

export type { PromptContextBlock };
