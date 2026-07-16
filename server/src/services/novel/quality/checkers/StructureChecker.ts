import type { QualityCheckConfig, QualityDimension, QualityDimensionChecker, QualityIssue } from "../types";

export class StructureChecker implements QualityDimensionChecker {
  name = "structure" as const;

  async check(content: string, _chapterId: string, _novelId: string, config: QualityCheckConfig): Promise<QualityDimension> {
    if (!content || content.trim().length === 0) {
      return {
        name: this.name,
        score: 0,
        passed: false,
        issues: [{ type: "empty_content", message: "章节内容为空，无法进行结构检查", severity: "error" }],
      };
    }

    const paragraphs = content.split(/\n\n+/).filter((p) => p.trim().length > 0);
    const issues: QualityIssue[] = [];

    // 1. Paragraph count check
    if (paragraphs.length < config.structure.minParagraphs) {
      issues.push({
        type: "few_paragraphs",
        message: `段落数过少：${paragraphs.length} 段，建议至少 ${config.structure.minParagraphs} 段`,
        severity: "warning",
      });
    }

    // 2. Dialogue ratio check
    const dialogueParagraphs = paragraphs.filter((p) => /["「『"']/.test(p));
    const dialogueRatio = paragraphs.length > 0 ? dialogueParagraphs.length / paragraphs.length : 0;

    if (dialogueRatio === 1.0) {
      issues.push({
        type: "all_dialogue",
        message: "全篇均为对话，缺少叙述描写",
        severity: "error",
      });
    } else if (dialogueRatio > config.structure.maxDialogueRatio) {
      issues.push({
        type: "too_much_dialogue",
        message: `对话比例过高：${(dialogueRatio * 100).toFixed(1)}%，建议不超过 ${(config.structure.maxDialogueRatio * 100).toFixed(0)}%`,
        severity: "warning",
      });
    }

    // 3. Detect all-narrative (no dialogue at all)
    if (dialogueRatio === 0 && paragraphs.length > 10) {
      issues.push({
        type: "no_dialogue",
        message: "长章节缺少对话，人物交互感较弱",
        severity: "info",
      });
    }

    // 4. Paragraph length uniformity check
    if (paragraphs.length >= 5) {
      const lengths = paragraphs.map((p) => p.length);
      const avgLen = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      const veryShortCount = lengths.filter((l) => l < avgLen * 0.2).length;
      const shortRatio = veryShortCount / lengths.length;

      if (shortRatio > 0.5) {
        issues.push({
          type: "fragmented_paragraphs",
          message: `段落碎片化严重：${(shortRatio * 100).toFixed(0)}% 段落偏短`,
          severity: "warning",
        });
      }
    }

    const score = this.calculateScore(paragraphs.length, dialogueRatio, config, issues);
    return {
      name: this.name,
      score,
      passed: issues.filter((i) => i.severity === "error").length === 0,
      issues,
    };
  }

  private calculateScore(
    paragraphCount: number,
    dialogueRatio: number,
    config: QualityCheckConfig,
    issues: QualityIssue[],
  ): number {
    const hasError = issues.some((i) => i.severity === "error");
    if (hasError) return 40;

    let score = 100;

    // Paragraph count penalty
    if (paragraphCount < config.structure.minParagraphs) {
      score -= Math.round(((config.structure.minParagraphs - paragraphCount) / config.structure.minParagraphs) * 30);
    }

    // Dialogue ratio penalty (ideal: 0.15-0.60)
    if (dialogueRatio > config.structure.maxDialogueRatio) {
      score -= Math.round(((dialogueRatio - config.structure.maxDialogueRatio) / (1 - config.structure.maxDialogueRatio)) * 30);
    }
    if (dialogueRatio === 0 && paragraphCount > 10) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }
}
