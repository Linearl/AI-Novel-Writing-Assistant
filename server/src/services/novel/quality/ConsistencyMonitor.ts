/**
 * REQ-7051: ConsistencyMonitor — stub implementation.
 *
 * TODO: Full implementation requires Prisma ConsistencyViolation model
 * and checker modules (TimelineChecker, CharacterBehaviorChecker, SpatialLogicChecker).
 */
import type {
  ConsistencyConfig,
  ConsistencyReport,
  ConsistencyViolationRecord,
  NovelConsistencyReport,
} from "@ai-novel/shared";
import { DEFAULT_CONSISTENCY_CONFIG } from "@ai-novel/shared";

const NOT_IMPLEMENTED = "一致性监控模块尚未完成实现，请等待后续版本。";

export class ConsistencyMonitor {
  async check(_chapterId: string, _config?: Partial<ConsistencyConfig>): Promise<ConsistencyReport> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async incrementalCheck(chapterId: string, config?: Partial<ConsistencyConfig>): Promise<ConsistencyReport> {
    return this.check(chapterId, config);
  }

  async getChapterViolations(_chapterId: string): Promise<ConsistencyViolationRecord[]> {
    return [];
  }

  async getNovelReport(novelId: string): Promise<NovelConsistencyReport> {
    return {
      novelId,
      generatedAt: new Date().toISOString(),
      chapterReports: [],
      totalViolations: 0,
      openViolations: 0,
      criticalCount: 0,
      warningCount: 0,
      typeBreakdown: {},
      severityBreakdown: {},
      recentViolations: [],
      summary: NOT_IMPLEMENTED,
    };
  }

  async resolveViolation(_violationId: string, _resolution?: string): Promise<ConsistencyViolationRecord | null> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async ignoreViolation(_violationId: string, _reason?: string): Promise<ConsistencyViolationRecord | null> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async getConfig(): Promise<ConsistencyConfig> {
    return { ...DEFAULT_CONSISTENCY_CONFIG };
  }
}

export const consistencyMonitor = new ConsistencyMonitor();
