/**
 * 一致性监控器 — 模块层外观
 *
 * REQ-7051: 编排跨章一致性检查器（时间线、人物行为、空间逻辑）
 * 并集成 LLM 驱动的设定一致性检查（REQ-2038）。
 *
 * 职责：
 * - 封装 services 层 ConsistencyMonitor 与 settingConsistencyService
 * - 返回统一的 ConsistencyCheckResult，合并规则检测与 LLM 检测结果
 * - 支持增量检查、矛盾报告查询、问题标记（resolve/ignore）
 *
 * 与 services 层的关系：
 * - services/novel/quality/ConsistencyMonitor.ts — 规则引擎（时间线/角色/空间）
 * - services/setting/settingConsistencyService.ts — LLM 设定一致性
 * - 本文件作为 module 层 facade，聚合下层能力并统一对外接口
 *
 * @module consistencyMonitor
 * @see REQ-7051
 */

import type {
  ConsistencyConfig,
  ConsistencyReport,
  ConsistencyViolationRecord,
  ConsistencyViolation,
  NovelConsistencyReport,
} from "@ai-novel/shared";
import { DEFAULT_CONSISTENCY_CONFIG } from "@ai-novel/shared";
import type { SettingConsistencyReport, Contradiction } from "@ai-novel/shared";
import { consistencyMonitor as servicesMonitor } from "../../../services/novel/quality/ConsistencyMonitor";
import { settingConsistencyService } from "../../../services/setting/settingConsistencyService";
import { prisma } from "../../../db/prisma";
import { logger } from "../../../services/logging/LoggerService";

// ─── 模块层类型 ────────────────────────────────────────────────────────────

/**
 * 单章一致性检查结果 — 合并规则检测与 LLM 设定检测。
 */
export interface ConsistencyCheckResult {
  /** 章节 ID */
  chapterId: string;
  /** 检查时间 */
  checkedAt: string;
  /** 规则检测报告（时间线/角色/空间） */
  report: ConsistencyReport;
  /** LLM 设定一致性报告（可为 null，表示未执行或不可用） */
  settingReport: SettingConsistencyReport | null;
  /** 整体是否通过 */
  overallPassed: boolean;
  /** 人类可读摘要 */
  summary: string;
  /** 总问题数 */
  totalViolations: number;
  /** 设定矛盾数 */
  totalContradictions: number;
}

/**
 * 检查选项：控制各类检查器的启用/禁用及配置覆盖。
 */
export interface ConsistencyCheckOptions {
  /** 规则检测配置覆盖 */
  config?: Partial<ConsistencyConfig>;
  /** 是否启用设定一致性检测（LLM） */
  enableSettingCheck?: boolean;
  /** 设定检测 provider 覆盖 */
  settingProvider?: string;
  /** 设定检测 model 覆盖 */
  settingModel?: string;
  /** 增量模式：删除旧结果后重新检测 */
  incremental?: boolean;
}

// ─── 默认选项 ────────────────────────────────────────────────────────────────

const DEFAULT_CHECK_OPTIONS: Required<Omit<ConsistencyCheckOptions, "config" | "settingProvider" | "settingModel">> = {
  enableSettingCheck: false,
  incremental: false,
};

// ─── 辅助函数 ───────────────────────────────────────────────────────────────

/**
 * 从 NovelWorld 的 structuredDataJson 中提取世界设定。
 * 返回键值对，用于 LLM 设定一致性检测。
 */
