/**
 * 自动重新生成管理器
 *
 * 职责：当质量检查器报告章节不合格时，自动触发重新生成，
 * 支持参数调整策略、重试上限控制和历史记录。
 *
 * 集成方式：
 * - 在质量检查完成后调用 regenerateIfNeeded() 判断是否需要重试
 * - 配置通过 AppSetting 持久化，支持运行时调整
 * - 重试历史记录在 Chapter.repairHistory 和独立日志中
 *
 * @module autoRegeneration
 * @see REQ-7049
 */

import type { QualityScore, ReviewIssue } from "@ai-novel/shared";
import { prisma } from "../../../db/prisma";
import { logger } from "../../../services/logging/LoggerService";
import { novelEventBus } from "../../../events";

// ─── 配置类型 ────────────────────────────────────────────────────────────────

export interface RegenerationParameterAdjustment {
  /** 每次重试的温度增量 */
  temperatureStep: number;
  /** 最大允许温度 */
  maxTemperature: number;
}

export interface RegenerationConfig {
  /** 是否启用自动重新生成 */
  enabled: boolean;
  /** 自动模式：true=自动重试，false=需用户确认 */
  autoMode: boolean;
  /** 最大重试次数 */
  maxRetries: number;
  /** 质量阈值：overall 低于此值触发重试 */
  qualityThreshold: number;
  /** 参数调整策略 */
  parameterAdjustment: RegenerationParameterAdjustment;
}

export interface RegenerationAttempt {
  /** 尝试序号（从1开始） */
  attemptNumber: number;
  /** 开始时间 */
  startedAt: string;
  /** 完成时间 */
  completedAt?: string;
  /** 使用的生成参数 */
  parameters: {
    temperature: number;
    /** 注入的失败原因提示 */
    failureReason?: string;
  };
  /** 质量评分 */
  qualityScore: number;
  /** 是否通过质量阈值 */
  success: boolean;
  /** 错误信息 */
  error?: string;
}

export interface RegenerationResult {
  chapterId: string;
  novelId: string;
  /** 总尝试次数 */
  totalAttempts: number;
  /** 最终是否成功 */
  finalSuccess: boolean;
  /** 所有尝试记录 */
  attempts: RegenerationAttempt[];
  /** 最佳尝试 */
  bestAttempt?: RegenerationAttempt;
}

export interface RegenerationLogEntry {
  chapterId: string;
  novelId: string;
  totalAttempts: number;
  finalSuccess: boolean;
  bestQualityScore: number;
  attempts: RegenerationAttempt[];
  createdAt: string;
  completedAt?: string;
}

// ─── 默认配置 ────────────────────────────────────────────────────────────────

export const DEFAULT_REGENERATION_CONFIG: RegenerationConfig = {
  enabled: true,
  autoMode: true,
  maxRetries: 3,
  qualityThreshold: 70,
  parameterAdjustment: {
    temperatureStep: 0.1,
    maxTemperature: 1.5,
  },
};

const CONFIG_STORE_KEY = "regeneration_config";

// ─── 配置管理 ────────────────────────────────────────────────────────────────

function parseStoredConfig(raw: string | null): RegenerationConfig | null {
  if (!raw?.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<RegenerationConfig>;
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    // 验证必需字段
    if (
      typeof parsed.maxRetries === "number" && parsed.maxRetries < 0
    ) {
      return null;
    }
    return { ...DEFAULT_REGENERATION_CONFIG, ...parsed };
  } catch {
    return null;
  }
}

export async function getRegenerationConfig(): Promise<RegenerationConfig> {
  const row = await prisma.appSetting.findUnique({
    where: { key: CONFIG_STORE_KEY },
    select: { value: true },
  });
  return parseStoredConfig(row?.value ?? null) ?? { ...DEFAULT_REGENERATION_CONFIG };
}

