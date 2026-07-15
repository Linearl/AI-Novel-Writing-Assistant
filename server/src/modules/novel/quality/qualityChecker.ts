/**
 * 质量检查器模块入口
 *
 * 职责：
 * - 作为 modules/novel/quality 的公开 API，封装下层 services 质量检查实现
 * - 集成 autoRegeneration 模块，质量不达标时自动触发修复流
 * - 统一返回 QualityCheckResult，供 HTTP 路由和内部调用者使用
 *
 * 与 services 层的关系：
 * - services/novel/quality/ 包含具体检查器实现（WordCountChecker 等）
 * - 本文件作为模块层 facade，聚合 services 层能力并注入自动修复编排
 *
 * @module qualityChecker
 * @see REQ-7048
 */

import { chapterQualityChecker } from "../../../services/novel/quality";
import type {
  QualityCheckConfig,
  QualityDimension,
  QualityIssue,
  QualityReport,
} from "../../../services/novel/quality";
import {
  AutoRegenerationManager,
  autoRegenerationManager,
} from "./autoRegeneration";
import type { RegenerationConfig, RegenerationResult } from "./autoRegeneration";
import { logger } from "../../../services/logging/LoggerService";
import type { QualityScore, ReviewIssue } from "@ai-novel/shared";

// ─── 公开类型 ────────────────────────────────────────────────────────────────

export type {
  QualityCheckConfig,
  QualityDimension,
  QualityIssue,
  QualityReport,
  RegenerationConfig,
  RegenerationResult,
};

/**
 * 质量检查完整结果：合并原始质量报告与自动修复结果。
 */
export interface QualityCheckResult {
  /** 质量报告 */
  report: QualityReport;
  /** 是否触发了自动重新生成 */
  autoRegenerated: boolean;
  /** 仅 autoRegenerated=true 时有值 */
  regenerationResult?: RegenerationResult;
}

/**
 * 检查配置扩展：增加自动修复相关字段。
 */
export interface QualityCheckOptions {
  /** 各维度检查器配置 */
  checkConfig?: Partial<QualityCheckConfig>;
  /** 自动重新生成配置覆盖 */
  regenerationConfig?: Partial<RegenerationConfig>;
  /** 跳过自动修复（即使评分不达标也不触发） */
  skipAutoRegeneration?: boolean;
  /** 质量评分未达标时的失败上下文（供重新生成用） */
  failureContext?: string;
}

// ─── 默认选项 ────────────────────────────────────────────────────────────────

const DEFAULT_CHECK_OPTIONS: Required<Omit<QualityCheckOptions, "checkConfig" | "regenerationConfig" | "failureContext">> = {
  skipAutoRegeneration: false,
};

// ─── 辅助：将 QualityReport 转为 autoRegeneration 所需格式 ─────────────────

function toAutoRegenInput(report: QualityReport): {
  score: QualityScore;
  issues: ReviewIssue[];
} {
  const dimensionMap: Record<string, number> = {};
  for (const dim of report.dimensions) {
    dimensionMap[dim.name] = dim.score;
  }

  return {
    score: {
      coherence: dimensionMap.plotCoherence ?? 0,
      repetition: dimensionMap.wordCount ?? 0,
      pacing: dimensionMap.structure ?? 0,
      voice: dimensionMap.character ?? 0,
      engagement: dimensionMap.plotCoherence ?? 0,
      overall: report.overallScore,
    },
    issues: report.dimensions.flatMap((d) =>
      d.issues.map((issue): ReviewIssue => ({
        severity: issue.severity === "error" ? "high" : issue.severity === "warning" ? "medium" : "low",
        category: resolveReviewIssueCategory(d.name),
        evidence: issue.message,
        fixSuggestion: "",
      })),
    ),
  };
}

function resolveReviewIssueCategory(dimension: string): ReviewIssue["category"] {
  const mapping: Record<string, ReviewIssue["category"]> = {
    wordCount: "repetition",
    structure: "pacing",
    character: "engagement",
    plotCoherence: "coherence",
  };
  return mapping[dimension] ?? "coherence";
}

