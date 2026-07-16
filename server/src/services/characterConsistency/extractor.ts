import { invokeStructuredLlm } from "../../llm/structuredInvoke";
import { characterStateExtractPrompt } from "./prompts";
import type { AppearanceState, PersonalityState, AbilityState, RelationshipState } from "./types";
import type { CharacterStateExtractionInput, CharacterStateExtractionOutput } from "./schemas";
import { logger } from "../../services/logging/LoggerService";

export interface ExtractedState {
  appearance: AppearanceState;
  personality: PersonalityState;
  abilities: AbilityState[];
  relationships: RelationshipState[];
  currentStatus: string | null;
  location: string | null;
}

function buildStateDescription(state: ExtractedState): string {
  const parts: string[] = [];

  parts.push(`外观: ${state.appearance.rawDescription || "（无描述）"}`);
  if (state.appearance.height) parts.push(`  身高: ${state.appearance.height}`);
  if (state.appearance.build) parts.push(`  体型: ${state.appearance.build}`);
  if (state.appearance.hair) parts.push(`  头发: ${state.appearance.hair}`);
  if (state.appearance.eyes) parts.push(`  眼睛: ${state.appearance.eyes}`);

  parts.push(`性格: ${state.personality.rawDescription || "（无描述）"}`);
  if (state.personality.traits.length > 0) parts.push(`  特质: ${state.personality.traits.join("、")}`);
  if (state.personality.motivations.length > 0) parts.push(`  动机: ${state.personality.motivations.join("、")}`);
  if (state.personality.fears.length > 0) parts.push(`  恐惧: ${state.personality.fears.join("、")}`);

  if (state.abilities.length > 0) {
    parts.push(`能力:`);
    for (const a of state.abilities) {
      parts.push(`  ${a.name}(Lv:${a.level})${a.limitations ? ` - 限制: ${a.limitations.join(", ")}` : ""}`);
    }
  }

  if (state.relationships.length > 0) {
    parts.push(`关系:`);
    for (const r of state.relationships) {
      parts.push(`  ${r.targetCharacterName}: ${r.type}${r.trustLevel !== undefined ? ` (信任: ${r.trustLevel})` : ""}`);
    }
  }

  if (state.currentStatus) parts.push(`状态: ${state.currentStatus}`);
  if (state.location) parts.push(`位置: ${state.location}`);

  return parts.join("\n");
}

export async function extractCharacterState(
  character: {
    id: string;
    name: string;
    personality?: string | null;
    background?: string | null;
    appearance?: string | null;
  },
  chapterContent: string,
  previousState: { appearance: string; personality: string } | null,
): Promise<ExtractedState> {
  const input: CharacterStateExtractionInput = {
    characterName: character.name,
    characterPersonality: character.personality ?? "",
    characterBackground: character.background ?? "",
    characterAppearance: character.appearance ?? "",
    chapterContent: chapterContent.slice(0, 12000),
    previousAppearance: previousState?.appearance ?? "",
    previousPersonality: previousState?.personality ?? "",
  };

  try {
    const rendered = characterStateExtractPrompt.render(input, {
      blocks: [],
      selectedBlockIds: [],
      droppedBlockIds: [],
      summarizedBlockIds: [],
      estimatedInputTokens: 0,
    });
    const result = await invokeStructuredLlm<CharacterStateExtractionOutput>({
      messages: rendered,
      schema: characterStateExtractPrompt.outputSchema!,
      label: "character-state-extraction",
      taskType: "planner",
      temperature: 0.3,
    });

    return {
      appearance: result.appearance,
      personality: result.personality,
      abilities: result.abilities ?? [],
      relationships: result.relationships ?? [],
      currentStatus: result.currentStatus,
      location: result.location,
    };
  } catch (error) {
    logger.warn("[CharacterStateExtractor] 状态提取失败，返回空状态", {
      characterId: character.id,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      appearance: { rawDescription: "提取失败" },
      personality: { traits: [], motivations: [], fears: [], rawDescription: "提取失败" },
      abilities: [],
      relationships: [],
      currentStatus: null,
      location: null,
    };
  }
}

export { buildStateDescription };