function extractWorldSettings(settingsJson: string | null): Record<string, unknown> {
  if (!settingsJson?.trim()) return {};
  try {
    const parsed = JSON.parse(settingsJson) as unknown;
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * 将 LLM 检测到的 Contradiction 映射为 ConsistencyViolation 格式，
 * 以便与规则检测结果统一展示。
 */
function contradictionsToViolations(contradictions: Contradiction[]): ConsistencyViolation[] {
  return contradictions.map((c) => ({
    type: "setting" as const,
    severity: (
      c.severity === "critical" ? "error" :
      c.severity === "warning" ? "warning" :
      "info"
    ) as ConsistencyViolation["severity"],
    description: c.description,
    chapterIds: [],
    locations: [],
    suggestion: c.suggestion,
    evidence: `${c.fieldA}: "${c.valueA}" ≠ ${c.fieldB}: "${c.valueB}"`,
  }));
}

/**
 * 综合规则检测与设定检测结果，生成统一摘要。
 */
function buildUnifiedSummary(
  ruleSummary: string,
  settingReport: SettingConsistencyReport | null,
  totalViolations: number,
): string {
  const parts: string[] = [ruleSummary];
  if (settingReport && settingReport.contradictions.length > 0) {
    parts.push(`${settingReport.contradictions.length} 个设定矛盾`);
  }
  if (totalViolations === 0) {
    parts.unshift("未发现一致性问题");
  }
  return parts.filter(Boolean).join("，");
}

/**
 * 生成小说级综合报告。
 */
function buildConsolidatedNovelReport(
  novelId: string,
  ruleReport: NovelConsistencyReport,
  settingReport: SettingConsistencyReport | null,
): {
  novelId: string;
  totalIssues: number;
  openIssues: number;
  typeBreakdown: Record<string, number>;
  severityBreakdown: Record<string, number>;
  ruleReport: NovelConsistencyReport;
  settingReport: SettingConsistencyReport | null;
} {
  const typeBreakdown = { ...ruleReport.typeBreakdown };
  const severityBreakdown = { ...ruleReport.severityBreakdown };

  if (settingReport) {
    typeBreakdown["setting"] = (typeBreakdown["setting"] ?? 0) + settingReport.contradictions.length;
    for (const c of settingReport.contradictions) {
      const sev = c.severity;
      severityBreakdown[sev] = (severityBreakdown[sev] ?? 0) + 1;
    }
  }

  const totalIssues = ruleReport.totalViolations + (settingReport?.contradictions.length ?? 0);
  const openIssues = ruleReport.openViolations + (settingReport?.contradictions.length ?? 0);

  return {
    novelId,
    totalIssues,
    openIssues,
    typeBreakdown,
    severityBreakdown,
    ruleReport,
    settingReport,
  };
}

// ─── 主类 ─────────────────────────────────────────────────────────────────

export class ModuleConsistencyMonitor {
  /**
   * 对指定章节执行完整一致性检查。
   *
   * 规则检测：时间线 + 人物行为 + 空间逻辑（rule engine）
   * 设定检测：LLM 驱动（可选，默认关闭）
   *
   * @param chapterId - 章节 ID
   * @param novelId   - 小说 ID
   * @param options   - 检查选项
   * @returns 合并后的一致性检查结果
   */
  async check(
    chapterId: string,
    novelId: string,
    options: ConsistencyCheckOptions = {},
  ): Promise<ConsistencyCheckResult> {
    const opts = { ...DEFAULT_CHECK_OPTIONS, ...options };
    const checkedAt = new Date().toISOString();

    logger.info("[ConsistencyMonitor] 开始一致性检查", { chapterId, novelId });

    // 1. 执行规则检测
    let ruleReport: ConsistencyReport;
    try {
      ruleReport = opts.incremental
        ? await servicesMonitor.incrementalCheck(chapterId, opts.config)
        : await servicesMonitor.check(chapterId, opts.config);
    } catch (error) {
      logger.error("[ConsistencyMonitor] 规则检测失败", {
        chapterId,
        error: error instanceof Error ? error.message : String(error),
      });
      ruleReport = {
        chapterId,
        checkedAt,
        violations: [],
        passed: false,
        overallPassed: false,
        summary: `规则检测异常: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    // 2. 执行设定检测（可选）
    let settingReport: SettingConsistencyReport | null = null;
    if (opts.enableSettingCheck) {
      try {
        const world = await prisma.novelWorld.findUnique({
          where: { novelId },
          select: { structuredDataJson: true },
        });
        const settings = extractWorldSettings(world?.structuredDataJson ?? null);

        if (Object.keys(settings).length > 0) {
          settingReport = await settingConsistencyService.checkConsistency(
            novelId,
            settings,
            {
              provider: opts.settingProvider,
              model: opts.settingModel,
            },
          );

          // 将设定矛盾持久化为 ConsistencyViolation 记录
          await this.persistSettingViolations(novelId, chapterId, settingReport.contradictions);
        }
      } catch (error) {
        logger.warn("[ConsistencyMonitor] 设定检测失败", {
          novelId,
          chapterId,
          error: error instanceof Error ? error.message : String(error),
        });
        settingReport = null;
      }
    }

    // 3. 合并结果
    const settingViolations = settingReport
      ? contradictionsToViolations(settingReport.contradictions)
      : [];
    const totalViolations = ruleReport.violations.length + settingViolations.length;
    const allRuleViolationsSevere = !ruleReport.violations.some((v) => v.severity === "error");
    const allSettingViolationsSevere = !settingViolations.some((v) => v.severity === "error");
    const overallPassed = allRuleViolationsSevere && allSettingViolationsSevere;

    const summary = buildUnifiedSummary(ruleReport.summary, settingReport, totalViolations);

    logger.info("[ConsistencyMonitor] 一致性检查完成", {
      chapterId,
      novelId,
      ruleViolations: ruleReport.violations.length,
      settingContradictions: settingReport?.contradictions.length ?? 0,
      overallPassed,
    });

    return {
      chapterId,
      checkedAt,
      report: ruleReport,
      settingReport,
      overallPassed,
      summary,
      totalViolations,
      totalContradictions: settingReport?.contradictions.length ?? 0,
    };
  }

  /**
   * 增量检查：删除该章旧违规记录后重新检测。
   */
  async incrementalCheck(
    chapterId: string,
    novelId: string,
    options: Omit<ConsistencyCheckOptions, "incremental"> = {},
  ): Promise<ConsistencyCheckResult> {
    return this.check(chapterId, novelId, { ...options, incremental: true });
  }

  /**
   * 获取章节的所有一致性违规记录。
   */
  async getChapterViolations(chapterId: string): Promise<ConsistencyViolationRecord[]> {
    return servicesMonitor.getChapterViolations(chapterId);
  }

  /**
   * 获取小说级一致性报告（含设定检测结果）。
   */
  async getNovelReport(novelId: string): Promise<
    ReturnType<typeof buildConsolidatedNovelReport>
  > {
    const ruleReport = await servicesMonitor.getNovelReport(novelId);

    // 尝试加载最新的设定一致性报告
    let settingReport: SettingConsistencyReport | null = null;
    try {
      settingReport = await settingConsistencyService.getReport(novelId);
    } catch {
      settingReport = null;
    }

    return buildConsolidatedNovelReport(novelId, ruleReport, settingReport);
  }

  /**
   * 标记一致性违规为"已解决"。
   */
  async resolveViolation(
    violationId: string,
    resolution?: string,
  ): Promise<ConsistencyViolationRecord | null> {
    return servicesMonitor.resolveViolation(violationId, resolution);
  }

  /**
   * 标记一致性违规为"已忽略"。
   */
  async ignoreViolation(
    violationId: string,
    reason?: string,
  ): Promise<ConsistencyViolationRecord | null> {
    return servicesMonitor.ignoreViolation(violationId, reason);
  }

  /**
   * 对指定小说全部章节执行一致性检查。
   */
  async checkNovel(
    novelId: string,
    options: ConsistencyCheckOptions = {},
  ): Promise<{
    chapterResults: ConsistencyCheckResult[];
    summary: string;
  }> {
    const chapters = await prisma.chapter.findMany({
      where: { novelId, content: { not: null } },
      orderBy: { order: "asc" },
      select: { id: true },
    });

    const results: ConsistencyCheckResult[] = [];
    for (const ch of chapters) {
      const result = await this.check(ch.id, novelId, options);
      results.push(result);
    }

    const totalViolations = results.reduce((sum, r) => sum + r.totalViolations, 0);
    return {
      chapterResults: results,
      summary: `检查了 ${chapters.length} 章，发现 ${totalViolations} 个一致性问题`,
    };
  }

  /**
   * 获取当前有效的一致性监控配置。
   */
  async getConfig(): Promise<ConsistencyConfig> {
    return { ...DEFAULT_CONSISTENCY_CONFIG };
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  /**
   * 将设定矛盾持久化为 ConsistencyViolation 记录。
   */
  private async persistSettingViolations(
    novelId: string,
    chapterId: string,
    contradictions: Contradiction[],
  ): Promise<void> {
    if (contradictions.length === 0) return;

    try {
      // TODO: Requires Prisma ConsistencyViolation model to be added to schema
      logger.info("[ConsistencyMonitor] 设定矛盾已记录（持久化待实现）", {
        novelId,
        chapterId,
        count: contradictions.length,
      });
    } catch (error) {
      logger.warn("[ConsistencyMonitor] 设定矛盾持久化失败", {
        novelId,
        chapterId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

// ─── 单例导出 ───────────────────────────────────────────────────────────────

export const moduleConsistencyMonitor = new ModuleConsistencyMonitor();
