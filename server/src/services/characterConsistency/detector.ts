import { invokeStructuredLlm } from "../../llm/structuredInvoke";
import { contradictionDetectPrompt } from "./prompts";
import type { CharacterConsistencyContradiction, ContradictionType, CharacterConsistencyStateRecord } from "./types";
import type { ContradictionDetectionOutput } from "./schemas";
import { buildStateDescription, type ExtractedState } from "./extractor";
import { logger } from "../../services/logging/LoggerService";

/**
 * Rule-based contradiction detection (fast, deterministic).
 */
function detectByRules(
  characterId: string,
  characterName: string,
  chapterNumber: number,
  newState: ExtractedState,
  historicalStates: CharacterConsistencyStateRecord[],
): CharacterConsistencyContradiction[] {
  const contradictions: CharacterConsistencyContradiction[] = [];
  const now = new Date();

  if (historicalStates.length === 0) return contradictions;

  const latest = historicalStates[historicalStates.length - 1];

  // 1. Appearance hard contradiction: explicit numeric/physical description changes
  if (latest.appearance && newState.appearance) {
    // Height conflict (if both specify a number)
    const heightA = latest.appearance.height?.match(/(\d+)/)?.[1];
    const heightB = newState.appearance.height?.match(/(\d+)/)?.[1];
    if (heightA && heightB && Math.abs(Number(heightA) - Number(heightB)) > 10) {
      contradictions.push(makeContradiction(
        characterId, characterName, chapterNumber, "appearance", "hard",
        `角色身高矛盾：历史记录为${latest.appearance.height}，新章节中为${newState.appearance.height}`,
        `身高: ${latest.appearance.height}`, `身高: ${newState.appearance.height}`,
        0.9, "请确认角色身高设定，统一两处描述", now,
      ));
    }

    // Hair color conflict
    if (
      latest.appearance.hair &&
      newState.appearance.hair &&
      latest.appearance.hair !== newState.appearance.hair &&
      latest.appearance.hair.length > 1 &&
      newState.appearance.hair.length > 1
    ) {
      // Avoid false positive on slight variations — only flag major differences
      const hasCommonWord = latest.appearance.hair.includes("长") === newState.appearance.hair.includes("长") ||
        latest.appearance.hair.includes("短") === newState.appearance.hair.includes("短");
      if (!hasCommonWord) {
        contradictions.push(makeContradiction(
          characterId, characterName, chapterNumber, "appearance", "hard",
          `角色发色矛盾：历史记录为"${latest.appearance.hair}"，新章节中为"${newState.appearance.hair}"`,
          `发色: ${latest.appearance.hair}`, `发色: ${newState.appearance.hair}`,
          0.85, "请确认角色发色，如有变更需有合理叙述", now,
        ));
      }
    }

    // Eye color conflict
    if (
      latest.appearance.eyes &&
      newState.appearance.eyes &&
      latest.appearance.eyes !== newState.appearance.eyes &&
      latest.appearance.eyes.length > 1 &&
      newState.appearance.eyes.length > 1
    ) {
      contradictions.push(makeContradiction(
        characterId, characterName, chapterNumber, "appearance", "hard",
        `角色瞳色矛盾：历史记录为"${latest.appearance.eyes}"，新章节中为"${newState.appearance.eyes}"`,
        `瞳色: ${latest.appearance.eyes}`, `瞳色: ${newState.appearance.eyes}`,
        0.85, "请确认角色瞳色，如有变更需有合理叙述", now,
      ));
    }
  }

  // 2. Personality hard contradiction: opposite traits
  if (latest.personality && newState.personality) {
    const oppositePairs: [string, string][] = [
      ["勇敢", "胆小"], ["善良", "残忍"], ["乐观", "悲观"],
      ["外向", "内向"], ["冷静", "冲动"], ["忠诚", "背叛"],
      ["慷慨", "吝啬"], ["温柔", "粗暴"], ["谨慎", "鲁莽"],
    ];

    for (const [a, b] of oppositePairs) {
      const hasA = newState.personality.traits.some((t: string) => t.includes(a));
      const hasB = newState.personality.traits.some((t: string) => t.includes(b));
      const prevB = latest.personality.traits.some((t: string) => t.includes(b));

      if (hasA && prevB && !hasB) {
        contradictions.push(makeContradiction(
          characterId, characterName, chapterNumber, "personality", "soft",
          `角色性格可能矛盾：新状态中出现"${a}"特质，而历史记录中有"${b}"倾向`,
          `性格特质含: ${b}`, `性格特质含: ${a}`,
          0.6, `请检查角色性格变化是否有合理剧情铺垫，如有则忽略此提示`, now,
        ));
      }
    }
  }

  // 3. Location contradiction
  if (latest.location && newState.location && latest.location !== newState.location) {
    // Only flag if the locations are far apart (simple keyword match)
    const commonLocations = ["房间", "门外", "门口", "隔壁", "同城区", "城里"];
    const isClose = commonLocations.some((loc) =>
      (latest.location!.includes(loc) || newState.location!.includes(loc))
    );

    if (!isClose && latest.location!.length > 1 && newState.location!.length > 1) {
      contradictions.push(makeContradiction(
        characterId, characterName, chapterNumber, "location", "soft",
        `角色位置变化：上一状态在"${latest.location}"，新状态在"${newState.location}"`,
        `位置: ${latest.location}`, `位置: ${newState.location}`,
        0.3, "请确认位置变化是否合理（可能是时间推进或场景切换）", now,
      ));
    }
  }

  return contradictions;
}

