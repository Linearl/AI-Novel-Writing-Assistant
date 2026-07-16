import { prisma } from "../../../../db/prisma";
import type { QualityCheckConfig, QualityDimension, QualityDimensionChecker, QualityIssue } from "../types";

export class CharacterChecker implements QualityDimensionChecker {
  name = "character" as const;

  async check(content: string, _chapterId: string, novelId: string, _config: QualityCheckConfig): Promise<QualityDimension> {
    if (!content || content.trim().length === 0) {
      return {
        name: this.name,
        score: 100,
        passed: true,
        issues: [],
      };
    }

    const issues: QualityIssue[] = [];

    // Extract character names from content using dialogue + action patterns
    const extractedNames = this.extractCharacterNames(content);

    // Fetch defined characters from the database
    // BaseCharacter does not have a direct novel relation, so we get all available
    const baseCharacters = await prisma.baseCharacter.findMany({
      select: {
        id: true,
        name: true,
        tags: true,
      },
    });

    const definedNames = new Set<string>();
    const characterAliasMap = new Map<string, string[]>();

    for (const char of baseCharacters) {
      definedNames.add(char.name);
      // Use tags field as aliases (comma-separated)
      const aliases = char.tags
        ? char.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [];
      for (const alias of aliases) {
        definedNames.add(alias);
      }
      characterAliasMap.set(char.name, aliases);
    }

    // Check for undefined characters
    for (const name of extractedNames) {
      if (!definedNames.has(name)) {
        issues.push({
          type: "undefined_character",
          message: `出现未在人物设定中定义的人物：${name}`,
          severity: "warning",
        });
      }
    }

    // Check for main character absence
    // Characters with "主角" or "主要" in tags are considered main characters
    const mainCharacters = baseCharacters.filter(
      (c) => c.tags.includes("主角") || c.tags.includes("主要"),
    );
    for (const main of mainCharacters) {
      const allNames = [main.name, ...(characterAliasMap.get(main.name) ?? [])];
      const found = allNames.some((n) => extractedNames.includes(n));
      if (!found) {
        issues.push({
          type: "main_character_absent",
          message: `主要人物「${main.name}」未在本章出现`,
          severity: "info",
        });
      }
    }

    const score = this.calculateScore(extractedNames.length, baseCharacters.length, issues);
    return {
      name: this.name,
      score,
      passed: issues.filter((i) => i.severity === "error").length === 0,
      issues,
    };
  }

  /**
   * Extract character names from content using Chinese name patterns
   * based on dialogue lead-in and action descriptors.
   */
  private extractCharacterNames(content: string): string[] {
    const nameSet = new Set<string>();

    // Pattern 1: "Name says/does something" — captures names before speech/action verbs
    const speechActionPattern = /(?:^|[，。！？\s\n])([一-鿿]{2,4})(?:说道|说|道|问道|答道|笑道|冷声道|喊|叫|问|答|点头|摇头|叹气|冷哼|皱眉|微笑|冷笑|苦笑|叹息|沉吟|低语|怒吼|咆哮|呢喃|心想|暗想|思忖|看向|望向|盯着|瞥了|扫了)/g;
    let match: RegExpExecArray | null;
    while ((match = speechActionPattern.exec(content)) !== null) {
      const candidate = match[1];
      if (this.isLikelyName(candidate)) {
        nameSet.add(candidate);
      }
    }

    // Pattern 2: Dialogue attribution — "XXX：" or "XXX:" (leading indicator)
    const dialogueAttrPattern = /(?:^|\n)([一-鿿]{2,4})[：:]/gm;
    while ((match = dialogueAttrPattern.exec(content)) !== null) {
      const candidate = match[1];
      if (this.isLikelyName(candidate)) {
        nameSet.add(candidate);
      }
    }

    // Pattern 3: "XXX的" possessive pattern (e.g. "张三的目光")
    const possessivePattern = /([一-鿿]{2,4})的(?:目光|眼神|声音|手|脸|身影|脚步|心|身体)/g;
    while ((match = possessivePattern.exec(content)) !== null) {
      const candidate = match[1];
      if (this.isLikelyName(candidate)) {
        nameSet.add(candidate);
      }
    }

    return Array.from(nameSet);
  }

  /**
   * Heuristic to filter out non-name 2-4 character Chinese strings.
   */
  private isLikelyName(candidate: string): boolean {
    // Common non-name 2-4 char words to exclude
    const nonNameWords = new Set([
      "他们", "我们", "你们", "她们", "这个", "那个", "什么", "怎么", "为什么",
      "不知道", "可以", "没有", "不是", "但是", "因为", "所以", "如果", "虽然",
      "然后", "忽然", "突然", "原来", "终于", "于是", "接着", "立刻", "马上",
      "已经", "曾经", "现在", "此时", "这里", "那里", "自己", "对方", "大家",
      "依旧", "仍然", "不过", "只是", "甚至", "简直", "恐怕", "或许", "也许",
      "心里", "心中", "脑海", "面前", "眼前", "身边", "背后", "一旁",
      "说道", "觉得", "感到", "看见", "听见", "闻到", "想到",
      "看着", "听着", "发现", "想起", "记得", "忘记",
    ]);

    if (nonNameWords.has(candidate)) return false;

    // Chinese surnames: single-character surnames common in Chinese
    const commonSurnames = new Set([
      "王", "李", "张", "刘", "陈", "杨", "赵", "黄", "周", "吴",
      "徐", "孙", "马", "胡", "朱", "郭", "何", "罗", "高", "林",
      "郑", "梁", "谢", "唐", "许", "冯", "宋", "韩", "邓", "彭",
      "沈", "欧阳", "司马", "上官", "慕容", "令狐", "独孤", "诸葛",
    ]);

    // If it starts with a known surname, very likely a name
    const firstChar = candidate.charAt(0);
    if (commonSurnames.has(firstChar)) return true;
    if (commonSurnames.has(candidate.slice(0, 2))) return true;

    // Filter out common sentence-starting words
    const sentenceStarters = new Set([
      "忽然间", "刹那间", "一时间", "不多时", "片刻后", "不多久",
      "换言之", "反过来说", "实际上", "说到底",
    ]);
    if (sentenceStarters.has(candidate)) return false;

    return true;
  }

  private calculateScore(extractedCount: number, definedCount: number, issues: QualityIssue[]): number {
    if (extractedCount === 0 && definedCount === 0) return 100;
    if (definedCount === 0) return 80;

    const warningCount = issues.filter((i) => i.severity === "warning").length;
    const infoCount = issues.filter((i) => i.severity === "info").length;

    let score = 100;
    score -= warningCount * 15;
    score -= infoCount * 5;

    return Math.max(0, Math.min(100, score));
  }
}
