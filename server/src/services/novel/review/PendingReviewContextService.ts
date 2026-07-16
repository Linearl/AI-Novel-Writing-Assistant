/**
 * PendingReviewContextService
 *
 * 章节进入待审（pending review）状态时，组装四大上下文区域，
 * 以 PromptContextBlock 形式注入审校 prompt 构建流程。
 *
 * 四大上下文：
 *   - previousSummary：前文章节摘要
 *   - characterStates：角色当前资源状态
 *   - worldChanges：世界设定近期变更
 *   - thematicContinuity：主题连贯性提示
 *
 * 数据来源：GenerationContextPackage（已在 GenerationContextAssembler 中组装）。
 * 约束：
 *   - 每个字段做长度截断，防止 prompt 超 token 限制
 *   - 数据缺失时优雅降级，显示"暂无数据"
 *   - 四大上下文可独立开关
 *
 * 前置依赖：
 *   - 理论依赖 REQ-7074（资源上下文重构），但本服务独立从 GenerationContextPackage
 *     读取已有字段，无需等 REQ-7074 完成。
 */

import type { GenerationContextPackage } from "@ai-novel/shared";
import { createContextBlock } from "../../../prompting/core/contextBudget";
import type { PromptContextBlock } from "../../../prompting/core/promptTypes";

// ---------------------------------------------------------------------------
// 长度限制
// ---------------------------------------------------------------------------

const TRUNCATE_LIMITS = {
  previousSummary: 500,
  characterStates: 400,
  worldChanges: 400,
  thematicContinuity: 300,
} as const;

const FALLBACK_EMPTY = "暂无数据";

// ---------------------------------------------------------------------------
// 开关配置
// ---------------------------------------------------------------------------

export interface PendingReviewContextToggle {
  previousSummary?: boolean;
  characterStates?: boolean;
  worldChanges?: boolean;
  thematicContinuity?: boolean;
}

const DEFAULT_TOGGLE: Required<PendingReviewContextToggle> = {
  previousSummary: true,
  characterStates: true,
  worldChanges: true,
  thematicContinuity: true,
};

// ---------------------------------------------------------------------------
// 通用辅助
// ---------------------------------------------------------------------------

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) {
    return text;
  }
  return text.slice(0, maxLen - 3) + "...";
}

function compactText(value: string | null | undefined, fallback = ""): string {
  return String(value ?? "").replace(/\s+/g, " ").trim() || fallback;
}

