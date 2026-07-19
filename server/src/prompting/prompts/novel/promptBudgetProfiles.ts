import * as fs from "node:fs";
import * as path from "node:path";
import * as yaml from "js-yaml";
import type { PromptBudgetProfile } from "@ai-novel/shared";

/**
 * REQ-2059: token 预算配置从 server/configs/token-budgets.yaml 加载。
 *
 * 加载失败时降级使用以下 TypeScript 默认值，保证服务可启动。
 * 默认值与 YAML 内容保持同步，YAML 是单一真相源。
 */

// ---------------------------------------------------------------------------
// Fallback 默认值（与 configs/token-budgets.yaml 保持同步）
// ---------------------------------------------------------------------------

const FALLBACK_CONTEXT_BUDGETS = {
  directorCandidates: 4800,
  directorCandidatePatch: 4800,
  directorBookContract: 5600,
  directorBlueprint: 9600,
  storyMacroDecomposition: 7200,
  storyMacroFieldRegeneration: 6400,
  volumeStrategy: 7200,
  volumeStrategyCritique: 7200,
  volumeSkeleton: 8000,
  volumeBeatSheet: 25600,
  volumeChapterList: 25600,
  volumeChapterDetail: 25600,
  volumeRebalance: 6400,
  chapterWriter: 10400,
  chapterAcceptance: 19200,
  chapterArtifactDelta: 5600,
  chapterEditorWorkspaceDiagnosis: 5600,
  chapterEditorUserIntent: 3600,
  chapterEditorRewrite: 20000,
  chapterLightAudit: 14400,
  chapterReview: 10400,
  chapterRepair: 8800,
  chapterSummary: 4000,
  chapterCompress: 10400,
  chapterExpand: 10400,
  waterContentDetection: 10400,
  globalReview: 120000,
  themeAnalysis: 8000,
  characterConsistency: 32000,
  feedbackIssueGeneration: 32000,
} satisfies Record<string, number>;

export type NovelPromptBudgets = typeof FALLBACK_CONTEXT_BUDGETS;

const FALLBACK_RUNTIME_PROFILES: PromptBudgetProfile[] = [
  {
    promptId: "novel.chapter.writer",
    maxTokensBudget: FALLBACK_CONTEXT_BUDGETS.chapterWriter,
    preferredGroups: [
      "chapter_boundary",
      "chapter_mission",
      "previous_chapter_tail",
      "timeline_context",
      "previous_chapter_hook",
      "character_hard_facts",
      "payoff_directives",
      "style_contract",
      "volume_window",
      "participant_subset",
      "local_state",
      "open_conflicts",
      "recent_chapters",
    ],
    dropOrder: [
      "rag_facts",
      "world_rules",
      "continuation_constraints",
      "opening_constraints",
    ],
  },
  {
    promptId: "novel.chapter.acceptance_assessment",
    maxTokensBudget: FALLBACK_CONTEXT_BUDGETS.chapterAcceptance,
    preferredGroups: [
      "chapter_mission",
      "structure_obligations",
      "character_hard_facts",
      "local_state",
      "style_contract",
      "open_conflicts",
    ],
    dropOrder: [
      "recent_chapters",
      "participant_subset",
      "world_rules",
      "historical_issues",
    ],
  },
  {
    promptId: "novel.chapter.artifact_delta.extract",
    maxTokensBudget: FALLBACK_CONTEXT_BUDGETS.chapterArtifactDelta,
    preferredGroups: [
      "chapter_mission",
      "local_state",
      "character_hard_facts",
      "payoff_directives",
      "open_conflicts",
    ],
    dropOrder: [
      "recent_chapters",
      "world_rules",
      "historical_issues",
      "participant_subset",
    ],
  },
  {
    promptId: "audit.chapter.light",
    maxTokensBudget: FALLBACK_CONTEXT_BUDGETS.chapterLightAudit,
    preferredGroups: [
      "chapter_mission",
      "structure_obligations",
      "character_hard_facts",
      "local_state",
    ],
    dropOrder: [
      "recent_chapters",
      "participant_subset",
      "historical_issues",
      "world_rules",
    ],
  },
  {
    promptId: "audit.chapter.full",
    maxTokensBudget: FALLBACK_CONTEXT_BUDGETS.chapterReview,
    preferredGroups: [
      "chapter_mission",
      "structure_obligations",
      "character_hard_facts",
      "world_rules",
      "historical_issues",
    ],
    dropOrder: [
      "rag_facts",
      "recent_chapters",
      "participant_subset",
    ],
  },
  {
    promptId: "novel.review.repair",
    maxTokensBudget: FALLBACK_CONTEXT_BUDGETS.chapterRepair,
    preferredGroups: [
      "style_contract",
      "repair_issues",
      "chapter_mission",
      "previous_chapter_tail",
      "repair_boundaries",
      "character_hard_facts",
      "world_rules",
    ],
    dropOrder: [
      "recent_chapters",
      "participant_subset",
      "continuation_constraints",
    ],
  },
];

