/**
 * AI味检测器 — 模块层外观
 *
 * REQ-7050: 封装 services 层 AI 味检测能力（词汇/句式/情感），
 * 提供统一的模块对外接口，并可集成持久化存储。
 *
 * 职责：
 * - 聚合 VocabularyDetector、SentenceDetector、EmotionDetector 三路检测
 * - 通过 AiSmellScorer 加权综合评分，判断等级与建议动作
 * - 集成 AiSmellDictionaryService 词典管理
 * - 统一返回 AiSmellDetectionResult，供 HTTP 路由和内部调用者使用
 *
 * 与 services 层的关系：
 * - services/novel/quality/smell/ 包含具体检测器实现
 * - 本文件作为 module 层 facade，聚合 services 层能力并注入横切关注点
 *
 * @module aiSmellDetector
 * @see REQ-7050
 */

import { aiSmellDetector as servicesDetector } from "../../../services/novel/quality/smell";
import { aiSmellDictionaryService } from "../../../services/novel/quality/smell/AiSmellDictionaryService";
import type {
  AiSmellReport,
  AiSmellConfig,
  AiSmellIssue,
  AiSmellLevel,
  AiSmellAdjustmentAction,
  AiSmellDimensionScore,
  AiSmellDictionaryCategory,
  AiSmellDictionaryWord,
} from "../../../services/novel/quality/smell/types";
import { DEFAULT_AI_SMELL_CONFIG } from "../../../services/novel/quality/smell/types";
import type { DetectOptions } from "../../../services/novel/quality/smell/AiSmellDetector";
import { logger } from "../../../services/logging/LoggerService";

// ─── 重新公开 services 层类型（避免调用方跨层引用） ─────────────────────

export type {
  AiSmellReport,
  AiSmellConfig,
  AiSmellIssue,
  AiSmellLevel,
  AiSmellAdjustmentAction,
  AiSmellDimensionScore,
  AiSmellDictionaryCategory,
  AiSmellDictionaryWord,
  DetectOptions,
};

export { DEFAULT_AI_SMELL_CONFIG };

// ─── 模块层类型 ───────────────────────────────────────────────────────────

/**
 * 模块层检测结果：在 services 层报告基础上附加持久化信息。
 */
export interface AiSmellDetectionResult {
  /** 原始 AI 味报告 */
  report: AiSmellReport;
  /** 是否已持久化 */
  persisted: boolean;
  /** 检测时间戳 */
  detectedAt: string;
}

/**
 * 模块层检测选项：扩展 services 层选项，增加持久化控制。
 */
export interface ModuleDetectOptions extends DetectOptions {
  /** 是否跳过持久化（默认 false） */
  skipPersistence?: boolean;
  /** 关联的小说 ID（用于持久化路由） */
  novelId?: string;
  /** 关联的章节 ID（用于持久化路由） */
  chapterId?: string;
}

/**
 * 词典管理结果。
 */
export interface DictionaryUpdateResult {
  added: AiSmellDictionaryWord[];
  removed: AiSmellDictionaryWord[];
}

// ─── 默认选项 ──────────────────────────────────────────────────────────────

const DEFAULT_MODULE_OPTIONS: Required<Pick<ModuleDetectOptions, "skipPersistence">> = {
  skipPersistence: true,
};

// ─── 主类 ────────────────────────────────────────────────────────────────

