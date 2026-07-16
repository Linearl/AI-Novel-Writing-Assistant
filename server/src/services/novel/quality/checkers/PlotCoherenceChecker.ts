import { prisma } from "../../../../db/prisma";
import type { QualityCheckConfig, QualityDimension, QualityDimensionChecker, QualityIssue } from "../types";

/**
 * Time-related keywords and scene/location shift indicators
 * used to detect narrative jumps between consecutive chapters.
 */
const TIME_JUMP_INDICATORS = [
  "第二天", "次日", "几天后", "几个月后", "一年后", "数日后",
  "转天", "翌日", "当天夜里", "当晚", "当夜",
  "时光飞逝", "光阴似箭", "转眼间", "一晃", "弹指间",
  "不久之后", "不久后", "没过多久", "又过了",
  "不知过了多久", "多年以后", "多年后",
];

const SCENE_SHIFT_INDICATORS = [
  "与此同时", "另一边", "另一方面", "画面一转", "镜头一转",
  "场景切换", "远处的", "远在", "在某处", "这里的",
];

const TIME_GAP_PATTERN = /(\d+)年(?:之)?[前后]/g;
const TIME_UNIT_PATTERN = /(\d+)\s*(个)?\s*[月天时](?:之)?[前后]/g;

export class PlotCoherenceChecker implements QualityDimensionChecker {
  name = "plotCoherence" as const;

  async check(content: string, chapterId: string, novelId: string, _config: QualityCheckConfig): Promise<QualityDimension> {
    if (!content || content.trim().length === 0) {
      return {
        name: this.name,
        score: 100,
        passed: true,
        issues: [],
      };
    }

    const issues: QualityIssue[] = [];

    // Get previous chapter for continuity check
    const chapters = await prisma.chapter.findMany({
      where: { novelId, id: chapterId },
      select: { order: true },
    });

    if (chapters.length === 0) {
      return { name: this.name, score: 100, passed: true, issues: [] };
    }

    const currentOrder = chapters[0].order;

    const prevChapter = await prisma.chapter.findFirst({
      where: { novelId, order: currentOrder - 1 },
      select: { id: true, content: true, title: true },
    });

    if (prevChapter && prevChapter.content) {
      // 1. Time jump detection
      const timeJump = this.detectTimeJump(prevChapter.content, content);
      if (timeJump) {
        issues.push({
          type: "time_jump",
          message: `检测到与前章的时间跳跃：${timeJump}`,
          severity: "warning",
        });
      }

      // 2. Scene jump detection
      const sceneJump = this.detectSceneJump(prevChapter.content, content);
      if (sceneJump) {
        issues.push({
          type: "scene_jump",
          message: `检测到场景跳跃：${sceneJump}`,
          severity: "warning",
        });
      }

      // 3. Check that the current chapter references the previous chapter's ending
      const prevEnding = this.extractEnding(prevChapter.content, 200);
      const continuityScore = this.estimateContinuity(prevEnding, content);
      if (continuityScore < 30) {
        issues.push({
          type: "low_continuity",
          message: "本章与前章结尾的衔接度较低，可能存在情节断裂",
          severity: "warning",
        });
      }
    }

    // 4. Internal coherence: detect time contradictions within the chapter
    const internalTimeIssues = this.detectInternalTimeContradictions(content);
    if (internalTimeIssues) {
      issues.push({
        type: "time_contradiction",
        message: internalTimeIssues,
        severity: "warning",
      });
    }

    const score = this.calculateScore(issues, !!prevChapter);
    return {
      name: this.name,
      score,
      passed: issues.filter((i) => i.severity === "error").length === 0,
      issues,
    };
  }

  private detectTimeJump(prevContent: string, currentContent: string): string | null {
    const currentStart = currentContent.slice(0, 500);

    for (const indicator of TIME_JUMP_INDICATORS) {
      const idx = currentStart.indexOf(indicator);
      if (idx !== -1 && idx < 200) {
        return `开头附近出现时间跳跃关键词「${indicator}」`;
      }
    }

    // Check explicit time gaps at chapter start
    TIME_GAP_PATTERN.lastIndex = 0;
    TIME_UNIT_PATTERN.lastIndex = 0;
    const gapStart = currentStart.slice(0, 300);
    const gapMatch = gapStart.match(TIME_GAP_PATTERN) ?? gapStart.match(TIME_UNIT_PATTERN);
    if (gapMatch && gapMatch.length > 0) {
      return `章节开头存在时间跨度描述：「${gapMatch[0]}」`;
    }

    return null;
  }

  private detectSceneJump(prevContent: string, currentContent: string): string | null {
    const currentStart = currentContent.slice(0, 500);

    for (const indicator of SCENE_SHIFT_INDICATORS) {
      const idx = currentStart.indexOf(indicator);
      if (idx !== -1 && idx < 200) {
        return `开头附近出现场景切换指示词「${indicator}」`;
      }
    }

    return null;
  }

  /**
   * Extract the last N characters of chapter content as the ending.
   */
  private extractEnding(content: string, charCount: number): string {
    return content.length > charCount ? content.slice(-charCount) : content;
  }

  /**
   * Estimate continuity score by comparing keyword overlap between
   * previous chapter ending and current chapter beginning.
   */
  private estimateContinuity(prevEnding: string, currentContent: string): number {
    const currentStart = currentContent.slice(0, 500);

    // Extract meaningful words (2-4 char CJK segments)
    const extractKeywords = (text: string): Set<string> => {
      const words = new Set<string>();
      const cleaned = text.replace(/[^一-鿿]/g, "");
      for (let len = 2; len <= 4; len++) {
        for (let i = 0; i <= cleaned.length - len; i++) {
          words.add(cleaned.slice(i, i + len));
        }
      }
      return words;
    };

    const prevKeywords = extractKeywords(prevEnding);
    const currKeywords = extractKeywords(currentStart);

    if (prevKeywords.size === 0 || currKeywords.size === 0) return 0;

    let overlap = 0;
    for (const kw of prevKeywords) {
      if (currKeywords.has(kw)) overlap++;
    }

    // Normalize: overlap ratio relative to prevEnding keyword count
    return Math.round((overlap / prevKeywords.size) * 100);
  }

  /**
   * Detect internal time contradictions within a single chapter
   * (e.g. "morning" appearing after "midnight" without transition).
   */
  private detectInternalTimeContradictions(content: string): string | null {
    const morning = /清晨|早上|早晨|上午/g;
    const noon = /中午|正午|午时/g;
    const evening = /傍晚|黄昏|日落/g;
    const night = /深夜|半夜|午夜|凌晨/g;

    const morningMatches = Array.from(content.matchAll(morning), (m) => m.index ?? 0);
    const nightMatches = Array.from(content.matchAll(night), (m) => m.index ?? 0);

    if (morningMatches.length > 0 && nightMatches.length > 0) {
      const lastMorning = Math.max(...morningMatches);
      const firstNight = Math.min(...nightMatches);
      if (lastMorning > firstNight) {
        return "时间顺序可能存在矛盾（先出现深夜后出现早晨描述）";
      }
    }

    return null;
  }

  private calculateScore(issues: QualityIssue[], hasPrevChapter: boolean): number {
    if (!hasPrevChapter) return 100; // First chapter — no coherence issues expected

    const warningCount = issues.filter((i) => i.severity === "warning").length;
    if (warningCount === 0) return 100;
    if (warningCount === 1) return 75;
    if (warningCount === 2) return 50;
    return 25;
  }
}
