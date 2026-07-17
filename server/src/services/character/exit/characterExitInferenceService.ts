import { prisma } from "../../../db/prisma";
import { runStructuredPrompt } from "../../../prompting/core/promptRunner";
import { characterExitInferencePrompt } from "../../../prompting/prompts/novel/characterExitInference.prompts";
import type { CharacterExitStatus } from "@ai-novel/shared";

const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;
const DEFAULT_FREEZE_THRESHOLD = 5;

export interface ExitInferenceEvent {
  characterId: string;
  characterName: string;
  exitType: "exited" | "dead";
  confidence: number;
  evidence: string;
}

export interface ExitInferenceResult {
  appliedEvents: ExitInferenceEvent[];
  pendingEvents: ExitInferenceEvent[];
  frozenCharacters: Array<{
    characterId: string;
    characterName: string;
    previousStatus: CharacterExitStatus;
  }>;
}

export class CharacterExitInferenceService {
  /**
   * Run exit inference after chapter confirmation.
   * For high-confidence events (>= threshold), update character exitStatus in DB.
   * For low-confidence events, return as pending for user review.
   */
  async inferAndApply(
    novelId: string,
    chapterId: string,
    chapterContent: string,
    chapterOutline: string,
    options?: {
      confidenceThreshold?: number;
      freezeThreshold?: number;
      provider?: string;
      model?: string;
    },
  ): Promise<ExitInferenceResult> {
    const confidenceThreshold = options?.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
    const freezeThreshold = options?.freezeThreshold ?? DEFAULT_FREEZE_THRESHOLD;

    // Load active characters for this novel
    const characters = await prisma.character.findMany({
      where: { novelId, exitStatus: "active" },
      select: { id: true, name: true, role: true },
    });

    if (characters.length === 0) {
      return { appliedEvents: [], pendingEvents: [], frozenCharacters: [] };
    }

    // Call LLM for exit inference
    let inferenceResult: { exitEvents: ExitInferenceEvent[] };
    try {
      const result = await runStructuredPrompt({
        asset: characterExitInferencePrompt,
        promptInput: {
          characters,
          chapterContent,
          chapterOutline,
        },
        options: {
          provider: options?.provider as "openai" | "anthropic" | "google" | "deepseek" | undefined,
          model: options?.model,
          temperature: 0.2,
        },
      });
      inferenceResult = result.output as { exitEvents: ExitInferenceEvent[] };
    } catch {
      // Inference failure must not block chapter confirmation
      return { appliedEvents: [], pendingEvents: [], frozenCharacters: [] };
    }

    const exitEvents = inferenceResult.exitEvents ?? [];
    const appliedEvents: ExitInferenceEvent[] = [];
    const pendingEvents: ExitInferenceEvent[] = [];

    // Process each exit event
    for (const event of exitEvents) {
      if (event.confidence >= confidenceThreshold) {
        // Verify character exists and is active
        const character = await prisma.character.findFirst({
          where: { id: event.characterId, novelId, exitStatus: "active" },
        });
        if (character) {
          const newStatus: CharacterExitStatus = event.exitType === "dead" ? "dead" : "exited";
          await prisma.character.update({
            where: { id: event.characterId },
            data: {
              exitStatus: newStatus,
              exitNote: event.evidence,
              exitChapterId: chapterId,
            },
          });
          appliedEvents.push(event);
        }
      } else {
        pendingEvents.push(event);
      }
    }

    // Auto-freeze: check exited/dead characters not mentioned in last N chapters
    const frozenCharacters = await this.checkAndFreezeCharacters(
      novelId,
      chapterId,
      freezeThreshold,
    );

    return { appliedEvents, pendingEvents, frozenCharacters };
  }

  /**
   * Check exited/dead characters for auto-freeze.
   * If not mentioned in the last N chapters, update to frozen.
   */
  async checkAndFreezeCharacters(
    novelId: string,
    currentChapterId: string,
    freezeThreshold: number = DEFAULT_FREEZE_THRESHOLD,
  ): Promise<ExitInferenceResult["frozenCharacters"]> {
    // Get current chapter order
    const currentChapter = await prisma.chapter.findFirst({
      where: { id: currentChapterId, novelId },
      select: { order: true },
    });
    if (!currentChapter) {
      return [];
    }

    // Get exited/dead characters
    const exitedCharacters = await prisma.character.findMany({
      where: {
        novelId,
        exitStatus: { in: ["exited", "dead"] },
      },
      select: { id: true, name: true, exitStatus: true },
    });

    if (exitedCharacters.length === 0) {
      return [];
    }

    const frozenCharacters: ExitInferenceResult["frozenCharacters"] = [];

    for (const character of exitedCharacters) {
      // Check if character appears in recent N chapters' text
      const recentMention = await prisma.chapter.findFirst({
        where: {
          novelId,
          order: {
            gte: Math.max(1, currentChapter.order - freezeThreshold),
            lte: currentChapter.order,
          },
          content: { contains: character.name },
        },
        select: { id: true },
      });

      if (!recentMention) {
        // Character not mentioned in last N chapters — freeze
        await prisma.character.update({
          where: { id: character.id },
          data: { exitStatus: "frozen" },
        });
        frozenCharacters.push({
          characterId: character.id,
          characterName: character.name,
          previousStatus: character.exitStatus as CharacterExitStatus,
        });
      }
    }

    return frozenCharacters;
  }

  /**
   * Manually set character exit status (user action).
   * Only allows active -> exited/dead transitions.
   */
  async setExitStatus(
    novelId: string,
    characterId: string,
    exitStatus: "exited" | "dead",
    exitNote?: string,
  ) {
    const character = await prisma.character.findFirst({
      where: { id: characterId, novelId },
      select: { id: true, exitStatus: true },
    });
    if (!character) {
      throw new Error("角色不存在");
    }
    if (character.exitStatus !== "active") {
      throw new Error(`当前状态为"${character.exitStatus}"，仅允许从"active"状态标记退场或死亡`);
    }

    return prisma.character.update({
      where: { id: characterId },
      data: {
        exitStatus,
        exitNote: exitNote ?? null,
      },
    });
  }
}

export const characterExitInferenceService = new CharacterExitInferenceService();
