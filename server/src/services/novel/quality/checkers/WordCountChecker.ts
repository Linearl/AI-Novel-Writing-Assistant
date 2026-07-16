import type { QualityCheckConfig, QualityDimension, QualityDimensionChecker, QualityIssue } from "../types";

export class WordCountChecker implements QualityDimensionChecker {
  name = "wordCount" as const;

  async check(content: string, _chapterId: string, _novelId: string, config: QualityCheckConfig): Promise<QualityDimension> {
    const count = this.countEffectiveWords(content);
    const { min, max } = config.wordCount;
    const issues: QualityIssue[] = [];

    if (count < min) {
      issues.push({
        type: "word_count_under",
        message: `字数不足：当前 ${count} 字，要求至少 ${min} 字`,
        severity: "warning",
      });
    }

    if (count > max) {
      issues.push({
        type: "word_count_over",
        message: `字数超标：当前 ${count} 字，建议不超过 ${max} 字`,
        severity: "warning",
      });
    }

    const score = this.calculateScore(count, min, max);
    return {
      name: this.name,
      score,
      passed: issues.filter((i) => i.severity === "error").length === 0,
      issues,
    };
  }

  private countEffectiveWords(content: string): number {
    if (!content || content.trim().length === 0) {
      return 0;
    }
    // Count CJK characters + letters + digits, excluding spaces and punctuation
    const cleaned = content
      .split(/\n/)
      .filter((line) => line.trim().length > 0)
      .join("");
    const matches = cleaned.match(/[一-鿿㐀-䶿a-zA-Z0-9]/g);
    return matches ? matches.length : 0;
  }

  private calculateScore(count: number, min: number, max: number): number {
    if (count === 0) return 0;
    if (count >= min && count <= max) return 100;
    if (count < min) {
      // Linear drop: 0 at 0 -> 100 at min
      return Math.round((count / min) * 100);
    }
    // Over max: linear drop, bottom at 0 for double max
    const excess = count - max;
    const penalty = Math.min(100, Math.round((excess / max) * 100));
    return Math.max(0, 100 - penalty);
  }
}