function takeTop(values: Array<string | null | undefined>, limit: number): string[] {
  const seen = new Set<string>();
  const results: string[] = [];
  for (const item of values) {
    const normalized = compactText(item);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    results.push(normalized);
    if (results.length >= limit) {
      break;
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// 各上下文构建器
// ---------------------------------------------------------------------------

/**
 * 前文摘要：从 previousChaptersSummary 提取最近几章的摘要。
 */
function buildPreviousSummary(pkg: GenerationContextPackage): string {
  const summaries = pkg.previousChaptersSummary ?? [];
  if (summaries.length === 0) {
    return FALLBACK_EMPTY;
  }
  const lines = summaries
    .slice(0, 3)
    .map((s, i) => `- 第${i + 1}章摘要: ${compactText(s)}`);
  const text = ["【前文摘要】", ...lines].join("\n");
  return truncate(text, TRUNCATE_LIMITS.previousSummary);
}

/**
 * 角色当前状态：从 characterRoster 提取角色名、当前状态、目标。
 */
function buildCharacterStates(pkg: GenerationContextPackage): string {
  const roster = pkg.characterRoster ?? [];
  if (roster.length === 0) {
    return FALLBACK_EMPTY;
  }
  const lines = roster.slice(0, 6).map((char) => {
    const parts = [char.name];
    if (char.role) parts.push(`(${char.role})`);
    if (char.currentState) parts.push(`状态: ${compactText(char.currentState)}`);
    if (char.currentGoal) parts.push(`目标: ${compactText(char.currentGoal)}`);
    return `- ${parts.join(" | ")}`;
  });
  const text = ["【角色当前状态】", ...lines].join("\n");
  return truncate(text, TRUNCATE_LIMITS.characterStates);
}

/**
 * 世界设定近期变更：从 canonicalState.worldState 和 storyWorldSlice 提取。
 */
function buildWorldChanges(pkg: GenerationContextPackage): string {
  const fragments: string[] = [];

  // 优先使用 canonicalState 中的世界状态
  const canonicalWorld = pkg.canonicalState?.worldState;
  if (canonicalWorld) {
    if (canonicalWorld.summary) {
      fragments.push(`世界摘要: ${compactText(canonicalWorld.summary)}`);
    }
    if (canonicalWorld.currentSituation) {
      fragments.push(`当前局势: ${compactText(canonicalWorld.currentSituation)}`);
    }
    const rules = canonicalWorld.rules ?? [];
    if (rules.length > 0) {
      fragments.push(`世界规则: ${compactText(rules.slice(0, 3).join("；"))}`);
    }
  }

  // 补充 storyWorldSlice（世界故事切片，来自 WorldContextGateway）
  const worldSlice = pkg.storyWorldSlice as string | null | undefined;
  if (!canonicalWorld && typeof worldSlice === "string" && worldSlice.trim()) {
    fragments.push(`世界切片: ${compactText(worldSlice)}`);
  }

  if (fragments.length === 0) {
    return FALLBACK_EMPTY;
  }
  const text = ["【世界设定近期变更】", ...fragments].join("\n");
  return truncate(text, TRUNCATE_LIMITS.worldChanges);
}

/**
 * 主题连贯性提示：从 canonicalState.bookContract 提取核心卖点、阅读承诺和主题约束。
 */
function buildThematicContinuity(pkg: GenerationContextPackage): string {
  const fragments: string[] = [];

  // 优先从 canonicalState 获取完整的 bookContract（含 readingPromise）
  const canonicalContract = pkg.canonicalState?.bookContract;
  if (canonicalContract) {
    if (canonicalContract.coreSellingPoint?.trim()) {
      fragments.push(`核心卖点: ${compactText(canonicalContract.coreSellingPoint)}`);
    }
    if (canonicalContract.readingPromise?.trim()) {
      fragments.push(`阅读承诺: ${compactText(canonicalContract.readingPromise)}`);
    }
    if (canonicalContract.relationshipMainline?.trim()) {
      fragments.push(`关系主线: ${compactText(canonicalContract.relationshipMainline)}`);
    }
  }

  // 回退到 bookContract（BuildContext 只有基本字段）
  const contract = pkg.bookContract;
  if (fragments.length === 0 && contract) {
    if (contract.sellingPoint?.trim()) {
      fragments.push(`核心卖点: ${compactText(contract.sellingPoint)}`);
    }
    if (contract.first30ChapterPromise?.trim()) {
      fragments.push(`前30章承诺: ${compactText(contract.first30ChapterPromise)}`);
    }
  }

  if (fragments.length === 0) {
    return FALLBACK_EMPTY;
  }
  const text = ["【主题连贯性】", ...fragments].join("\n");
  return truncate(text, TRUNCATE_LIMITS.thematicContinuity);
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class PendingReviewContextService {
  /**
   * 从 GenerationContextPackage 构建四大待审上下文块。
   *
   * 返回的 context blocks 可直接注入审校 prompt 流程。
   */
  buildContextBlocks(
    contextPackage: GenerationContextPackage,
    toggle: PendingReviewContextToggle = {},
  ): PromptContextBlock[] {
    const enabled = { ...DEFAULT_TOGGLE, ...toggle };
    const blocks: PromptContextBlock[] = [];

    if (enabled.previousSummary) {
      const content = buildPreviousSummary(contextPackage);
      if (content !== FALLBACK_EMPTY) {
        blocks.push(createContextBlock({
          id: "pending_review_previous_summary",
          group: "pending_review_context",
          priority: 88,
          required: false,
          content,
        }));
      }
    }

    if (enabled.characterStates) {
      const content = buildCharacterStates(contextPackage);
      if (content !== FALLBACK_EMPTY) {
        blocks.push(createContextBlock({
          id: "pending_review_character_states",
          group: "pending_review_context",
          priority: 87,
          required: false,
          content,
        }));
      }
    }

    if (enabled.worldChanges) {
      const content = buildWorldChanges(contextPackage);
      if (content !== FALLBACK_EMPTY) {
        blocks.push(createContextBlock({
          id: "pending_review_world_changes",
          group: "pending_review_context",
          priority: 86,
          required: false,
          content,
        }));
      }
    }

    if (enabled.thematicContinuity) {
      const content = buildThematicContinuity(contextPackage);
      if (content !== FALLBACK_EMPTY) {
        blocks.push(createContextBlock({
          id: "pending_review_thematic_continuity",
          group: "pending_review_context",
          priority: 85,
          required: false,
          content,
        }));
      }
    }

    return blocks;
  }

  /**
   * 返回一段纯文本形式的待审上下文（供直接内联到 HumanMessage）。
   * 备选方案，主要用于与现有分层上下文机制不冲突的场景。
   */
  buildContextText(
    contextPackage: GenerationContextPackage,
    toggle: PendingReviewContextToggle = {},
  ): string {
    const blocks = this.buildContextBlocks(contextPackage, toggle);
    if (blocks.length === 0) {
      return "待审上下文：暂无";
    }
    return blocks.map((block) => block.content.trim()).join("\n\n");
  }
}

export const pendingReviewContextService = new PendingReviewContextService();
