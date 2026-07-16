import { prisma } from "../../../db/prisma";
import type { QualityCheckConfig, QualityDimension, QualityIssue, QualityReport } from "./types";
import { DEFAULT_QUALITY_CONFIG } from "./types";
import {
  WordCountChecker,
  StructureChecker,
  CharacterChecker,
  PlotCoherenceChecker,
} from "./checkers";

export type { QualityCheckConfig, QualityDimension, QualityIssue, QualityReport } from "./types";

export class ChapterQualityChecker {
  private checkers = new Map<string, { check(content: string, chapterId: string, novelId: string, config: QualityCheckConfig): Promise<QualityDimension> }>();

  constructor() {
    this.checkers.set("wordCount", new WordCountChecker());
    this.checkers.set("structure", new StructureChecker());
    this.checkers.set("character", new CharacterChecker());
    this.checkers.set("plotCoherence", new PlotCoherenceChecker());
  }

  /**
   * Registers a custom checker. Use this to extend the quality system
   * with additional dimensions (e.g. AI smell, style consistency).
   */
  registerChecker(name: string, checker: { check(content: string, chapterId: string, novelId: string, config: QualityCheckConfig): Promise<QualityDimension> }): void {
    this.checkers.set(name, checker);
  }

  /**
   * Run all enabled quality checks for a given chapter.
   */
  async run(chapterId: string, novelId: string, configOverride?: Partial<QualityCheckConfig>): Promise<QualityReport> {
    const config = this.resolveConfig(configOverride);

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { id: true, content: true, novelId: true },
    });

    if (!chapter) {
      throw new Error(`Chapter not found: ${chapterId}`);
    }

    const content = chapter.content ?? "";
    const dimensions: QualityDimension[] = [];
    const errors: string[] = [];

    for (const checkerName of config.enabledCheckers) {
      const checker = this.checkers.get(checkerName);
      if (!checker) {
        errors.push(`Unknown checker: ${checkerName}`);
        continue;
      }

      try {
        const dimension = await checker.check(content, chapterId, novelId, config);
        dimensions.push(dimension);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`Checker "${checkerName}" failed: ${message}`);
        dimensions.push({
          name: checkerName,
          score: 0,
          passed: false,
          issues: [{
            type: "checker_error",
            message: `检查器「${checkerName}」执行失败：${message}`,
            severity: "error",
          }],
        });
      }
    }

    const overallScore = this.computeOverallScore(dimensions);
    const passed = dimensions.every((d) => d.passed) && overallScore >= 60;

    const summaryParts: string[] = [];
    if (overallScore >= 85) summaryParts.push("总体质量优秀");
    else if (overallScore >= 70) summaryParts.push("总体质量良好");
    else if (overallScore >= 60) summaryParts.push("总体质量合格");
    else summaryParts.push("总体质量需改进");

    const totalIssues = dimensions.reduce((sum, d) => sum + d.issues.length, 0);
    const errorCount = dimensions.reduce((sum, d) => sum + d.issues.filter((i) => i.severity === "error").length, 0);
    const warningCount = dimensions.reduce((sum, d) => sum + d.issues.filter((i) => i.severity === "warning").length, 0);

    if (totalIssues > 0) {
      summaryParts.push(`发现 ${totalIssues} 个问题`);
      if (errorCount > 0) summaryParts.push(`${errorCount} 个错误`);
      if (warningCount > 0) summaryParts.push(`${warningCount} 个警告`);
    } else {
      summaryParts.push("所有检查均通过");
    }

    if (errors.length > 0) {
      summaryParts.push(`${errors.length} 个检查器执行异常`);
    }

    const report: QualityReport = {
      chapterId,
      novelId,
      overallScore,
      passed,
      dimensions,
      summary: summaryParts.join("，"),
      checkedAt: new Date().toISOString(),
    };

    // Persist report to database
    try {
      await prisma.qualityReport.create({
        data: {
          novelId,
          chapterId,
          coherence: this.getDimensionScore(dimensions, "plotCoherence"),
          repetition: 0, // reserved for REQ-7050 AI smell
          pacing: this.getDimensionScore(dimensions, "structure"),
          voice: 0, // reserved for REQ-7050 AI smell
          engagement: this.getDimensionScore(dimensions, "character"),
          overall: overallScore,
          issues: JSON.stringify(dimensions.flatMap((d) => d.issues)),
        },
      });
    } catch (error) {
      // Persistence failure should not block the report
      console.error("[quality] Failed to persist quality report:", error);
    }

    return report;
  }

  /**
   * Retrieve the latest quality report for a chapter.
   */
  async getReport(chapterId: string): Promise<QualityReport | null> {
    const record = await prisma.qualityReport.findFirst({
      where: { chapterId },
      orderBy: { createdAt: "desc" },
    });

    if (!record) return null;

    const dimensions: QualityDimension[] = [];
    if (record.issues) {
      try {
        const issues = JSON.parse(record.issues) as QualityIssue[];
        // Group issues by prefix to reconstruct dimensions
        const grouped = new Map<string, QualityIssue[]>();
        for (const issue of issues) {
          const prefix = this.inferDimensionFromIssueType(issue.type);
          const existing = grouped.get(prefix) ?? [];
          existing.push(issue);
          grouped.set(prefix, existing);
        }
        for (const [name, dimIssues] of grouped) {
          dimensions.push({
            name,
            score: this.resolveDimensionScore(name, record),
            passed: dimIssues.filter((i) => i.severity === "error").length === 0,
            issues: dimIssues,
          });
        }
      } catch {
        // ignore parse errors
      }
    }

    return {
      chapterId: record.chapterId ?? "",
      novelId: record.novelId,
      overallScore: record.overall,
      passed: record.overall >= 60,
      dimensions,
      summary: "",
      checkedAt: record.createdAt.toISOString(),
    };
  }

  /**
   * Get quality statistics for an entire novel.
   */
  async getStats(novelId: string): Promise<{
    averageScore: number;
    passRate: number;
    totalReports: number;
    dimensionAverages: Record<string, number>;
  }> {
    const reports = await prisma.qualityReport.findMany({
      where: { novelId },
      orderBy: { createdAt: "desc" },
      select: {
        overall: true,
        coherence: true,
        repetition: true,
        pacing: true,
        voice: true,
        engagement: true,
      },
    });

    if (reports.length === 0) {
      return {
        averageScore: 0,
        passRate: 0,
        totalReports: 0,
        dimensionAverages: {},
      };
    }

    const totalScore = reports.reduce((sum, r) => sum + r.overall, 0);
    const passedCount = reports.filter((r) => r.overall >= 60).length;

    return {
      averageScore: Math.round(totalScore / reports.length),
      passRate: Math.round((passedCount / reports.length) * 100),
      totalReports: reports.length,
      dimensionAverages: {
        plotCoherence: Math.round(reports.reduce((s, r) => s + r.coherence, 0) / reports.length),
        structure: Math.round(reports.reduce((s, r) => s + r.pacing, 0) / reports.length),
        character: Math.round(reports.reduce((s, r) => s + r.engagement, 0) / reports.length),
      },
    };
  }

  private resolveConfig(override?: Partial<QualityCheckConfig>): QualityCheckConfig {
    if (!override) return { ...DEFAULT_QUALITY_CONFIG };
    return {
      ...DEFAULT_QUALITY_CONFIG,
      ...override,
      wordCount: { ...DEFAULT_QUALITY_CONFIG.wordCount, ...override.wordCount },
      structure: { ...DEFAULT_QUALITY_CONFIG.structure, ...override.structure },
      character: { ...DEFAULT_QUALITY_CONFIG.character, ...override.character },
      plotCoherence: { ...DEFAULT_QUALITY_CONFIG.plotCoherence, ...override.plotCoherence },
      aiSmell: { ...DEFAULT_QUALITY_CONFIG.aiSmell, ...override.aiSmell },
    };
  }

  private computeOverallScore(dimensions: QualityDimension[]): number {
    if (dimensions.length === 0) return 0;
    const total = dimensions.reduce((sum, d) => sum + d.score, 0);
    return Math.round(total / dimensions.length);
  }

  private getDimensionScore(dimensions: QualityDimension[], name: string): number {
    const dim = dimensions.find((d) => d.name === name);
    return dim ? dim.score : 0;
  }

  private inferDimensionFromIssueType(type: string): string {
    if (type.startsWith("word_count")) return "wordCount";
    if (["few_paragraphs", "too_much_dialogue", "all_dialogue", "no_dialogue", "fragmented_paragraphs", "empty_content"].includes(type)) return "structure";
    if (["undefined_character", "main_character_absent"].includes(type)) return "character";
    if (["time_jump", "scene_jump", "low_continuity", "time_contradiction"].includes(type)) return "plotCoherence";
    return "other";
  }

  private resolveDimensionScore(name: string, record: { coherence: number; repetition: number; pacing: number; voice: number; engagement: number }): number {
    switch (name) {
      case "plotCoherence": return record.coherence;
      case "structure": return record.pacing;
      case "character": return record.engagement;
      default: return 0;
    }
  }
}

export const chapterQualityChecker = new ChapterQualityChecker();
