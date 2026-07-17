/**
 * Character consistency — module facade.
 *
 * Wraps CharacterConsistencyService and provides the public API
 * to be consumed by HTTP routes and pipeline integration.
 */
import { characterConsistencyService } from "../../../services/character/consistency/CharacterConsistencyService";
import type {
  CharacterConsistencyStateRecord,
  CharacterConsistencyContradiction,
  ConsistencyScoreBreakdown,
  ContradictionFilter,
  ContradictionReport,
} from "../../../services/character/consistency/types";
import { logger } from "../../../services/logging/LoggerService";

export class CharacterConsistencyModule {
  /**
   * Run full consistency check for a chapter (async, non-blocking).
   */
  async runCheck(
    novelId: string,
    chapterNumber: number,
    chapterContent: string,
  ) {
    return characterConsistencyService.runConsistencyCheck({
      novelId,
      chapterId: "",
      chapterNumber,
      chapterContent,
    });
  }

  /**
   * Re-run check for a chapter (deletes old data first).
   */
  async reCheck(
    novelId: string,
    chapterNumber: number,
    chapterContent: string,
  ) {
    return characterConsistencyService.recheck(novelId, chapterNumber, chapterContent);
  }

  /**
   * Get character state history.
   */
  async getStateHistory(
    novelId: string,
    characterId: string,
  ): Promise<CharacterConsistencyStateRecord[]> {
    return characterConsistencyService.getStateHistory(novelId, characterId);
  }

  /**
   * Get contradictions for a specific chapter.
   */
  async getChapterContradictions(
    novelId: string,
    chapterNumber: number,
  ): Promise<CharacterConsistencyContradiction[]> {
    return characterConsistencyService.getChapterContradictions(novelId, chapterNumber);
  }

  /**
   * Get all contradictions for a novel, with optional filter.
   */
  async getNovelContradictions(
    novelId: string,
    filter?: ContradictionFilter,
  ): Promise<CharacterConsistencyContradiction[]> {
    return characterConsistencyService.getNovelContradictions(novelId, filter);
  }

  /**
   * Get consistency score for a chapter.
   */
  async getChapterScore(
    novelId: string,
    chapterNumber: number,
  ): Promise<ConsistencyScoreBreakdown | null> {
    return characterConsistencyService.getChapterScore(novelId, chapterNumber);
  }

  /**
   * Get novel-level consistency report.
   */
  async getNovelReport(novelId: string) {
    return characterConsistencyService.getNovelReport(novelId);
  }

  /**
   * Resolve a contradiction.
   */
  async resolveContradiction(
    id: string,
    note?: string,
  ): Promise<CharacterConsistencyContradiction | null> {
    return characterConsistencyService.resolveContradiction(id, note);
  }
}

export const characterConsistencyModule = new CharacterConsistencyModule();