export async function updateRegenerationConfig(
  partial: Partial<RegenerationConfig>,
): Promise<RegenerationConfig> {
  const current = await getRegenerationConfig();
  const merged: RegenerationConfig = { ...current, ...partial };
  await prisma.appSetting.upsert({
    where: { key: CONFIG_STORE_KEY },
    update: { value: JSON.stringify(merged) },
    create: { key: CONFIG_STORE_KEY, value: JSON.stringify(merged) },
  });
  logger.info("[AutoRegen] 重新生成配置已更新", { config: merged });
  return merged;
}

// ─── 质量判定 ────────────────────────────────────────────────────────────────

/**
 * 判断质量评分是否需要触发重新生成。
 * 条件：overall < 阈值 或 任一维度严重不达标。
 */
export function shouldRegenerate(
  score: QualityScore,
  config: RegenerationConfig,
): { needed: boolean; reason: string } {
  if (!config.enabled) {
    return { needed: false, reason: "自动重新生成已禁用" };
  }

  if (score.overall < config.qualityThreshold) {
    return {
      needed: true,
      reason: `综合评分 ${score.overall} 低于阈值 ${config.qualityThreshold}`,
    };
  }

  // 单项严重不达标也触发
  const criticalThreshold = Math.max(config.qualityThreshold - 20, 30);
  const failingDimension = (["coherence", "repetition", "pacing", "voice", "engagement"] as const)
    .find((dim) => score[dim] < criticalThreshold);

  if (failingDimension) {
    return {
      needed: true,
      reason: `${failingDimension} 评分 ${score[failingDimension]} 低于单项阈值 ${criticalThreshold}`,
    };
  }

  return { needed: false, reason: "质量评分达标" };
}

export function buildFailureContext(
  score: QualityScore,
  issues: ReviewIssue[],
): string {
  const parts: string[] = [];
  parts.push(`综合评分: ${score.overall}/100`);
  const dims = ["coherence", "repetition", "pacing", "voice", "engagement"] as const;
  const dimLabels: Record<string, string> = {
    coherence: "连贯性",
    repetition: "重复度",
    pacing: "节奏感",
    voice: "文风",
    engagement: "吸引力",
  };
  parts.push(
    ...dims.map((dim) => `  ${dimLabels[dim]}: ${score[dim]}/100`),
  );

  if (issues.length > 0) {
    const highSeverity = issues.filter((i) => i.severity === "high" || i.severity === "critical");
    if (highSeverity.length > 0) {
      parts.push("\n主要问题:");
      parts.push(
        ...highSeverity.slice(0, 3).map((i) =>
          `  - [${i.category}] ${i.evidence.slice(0, 120)}`,
        ),
      );
    }
  }

  return parts.join("\n");
}

// ─── 参数调整 ────────────────────────────────────────────────────────────────

export function adjustGenerationTemperature(
  baseTemperature: number,
  attemptIndex: number,
  adjustment: RegenerationParameterAdjustment,
): number {
  const increase = adjustment.temperatureStep * (attemptIndex + 1);
  return Math.min(baseTemperature + increase, adjustment.maxTemperature);
}

// ─── 重试日志持久化 ────────────────────────────────────────────────────────────

/**
 * 将重试记录追加到章节的 repairHistory 字段。
 */
async function appendRegenerationToRepairHistory(
  novelId: string,
  chapterId: string,
  result: RegenerationResult,
): Promise<void> {
  const chapter = await prisma.chapter.findFirst({
    where: { id: chapterId, novelId },
    select: { repairHistory: true },
  });
  if (!chapter) {
    return;
  }

  const lines = (chapter.repairHistory?.split(/\r?\n/).filter(Boolean) ?? []);
  const summary = [
    `[auto_regen ${new Date().toISOString()}]`,
    `attempts=${result.totalAttempts}`,
    `success=${result.finalSuccess}`,
    `bestScore=${result.bestAttempt?.qualityScore ?? "n/a"}`,
    result.finalSuccess ? "" : `maxRetriesReached=true`,
  ].filter(Boolean).join(" ");

  lines.push(summary);
  const trimmed = lines.slice(-20).join("\n");

  await prisma.chapter.update({
    where: { id: chapterId },
    data: { repairHistory: trimmed },
  });
}