// ─── 单例类 ─────────────────────────────────────────────────────────────────

export class ModuleQualityChecker {
  constructor(
    private readonly regenManager: AutoRegenerationManager = autoRegenerationManager,
  ) {}

  /**
   * 对指定章节执行全维度质量检查，并按配置自动触发修复。
   *
   * @param chapterId - 章节 ID
   * @param novelId   - 小说 ID
   * @param options   - 检查与修复配置
   * @returns 结构化的质量检查结果，包含原始报告与可选的修复结果
   */
  async run(
    chapterId: string,
    novelId: string,
    options: QualityCheckOptions = {},
  ): Promise<QualityCheckResult> {
    const skipAutoRegeneration = options.skipAutoRegeneration ?? DEFAULT_CHECK_OPTIONS.skipAutoRegeneration;
    const checkConfig = options.checkConfig;
    const regenerationConfig = options.regenerationConfig;

    // 1. 执行质量检查
    const report = await chapterQualityChecker.run(chapterId, novelId, checkConfig);

    logger.info("[QualityChecker] 质量检查完成", {
      chapterId,
      novelId,
      overallScore: report.overallScore,
      passed: report.passed,
      dimensions: report.dimensions.length,
    });

    const result: QualityCheckResult = {
      report,
      autoRegenerated: false,
    };

    // 2. 判断是否需要自动重新生成
    if (skipAutoRegeneration) {
      return result;
    }

    // 仅当检查未通过时才考虑触发修复
    if (report.passed) {
      return result;
    }

    try {
      const regenInput = toAutoRegenInput(report);
      const regenOutcome = await this.regenManager.regenerateIfNeeded(
        novelId,
        chapterId,
        regenInput,
        regenerationConfig,
      );

      if (regenOutcome.regenerated) {
        result.autoRegenerated = true;
        result.regenerationResult = regenOutcome.result;

        // 重新执行质量检查以获取修复后的报告
        const recheckReport = await chapterQualityChecker.run(chapterId, novelId, checkConfig);
        result.report = recheckReport;

        logger.info("[QualityChecker] 自动修复完成并重新检查", {
          chapterId,
          novelId,
          originalScore: report.overallScore,
          recheckedScore: recheckReport.overallScore,
          regenerationAttempts: regenOutcome.result?.totalAttempts,
        });
      }
    } catch (error) {
      logger.warn("[QualityChecker] 自动修复流程异常", {
        chapterId,
        novelId,
        error: error instanceof Error ? error.message : String(error),
      });
      // 不阻断：保留原始报告返回
    }

    return result;
  }

  /**
   * 获取章节的最新质量报告。
   */
  async getReport(chapterId: string): Promise<QualityReport | null> {
    return chapterQualityChecker.getReport(chapterId);
  }

  /**
   * 获取小说级质量统计。
   */
  async getStats(novelId: string): Promise<{
    averageScore: number;
    passRate: number;
    totalReports: number;
    dimensionAverages: Record<string, number>;
  }> {
    return chapterQualityChecker.getStats(novelId);
  }

  /**
   * 仅执行质量检查，不触发自动修复。
   */
  async checkOnly(
    chapterId: string,
    novelId: string,
    checkConfig?: Partial<QualityCheckConfig>,
  ): Promise<QualityReport> {
    return chapterQualityChecker.run(chapterId, novelId, checkConfig);
  }

  /**
   * 对已检查的章节强制执行重新生成（不等到检查阶段）。
   */
  async forceRegenerate(
    novelId: string,
    chapterId: string,
    regenerationConfig?: Partial<RegenerationConfig>,
  ): Promise<RegenerationResult> {
    const report = await chapterQualityChecker.run(chapterId, novelId);
    return this.regenManager.regenerate(
      novelId,
      chapterId,
      toAutoRegenInput(report),
      regenerationConfig,
    );
  }
}

// ─── 单例 ───────────────────────────────────────────────────────────────────

export const moduleQualityChecker = new ModuleQualityChecker();