// ---------------------------------------------------------------------------
// YAML 加载
// ---------------------------------------------------------------------------

interface TokenBudgetsYaml {
  context_budgets?: Record<string, unknown>;
  runtime_profiles?: Record<string, unknown>;
}

function resolveYamlPath(): string {
  // 从 src（tsx 运行）和 dist（node 运行）都指向 server/configs/
  // src/prompting/prompts/novel/ -> ../../../../configs/
  // dist/prompting/prompts/novel/ -> ../../../../configs/
  return path.resolve(__dirname, "../../../../configs/token-budgets.yaml");
}

function loadYamlConfig(): TokenBudgetsYaml | null {
  try {
    const yamlPath = resolveYamlPath();
    if (!fs.existsSync(yamlPath)) {
      return null;
    }
    const content = fs.readFileSync(yamlPath, "utf-8");
    const parsed = yaml.load(content);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parsed as TokenBudgetsYaml;
  } catch {
    // YAML 加载或解析失败时降级到 fallback
    return null;
  }
}

function isNumberRecord(value: unknown): value is Record<string, number> {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return Object.values(record).every((v) => typeof v === "number" && Number.isFinite(v));
}

function buildContextBudgets(): NovelPromptBudgets {
  const config = loadYamlConfig();
  const yamlBudgets = config?.context_budgets;
  if (isNumberRecord(yamlBudgets)) {
    // 合并 fallback 与 YAML，保证 fallback 中存在但 YAML 缺失的键仍有值
    return { ...FALLBACK_CONTEXT_BUDGETS, ...yamlBudgets };
  }
  return FALLBACK_CONTEXT_BUDGETS;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function buildRuntimeProfiles(): PromptBudgetProfile[] {
  const config = loadYamlConfig();
  const yamlProfiles = config?.runtime_profiles;
  if (!yamlProfiles || typeof yamlProfiles !== "object") {
    return FALLBACK_RUNTIME_PROFILES;
  }

  const profiles: PromptBudgetProfile[] = [];
  for (const [promptId, raw] of Object.entries(yamlProfiles)) {
    if (!raw || typeof raw !== "object") {
      continue;
    }
    const entry = raw as {
      maxTokensBudget?: unknown;
      preferredGroups?: unknown;
      dropOrder?: unknown;
    };
    const maxTokensBudget = Number(entry.maxTokensBudget);
    if (!Number.isFinite(maxTokensBudget) || maxTokensBudget <= 0) {
      continue;
    }
    profiles.push({
      promptId,
      maxTokensBudget,
      preferredGroups: isStringArray(entry.preferredGroups) ? entry.preferredGroups : [],
      dropOrder: isStringArray(entry.dropOrder) ? entry.dropOrder : [],
    });
  }

  return profiles.length > 0 ? profiles : FALLBACK_RUNTIME_PROFILES;
}

// ---------------------------------------------------------------------------
// 导出（保持现有签名）
// ---------------------------------------------------------------------------

export const NOVEL_PROMPT_BUDGETS: NovelPromptBudgets = buildContextBudgets();
export const RUNTIME_PROMPT_BUDGET_PROFILES: PromptBudgetProfile[] = buildRuntimeProfiles();
