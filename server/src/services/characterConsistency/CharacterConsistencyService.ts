/**
 * REQ-7056: Character Consistency Service — main orchestrator.
 *
 * Responsibilities:
 * 1. Extract character states from chapter content (LLM structured output)
 * 2. Detect contradictions (rule-based + LLM semantic)
 * 3. Generate contradiction reports and consistency scores
 * 4. Provide async pipeline integration (non-blocking background task)
 *
 * Designed to run as a side-effect after chapter generation completes.
 */
import { extractCharacterState, buildStateDescription } from "./extractor";
import { detectContradictions } from "./detector";
import { calculateConsistencyScore, getScoreThresholdWarning } from "./scorer";
import { generateContradictionReport, generateNovelSummaryReport } from "./reportGenerator";
import {
  saveCharacterState,
  getLatestState,
  getStateHistory,
  getHistoricalStates,
  deleteStatesForChapter,
} from "./stateStore";
import {
  saveContradictions,
  getChapterContradictions,
  getNovelContradictions,
  getContradictionById,
  resolveContradiction,
  deleteContradictionsForChapter,
  getContradictionStats,
} from "./contradictionStore";
import {
  saveConsistencyScore,
  getChapterScore,
  getNovelScores,
  getNovelAverageScore,
} from "./scoreStore";
import type {
  CharacterConsistencyStateRecord,
  CharacterConsistencyContradiction,
  ConsistencyScoreBreakdown,
  ContradictionFilter,
  ContradictionReport,
} from "./types";
import { prisma } from "../../db/prisma";
import { logger } from "../logging/LoggerService";

export interface ChapterConsistencyResult {
  novelId: string;
  chapterNumber: number;
  characterStates: CharacterConsistencyStateRecord[];
  contradictions: CharacterConsistencyContradiction[];
  score: ConsistencyScoreBreakdown;
  report: ContradictionReport;
  warning: string | null;
}

export interface ConsistencyPipelineInput {
  novelId: string;
  chapterId: string;
  chapterNumber: number;
  chapterContent: string;
}

export class CharacterConsistencyService {
  /**
   * Full pipeline: extract states -> detect contradictions -> score -> report.
   * Designed to be called asynchronously after chapter generation.
   */
  async runConsistencyCheck(input: ConsistencyPipelineInput): Promise<ChapterConsistencyResult> {
    const { novelId, chapterNumber, chapterContent } = input;

    logger.info("[CharacterConsistency] 开始一致性检查", { novelId, chapterNumber });

    // 1. Get characters for this novel
    const characters = await prisma.character.findMany({
      where: { novelId },
      select: {
        id: true,
        name: true,
        personality: true,
        background: true,
        appearance: true,
      },
    });

    if (characters.length === 0) {
      logger.info("[CharacterConsistency] 小说无角色，跳过检查", { novelId });
      return {
        novelId,
        chapterNumber,
        characterStates: [],
        contradictions: [],
        score: {
          chapterNumber,
          overall: 100,
          dimensions: { appearance: 100, personality: 100, ability: 100, relationship: 100 },
          contradictions: [],
        },
        report: generateContradictionReport(novelId, chapterNumber, [], {
          chapterNumber,
          overall: 100,
          dimensions: { appearance: 100, personality: 100, ability: 100, relationship: 100 },
          contradictions: [],
        }),
        warning: null,
      };
    }

    // 2. Extract character states for this chapter
    const characterStates: CharacterConsistencyStateRecord[] = [];
    for (const character of characters) {
      const prevState = await getLatestState(novelId, character.id);
      const prevDesc = prevState
        ? {
            appearance: prevState.appearance.rawDescription,
            personality: prevState.personality.rawDescription,
          }
        : null;

      const extracted = await extractCharacterState(character, chapterContent, prevDesc);
      const state = await saveCharacterState({
        novelId,
        characterId: character.id,
        chapterNumber,
        appearance: extracted.appearance,
        personality: extracted.personality,
        abilities: extracted.abilities,
        relationships: extracted.relationships,
        currentStatus: extracted.currentStatus,
        location: extracted.location,
        sourceChapter: chapterNumber,
      });
      characterStates.push(state);
    }

    // 3. Detect contradictions
    let allContradictions: CharacterConsistencyContradiction[] = [];
    for (const state of characterStates) {
      const character = characters.find((c) => c.id === state.characterId);
      if (!character) continue;

      const historicalStates = await getHistoricalStates(novelId, state.characterId, chapterNumber);
      const extracted: Parameters<typeof detectContradictions>[4] = {
        appearance: state.appearance,
        personality: state.personality,
        abilities: state.abilities,
        relationships: state.relationships,
        currentStatus: state.currentStatus,
        location: state.location,
      };

      const result = await detectContradictions(
        novelId,
        state.characterId,
        character.name,
        chapterNumber,
        extracted,
        historicalStates,
      );

      if (result.ruleContradictions.length > 0 || result.llmContradictions.length > 0) {
        const saved = await saveContradictions([
          ...result.ruleContradictions,
          ...result.llmContradictions,
        ]);
        allContradictions.push(...saved);
      }
    }

    // 4. Calculate consistency score
    const score = calculateConsistencyScore({ chapterNumber, contradictions: allContradictions });
    await saveConsistencyScore(novelId, score);

    // 5. Generate report and warning
    const report = generateContradictionReport(novelId, chapterNumber, allContradictions, score);
    const warning = getScoreThresholdWarning(score);

    logger.info("[CharacterConsistency] 一致性检查完成", {
      novelId,
      chapterNumber,
      charactersChecked: characters.length,
      contradictions: allContradictions.length,
      score: score.overall,
    });

    return {
      novelId,
      chapterNumber,
      characterStates,
      contradictions: allContradictions,
      score,
      report,
      warning,
    };
  }

