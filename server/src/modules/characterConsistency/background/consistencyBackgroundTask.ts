/**
 * REQ-7056: Background task integration for character consistency.
 *
 * Provides a non-blocking async entry point to run character consistency
 * checks after chapter generation completes. This is designed to be called
 * as a side-effect, not blocking the main generation pipeline.
 */
import { characterConsistencyService } from "../../../services/characterConsistency/CharacterConsistencyService";
import { logger } from "../../../services/logging/LoggerService";

export interface ConsistencyBackgroundJob {
  novelId: string;
  chapterNumber: number;
  chapterContent: string;
}

/**
 * Run character consistency check in the background.
 * Returns immediately; errors are logged but do not propagate.
 */
export async function runCharacterConsistencyInBackground(job: ConsistencyBackgroundJob): Promise<void> {
  try {
    logger.info("[CharacterConsistency] 后台一致性检查启动", {
      novelId: job.novelId,
      chapterNumber: job.chapterNumber,
    });

    const result = await characterConsistencyService.runConsistencyCheck({
      novelId: job.novelId,
      chapterId: "",
      chapterNumber: job.chapterNumber,
      chapterContent: job.chapterContent,
    });

    logger.info("[CharacterConsistency] 后台一致性检查完成", {
      novelId: job.novelId,
      chapterNumber: job.chapterNumber,
      contradictions: result.contradictions.length,
      score: result.score.overall,
    });

    if (result.warning) {
      logger.warn("[CharacterConsistency] 一致性警告", {
        novelId: job.novelId,
        chapterNumber: job.chapterNumber,
        warning: result.warning,
      });
    }
  } catch (error) {
    logger.error("[CharacterConsistency] 后台一致性检查失败", {
      novelId: job.novelId,
      chapterNumber: job.chapterNumber,
      error: error instanceof Error ? error.message : String(error),
    });
    // Do not rethrow — background task should not crash the main process
  }
}