function makeContradiction(
  characterId: string,
  characterName: string,
  chapterNumber: number,
  type: ContradictionType,
  severity: "hard" | "soft",
  description: string,
  existingState: string,
  newState: string,
  confidence: number,
  suggestion: string | null,
  now: Date,
): CharacterConsistencyContradiction {
  return {
    id: "",
    novelId: "",
    chapterNumber,
    characterId,
    characterName,
    type,
    severity,
    description,
    existingState,
    newState,
    suggestion,
    confidence,
    resolved: false,
    resolvedNote: null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * LLM-based semantic contradiction detection.
 */
async function detectByLLM(
  characterName: string,
  chapterNumber: number,
  newState: ExtractedState,
  historicalStates: CharacterConsistencyStateRecord[],
): Promise<ContradictionDetectionOutput> {
  if (historicalStates.length === 0) {
    return { contradictions: [], summary: "无历史记录，跳过检测" };
  }

  const newStateDescription = buildStateDescription(newState);
  const historicalSummary = historicalStates
    .slice(-5)
    .map((s) => `[第${s.chapterNumber}章] 外貌:${s.appearance.rawDescription} 性格:${s.personality.rawDescription} 位置:${s.location ?? "未知"} 状态:${s.currentStatus ?? "未知"}`)
    .join("\n");

  const input = {
    characterName,
    chapterNumber,
    newStateDescription,
    historicalStatesSummary: historicalSummary,
  };

  try {
    const rendered = contradictionDetectPrompt.render(input, {
      blocks: [],
      selectedBlockIds: [],
      droppedBlockIds: [],
      summarizedBlockIds: [],
      estimatedInputTokens: 0,
    });
    const result = await invokeStructuredLlm<ContradictionDetectionOutput>({
      messages: rendered,
      schema: contradictionDetectPrompt.outputSchema!,
      label: "contradiction-detection",
      taskType: "planner",
      temperature: 0.3,
    });
    return result;
  } catch (error) {
    logger.warn("[ContradictionDetector] LLM检测失败", {
      characterName,
      error: error instanceof Error ? error.message : String(error),
    });
    return { contradictions: [], summary: "LLM检测异常" };
  }
}

export interface DetectionResult {
  ruleContradictions: CharacterConsistencyContradiction[];
  llmContradictions: CharacterConsistencyContradiction[];
}

export async function detectContradictions(
  novelId: string,
  characterId: string,
  characterName: string,
  chapterNumber: number,
  newState: ExtractedState,
  historicalStates: CharacterConsistencyStateRecord[],
): Promise<DetectionResult> {
  const now = new Date();

  // Rule-based detection (fast, deterministic)
  const ruleContradictions = detectByRules(
    characterId, characterName, chapterNumber, newState, historicalStates,
  ).map((c) => ({ ...c, novelId }));

  // LLM-based detection (semantic, deep)
  const llmOutput = await detectByLLM(characterName, chapterNumber, newState, historicalStates);

  const llmContradictions: CharacterConsistencyContradiction[] = llmOutput.contradictions.map((c) => ({
    id: "",
    novelId,
    chapterNumber,
    characterId,
    characterName,
    type: c.type,
    severity: c.severity,
    description: c.description,
    existingState: c.existingState,
    newState: c.newState,
    suggestion: c.suggestion ?? null,
    confidence: c.confidence,
    resolved: false,
    resolvedNote: null,
    createdAt: now,
    updatedAt: now,
  }));

  return { ruleContradictions, llmContradictions };
}