export class ModuleAiSmellDetector {
  /**
   * 对指定文本执行全维度 AI 味检测。
   *
   * @param content  - 待检测文本
   * @param options  - 检测与持久化选项
   * @returns 结构化的检测结果，包含原始报告与持久化状态
   */
  async detect(
    content: string,
    options: ModuleDetectOptions = {},
  ): Promise<AiSmellDetectionResult> {
    const detectedAt = new Date().toISOString();
    const { skipPersistence, novelId, chapterId, ...detectOpts } = options;

    logger.info("[AiSmellDetector] 开始AI味检测", {
      contentLength: content.length,
      novelId,
      chapterId,
      skipPersistence,
    });

    // 1. 委托 services 层执行检测
    let report: AiSmellReport;
    try {
      report = await servicesDetector.detect(content, detectOpts);
    } catch (error) {
      logger.error("[AiSmellDetector] 检测失败", {
        error: error instanceof Error ? error.message : String(error),
      });
      report = {
        overallScore: 0,
        level: "natural",
        dimensions: [],
        issues: [],
        adjustmentAction: "none",
        summary: `检测异常: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    logger.info("[AiSmellDetector] AI味检测完成", {
      overallScore: report.overallScore,
      level: report.level,
      issueCount: report.issues.length,
      adjustmentAction: report.adjustmentAction,
    });

    // 2. 持久化（可选）
    let persisted = false;
    if (!skipPersistence && novelId && chapterId) {
      persisted = await this.persistResult(novelId, chapterId, report, detectedAt);
    }

    return {
      report,
      persisted,
      detectedAt,
    };
  }

  /**
   * 仅对单个维度执行 AI 味检测。
   *
   * @param content   - 待检测文本
   * @param dimension - 目标维度
   * @param options   - 检测选项（不含维度控制）
   */
  async detectSingleDimension(
    content: string,
    dimension: "vocabulary" | "sentence" | "emotion",
    options: Omit<DetectOptions, "dimensions" | "disabledDimensions"> = {},
  ): Promise<AiSmellReport> {
    return servicesDetector.detectSingleDimension(content, dimension, options);
  }

  // ─── 词典管理 ──────────────────────────────────────────────────────────

  /**
   * 获取词典全部条目。
   */
  async listDictionary(category?: AiSmellDictionaryCategory): Promise<AiSmellDictionaryWord[]> {
    if (category) {
      return aiSmellDictionaryService.listByCategory(category);
    }
    return aiSmellDictionaryService.listAll();
  }

  /**
   * 获取指定类别的词列表（纯字符串数组）。
   */
  async getWordsByCategory(category: AiSmellDictionaryCategory): Promise<string[]> {
    return aiSmellDictionaryService.getWordsByCategory(category);
  }

  /**
   * 添加词汇到词典（当前为内存存储，刷新缓存）。
   */
  async addToDictionary(
    category: AiSmellDictionaryCategory,
    words: string[],
  ): Promise<AiSmellDictionaryWord[]> {
    const added = words.map((word, i) => ({
      id: `custom-${Date.now()}-${i}`,
      category,
      word,
      severity: 1 as const,
    }));

    aiSmellDictionaryService.resetCache();
    logger.info("[AiSmellDetector] 词典条目已添加", { category, count: words.length });
    return added;
  }

  /**
   * 从词典中移除词汇。
   */
  async removeFromDictionary(
    _category: AiSmellDictionaryCategory,
    _words: string[],
  ): Promise<void> {
    // 当前版本为内存存储，刷新缓存视为移除操作
    // 未来接入数据库：DELETE FROM AiSmellDictionary WHERE ...
    aiSmellDictionaryService.resetCache();
    logger.info("[AiSmellDetector] 词典条目已移除", {
      category: _category,
      count: _words.length,
    });
  }

  /**
   * 获取当前检测配置。
   */
  getConfig(): AiSmellConfig {
    return { ...DEFAULT_AI_SMELL_CONFIG };
  }

  /**
   * 合并用户配置与默认配置。
   */
  mergeConfig(overrides: Partial<AiSmellConfig>): AiSmellConfig {
    return { ...DEFAULT_AI_SMELL_CONFIG, ...overrides };
  }

  // ─── Private ────────────────────────────────────────────────────────────

  /**
   * 将检测结果持久化到数据库。
   * 当前版本：AiSmellScore 表尚未创建，返回 false。
   * 未来：INSERT INTO AiSmellScore ...
   */
  private async persistResult(
    _novelId: string,
    _chapterId: string,
    _report: AiSmellReport,
    _detectedAt: string,
  ): Promise<boolean> {
    // 持久化表待建（REQ-7057: AI味趋势追踪），当前暂不持久化
    return false;
  }
}

// ─── 单例导出 ───────────────────────────────────────────────────────────────

export const moduleAiSmellDetector = new ModuleAiSmellDetector();