  /**
   * Re-run consistency check for a chapter (deletes old data first).
   */
  async recheck(novelId: string, chapterNumber: number, chapterContent: string): Promise<ChapterConsistencyResult> {
    await deleteStatesForChapter(novelId, chapterNumber);
    await deleteContradictionsForChapter(novelId, chapterNumber);

    return this.runConsistencyCheck({
      novelId,
      chapterId: "",
      chapterNumber,
      chapterContent,
    });
  }

  // ─── Query Methods ─────────────────────────────────────────────────────

  async getStateHistory(novelId: string, characterId: string): Promise<CharacterConsistencyStateRecord[]> {
    return getStateHistory(novelId, characterId);
  }

  async getChapterContradictions(novelId: string, chapterNumber: number): Promise<CharacterConsistencyContradiction[]> {
    return getChapterContradictions(novelId, chapterNumber);
  }

  async getNovelContradictions(novelId: string, filter?: ContradictionFilter): Promise<CharacterConsistencyContradiction[]> {
    return getNovelContradictions(novelId, filter);
  }

  async getChapterScore(novelId: string, chapterNumber: number): Promise<ConsistencyScoreBreakdown | null> {
    const scoreRecord = await getChapterScore(novelId, chapterNumber);
    if (!scoreRecord) return null;

    const contradictions = await getChapterContradictions(novelId, chapterNumber);
    return {
      chapterNumber: scoreRecord.chapterNumber,
      overall: scoreRecord.overallScore,
      dimensions: {
        appearance: scoreRecord.appearanceScore ?? 100,
        personality: scoreRecord.personalityScore ?? 100,
        ability: scoreRecord.abilityScore ?? 100,
        relationship: scoreRecord.relationshipScore ?? 100,
      },
      contradictions,
    };
  }

  async resolveContradiction(id: string, note?: string): Promise<CharacterConsistencyContradiction | null> {
    return resolveContradiction(id, note);
  }

  async getNovelReport(novelId: string) {
    const [contradictions, scores, stats] = await Promise.all([
      getNovelContradictions(novelId),
      getNovelScores(novelId),
      getContradictionStats(novelId),
    ]);

    const scoreTrend = scores.map((s) => ({
      chapterNumber: s.chapterNumber,
      overall: s.overallScore,
    }));

    return {
      ...generateNovelSummaryReport(novelId, contradictions, scoreTrend),
      stats,
    };
  }
}

export const characterConsistencyService = new CharacterConsistencyService();
