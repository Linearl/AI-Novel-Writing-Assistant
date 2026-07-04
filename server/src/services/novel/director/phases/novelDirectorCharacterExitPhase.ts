import { prisma } from "../../../../db/prisma";
import { characterExitInferenceService } from "../../characterExit/characterExitInferenceService";

/**
 * Character Exit Phase — runs after chapter confirmation in the auto-director.
 *
 * 1. Calls LLM to infer character exits/deaths in the confirmed chapter.
 * 2. For high-confidence events, updates character exitStatus in DB.
 * 3. Auto-freezes exited/dead characters not mentioned in last N chapters.
 */
export async function runCharacterExitPhase(
  novelId: string,
  chapterId: string,
  options?: {
    confidenceThreshold?: number;
    freezeThreshold?: number;
    provider?: string;
    model?: string;
  },
): Promise<{
  inferenceApplied: number;
  inferencePending: number;
  frozenCount: number;
}> {
  // Load chapter content and expectation (outline)
  const chapter = await prisma.chapter.findFirst({
    where: { id: chapterId, novelId },
    select: { content: true, expectation: true },
  });
  if (!chapter) {
    return { inferenceApplied: 0, inferencePending: 0, frozenCount: 0 };
  }

  const result = await characterExitInferenceService.inferAndApply(
    novelId,
    chapterId,
    chapter.content ?? "",
    chapter.expectation ?? "",
    options,
  );

  return {
    inferenceApplied: result.appliedEvents.length,
    inferencePending: result.pendingEvents.length,
    frozenCount: result.frozenCharacters.length,
  };
}