/**
 * 保存生成日志到 QualityReport 表（复用现有模型记录重试结果）。
 */
async function saveRegenerationQualityReport(
  novelId: string,
  chapterId: string,
  attempt: RegenerationAttempt,
): Promise<void> {
  await prisma.qualityReport.create({
    data: {
      novelId,
      chapterId,
      coherence: 0,
      repetition: 0,
      pacing: 0,
      voice: 0,
      engagement: 0,
      overall: attempt.qualityScore,
      issues: JSON.stringify({
        source: "auto_regeneration",
        attemptNumber: attempt.attemptNumber,
        success: attempt.success,
        parameters: attempt.parameters,
        error: attempt.error ?? null,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt ?? null,
      }),
    },
  });
}

// ─── 重新生成执行 ──────────────────────────────────────────────────────────────

export type RegenerationExecutor = (
  novelId: string,
  chapterId: string,
  options: {
    temperature: number;
    failureContext?: string;
  },
) => Promise<{
  score: QualityScore;
  issues: ReviewIssue[];
}>;

/**
 * 默认的重新生成执行器：通过修复流触发重新生成，并等待质量审核完成。
 */
async function defaultRegenerationExecutor(
  novelId: string,
  chapterId: string,
  options: { temperature: number; failureContext?: string },
): Promise<{ score: QualityScore; issues: ReviewIssue[] }> {
  const { getSharedNovelServices } = await import(
    "../../../services/novel/application/sharedNovelServices"
  );
  const services = getSharedNovelServices();

  const streamed = await services.createRepairStream(novelId, chapterId, {
    temperature: options.temperature,
    userInstruction: options.failureContext
      ? `上一版本存在以下质量问题，请针对性改进：\n${options.failureContext}`
      : undefined,
  });

  // 消费流并等待完成
  const chunks: string[] = [];
  for await (const chunk of streamed.stream) {
    if (chunk && typeof (chunk as unknown as { content?: string }).content === "string") {
      chunks.push((chunk as unknown as { content: string }).content);
    }
  }

  let finalContent = chunks.join("");
  await streamed.onDone(finalContent, {
    writeFrame: () => {},
    startTimer: () => {},
    endTimer: () => {},
  });

  // 重新获取质量评分
  const reviewResult = await services.reviewChapter(novelId, chapterId, {
    temperature: 0.1,
  });

  return {
    score: reviewResult.score,
    issues: reviewResult.issues ?? [],
  };
}

// ─── 主类 ────────────────────────────────────────────────────────────────────

export class AutoRegenerationManager {
  constructor(
    private readonly executor: RegenerationExecutor = defaultRegenerationExecutor,
  ) {}

  /**
   * 核心方法：执行自动重新生成流程。
   *
   * @returns 重新生成结果，包含所有尝试记录和最终状态。
   */
  async regenerate(
    novelId: string,
    chapterId: string,
    qualityReport: { score: QualityScore; issues: ReviewIssue[] },
    configOverride?: Partial<RegenerationConfig>,
  ): Promise<RegenerationResult> {
    const config = {
      ...(await getRegenerationConfig()),
      ...configOverride,
    };

    const baseTemperature = 0.7; // 默认基准温度，可从章节配置获取
    const attempts: RegenerationAttempt[] = [];
    let bestAttempt: RegenerationAttempt | undefined;

    const failureContext = buildFailureContext(qualityReport.score, qualityReport.issues);

    logger.info("[AutoRegen] 开始自动重新生成", {
      novelId,
      chapterId,
      maxRetries: config.maxRetries,
      currentScore: qualityReport.score.overall,
      threshold: config.qualityThreshold,
    });

    await novelEventBus.emit({
      type: "chapter:reviewed",
      payload: {
        novelId,
        chapterId,
        qualityScore: qualityReport.score.overall,
      },
    });

    for (let i = 0; i < config.maxRetries; i++) {
      const temperature = adjustGenerationTemperature(
        baseTemperature,
        i,
        config.parameterAdjustment,
      );

      const attempt: RegenerationAttempt = {
        attemptNumber: i + 1,
        startedAt: new Date().toISOString(),
        parameters: {
          temperature,
          failureReason: failureContext,
        },
        qualityScore: 0,
        success: false,
      };

      logger.info("[AutoRegen] 执行第 {attempt}/{max} 次重新生成", {
        novelId,
        chapterId,
        attempt: attempt.attemptNumber,
        max: config.maxRetries,
        temperature,
      });

      try {
        const result = await this.executor(novelId, chapterId, {
          temperature,
          failureContext,
        });

        attempt.completedAt = new Date().toISOString();
        attempt.qualityScore = result.score.overall;
        attempt.success = result.score.overall >= config.qualityThreshold;

        attempts.push(attempt);

        // 跟踪最佳结果
        if (!bestAttempt || attempt.qualityScore > bestAttempt.qualityScore) {
          bestAttempt = attempt;
        }

        // 保存质量报告
        await saveRegenerationQualityReport(novelId, chapterId, attempt).catch((err) => {
          logger.warn("[AutoRegen] 保存质量报告失败", { error: err instanceof Error ? err.message : String(err) });
        });

        if (attempt.success) {
          logger.info("[AutoRegen] 重新生成成功", {
            novelId,
            chapterId,
            attempt: attempt.attemptNumber,
            score: attempt.qualityScore,
          });
          break;
        }

        logger.info("[AutoRegen] 本次尝试未达标，继续重试", {
          novelId,
          chapterId,
          attempt: attempt.attemptNumber,
          score: attempt.qualityScore,
          threshold: config.qualityThreshold,
        });

      } catch (error) {
        attempt.completedAt = new Date().toISOString();
        attempt.error = error instanceof Error ? error.message : String(error);
        attempts.push(attempt);

        logger.error("[AutoRegen] 重新生成失败", {
          novelId,
          chapterId,
          attempt: attempt.attemptNumber,
          error: attempt.error,
        });
      }
    }

    const finalSuccess = attempts.some((a) => a.success);
    const result: RegenerationResult = {
      chapterId,
      novelId,
      totalAttempts: attempts.length,
      finalSuccess,
      attempts,
      bestAttempt,
    };

    // 持久化重试历史
    await appendRegenerationToRepairHistory(novelId, chapterId, result).catch((err) => {
      logger.warn("[AutoRegen] 追加重试历史失败", { error: err instanceof Error ? err.message : String(err) });
    });

    logger.info("[AutoRegen] 自动重新生成完成", {
      novelId,
      chapterId,
      totalAttempts: result.totalAttempts,
      finalSuccess: result.finalSuccess,
      bestScore: result.bestAttempt?.qualityScore,
    });

    return result;
  }

  /**
   * 便捷方法：检查质量评分，如需要则自动触发重新生成。
   */
  async regenerateIfNeeded(
    novelId: string,
    chapterId: string,
    qualityReport: { score: QualityScore; issues: ReviewIssue[] },
    configOverride?: Partial<RegenerationConfig>,
  ): Promise<{ regenerated: boolean; result?: RegenerationResult; reason: string }> {
    const config = { ...(await getRegenerationConfig()), ...configOverride };
    const { needed, reason } = shouldRegenerate(qualityReport.score, config);

    if (!needed) {
      return { regenerated: false, reason };
    }

    const result = await this.regenerate(novelId, chapterId, qualityReport, config);
    return {
      regenerated: true,
      result,
      reason: result.finalSuccess
        ? `经过 ${result.totalAttempts} 次重试后达标`
        : `经过 ${result.totalAttempts} 次重试后仍未达标`,
    };
  }
}

// ─── 单例 ────────────────────────────────────────────────────────────────────

export const autoRegenerationManager = new AutoRegenerationManager();
